import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export interface Gasto {
  id: string;
  categoria: "custo_gabinete" | "subsidio_ministro";
  descricao: string;
  valor: number;
  mes: number;
  ano: number;
  fonte: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function useGastos(ministroId: string) {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!UUID_RE.test(ministroId)) return;

    setLoading(true);
    supabase
      .from("stf_gastos")
      .select("id, categoria, descricao, valor, mes, ano, fonte")
      .eq("ministro_id", ministroId)
      .order("ano", { ascending: false })
      .order("mes", { ascending: false })
      .then(({ data }) => {
        setGastos((data as Gasto[]) ?? []);
        setLoading(false);
      });
  }, [ministroId]);

  return { gastos, loading };
}
