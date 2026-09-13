import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { executarConsultaCancelavel } from "./consultaCancelavel";
import type { ResultadoConsulta } from "./consultaCancelavel";

export interface Tema {
  id: string;
  tema: number;
  titulo: string;
  tese: string | null;
  status: "pendente" | "julgado" | "sobrestado";
  data_reconh: string | null;
  data_julg: string | null;
  leading_case: string | null;
  processos_imp: number | null;
  destaque: boolean;
  relator_id: string | null;
}

export function useRepercussaoGeral(filtroStatus?: string, search?: string, limit = 50) {
  const [temas, setTemas] = useState<Tema[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  // Incrementado pelo botão "Tentar novamente" para reexecutar o efeito sem
  // duplicar filtroStatus/search/limit nas dependências.
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    const consultar = () => {
      let q = supabase
        .from("stf_repercussao_geral")
        .select("id, tema, titulo, tese, status, data_reconh, data_julg, leading_case, processos_imp, destaque, relator_id", { count: "exact" });

      if (filtroStatus && filtroStatus !== "todos") {
        q = q.eq("status", filtroStatus as Tema["status"]);
      }
      if (search && search.length > 2) q = q.ilike("titulo", `%${search}%`);

      return q.order("destaque", { ascending: false })
        .order("tema", { ascending: false })
        .limit(limit) as unknown as PromiseLike<ResultadoConsulta>;
    };

    // Toda a lógica de cancelamento/normalização de erro vive em
    // consultaCancelavel.js — ver esse arquivo para o porquê (achado AUD-01)
    // e tests/repercussao-geral-consulta.test.mjs para os cenários cobertos.
    return executarConsultaCancelavel(consultar, { setLoading, setErro, setTemas, setTotal });
  }, [filtroStatus, search, limit, tentativa]);

  const tentarNovamente = () => setTentativa((t) => t + 1);

  return { temas, loading, total, erro, tentarNovamente };
}
