export interface ColunaExportavel {
  nome: string;
  descricao: string;
}

export interface TabelaExportavel {
  slug: string;
  tabela: string;
  rotulo: string;
  descricao: string;
  colunas: ColunaExportavel[];
  ordenarPor: { coluna: string; ascendente: boolean }[];
}

export const LIMITE_PADRAO: number;
export const LIMITE_MAXIMO: number;
export const TABELAS_EXPORTAVEIS: TabelaExportavel[];
export function encontrarTabelaExportavel(slug: string): TabelaExportavel | undefined;
