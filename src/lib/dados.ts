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

export interface GastoServidor {
  nome: string;
  cargo_efetivo: string | null;
  cargo_comissionado: string | null;
  funcao: string | null;
  situacao_funcional: string | null;
  remuneracao_bruta: number;
  remuneracao_liquida: number | null;
}

export interface Passagem {
  nome: string | null;
  cargo: string | null;
  motivo: string | null;
  data_ida: string | null;
  data_volta: string | null;
  tipo_passagem: string | null;
  trecho: string | null;
  custo_efetivo: number | null;
  ano: number;
  mes: number | null;
}

export interface Diaria {
  nome: string | null;
  cargo: string | null;
  motivo: string | null;
  tipo_diaria: string | null;
  quantidade: number | null;
  valor_total: number | null;
  ano: number;
  mes: number | null;
}

export interface AcaoControleConcentrado {
  processo: string;
  link_processo: string | null;
  ramo_direito: string | null;
  assunto: string | null;
  em_tramitacao: boolean | null;
  situacao_processual: string | null;
  data_autuacao: string | null;
}

export interface ControleConcentrado {
  total: number;
  emTramitacao: number;
  acoes: AcaoControleConcentrado[];
}

export interface Reclamacao {
  processo: string;
  ramo_direito: string | null;
  procedencia: string | null;
  em_tramitacao: boolean | null;
  liminar_pendente: boolean | null;
  data_autuacao: string | null;
}

export interface Reclamacoes {
  total: number;
  emTramitacao: number;
  liminaresPendentes: number;
  lista: Reclamacao[];
}

export interface ProximoJulgamento {
  classe: string | null;
  numero: number | null;
  orgao: string;
  ramo_direito: string | null;
  papel: "relator" | "vista";
  data_pauta: string | null;
}

export interface CasoOmissaoInconstitucional {
  materia: string | null;
  processo: string;
  data_julgamento: string | null;
  tipo_omissao: string | null;
  ramo_direito: string | null;
  link_processo: string | null;
}

