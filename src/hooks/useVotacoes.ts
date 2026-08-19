// ⚠️ HOOK APOSENTADO (achado D1, 2026-08-18) — não use em tela nova.
//
// A ficha do ministro migrou para useDecisoes/stf_decisoes. Este arquivo segue
// no repositório apenas enquanto stf_votacoes existir no banco, porque a tabela
// foi congelada e não descartada — o descarte só acontece depois de conferir
// que nada mais depende dela.
//
// Por que não voltar: stf_votacoes normaliza o andamento na ESCRITA e não
// guarda o texto original do STF. 487.778 das 758.714 linhas (64%) caíram em
// `voto = 'ausente'`, que numa decisão monocrática afirma algo impossível — quem
// decide é o próprio ministro. Sem o bruto, isso não é corrigível por UPDATE.
// Ver docs/proposta-schema-stf-decisoes.md, seção 2.
//
// A tabela também está congelada no tempo: nada além de 19/01/2025, porque a
// fonte que a alimentava (espelho da Base dos Dados) parou em março de 2025.

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
