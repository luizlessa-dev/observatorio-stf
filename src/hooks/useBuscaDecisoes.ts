import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export interface DecisaoBusca {
  id: string;
  processo: string;
  data_decisao: string;
  andamento_bruto: string;
  tipo_origem: "MONOCRÁTICA" | "COLEGIADA";
  assunto: string | null;
  ministro_id: string | null;
}

/**
 * Busca client-side em stf_decisoes (~3 milhões de linhas).
 *
 * IMPORTANTE — por que é busca EXATA, não por prefixo: testei via EXPLAIN
 * ANALYZE antes de escrever isto. `processo ilike 'HC 276824%'` (ou mesmo
 * `like`, case-sensitive) faz Seq Scan — o índice
 * stf_decisoes_processo_idx é um btree comum, que este banco não consegue
 * usar para casar padrão com curinga à direita nesta collation (precisaria
 * de um índice com text_pattern_ops para isso). Resultado real medido:
 * 15-16 segundos e timeout da statement_timeout do PostgREST. Só
 * `processo = 'HC 276824'` usa o índice (Index Scan, ~3ms). Por isso a
 * busca aqui exige o número completo do processo — nunca ilike/like em
 * `processo`, e nunca em `assunto`/`andamento_bruto` (sem índice nenhum).
 *
 * Sem `processo` e sem `ministroId`, não dispara consulta nenhuma — listar
 * "as últimas decisões do STF" sem filtro não é o que essa tela promete, e
 * evitaria o usuário perceber que a busca exige ao menos um critério.
 */
export function useBuscaDecisoes(processoBruto: string, ministroId: string, limit = 30) {
  const [decisoes, setDecisoes] = useState<DecisaoBusca[]>([]);
  const [loading, setLoading] = useState(false);
  const [buscou, setBuscou] = useState(false);

  // Normaliza "hc276824" / "hc 276824" / "HC  276824" para "HC 276824" —
  // tem que bater exatamente com o formato salvo em `processo`.
  const processo = processoBruto
    .trim()
    .toUpperCase()
    .replace(/^([A-ZÀ-Ú]+)\s*(\d)/, "$1 $2");

  useEffect(() => {
    if (!processo && !ministroId) {
      setDecisoes([]);
      setBuscou(false);
      return;
    }

    setLoading(true);
    setBuscou(true);
    let q = supabase
      .from("stf_decisoes")
      .select("id, processo, data_decisao, andamento_bruto, tipo_origem, assunto, ministro_id");

    if (processo) q = q.eq("processo", processo);
    if (ministroId) q = q.eq("ministro_id", ministroId);

    const chamada = q.order("data_decisao", { ascending: false }).limit(limit);

    let cancelado = false;
    chamada.then(({ data, error }) => {
      if (cancelado) return;
      if (error) {
        setDecisoes([]);
      } else {
        setDecisoes((data as DecisaoBusca[]) ?? []);
      }
      setLoading(false);
    });

    return () => { cancelado = true; };
  }, [processo, ministroId, limit]);

  return { decisoes, loading, buscou, processoNormalizado: processo };
}
