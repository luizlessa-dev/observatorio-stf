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
  const [pauta, presidencia] = await Promise.all([
    supabase
      .from("stf_decisoes")
      .select("id, processo, data_decisao, andamento_bruto, tipo_decisao, assunto", { count: "exact" })
      .eq("ministro_id", ministroId)
      .eq("ministro_resolucao", "nome")
      .eq("tipo_origem", "MONOCRÁTICA")
      .order("data_decisao", { ascending: false })
      .limit(limite),
    supabase
      .from("stf_decisoes")
      .select("id", { count: "exact", head: true })
      .eq("ministro_id", ministroId)
      .eq("ministro_resolucao", "presidencia"),
  ]);

  return {
    decisoes: (pauta.data ?? []) as Decisao[],
    total: pauta.count ?? 0,
    comoPresidente: presidencia.count ?? 0,
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
 * `count: "exact"` sem filtro em stf_decisoes (2,9M linhas) mede ~11s — perto
 * do limite em que o build já viu esse fetch falhar em silêncio (o cliente
 * volta `count: null`, sem lançar erro). Uma tentativa isolada some direto
 * pro "0" no HTML. Retry curto cobre a instabilidade pontual; falhar alto no
 * fim cobre o resto, no mesmo espírito do `carregarMinistros` acima.
 */
function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function contarExato(
  fabricaDaQuery: () => PromiseLike<{ count: number | null; error: { message: string; code?: string } | null; status?: number }>,
  rotulo: string,
  tentativas = 5,
): Promise<number> {
  let ultimoErro = "";
  for (let i = 0; i < tentativas; i++) {
    const { count, error, status } = await fabricaDaQuery();
    if (!error && count != null) return count;
    ultimoErro = error?.message || `HTTP ${status}` || "count voltou null sem erro explícito";
    if (i < tentativas - 1) await esperar(1500 * (i + 1));
  }
  throw new Error(`${rotulo}: falhou após ${tentativas} tentativas (${ultimoErro})`);
}

/** Números do acervo, para a home e para o JSON-LD. */
export async function carregarResumo() {
  const [totalTemasRG, ultima] = await Promise.all([
    contarExato(() => supabase.from("stf_repercussao_geral").select("id", { count: "exact", head: true }), "stf_repercussao_geral total"),
    supabase.from("stf_decisoes").select("data_decisao").order("data_decisao", { ascending: false }).limit(1),
  ]);
  if (ultima.error) throw new Error(`stf_decisoes (data mais recente): ${ultima.error.message}`);

  const totalDecisoes = await contarExato(
    () => supabase.from("stf_decisoes").select("id", { count: "exact", head: true }),
    "stf_decisoes total",
  );
  return {
    totalDecisoes,
    totalTemasRG,
    dadosAte: ultima.data?.[0]?.data_decisao ?? null,
  };
}