export interface Viagens {
  totalPassagens: number;
  totalDiarias: number;
  qtdPassagens: number;
  qtdDiarias: number;
  desde: number | null;
  passagens: Passagem[];
  diarias: Diaria[];
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

export interface PerfilDecisorio {
  totalDecisoes: number;
  pctClassificadas: number | null;
  pctMerito: number | null;
  pctAdmissibilidade: number | null;
  pctCautelar: number | null;
  pctProcessual: number | null;
  pctDevolucao: number | null;
  nMeritoComSentido: number;
  pctFavoravel: number | null;
  pctContrario: number | null;
  pctParcial: number | null;
  tempoMedioDias: number | null;
  pctMonocratica: number | null;
  pctColegiada: number | null;
}

/**
 * Perfil decisório do ministro: natureza do ato (mérito/admissibilidade/
 * cautelar/processual/devolução) e, dentro de mérito, taxa de
 * favorável/contrário/parcial — classificado por regra sobre o texto literal
 * de andamento_bruto (migration 0016), sem LLM e sem eixo ideológico. Ver
 * /metodologia#perfil-decisorio.
 *
 * `null` quando não há linha pro ministro, quando a amostra é menor que 10
 * decisões classificadas (evita "100%" a partir de 1 decisão — tecnicamente
 * exato, ainda assim enganoso isolado), ou quando um denominador individual
 * é zero — nunca um valor fabricado. O chamador decide se omite a seção;
 * nunca inventamos "sem dados = 0%".
 */
const COLUNAS_PERFIL_DECISORIO =
  "total_decisoes, total_classificadas, pct_classificadas, n_merito, n_admissibilidade, n_cautelar, n_processual, n_devolucao, pct_merito, pct_admissibilidade, pct_cautelar, pct_processual, pct_devolucao, n_merito_com_sentido, n_favoravel, n_contrario, n_parcial, pct_favoravel, pct_contrario, pct_parcial, tempo_medio_dias" as const;
const COLUNAS_MIX_ATUACAO = "n_monocratica, n_colegiada, pct_monocratica, pct_colegiada" as const;

// Sem isto, um ministro histórico com 1 decisão classificada aparece com
// "100%" numa categoria — tecnicamente exato, ainda assim enganoso isolado.
// 10 é bem acima do MIN_VOTOS_RELEVANTES=3 do termômetro antigo. Compartilhado
// entre carregarPerfilDecisorio (ficha individual) e carregarComparativoDecisorio
// (ranking) — o mesmo piso vale pra aparecer sozinho ou junto de outros.
const AMOSTRA_MINIMA = 10;

export async function carregarPerfilDecisorio(ministroId: string): Promise<PerfilDecisorio | null> {
  const [perfil, mix] = await Promise.all([
    comRetrySimples(
      () =>
        supabase
          .from("stf_ministros_perfil_decisorio")
          .select(COLUNAS_PERFIL_DECISORIO)
          .eq("ministro_id", ministroId)
          .maybeSingle(),
      `stf_ministros_perfil_decisorio (ministro ${ministroId})`,
    ),
    comRetrySimples(
      () =>
        supabase
          .from("stf_ministros_mix_atuacao")
          .select(COLUNAS_MIX_ATUACAO)
          .eq("ministro_id", ministroId)
          .maybeSingle(),
      `stf_ministros_mix_atuacao (ministro ${ministroId})`,
    ),
  ]);

  if (!perfil.data || perfil.data.total_classificadas < AMOSTRA_MINIMA) return null;

  return {
    totalDecisoes: perfil.data.total_decisoes,
    pctClassificadas: perfil.data.pct_classificadas,
    pctMerito: perfil.data.pct_merito,
    pctAdmissibilidade: perfil.data.pct_admissibilidade,
    pctCautelar: perfil.data.pct_cautelar,
    pctProcessual: perfil.data.pct_processual,
    pctDevolucao: perfil.data.pct_devolucao,
    nMeritoComSentido: perfil.data.n_merito_com_sentido,
    pctFavoravel: perfil.data.pct_favoravel,
    pctContrario: perfil.data.pct_contrario,
    pctParcial: perfil.data.pct_parcial,
    tempoMedioDias: perfil.data.tempo_medio_dias,
    pctMonocratica: mix.data?.pct_monocratica ?? null,
    pctColegiada: mix.data?.pct_colegiada ?? null,
  };
}

export interface PerfilComparativo {
  ministroId: string;
  nome: string;
  slug: string;
  totalClassificadas: number;
  nMeritoComSentido: number;
  pctFavoravel: number | null;
  pctContrario: number | null;
  pctParcial: number | null;
  pctMerito: number | null;
}

/**
 * Ranking dos ministros em exercício por taxa de contrário/favorável, pra
 * comparar lado a lado — mesmo dado de carregarPerfilDecisorio, mesmo piso de
 * amostra mínima, mesma metodologia por regra (/metodologia#perfil-decisorio).
 * Só entram ministros ATIVOS com amostra suficiente na dimensão de mérito
 * (n_merito_com_sentido, não total_classificadas — é ela que embasa
 * pct_favoravel/pct_contrario, que é o que a página ordena).
 */
export async function carregarComparativoDecisorio(): Promise<PerfilComparativo[]> {
  const [ministros, { data: perfis, error }] = await Promise.all([
    carregarMinistros(),
    supabase
      .from("stf_ministros_perfil_decisorio")
      .select("ministro_id, total_classificadas, n_merito_com_sentido, pct_favoravel, pct_contrario, pct_parcial, pct_merito"),
  ]);
  if (error) throw new Error(`stf_ministros_perfil_decisorio: ${error.message}`);

  const porMinistro = new Map(ministros.map((m) => [m.id, m]));
  const linhas: PerfilComparativo[] = [];
  for (const p of perfis ?? []) {
    if (p.n_merito_com_sentido < AMOSTRA_MINIMA) continue;
    const m = porMinistro.get(p.ministro_id);
    if (!m?.ativo) continue;
    linhas.push({
      ministroId: p.ministro_id,
      nome: m.nome,
      slug: m.slug,
      totalClassificadas: p.total_classificadas,
      nMeritoComSentido: p.n_merito_com_sentido,
      pctFavoravel: p.pct_favoravel,
      pctContrario: p.pct_contrario,
      pctParcial: p.pct_parcial,
      pctMerito: p.pct_merito,
    });
  }
  linhas.sort((a, b) => (b.pctContrario ?? 0) - (a.pctContrario ?? 0));
  return linhas;
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
 * Detalhamento por servidor do gabinete, só do mês mais recente disponível
 * (não faz sentido mostrar histórico completo aqui — quem quer isso já tem
 * o agregado mensal via carregarGastos). Uma consulta para achar o
 * ano/mês mais recente e outra para os servidores desse período: mais
 * simples que uma janela SQL, e o volume por ministro (~35 linhas) não
 * justifica a complexidade.
 */
export async function carregarGastosServidores(ministroId: string): Promise<GastoServidor[]> {
  const { data: ultimo } = await supabase
    .from("stf_gastos_servidores")
    .select("ano, mes")
    .eq("ministro_id", ministroId)
    .order("ano", { ascending: false })
    .order("mes", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!ultimo) return [];

  const { data } = await supabase
    .from("stf_gastos_servidores")
    .select("nome, cargo_efetivo, cargo_comissionado, funcao, situacao_funcional, remuneracao_bruta, remuneracao_liquida")
    .eq("ministro_id", ministroId)
    .eq("ano", ultimo.ano)
    .eq("mes", ultimo.mes)
    .order("remuneracao_bruta", { ascending: false });
  return (data ?? []) as GastoServidor[];
}

/**
 * Passagens aéreas e diárias do gabinete, desde 2016 (início da série na
 * fonte). Os totais somam o histórico inteiro disponível — sem filtrar por
 * data de posse, porque a fonte não deixa isso simples de fazer no cliente
 * e a maioria dos ministros já cobre praticamente toda a série. A tabela
 * de detalhe mostra só as 40 mais recentes de cada uma; quem quer o resto
 * tem os dados brutos no Supabase.
 */
export async function carregarViagens(ministroId: string): Promise<Viagens> {
  const [
    { data: agregPassagens },
    { data: agregDiarias },
    { data: passagens },
    { data: diarias },
  ] = await Promise.all([
    supabase.from("stf_passagens").select("custo_efetivo, ano").eq("ministro_id", ministroId),
    supabase.from("stf_diarias").select("valor_total, ano").eq("ministro_id", ministroId),
    supabase
      .from("stf_passagens")
      .select("nome, cargo, motivo, data_ida, data_volta, tipo_passagem, trecho, custo_efetivo, ano, mes")
      .eq("ministro_id", ministroId)
      .order("ano", { ascending: false })
      .order("mes", { ascending: false })
      .limit(40),
    supabase
      .from("stf_diarias")
      .select("nome, cargo, motivo, tipo_diaria, quantidade, valor_total, ano, mes")
      .eq("ministro_id", ministroId)
      .order("ano", { ascending: false })
      .order("mes", { ascending: false })
      .limit(40),
  ]);

  const anos = [...(agregPassagens ?? []).map((p) => p.ano), ...(agregDiarias ?? []).map((d) => d.ano)];

  return {
    totalPassagens: (agregPassagens ?? []).reduce((s, p) => s + (p.custo_efetivo ?? 0), 0),
    totalDiarias: (agregDiarias ?? []).reduce((s, d) => s + (d.valor_total ?? 0), 0),
    qtdPassagens: agregPassagens?.length ?? 0,
    qtdDiarias: agregDiarias?.length ?? 0,
    desde: anos.length ? Math.min(...anos) : null,
    passagens: (passagens ?? []) as Passagem[],
    diarias: (diarias ?? []) as Diaria[],
  };
}

/**
 * Ações de controle concentrado (ADI/ADC/ADPF/ADO) sob relatoria do
 * ministro — histórico completo desde 1997, não só o período em exercício
 * (relatoria de uma ação não muda quando o processo já está distribuído).
 * A lista de detalhe mostra as 40 mais recentes por data de autuação;
 * total e "em tramitação" somam tudo.
 */
export async function carregarControleConcentrado(ministroId: string): Promise<ControleConcentrado> {
  const [{ count: total }, { count: emTramitacao }, { data: acoes }] = await Promise.all([
    supabase.from("stf_controle_concentrado").select("*", { count: "exact", head: true }).eq("ministro_id", ministroId),
    supabase
      .from("stf_controle_concentrado")
      .select("*", { count: "exact", head: true })
      .eq("ministro_id", ministroId)
      .eq("em_tramitacao", true),
    supabase
      .from("stf_controle_concentrado")
      .select("processo, link_processo, ramo_direito, assunto, em_tramitacao, situacao_processual, data_autuacao")
      .eq("ministro_id", ministroId)
      .order("data_autuacao", { ascending: false })
      .limit(40),
  ]);

  return {
    total: total ?? 0,
    emTramitacao: emTramitacao ?? 0,
    acoes: (acoes ?? []) as AcaoControleConcentrado[],
  };
}

/**
 * Reclamações constitucionais sob relatoria do ministro — histórico
 * completo. É o maior volume individual de processo do tribunal (quase
 * 100 mil), então a lista de detalhe fica restrita às 40 mais recentes.
 */
export async function carregarReclamacoes(ministroId: string): Promise<Reclamacoes> {
  const [{ count: total }, { count: emTramitacao }, { count: liminaresPendentes }, { data: lista }] = await Promise.all([
    supabase.from("stf_reclamacoes").select("*", { count: "exact", head: true }).eq("ministro_id", ministroId),
    supabase
      .from("stf_reclamacoes")
      .select("*", { count: "exact", head: true })
      .eq("ministro_id", ministroId)
      .eq("em_tramitacao", true),
    supabase
      .from("stf_reclamacoes")
      .select("*", { count: "exact", head: true })
      .eq("ministro_id", ministroId)
      .eq("liminar_pendente", true),
    supabase
      .from("stf_reclamacoes")
      .select("processo, ramo_direito, procedencia, em_tramitacao, liminar_pendente, data_autuacao")
      .eq("ministro_id", ministroId)
      .order("data_autuacao", { ascending: false })
      .limit(40),
  ]);

  return {
    total: total ?? 0,
    emTramitacao: emTramitacao ?? 0,
    liminaresPendentes: liminaresPendentes ?? 0,
    lista: (lista ?? []) as Reclamacao[],
  };
}

/**
 * Próximos julgamentos — única fonte prospectiva do site: processos já
 * liberados para julgamento (Plenário ou Turmas), ainda não decididos.
 * Combina os dois painéis e os dois papéis possíveis do ministro no
 * mesmo processo (relator ou quem pediu vista), ordenado por data em
 * que entrou na pauta.
 */
export async function carregarProximosJulgamentos(ministroId: string): Promise<ProximoJulgamento[]> {
  const [
    { data: plenarioRelator },
    { data: plenarioVista },
    { data: turmasRelator },
    { data: turmasVista },
  ] = await Promise.all([
    supabase.from("stf_pauta_plenario").select("classe, numero, ramo_direito, data_pauta").eq("ministro_id", ministroId),
    supabase.from("stf_pauta_plenario").select("classe, numero, ramo_direito, data_pauta").eq("ministro_vista_id", ministroId),
    supabase.from("stf_pauta_turmas").select("classe, numero, orgao_julgador, ramo_direito, data_pauta").eq("ministro_id", ministroId),
    supabase.from("stf_pauta_turmas").select("classe, numero, orgao_julgador, ramo_direito, data_pauta").eq("ministro_vista_id", ministroId),
  ]);

  const lista: ProximoJulgamento[] = [
    ...(plenarioRelator ?? []).map((p) => ({ classe: p.classe, numero: p.numero, orgao: "Plenário", ramo_direito: p.ramo_direito, papel: "relator" as const, data_pauta: p.data_pauta })),
    ...(plenarioVista ?? []).map((p) => ({ classe: p.classe, numero: p.numero, orgao: "Plenário", ramo_direito: p.ramo_direito, papel: "vista" as const, data_pauta: p.data_pauta })),
    ...(turmasRelator ?? []).map((t) => ({ classe: t.classe, numero: t.numero, orgao: t.orgao_julgador ?? "Turma", ramo_direito: t.ramo_direito, papel: "relator" as const, data_pauta: t.data_pauta })),
    ...(turmasVista ?? []).map((t) => ({ classe: t.classe, numero: t.numero, orgao: t.orgao_julgador ?? "Turma", ramo_direito: t.ramo_direito, papel: "vista" as const, data_pauta: t.data_pauta })),
  ];

  return lista.sort((a, b) => (b.data_pauta ?? "").localeCompare(a.data_pauta ?? "")).slice(0, 40);
}

/**
 * Casos de omissão inconstitucional relatados pelo ministro — lista
 * curada e pequena (171 no total), nunca precisa de paginação.
 */
export async function carregarOmissaoInconstitucional(ministroId: string): Promise<CasoOmissaoInconstitucional[]> {
  const { data } = await supabase
    .from("stf_omissao_inconstitucional")
    .select("materia, processo, data_julgamento, tipo_omissao, ramo_direito, link_processo")
    .eq("ministro_id", ministroId)
    .order("data_julgamento", { ascending: false });
  return (data ?? []) as CasoOmissaoInconstitucional[];
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

type RespostaSimples = { data: unknown; error: { message: string } | null; status?: number };

/** Mesma disciplina de `comRetry`, para consultas sem `count` (ex.: `.maybeSingle()`). */
async function comRetrySimples<T extends RespostaSimples>(
  fabricaDaQuery: () => PromiseLike<T>,
  rotulo: string,
  tentativas = 5,
): Promise<T> {
  let ultimoErro = "";
  for (let i = 0; i < tentativas; i++) {
    const resultado = await fabricaDaQuery();
    if (!resultado.error) return resultado;
    ultimoErro = resultado.error.message || `HTTP ${resultado.status}`;
    if (i < tentativas - 1) await esperar(1500 * (i + 1));
  }
  throw new Error(`${rotulo}: falhou após ${tentativas} tentativas (${ultimoErro})`);
}

/**
 * Números do acervo, para a home, o JSON-LD e /metodologia.
 *
 * Não agrega stf_decisoes ao vivo. `count: "exact"` sem filtro nas 2,9M
 * linhas media ~10-11s, perto ou acima de um teto de ~8s que existe pra
 * QUALQUER papel — anon, authenticated ou service_role. Não é config por
 * papel (isso é `authenticator`, o login que o PostgREST usa antes do SET
 * ROLE, com seu próprio `statement_timeout`, que sobrevive à troca de papel).
 * Índice não resolve uma agregação sem filtro; o que ajuda é não rodar essa
 * conta aqui. `stf_estatisticas` (migration 0012) é recalculada pelo
 * pipeline de ingestão — que soma por ano em vez de contar a tabela inteira
 * de uma vez, ver `_contar_por_ano` em fetch_decisoes_qlik.py — uma vez por
 * dia. O build só faz um select por chave primária.
 */
export async function carregarResumo() {
  const { data, error } = await supabase
    .from("stf_estatisticas")
    .select("total_decisoes, total_temas_rg, sem_ministro, dados_ate")
    .eq("id", 1)
    .single();
  if (error || !data) throw new Error(`stf_estatisticas: ${error?.message ?? "sem linha"}`);

  return {
    totalDecisoes: data.total_decisoes,
    totalTemasRG: data.total_temas_rg,
    dadosAte: data.dados_ate,
    pctSemMinistro: data.total_decisoes > 0 ? (data.sem_ministro / data.total_decisoes) * 100 : null,
  };
}

export interface Snapshot {
  tabela: string;
  linhas: number;
  hash: string;
  fonte: string | null;
  criadoEm: string;
}

/**
 * AUD-11: histórico público de quando cada fonte foi ingerida pela última
 * vez — /metodologia#historico-de-dados. Diferente de carregarResumo(),
 * NÃO falha o build se a tabela estiver vazia ou a consulta der erro: esta
 * é uma seção suplementar (nem toda fonte grava snapshot ainda — só
 * stf_gastos/stf_gastos_servidores nesta rodada, ver
 * ingestao/stf/_snapshot.py), não um número central da home. Uma tabela
 * vazia (ainda sem nenhuma ingestão desde a migração) é estado válido, não
 * erro — a seção mostra "nenhum snapshot registrado ainda" nesse caso.
 *
 * Um snapshot por tabela (o mais recente): busca as últimas `porTabela *
 * limiteBusca` linhas ordenadas por data e mantém só a primeira ocorrência
 * de cada `tabela` — mais simples que uma window function, e nesta escala
 * (poucas dezenas de linhas por enquanto) não há necessidade de otimizar.
 */
export async function carregarUltimosSnapshots(limiteBusca = 50): Promise<Snapshot[]> {
  const { data, error } = await supabase
    .from("stf_snapshots")
    .select("tabela, linhas, hash, fonte, criado_em")
    .order("criado_em", { ascending: false })
    .limit(limiteBusca);

  if (error || !data) return [];

  const vistos = new Set<string>();
  const ultimos: Snapshot[] = [];
  for (const linha of data) {
    if (vistos.has(linha.tabela)) continue;
    vistos.add(linha.tabela);
    ultimos.push({
      tabela: linha.tabela,
      linhas: linha.linhas,
      hash: linha.hash,
      fonte: linha.fonte,
      criadoEm: linha.criado_em,
    });
  }
  return ultimos;
}
