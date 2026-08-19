import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

// Substitui useVotacoes (achado D1). A tabela stf_votacoes normalizava o
// andamento na escrita e perdia o original — 64% das linhas viraram "ausente".
// stf_decisoes guarda o texto bruto do STF, e é ele que a tela mostra.
//
// ARMADILHA DO ministro_id — a razão de este hook fazer DUAS consultas.
// `ministro_resolucao` registra COMO a decisão foi atribuída ao ministro:
//   'nome'        → o relator nomeado é ele (a pauta dele)
//   'presidencia' → assinada por ele na condição de PRESIDENTE do STF
//                   (plantão, competência da Presidência)
// Em 2026, Fachin tem 35 decisões como relator e 28.115 como presidente.
// Somar as duas faria a ficha dele exibir ~6,7× o volume de Moraes, quando
// ele é justamente quem tem MENOS decisões próprias — presidir o STF
// redistribui a pauta do ministro. Misturar produziria exatamente o mesmo
// tipo de leitura falsa que o custo de gabinete produzia antes do achado A6.
//
// Por isso a lista é sempre `ministro_resolucao = 'nome'`, e o volume como
// presidente aparece separado e rotulado. NUNCA junte os dois num número só.

export interface Decisao {
  id:              string;
  processo:        string;
  data_decisao:    string;
  andamento_bruto: string;
  tipo_decisao:    string | null;
  tipo_origem:     string;
  assunto:         string | null;
  observacao:      string | null;
}

const CAMPOS =
  "id, processo, data_decisao, andamento_bruto, tipo_decisao, tipo_origem, assunto, observacao";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function useDecisoes(ministroId: string, limit = 20) {
  const [decisoes, setDecisoes] = useState<Decisao[]>([]);
  const [total, setTotal] = useState(0);
  const [comoPresidente, setComoPresidente] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!UUID_RE.test(ministroId)) return;   // id de seed — aguarda o UUID real

    setLoading(true);
    let cancelado = false;

    const pauta = supabase
      .from("stf_decisoes")
      .select(CAMPOS, { count: "exact" })
      .eq("ministro_id", ministroId)
      .eq("ministro_resolucao", "nome")
      .eq("tipo_origem", "MONOCRÁTICA")
      .order("data_decisao", { ascending: false })
      .limit(limit);

    // Só a contagem — estas decisões não entram na lista, para não inflar a
    // produção do ministro com atos que ele assinou na condição de presidente.
    const presidencia = supabase
      .from("stf_decisoes")
      .select("id", { count: "exact", head: true })
      .eq("ministro_id", ministroId)
      .eq("ministro_resolucao", "presidencia");

    Promise.all([pauta, presidencia]).then(([p, pres]) => {
      if (cancelado) return;
      setDecisoes((p.data as Decisao[]) ?? []);
      setTotal(p.count ?? 0);
      setComoPresidente(pres.count ?? 0);
      setLoading(false);
    });

    return () => { cancelado = true; };
  }, [ministroId, limit]);

  return { decisoes, total, comoPresidente, loading };
}
