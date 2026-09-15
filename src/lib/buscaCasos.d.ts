export interface CasoBuscavel {
  slug: string;
  titulo: string;
  resumo: string;
  status: string;
  ministros: string[];
}

export function normalizar(s: string): string;
export function buscarCasos<T extends CasoBuscavel>(casos: T[], termo: string): T[];
