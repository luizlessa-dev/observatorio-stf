/**
 * Consultas executadas UMA VEZ, no build. O resultado vai para dentro do HTML.
 *
 * É a diferença que o achado E1 apontava: antes cada visitante disparava duas
 * viagens ao Supabase depois de baixar 505 KB de JavaScript, e quem não executa
 * JS — GPTBot, ClaudeBot, PerplexityBot — via uma página em branco.
 *
 * REGRA: nada aqui interpreta dado. O andamento sai como o STF escreveu, e a
 * atribuição de ministro respeita `ministro_resolucao`. Ver docs/auditoria-onda-1.md.
 */
import { supabase } from "./supabase";
import { slugMinistro } from "./slug";

export interface Ministro {
  id: string;
  nome: string;
  slug: string;
  iniciais_exibicao: string;
  data_posse: string;
  data_saida: string | null;
  indicado_por: string;
  indicado_por_curto: string;
  partido_indicante: string;
  cargo_anterior: string | null;
  aposentadoria_comp: string | null;
  ativo: boolean;
  cargo: "presidente" | "vice_presidente" | null;
}

export interface Decisao {
  id: string;
  processo: string;
  data_decisao: string;
  andamento_bruto: string;
  tipo_decisao: string | null;
  assunto: string | null;
}

export interface Gasto {
  categoria: string;
  descricao: string | null;
  valor: number;
  mes: number;
  ano: number;
  fonte: string | null;
}

const COLUNAS_MINISTRO =
  "id, nome, iniciais_exibicao, data_posse, data_saida, indicado_por, indicado_por_curto, partido_indicante, cargo_anterior, aposentadoria_comp, ativo" as const;

/** Todos os ministros, em exercício e históricos, com o cargo atual anotado. */
export async function carregarMinistros(): Promise<Ministro[]> {
  const [{ data: ministros, error }, { data: presidencias }] = await Promise.all([
    supabase.from("stf_ministros").select(COLUNAS_MINISTRO).order("data_posse", { ascending: false }),
    supabase.from("stf_presidencias").select("ministro_id, cargo, fim"),
  ]);

  // Falhar alto: um build que gera 33 páginas vazias porque a consulta quebrou
  // é pior do que um build que não termina.
  if (error) throw new Error(`stf_ministros: ${error.message}`);
  if (!ministros?.length) throw new Error("stf_ministros voltou vazia — build abortado");

  const cargoPorMinistro = new Map<string, "presidente" | "vice_presidente">();
  for (const p of presidencias ?? []) {
    if (p.fim === null) cargoPorMinistro.set(p.ministro_id, p.cargo);
  }

  return ministros.map((m) => ({
    ...m,
    slug: slugMinistro(m.nome),
    iniciais_exibicao: m.iniciais_exibicao ?? "",
    indicado_por_curto: m.indicado_por_curto ?? m.indicado_por,
    cargo: cargoPorMinistro.get(m.id) ?? null,
  })) as Ministro[];
}

/**
 * Decisões monocráticas do ministro COMO RELATOR, mais a contagem do que ele
 * assinou como presidente do STF.
 *
 * As duas nunca se somam. Em 2026, Fachin tem 35 como relator e 28.115 como
 * presidente; juntar faria a ficha dele exibir quase 7x o volume de Moraes,
 * quando ele é justamente quem tem menos decisões próprias — presidir
 * redistribui a pauta. Ver o comentário longo em src/hooks/useDecisoes.ts.
 */
export async function carregarDecisoes(ministroId: string, limite = 30) {
  // As duas consultas usam stf_decisoes_ficha_idx (migration 0010, ~200ms) —
  // rápidas isoladamente, mas o build dispara isto para os 33 ministros ao
  // mesmo tempo (getStaticPaths, Promise.all sem limite de concorrência) e
  // essa rajada já derrubou uma delas com "statement timeout" numa execução
  // real de build, mesmo a query sendo barata sozinha. Por isso comRetry nas
  // duas, não só na contagem.
  const [pauta, comoPresidente] = await Promise.all([
    comRetry(
      () =>
        supabase
          .from("stf_decisoes")
          .select("id, processo, data_decisao, andamento_bruto, tipo_decisao, assunto", { count: "exact" })
          .eq("ministro_id", ministroId)
          .eq("ministro_resolucao", "nome")
          .eq("tipo_origem", "MONOCRÁTICA")
          .order("data_decisao", { ascending: false })
          .limit(limite),
      `stf_decisoes (pauta do ministro ${ministroId})`,
    ),
    contarExato(
      () =>
        supabase
          .from("stf_decisoes")
          .select("id", { count: "exact", head: true })
          .eq("ministro_id", ministroId)
          .eq("ministro_resolucao", "presidencia"),
      `stf_decisoes como presidente (ministro ${ministroId})`,
    ),
  ]);

  return {
    decisoes: (pauta.data ?? []) as Decisao[],
    total: pauta.count!,
    comoPresidente,
  };
}

