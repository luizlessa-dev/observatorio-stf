import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

// Achado A6 (auditoria 2026-08-17): o custo de gabinete do ministro presidente
// não é comparável ao dos demais — a estrutura de apoio da Presidência não
// corre pelo gabinete dele. Fachin aparece com 9 servidores contra 31–38 dos
// outros, e sem contexto o número convida à leitura errada.
//
// A pergunta que a interface faz NÃO é "quem preside hoje", é "quem presidia
// no mês de referência deste gasto" — por isso períodos, não flag booleana.
// Ver supabase/migrations/0006_presidencias_stf.sql.

export type Cargo = "presidente" | "vice_presidente";

export interface Presidencia {
  ministro_id: string;
  cargo:       Cargo;
  inicio:      string;        // ISO
  fim:         string | null; // null = em exercício
}

export const ROTULO_CARGO: Record<Cargo, string> = {
  presidente:      "Presidente do STF",
  vice_presidente: "Vice-presidente do STF",
};

// A tabela tem poucas linhas (uma por mandato) — carrega inteira uma vez.
export function usePresidencias() {
  const [presidencias, setPresidencias] = useState<Presidencia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("stf_presidencias")
      .select("ministro_id, cargo, inicio, fim")
      .order("inicio", { ascending: false })
      .then(({ data }) => {
        setPresidencias((data as Presidencia[]) ?? []);
        setLoading(false);
      });
  }, []);

  return { presidencias, loading };
}

/** Cargo que o ministro exerce agora, ou null. */
export function cargoAtual(
  presidencias: Presidencia[],
  ministroId: string,
): Cargo | null {
  return presidencias.find((p) => p.ministro_id === ministroId && p.fim === null)?.cargo ?? null;
}

/**
 * O ministro presidia o STF em algum momento do mês (ano, mes)?
 *
 * Compara mês a mês de propósito: os gastos são publicados por competência
 * mensal, e a posse costuma cair no meio do mês. Um mandato que começou em
 * 29/09 conta para setembro — é o mês em que a estrutura de gabinete já
 * estava mudando de mãos, e é justamente onde a nota de contexto é mais
 * necessária, não menos.
 */
export function presidiaNoMes(
  presidencias: Presidencia[],
  ministroId: string,
  ano: number,
  mes: number,
): boolean {
  const primeiroDia = `${ano}-${String(mes).padStart(2, "0")}-01`;
  // Último dia do mês: dia 0 do mês seguinte.
  const ultimo = new Date(Date.UTC(ano, mes, 0)).toISOString().slice(0, 10);

  return presidencias.some(
    (p) =>
      p.ministro_id === ministroId &&
      p.cargo === "presidente" &&
      p.inicio <= ultimo &&
      (p.fim === null || p.fim >= primeiroDia),
  );
}
