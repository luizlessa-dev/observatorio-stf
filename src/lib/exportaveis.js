/**
 * AUD-16: catálogo das tabelas exportáveis via /api/exportar — fonte única
 * usada tanto pelo endpoint quanto pela página /dados (dicionário de dados).
 *
 * Lista fechada de propósito: o Supabase deste projeto é compartilhado com
 * outros produtos (parlamentares, TSE, CVM etc.), todos com `anon` tendo
 * SELECT — um whitelist aberto por nome de tabela vindo da requisição
 * vazaria dado de projetos completamente alheios ao Observatório. Só as
 * tabelas abaixo, com as colunas abaixo, nunca "select *" nem nome de
 * tabela dinâmico. Ver tests/exportaveis.test.mjs, que trava essa garantia.
 *
 * stf_decisoes (~3M linhas) e stf_reclamacoes (~100 mil) entram com o
 * mesmo teto de paginação das demais — não têm tratamento especial, só o
 * volume real é maior. Ver LIMITE_MAXIMO.
 *
 * .js (não .ts) pelo mesmo motivo de buscaCasos.js: node --test importa
 * ".js" direto — não remapeia pra um ".ts", que é coisa do bundler do
 * Astro/Vercel. Ver exportaveis.d.ts pros tipos.
 */

export const LIMITE_PADRAO = 1000;
export const LIMITE_MAXIMO = 5000;

