import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export interface Votacao {
  id: string;
  processo: string;
  classe: string;
  data: string;
  ementa: string;
  voto: "favor" | "contra" | "abstencao" | "ausente";
  resultado: "procedente" | "improcedente" | "parcial" | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function useVotacoes(ministroId: string, limit = 20) {
  const [votacoes, setVotacoes] = useState<Votacao[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!UUID_RE.test(ministroId)) return;   // seed id — aguarda UUID real

    setLoading(true);
    supabase
      .from("stf_votacoes")
      .select("id, processo, classe, data, ementa, voto, resultado")
      .eq("ministro_id", ministroId)
      .order("data", { ascending: false })
      .limit(limit)
      .then(({ data }) => {
        setVotacoes((data as Votacao[]) ?? []);
        setLoading(false);
      });
  }, [ministroId, limit]);

  return { votacoes, loading };
}
