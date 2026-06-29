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
  score_geral:      number;
  score_direitos:   number;
  score_imprensa:   number;
  score_seguranca:  number;
  score_economico:  number;
  score_democracia: number;
  tags:             string[];
}

export const MINISTROS_SEED: Ministro[] = [
  {
    id: "am", nome: "Alexandre de Moraes", iniciais: "AM",
    data_posse: "22 mar 2017", indicado_por: "Michel Temer",
    partido_indicante: "PMDB", cargo_anterior: "Ministro da Justiça",
    aposentadoria: "2043", ativo: true,
    score_geral: 6.6, score_direitos: 7.2, score_imprensa: 5.1,
    score_seguranca: 3.8, score_economico: 5.5, score_democracia: 8.4,
    tags: ["Democracia digital", "Seg. pública"],
  },
  {
    id: "ef", nome: "Edson Fachin", iniciais: "EF",
    data_posse: "02 abr 2015", indicado_por: "Dilma Rousseff",
    partido_indicante: "PT", cargo_anterior: "Professor USP",
    aposentadoria: "2039", ativo: true,
    score_geral: 8.2, score_direitos: 9.1, score_imprensa: 8.0,
    score_seguranca: 8.5, score_economico: 6.0, score_democracia: 9.2,
    tags: ["Garantismo", "Dir. humanos"],
  },
  {
    id: "cl", nome: "Cármen Lúcia", iniciais: "CL",
    data_posse: "21 jun 2006", indicado_por: "Lula (1º mandato)",
    partido_indicante: "PT", cargo_anterior: "Procuradora MG",
    aposentadoria: "2030", ativo: true,
    score_geral: 6.0, score_direitos: 7.0, score_imprensa: 6.5,
    score_seguranca: 5.0, score_economico: 5.5, score_democracia: 6.2,
    tags: [],
  },
  {
    id: "dt", nome: "Dias Toffoli", iniciais: "DT",
    data_posse: "23 out 2009", indicado_por: "Lula (1º mandato)",
    partido_indicante: "PT", cargo_anterior: "Advogado-Geral da União",
    aposentadoria: "2038", ativo: true,
    score_geral: 3.0, score_direitos: 4.0, score_imprensa: 3.5,
    score_seguranca: 2.8, score_economico: 3.2, score_democracia: 2.5,
    tags: ["Conservador atual"],
  },
  {
    id: "lf", nome: "Luiz Fux", iniciais: "LF",
    data_posse: "03 mar 2011", indicado_por: "Dilma Rousseff",
    partido_indicante: "PT", cargo_anterior: "Ministro STJ",
    aposentadoria: "2038", ativo: true,
    score_geral: 4.4, score_direitos: 5.0, score_imprensa: 4.5,
    score_seguranca: 3.5, score_economico: 4.8, score_democracia: 4.2,
    tags: [],
  },
  {
    id: "gm", nome: "Gilmar Mendes", iniciais: "GM",
    data_posse: "20 jun 2002", indicado_por: "Fernando H. Cardoso",
    partido_indicante: "PSDB", cargo_anterior: "PGR / TCU",
    aposentadoria: "2030", ativo: true,
    score_geral: 3.6, score_direitos: 4.5, score_imprensa: 4.0,
    score_seguranca: 3.0, score_economico: 5.5, score_democracia: 2.8,
    tags: ["Mercado", "Garantismo"],
  },
  {
    id: "cz", nome: "Cristiano Zanin", iniciais: "CZ",
    data_posse: "03 ago 2023", indicado_por: "Lula (3º mandato)",
    partido_indicante: "PT", cargo_anterior: "Advogado de defesa",
    aposentadoria: "2056", ativo: true,
    score_geral: 6.5, score_direitos: 7.0, score_imprensa: 6.5,
    score_seguranca: 5.5, score_economico: 6.0, score_democracia: 7.5,
    tags: [],
  },
  {
    id: "fd", nome: "Flávio Dino", iniciais: "FD",
    data_posse: "22 dez 2023", indicado_por: "Lula (3º mandato)",
    partido_indicante: "PT", cargo_anterior: "Ministro da Justiça",
    aposentadoria: "2049", ativo: true,
    score_geral: 7.0, score_direitos: 8.0, score_imprensa: 7.0,
    score_seguranca: 6.0, score_economico: 6.5, score_democracia: 7.5,
    tags: [],
  },
  {
    id: "nm", nome: "Nunes Marques", iniciais: "NM",
    data_posse: "05 nov 2020", indicado_por: "Jair Bolsonaro",
    partido_indicante: "PL", cargo_anterior: "Procurador Federal",
    aposentadoria: "2047", ativo: true,
    score_geral: 2.0, score_direitos: 1.5, score_imprensa: 2.5,
    score_seguranca: 2.0, score_economico: 3.0, score_democracia: 1.5,
    tags: ["Religioso", "Anti-aborto"],
  },
  {
    id: "am2", nome: "André Mendonça", iniciais: "AM",
    data_posse: "16 dez 2021", indicado_por: "Jair Bolsonaro",
    partido_indicante: "PL", cargo_anterior: "Ministro da Justiça / AGU",
    aposentadoria: "2054", ativo: true,
    score_geral: 2.5, score_direitos: 2.0, score_imprensa: 3.0,
    score_seguranca: 2.5, score_economico: 3.5, score_democracia: 1.8,
    tags: ["Evangélico"],
  },
];
