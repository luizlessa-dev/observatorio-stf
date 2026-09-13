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

export interface OpcoesConsultaCancelavel {
  /** Força o modo de log técnico (uso em testes). Padrão: `import.meta.env.DEV`. */
  dev?: boolean;
}

export function executarConsultaCancelavel(
  consultar: () => PromiseLike<ResultadoConsulta>,
  deps: DepsConsultaCancelavel,
  opcoes?: OpcoesConsultaCancelavel,
): () => void;
