import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

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

  useEffect(() => {
    setLoading(true);
    let q = supabase
      .from("stf_repercussao_geral")
      .select("id, tema, titulo, tese, status, data_reconh, data_julg, leading_case, processos_imp, destaque, relator_id", { count: "exact" });

    if (filtroStatus && filtroStatus !== "todos") q = q.eq("status", filtroStatus);
    if (search && search.length > 2) q = q.ilike("titulo", `%${search}%`);

    q.order("destaque", { ascending: false })
     .order("tema", { ascending: false })
     .limit(limit)
     .then(({ data, count }) => {
       setTemas((data as Tema[]) ?? []);
       setTotal(count ?? 0);
       setLoading(false);
     });
  }, [filtroStatus, search, limit]);

  return { temas, loading, total };
}
