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
export interface Ministro {
  id:               string;
  nome:             string;
  iniciais:         string;
  data_posse:       string;
  indicado_por:     string;
  partido_indicante:string;
  cargo_anterior:   string;
  aposentadoria:    string;
  ativo:            boolean;
  tags:             string[];
}

export const MINISTROS_SEED: Ministro[] = [
  {
    id: "am", nome: "Alexandre de Moraes", iniciais: "AM",
    data_posse: "22 mar 2017", indicado_por: "Michel Temer",
    partido_indicante: "PMDB", cargo_anterior: "Ministro da Justiça",
    aposentadoria: "2043", ativo: true,
    tags: [],
  },
  {
    id: "ef", nome: "Edson Fachin", iniciais: "EF",
    data_posse: "02 abr 2015", indicado_por: "Dilma Rousseff",
    partido_indicante: "PT", cargo_anterior: "Professor USP",
    aposentadoria: "2039", ativo: true,
    tags: [],
  },
  {
    id: "cl", nome: "Cármen Lúcia", iniciais: "CL",
    data_posse: "21 jun 2006", indicado_por: "Lula (1º mandato)",
    partido_indicante: "PT", cargo_anterior: "Procuradora MG",
    aposentadoria: "2030", ativo: true,
    tags: [],
  },
  {
    id: "dt", nome: "Dias Toffoli", iniciais: "DT",
    data_posse: "23 out 2009", indicado_por: "Lula (1º mandato)",
    partido_indicante: "PT", cargo_anterior: "Advogado-Geral da União",
    aposentadoria: "2038", ativo: true,
    tags: [],
  },
  {
    id: "lf", nome: "Luiz Fux", iniciais: "LF",
    data_posse: "03 mar 2011", indicado_por: "Dilma Rousseff",
    partido_indicante: "PT", cargo_anterior: "Ministro STJ",
    aposentadoria: "2038", ativo: true,
    tags: [],
  },
  {
    id: "gm", nome: "Gilmar Mendes", iniciais: "GM",
    data_posse: "20 jun 2002", indicado_por: "Fernando H. Cardoso",
    partido_indicante: "PSDB", cargo_anterior: "PGR / TCU",
    aposentadoria: "2030", ativo: true,
    tags: [],
  },
  {
    id: "cz", nome: "Cristiano Zanin", iniciais: "CZ",
    data_posse: "03 ago 2023", indicado_por: "Lula (3º mandato)",
    partido_indicante: "PT", cargo_anterior: "Advogado de defesa",
    aposentadoria: "2056", ativo: true,
    tags: [],
  },
  {
    id: "fd", nome: "Flávio Dino", iniciais: "FD",
    data_posse: "22 dez 2023", indicado_por: "Lula (3º mandato)",
    partido_indicante: "PT", cargo_anterior: "Ministro da Justiça",
    aposentadoria: "2049", ativo: true,
    tags: [],
  },
  {
    id: "nm", nome: "Nunes Marques", iniciais: "NM",
    data_posse: "05 nov 2020", indicado_por: "Jair Bolsonaro",
    partido_indicante: "PL", cargo_anterior: "Procurador Federal",
    aposentadoria: "2047", ativo: true,
    tags: [],
  },
  {
    id: "am2", nome: "André Mendonça", iniciais: "AM",
    data_posse: "16 dez 2021", indicado_por: "Jair Bolsonaro",
    partido_indicante: "PL", cargo_anterior: "Ministro da Justiça / AGU",
    aposentadoria: "2054", ativo: true,
    tags: [],
  },
];