export async function carregarGastos(ministroId: string): Promise<Gasto[]> {
  const { data } = await supabase
    .from("stf_gastos")
    .select("categoria, descricao, valor, mes, ano, fonte")
    .eq("ministro_id", ministroId)
    .order("ano", { ascending: false })
    .order("mes", { ascending: false });
  return (data ?? []) as Gasto[];
}

/**
 * Consultas indexadas e normalmente rápidas (dezenas a poucas centenas de ms)
 * ainda podem falhar por instabilidade pontual ou pela rajada de ~66
 * consultas concorrentes que o build dispara para os 33 ministros de uma vez
 * (getStaticPaths sem limite de concorrência). Retry curto cobre isso;
 * falhar alto no fim cobre o resto, no mesmo espírito do `carregarMinistros`
 * acima — nunca cair em silêncio para `0` ou lista vazia. Não serve para
 * agregar a tabela inteira sem filtro: ver `carregarResumo` abaixo, que não
 * conta nada ao vivo porque nenhum retry salva uma consulta que passa do
 * statement_timeout por ser estruturalmente grande demais.
 */
function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Toda chamada daqui usa `count: "exact"`, então `count` sempre está na
// resposta — inclusive quando a query também traz `data` (a pauta em
// carregarDecisoes). `count == null` sem erro é o próprio sintoma que
// motivou isto: o cliente volta null em silêncio em vez de lançar.
type RespostaComContagem = {
  count: number | null;
  error: { message: string; code?: string } | null;
  status?: number;
};

async function comRetry<T extends RespostaComContagem>(
  fabricaDaQuery: () => PromiseLike<T>,
  rotulo: string,
  tentativas = 5,
): Promise<T> {
  let ultimoErro = "";
  for (let i = 0; i < tentativas; i++) {
    const resultado = await fabricaDaQuery();
    if (!resultado.error && resultado.count != null) return resultado;
    ultimoErro = resultado.error?.message || `HTTP ${resultado.status}` || "count voltou null sem erro explícito";
    if (i < tentativas - 1) await esperar(1500 * (i + 1));
  }
  throw new Error(`${rotulo}: falhou após ${tentativas} tentativas (${ultimoErro})`);
}

async function contarExato(fabricaDaQuery: () => PromiseLike<RespostaComContagem>, rotulo: string, tentativas = 5): Promise<number> {
  const resultado = await comRetry(fabricaDaQuery, rotulo, tentativas);
  return resultado.count!;
}

/**
 * Números do acervo, para a home, o JSON-LD e /metodologia.
 *
 * Não agrega stf_decisoes ao vivo. `count: "exact"` sem filtro nas 2,9M
 * linhas media ~11s sob o papel `anon` — que tem statement_timeout de 12s
 * (config do projeto Supabase), então falhava sob qualquer variação de
 * carga. Nenhum índice resolve isso: o gargalo é o tamanho da agregação, não
 * a falta de um plano de acesso melhor. `stf_estatisticas` (migration 0012)
 * é recalculada pelo pipeline de ingestão, que roda sob `service_role` (sem
 * statement_timeout) uma vez por dia — o build só faz um select por chave
 * primária.
 */
export async function carregarResumo() {
  const { data, error } = await supabase.from("stf_estatisticas").select("*").eq("id", 1).single();
  if (error || !data) throw new Error(`stf_estatisticas: ${error?.message ?? "sem linha"}`);

  return {
    totalDecisoes: data.total_decisoes,
    totalTemasRG: data.total_temas_rg,
    dadosAte: data.dados_ate,
    pctSemMinistro: data.total_decisoes > 0 ? (data.sem_ministro / data.total_decisoes) * 100 : null,
  };
}
