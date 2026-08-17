import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { type Ministro, MINISTROS_SEED } from "../lib/seed";

// Fase C1 (2026-07-26): a consulta usa lista EXPLÍCITA de colunas públicas —
// nunca select('*'). Os campos de score ideológico (score_geral + 5 dimensões)
// não são selecionados, não são tipados aqui e não podem voltar por acidente
// quando novas colunas forem criadas no banco. A migration
// supabase/migrations/0003_contencao_scores.sql retira o grant dessas colunas
// para anon/authenticated; esta lista precisa se manter dentro do conjunto
// de colunas com grant público, senão a consulta passa a retornar erro.
//
// Onda 1 (2026-08-17): entram `indicado_por_curto` e `iniciais_exibicao`
// (migration 0004), que receberam grant público. NÃO entra `data_nascimento`:
// é insumo interno do cálculo de aposentadoria e não tem grant.
const COLUNAS_PUBLICAS =
  "id, nome, iniciais, iniciais_exibicao, data_posse, indicado_por, indicado_por_curto, " +
  "partido_indicante, cargo_anterior, aposentadoria_comp, ativo";

const MESES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

// "2002-06-20" → "20 jun 2002". Devolve a entrada intacta se não for ISO —
// assim um valor de seed já formatado passa sem virar "undefined undefined".
function formatarDataISO(valor: string): string {
  if (!/^\d{4}-\d{2}-\d{2}/.test(valor)) return valor;
  const [ano, mes, dia] = valor.slice(0, 10).split("-");
  return `${dia} ${MESES[parseInt(mes, 10) - 1]} ${ano}`;
}

// Mapeia a linha do banco para o tipo Ministro usado no front
function rowToMinistro(row: Record<string, unknown>, seed?: Ministro): Ministro {
  const seedMatch = MINISTROS_SEED.find((m) => m.nome === row.nome) ?? seed;
  const iniciais = String(row.iniciais ?? seedMatch?.iniciais ?? "");
  const indicadoPor = String(row.indicado_por ?? seedMatch?.indicado_por ?? "");
  return {
    id:                 String(row.id ?? seedMatch?.id ?? ""),
    nome:               String(row.nome),
    iniciais,
    // `iniciais` é UNIQUE no banco e carrega sufixo de desambiguação (AM2).
    // Se a coluna de exibição vier vazia, tira o sufixo numérico aqui em vez
    // de deixar a chave técnica vazar para o avatar.
    iniciais_exibicao:  String(row.iniciais_exibicao ?? seedMatch?.iniciais_exibicao ?? iniciais)
                          .replace(/\d+$/, ""),
    data_posse:         formatarDataISO(String(row.data_posse ?? seedMatch?.data_posse ?? "")),
    indicado_por:       indicadoPor,
    // Nunca derivar por indicado_por.split(" ")[0] — produzia "Ind. Fernando",
    // "Ind. Jair", "Governo Fernando".
    indicado_por_curto: String(row.indicado_por_curto ?? seedMatch?.indicado_por_curto ?? indicadoPor),
    partido_indicante:  String(row.partido_indicante ?? seedMatch?.partido_indicante ?? ""),
    cargo_anterior:     String(row.cargo_anterior ?? seedMatch?.cargo_anterior ?? ""),
    // Vinha cru do banco ("2030-07-28") direto para a tela. Formata igual à posse.
    aposentadoria:      formatarDataISO(String(row.aposentadoria_comp ?? seedMatch?.aposentadoria ?? "")),
    ativo:              Boolean(row.ativo),
    tags:               seedMatch?.tags ?? [],
  };
}

export function useMinistros() {
  const [ministros, setMinistros] = useState<Ministro[]>(MINISTROS_SEED);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("stf_ministros")
      .select(COLUNAS_PUBLICAS)
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