export const TABELAS_EXPORTAVEIS = [
  {
    slug: "ministros",
    tabela: "stf_ministros",
    rotulo: "Ministros",
    descricao: "Todos os ministros do STF, em exercício e históricos.",
    colunas: [
      { nome: "id", descricao: "Identificador interno do ministro (UUID)." },
      { nome: "nome", descricao: "Nome completo, como grafado na fonte." },
      { nome: "slug", descricao: "Identificador usado nas URLs do site (/ministros/<slug>). Calculado a partir do nome, não é uma coluna do banco." },
      { nome: "iniciais_exibicao", descricao: "Iniciais exibidas no site." },
      { nome: "data_posse", descricao: "Data de posse no STF." },
      { nome: "data_saida", descricao: "Data de saída do STF, quando histórico." },
      { nome: "indicado_por", descricao: "Presidente que indicou." },
      { nome: "partido_indicante", descricao: "Partido do presidente indicante à época da indicação." },
      { nome: "cargo_anterior", descricao: "Cargo ocupado imediatamente antes da indicação." },
      { nome: "aposentadoria_comp", descricao: "Data da aposentadoria compulsória (75 anos)." },
      { nome: "ativo", descricao: "Se o ministro está em exercício." },
    ],
    ordenarPor: [{ coluna: "data_posse", ascendente: false }],
  },
  {
    slug: "gastos",
    tabela: "stf_gastos",
    rotulo: "Gastos de gabinete",
    descricao: "Subsídio do ministro e custo total do gabinete, por mês.",
    colunas: [
      { nome: "id", descricao: "Identificador do registro (UUID)." },
      { nome: "ministro_id", descricao: "Referência a stf_ministros.id." },
      { nome: "ano", descricao: "Ano de referência." },
      { nome: "mes", descricao: "Mês de referência (1-12)." },
      { nome: "categoria", descricao: "\"subsidio_ministro\" ou \"custo_gabinete\"." },
      { nome: "descricao", descricao: "Descrição do que o valor representa, escrita pela ingestão." },
      { nome: "valor", descricao: "Valor em reais." },
      { nome: "fonte", descricao: "Endpoint de origem no portal de transparência do STF." },
    ],
    ordenarPor: [{ coluna: "ano", ascendente: false }, { coluna: "mes", ascendente: false }],
  },
  {
    slug: "gastos_servidores",
    tabela: "stf_gastos_servidores",
    rotulo: "Servidores do gabinete",
    descricao: "Remuneração bruta de cada servidor lotado em cada gabinete, por mês.",
    colunas: [
      { nome: "id", descricao: "Identificador do registro (UUID)." },
      { nome: "ministro_id", descricao: "Referência a stf_ministros.id — gabinete ao qual o servidor está lotado." },
      { nome: "ano", descricao: "Ano de referência." },
      { nome: "mes", descricao: "Mês de referência (1-12)." },
      { nome: "nome", descricao: "Nome do servidor, como consta na fonte." },
      { nome: "cargo_efetivo", descricao: "Cargo efetivo, quando houver." },
      { nome: "cargo_comissionado", descricao: "Cargo comissionado, quando houver." },
      { nome: "funcao", descricao: "Função, quando houver." },
      { nome: "situacao_funcional", descricao: "Situação funcional." },
      { nome: "remuneracao_bruta", descricao: "Remuneração bruta em reais." },
      { nome: "remuneracao_liquida", descricao: "Remuneração líquida em reais, quando disponível." },
      { nome: "fonte", descricao: "Endpoint de origem no portal de transparência do STF." },
    ],
    ordenarPor: [{ coluna: "ano", ascendente: false }, { coluna: "mes", ascendente: false }, { coluna: "nome", ascendente: true }],
  },
  {
    slug: "passagens",
    tabela: "stf_passagens",
    rotulo: "Passagens aéreas",
    descricao: "Passagens aéreas a serviço, por gabinete, desde 2017.",
    colunas: [
      { nome: "id", descricao: "Identificador do registro (UUID)." },
      { nome: "ministro_id", descricao: "Referência a stf_ministros.id — gabinete responsável." },
      { nome: "nome", descricao: "Nome de quem viajou (pode ser o próprio ministro ou alguém do gabinete)." },
      { nome: "cargo", descricao: "Cargo de quem viajou." },
      { nome: "motivo", descricao: "Motivo declarado da viagem." },
      { nome: "ano", descricao: "Ano da viagem." },
      { nome: "mes", descricao: "Mês da viagem." },
      { nome: "data_ida", descricao: "Data de ida." },
      { nome: "data_volta", descricao: "Data de volta." },
      { nome: "tipo_passagem", descricao: "Tipo de passagem." },
      { nome: "trecho", descricao: "Trecho voado." },
      { nome: "custo_efetivo", descricao: "Custo efetivo em reais." },
      { nome: "fonte", descricao: "Endpoint de origem no portal de transparência do STF." },
    ],
    ordenarPor: [{ coluna: "ano", ascendente: false }, { coluna: "mes", ascendente: false }],
  },
  {
    slug: "diarias",
    tabela: "stf_diarias",
    rotulo: "Diárias",
    descricao: "Diárias pagas a serviço, por gabinete, desde 2017.",
    colunas: [
      { nome: "id", descricao: "Identificador do registro (UUID)." },
      { nome: "ministro_id", descricao: "Referência a stf_ministros.id — gabinete responsável." },
      { nome: "nome", descricao: "Nome de quem recebeu a diária." },
      { nome: "cargo", descricao: "Cargo de quem recebeu." },
      { nome: "tipo_diaria", descricao: "Tipo de diária." },
      { nome: "motivo", descricao: "Motivo declarado." },
      { nome: "quantidade", descricao: "Quantidade de diárias." },
      { nome: "valor_total", descricao: "Valor total em reais." },
      { nome: "ano", descricao: "Ano de referência." },
      { nome: "mes", descricao: "Mês de referência." },
      { nome: "fonte", descricao: "Endpoint de origem no portal de transparência do STF." },
    ],
    ordenarPor: [{ coluna: "ano", ascendente: false }, { coluna: "mes", ascendente: false }],
  },
  {
    slug: "controle_concentrado",
    tabela: "stf_controle_concentrado",
    rotulo: "Controle concentrado",
    descricao: "ADI/ADC/ADPF/ADO desde 1997, por relator.",
    colunas: [
      { nome: "id", descricao: "Identificador do registro (UUID)." },
      { nome: "processo", descricao: "Número do processo." },
      { nome: "link_processo", descricao: "Link para o processo no portal do STF." },
      { nome: "ministro_id", descricao: "Referência a stf_ministros.id — relator atual." },
      { nome: "ramo_direito", descricao: "Ramo do direito classificado pelo STF." },
      { nome: "assunto", descricao: "Assunto do processo." },
      { nome: "data_autuacao", descricao: "Data de autuação." },
      { nome: "em_tramitacao", descricao: "Se o processo ainda está em tramitação." },
      { nome: "situacao_processual", descricao: "Situação processual atual." },
    ],
    ordenarPor: [{ coluna: "data_autuacao", ascendente: false }],
  },
  {
    slug: "reclamacoes",
    tabela: "stf_reclamacoes",
    rotulo: "Reclamações",
    descricao: "Reclamações constitucionais, por relator — maior volume individual de processo do tribunal.",
    colunas: [
      { nome: "id", descricao: "Identificador do registro (UUID)." },
      { nome: "processo", descricao: "Número do processo." },
      { nome: "ministro_id", descricao: "Referência a stf_ministros.id — relator atual." },
      { nome: "procedencia", descricao: "Procedência da reclamação, quando julgada." },
      { nome: "ramo_direito", descricao: "Ramo do direito classificado pelo STF." },
      { nome: "data_autuacao", descricao: "Data de autuação." },
      { nome: "em_tramitacao", descricao: "Se a reclamação ainda está em tramitação." },
      { nome: "liminar_pendente", descricao: "Se há liminar pendente de decisão." },
    ],
    ordenarPor: [{ coluna: "data_autuacao", ascendente: false }],
  },
  {
    slug: "pauta_plenario",
    tabela: "stf_pauta_plenario",
    rotulo: "Pauta do Plenário",
    descricao: "Processos já liberados para julgamento no Plenário, ainda não decididos.",
    colunas: [
      { nome: "id", descricao: "Identificador do registro (UUID)." },
      { nome: "classe", descricao: "Classe processual." },
      { nome: "numero", descricao: "Número do processo dentro da classe." },
      { nome: "ministro_id", descricao: "Referência a stf_ministros.id — relator." },
      { nome: "ministro_vista_id", descricao: "Referência a stf_ministros.id — quem pediu vista, quando houver." },
      { nome: "ramo_direito", descricao: "Ramo do direito classificado pelo STF." },
      { nome: "data_autuacao", descricao: "Data de autuação." },
      { nome: "pedido_vista", descricao: "Se há pedido de vista em aberto." },
      { nome: "suspenso", descricao: "Se o julgamento está suspenso." },
      { nome: "data_pauta", descricao: "Data em que entrou na pauta." },
    ],
    ordenarPor: [{ coluna: "data_pauta", ascendente: false }],
  },
  {
    slug: "pauta_turmas",
    tabela: "stf_pauta_turmas",
    rotulo: "Pauta das Turmas",
    descricao: "Processos já liberados para julgamento nas Turmas, ainda não decididos.",
    colunas: [
      { nome: "id", descricao: "Identificador do registro (UUID)." },
      { nome: "classe", descricao: "Classe processual." },
      { nome: "numero", descricao: "Número do processo dentro da classe." },
      { nome: "orgao_julgador", descricao: "Primeira ou Segunda Turma." },
      { nome: "ministro_id", descricao: "Referência a stf_ministros.id — relator." },
      { nome: "ministro_vista_id", descricao: "Referência a stf_ministros.id — quem pediu vista, quando houver." },
      { nome: "ramo_direito", descricao: "Ramo do direito classificado pelo STF." },
      { nome: "data_autuacao", descricao: "Data de autuação." },
      { nome: "pedido_vista", descricao: "Se há pedido de vista em aberto." },
      { nome: "suspenso", descricao: "Se o julgamento está suspenso." },
      { nome: "data_pauta", descricao: "Data em que entrou na pauta." },
    ],
    ordenarPor: [{ coluna: "data_pauta", ascendente: false }],
  },
  {
    slug: "omissao_inconstitucional",
    tabela: "stf_omissao_inconstitucional",
    rotulo: "Omissão inconstitucional",
    descricao: "Lista curada de julgados em que o STF reconheceu falta de lei, política pública ou ato administrativo exigido pela Constituição.",
    colunas: [
      { nome: "id", descricao: "Identificador do registro (UUID)." },
      { nome: "materia", descricao: "Matéria julgada." },
      { nome: "processo", descricao: "Número do processo." },
      { nome: "ministro_id", descricao: "Referência a stf_ministros.id — relator." },
      { nome: "tipo_omissao", descricao: "Tipo de omissão reconhecida." },
      { nome: "ramo_direito", descricao: "Ramo do direito classificado pelo STF." },
      { nome: "data_julgamento", descricao: "Data do julgamento." },
      { nome: "link_processo", descricao: "Link para o processo no portal do STF." },
    ],
    ordenarPor: [{ coluna: "data_julgamento", ascendente: false }],
  },
  {
    slug: "repercussao_geral",
    tabela: "stf_repercussao_geral",
    rotulo: "Repercussão geral",
    descricao: "Temas de repercussão geral reconhecidos pelo STF.",
    colunas: [
      { nome: "id", descricao: "Identificador do registro (UUID)." },
      { nome: "tema", descricao: "Número do tema de repercussão geral." },
      { nome: "titulo", descricao: "Título do tema." },
      { nome: "tese", descricao: "Tese fixada, quando já julgado." },
      { nome: "status", descricao: "\"pendente\", \"julgado\" ou \"sobrestado\"." },
      { nome: "data_reconh", descricao: "Data de reconhecimento da repercussão geral." },
      { nome: "data_julg", descricao: "Data do julgamento de mérito, quando houver." },
      { nome: "processos_imp", descricao: "Estimativa de processos sobrestados aguardando este tema." },
      { nome: "relator_id", descricao: "Referência a stf_ministros.id — relator." },
      { nome: "leading_case", descricao: "Processo paradigma do tema." },
    ],
    ordenarPor: [{ coluna: "tema", ascendente: false }],
  },
  {
    slug: "presidencias",
    tabela: "stf_presidencias",
    rotulo: "Presidências e vice-presidências",
    descricao: "Histórico de quem presidiu e vice-presidiu o STF.",
    colunas: [
      { nome: "id", descricao: "Identificador do registro (UUID)." },
      { nome: "ministro_id", descricao: "Referência a stf_ministros.id." },
      { nome: "cargo", descricao: "\"presidente\" ou \"vice_presidente\"." },
      { nome: "inicio", descricao: "Data de início no cargo." },
      { nome: "fim", descricao: "Data de fim no cargo — vazio quando em exercício." },
      { nome: "fonte", descricao: "Fonte do registro." },
    ],
    ordenarPor: [{ coluna: "inicio", ascendente: false }],
  },
  {
    slug: "decisoes",
    tabela: "stf_decisoes",
    rotulo: "Decisões",
    descricao: "Decisões monocráticas e colegiadas do STF — a maior tabela do acervo (~3 milhões de linhas). Sempre paginada; use offset para percorrer o total.",
    colunas: [
      { nome: "id", descricao: "Identificador do registro (UUID)." },
      { nome: "ministro_id", descricao: "Referência a stf_ministros.id, quando resolvido para um nome." },
      { nome: "ministro_resolucao", descricao: "Como ministro_id foi atribuído: \"nome\", \"presidencia\", \"nao_aplicavel\" ou \"desconhecido\"." },
      { nome: "processo", descricao: "Número do processo." },
      { nome: "tipo_origem", descricao: "\"MONOCRÁTICA\" ou \"COLEGIADA\"." },
      { nome: "tipo_decisao", descricao: "Tipo de decisão." },
      { nome: "andamento_bruto", descricao: "Texto literal do andamento, como publicado pelo STF." },
      { nome: "data_decisao", descricao: "Data da decisão." },
      { nome: "ano_decisao", descricao: "Ano da decisão." },
      { nome: "orgao_julgador", descricao: "Órgão julgador." },
      { nome: "assunto", descricao: "Assunto do processo." },
      { nome: "sentido", descricao: "Sentido da decisão, quando classificado." },
    ],
    ordenarPor: [{ coluna: "data_decisao", ascendente: false }, { coluna: "id", ascendente: true }],
  },
];

/** @param {string} slug */
export function encontrarTabelaExportavel(slug) {
  return TABELAS_EXPORTAVEIS.find((t) => t.slug === slug);
}
