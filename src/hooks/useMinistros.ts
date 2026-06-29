import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { type Ministro, MINISTROS_SEED } from "../lib/seed";

const MESES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

function formatarDataPosse(iso: string): string {
  // "2002-06-20" → "20 jun 2002"
  const [ano, mes, dia] = iso.split("-");
  return `${dia} ${MESES[parseInt(mes, 10) - 1]} ${ano}`;
}

// Mapeia a linha do banco para o tipo Ministro usado no front
function rowToMinistro(row: Record<string, unknown>, seed?: Ministro): Ministro {
  const seedMatch = MINISTROS_SEED.find((m) => m.nome === row.nome) ?? seed;
  const rawData = String(row.data_posse ?? seedMatch?.data_posse ?? "");
  const dataPosse = rawData.match(/^\d{4}-\d{2}-\d{2}$/) ? formatarDataPosse(rawData) : rawData;
  return {
    id:                String(row.id ?? seedMatch?.id ?? ""),
    nome:              String(row.nome),
    iniciais:          String(row.iniciais),
    data_posse:        dataPosse,
    indicado_por:      String(row.indicado_por),
    partido_indicante: String(row.partido_indicante ?? seedMatch?.partido_indicante ?? ""),
    cargo_anterior:    String(row.cargo_anterior ?? seedMatch?.cargo_anterior ?? ""),
    aposentadoria:     String(row.aposentadoria_comp ?? seedMatch?.aposentadoria ?? ""),
    ativo:             Boolean(row.ativo),
    score_geral:       Number(row.score_geral ?? 5),
    score_direitos:    Number(row.score_direitos_civis ?? seedMatch?.score_direitos ?? 5),
    score_imprensa:    Number(row.score_lib_imprensa ?? seedMatch?.score_imprensa ?? 5),
    score_seguranca:   Number(row.score_seg_publica ?? seedMatch?.score_seguranca ?? 5),
    score_economico:   Number(row.score_economico ?? seedMatch?.score_economico ?? 5),
    score_democracia:  Number(row.score_democracia ?? seedMatch?.score_democracia ?? 5),
    tags:              seedMatch?.tags ?? [],
  };
}

export function useMinistros() {
  const [ministros, setMinistros] = useState<Ministro[]>(MINISTROS_SEED);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("stf_ministros")
      .select("*")
      .eq("ativo", true)
      .order("data_posse", { ascending: true })
      .then(({ data, error: err }) => {
        if (err) {
          setError(err.message);
        } else if (data && data.length > 0) {
          setMinistros(data.map((row) => rowToMinistro(row as Record<string, unknown>)));
        }
        setLoading(false);
      });
  }, []);

  return { ministros, loading, error };
}
