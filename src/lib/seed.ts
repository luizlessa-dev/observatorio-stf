// Fase C0 (contenção de integridade, 2026-07-26): os valores de `tags` foram
// esvaziados porque são classificações pessoais/ideológicas sem metodologia
// documentada. O código deste arquivo é bundlado no cliente (SPA), então
// apenas suspender a renderização na UI não bastava — os valores continuavam
// extraíveis do JS público. Ver docs/auditoria-integridade-dados.md.
//
// Fase C1 (contenção residual, 2026-07-26): os 6 campos de score ideológico
// (score_geral + 5 dimensões) foram removidos do tipo `Ministro` e dos dados
// de seed pelo mesmo motivo — eram valores fabricados embutidos no bundle
// público. Este tipo agora representa apenas o modelo PÚBLICO do ministro
// (dados biográficos/institucionais verificáveis). Scores permanecem
// armazenados no banco, acessíveis apenas a papéis internos.
//
// Onda 1 (2026-08-17): este seed é o que o visitante vê nos milissegundos
// antes de o Supabase responder — e estava errado. Sete das dez datas de
// aposentadoria compulsória tinham o ano incorreto (Fux constava 2038 quando
// é 2028), e as posses de Fachin e Dino estavam erradas. Todos os valores
// abaixo foram conferidos em 2026-08-17 contra as páginas "Dados e Datas" do
// portal do STF (posse) e o Wikidata cruzado com Poder360/CNN/Migalhas
// (nascimento → aposentadoria).
//
// REGRA: `aposentadoria` aqui é nascimento + 75 anos. No banco isso é
// derivado por trigger (migration 0004). Este arquivo é a única cópia
// digitada à mão que sobra — ao corrigir um ministro, corrija nos dois.
export interface Ministro {
  id:               string;
  nome:             string;
  iniciais:         string;
  iniciais_exibicao:string;
  data_posse:       string;
  indicado_por:     string;
  indicado_por_curto:string;
  partido_indicante:string;
  cargo_anterior:   string;
  aposentadoria:    string;
  ativo:            boolean;
  tags:             string[];
}

export const MINISTROS_SEED: Ministro[] = [
  {
    id: "gm", nome: "Gilmar Mendes", iniciais: "GM", iniciais_exibicao: "GM",
    data_posse: "20 jun 2002", indicado_por: "Fernando H. Cardoso", indicado_por_curto: "FHC",
    partido_indicante: "PSDB", cargo_anterior: "Advogado-Geral da União",
    aposentadoria: "30 dez 2030", ativo: true,
    tags: [],
  },
  {
    id: "cl", nome: "Cármen Lúcia", iniciais: "CL", iniciais_exibicao: "CL",
    data_posse: "21 jun 2006", indicado_por: "Lula (1º mandato)", indicado_por_curto: "Lula",
    partido_indicante: "PT", cargo_anterior: "Procuradora MG",
    aposentadoria: "19 abr 2029", ativo: true,
    tags: [],
  },
  {
    id: "dt", nome: "Dias Toffoli", iniciais: "DT", iniciais_exibicao: "DT",
    data_posse: "23 out 2009", indicado_por: "Lula (1º mandato)", indicado_por_curto: "Lula",
    partido_indicante: "PT", cargo_anterior: "Advogado-Geral da União",
    aposentadoria: "15 nov 2042", ativo: true,
    tags: [],
  },
  {
    id: "lf", nome: "Luiz Fux", iniciais: "LF", iniciais_exibicao: "LF",
    data_posse: "03 mar 2011", indicado_por: "Dilma Rousseff", indicado_por_curto: "Dilma",
    partido_indicante: "PT", cargo_anterior: "Ministro STJ",
    aposentadoria: "26 abr 2028", ativo: true,
    tags: [],
  },
  {
    id: "ef", nome: "Edson Fachin", iniciais: "EF", iniciais_exibicao: "EF",
    data_posse: "16 jun 2015", indicado_por: "Dilma Rousseff", indicado_por_curto: "Dilma",
    partido_indicante: "PT", cargo_anterior: "Professor da UFPR / Procurador do Estado do PR",
    aposentadoria: "08 fev 2033", ativo: true,
    tags: [],
  },
  {
    id: "am", nome: "Alexandre de Moraes", iniciais: "AM", iniciais_exibicao: "AM",
    data_posse: "22 mar 2017", indicado_por: "Michel Temer", indicado_por_curto: "Temer",
    partido_indicante: "PMDB", cargo_anterior: "Ministro da Justiça",
    aposentadoria: "13 dez 2043", ativo: true,
    tags: [],
  },
  {
    id: "nm", nome: "Nunes Marques", iniciais: "NM", iniciais_exibicao: "NM",
    data_posse: "05 nov 2020", indicado_por: "Jair Bolsonaro", indicado_por_curto: "Bolsonaro",
    partido_indicante: "PL", cargo_anterior: "Desembargador do TRF-1",
    aposentadoria: "16 mai 2047", ativo: true,
    tags: [],
  },
  {
    id: "am2", nome: "André Mendonça", iniciais: "AM2", iniciais_exibicao: "AM",
    data_posse: "16 dez 2021", indicado_por: "Jair Bolsonaro", indicado_por_curto: "Bolsonaro",
    partido_indicante: "PL", cargo_anterior: "Ministro da Justiça / AGU",
    aposentadoria: "27 dez 2047", ativo: true,
    tags: [],
  },
  {
    id: "cz", nome: "Cristiano Zanin", iniciais: "CZ", iniciais_exibicao: "CZ",
    data_posse: "03 ago 2023", indicado_por: "Lula (3º mandato)", indicado_por_curto: "Lula",
    partido_indicante: "PT", cargo_anterior: "Advogado de defesa",
    aposentadoria: "15 nov 2050", ativo: true,
    tags: [],
  },
  {
    id: "fd", nome: "Flávio Dino", iniciais: "FD", iniciais_exibicao: "FD",
    data_posse: "22 fev 2024", indicado_por: "Lula (3º mandato)", indicado_por_curto: "Lula",
    partido_indicante: "PT", cargo_anterior: "Ministro da Justiça",
    aposentadoria: "30 abr 2043", ativo: true,
    tags: [],
  },
];
