import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export interface DecisaoBuscaTexto {
  id: string;
  processo: string;
  data_decisao: string;
  andamento_bruto: string;
  assunto: string | null;
  ministro_id: string | null;
}

// AUD-13: busca por palavra-chave em assunto/andamento/processo, viável só
// depois da migração que criou stf_decisoes_busca_texto_idx (índice GIN
// funcional sobre to_tsvector) e a view stf_decisoes_busca, que expõe essa
// expressão como uma coluna de verdade — é o que permite o
// `.textSearch()` do supabase-js chegar até o índice via PostgREST (que só
// filtra em colunas/views nomeadas, não em expressões arbitrárias).
//
// Sem view+índice, isso faria Seq Scan nas ~3 milhões de linhas de
// stf_decisoes e estouraria o statement_timeout do PostgREST — mesma classe
// de problema documentada em useBuscaDecisoes.ts para busca por prefixo.
//
// Limiar de 3 caracteres: mesmo critério usado em useRepercussaoGeral (não
// tem nada de especial em stf_decisoes, só consistência de produto — buscas
// de 1-2 letras devolveriam ruído demais pra serem úteis).
export function useBuscaTextoDecisoes(termo: string, limit = 10) {
  const [decisoes, setDecisoes] = useState<DecisaoBuscaTexto[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(false);

  const termoAplicavel = termo.trim().length > 2 ? termo.trim() : "";

  useEffect(() => {
    if (!termoAplicavel) {
      setDecisoes([]);
      setLoading(false);
      setErro(false);
      return;
    }

    let cancelado = false;
    setLoading(true);
    setErro(false);

    supabase
      .from("stf_decisoes_busca")
      .select("id, processo, data_decisao, andamento_bruto, assunto, ministro_id")
      .textSearch("busca_texto", termoAplicavel, { type: "websearch", config: "portuguese" })
      .order("data_decisao", { ascending: false })
      .limit(limit)
      .then(({ data, error }) => {
        if (cancelado) return;
        if (error) {
          setDecisoes([]);
          setErro(true);
        } else {
          setDecisoes((data as DecisaoBuscaTexto[]) ?? []);
        }
        setLoading(false);
      });

    return () => { cancelado = true; };
  }, [termoAplicavel, limit]);

  return { decisoes, loading, erro, termoAplicavel };
}
