export function buscaEstaAplicada(search: string): boolean;

export function descreverContagem(
  carregados: number,
  total: number,
  filtroStatus: string,
  buscaAplicada: boolean,
): string;

export function deveMostrarCarregarMais(estado: {
  erro: string | null;
  loading: boolean;
  carregados: number;
  total: number;
}): boolean;
