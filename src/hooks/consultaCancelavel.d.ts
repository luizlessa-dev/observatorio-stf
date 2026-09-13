import type { Tema } from "./useRepercussaoGeral";

export interface ResultadoConsulta {
  data: Tema[] | null;
  count: number | null;
  error: { message: string } | null;
}

export interface DepsConsultaCancelavel {
  setLoading: (v: boolean) => void;
  setErro: (v: string | null) => void;
  setTemas: (v: Tema[]) => void;
  setTotal: (v: number) => void;
}

export function executarConsultaCancelavel(
  consultar: () => PromiseLike<ResultadoConsulta>,
  deps: DepsConsultaCancelavel,
): () => void;
