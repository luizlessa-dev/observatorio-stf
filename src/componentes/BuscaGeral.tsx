import { useEffect, useState } from "react";
import { useBuscaTextoDecisoes } from "../hooks/useBuscaTextoDecisoes";
import { supabase } from "../lib/supabase";
import { fmtData } from "../lib/formato";
import { buscarCasos } from "../lib/buscaCasos";

interface CasoIndice {
  slug: string;
  titulo: string;
  resumo: string;
  status: "em_apuracao" | "confirmado" | "arquivado";
  ministros: string[];
}
interface MinistroOpcao { id: string; nome: string; }
interface Props {
  casosIndex: CasoIndice[];
  ministros: MinistroOpcao[];
}

const ROTULO_STATUS: Record<string, string> = {
  em_apuracao: "Em apuração",
  confirmado: "Confirmado",
  arquivado: "Arquivado",
};

function lerQDaURL(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("q") ?? "";
}

interface TemaBusca {
  id: string;
  tema: number;
  titulo: string;
  status: "pendente" | "julgado" | "sobrestado";
}

// Busca de repercussão geral dedicada a este componente — dataset pequeno
// (1.470 temas), não precisa da lógica completa de filtro/paginação/retry de
// useRepercussaoGeral.ts, só um ilike simples com cancelamento.
function useBuscaTemasRG(termo: string, limit = 5) {
  const [temas, setTemas] = useState<TemaBusca[]>([]);
  const [loading, setLoading] = useState(false);
  const termoAplicavel = termo.trim().length > 2 ? termo.trim() : "";

  useEffect(() => {
    if (!termoAplicavel) {
      setTemas([]);
      return;
    }
    let cancelado = false;
    setLoading(true);
    supabase
      .from("stf_repercussao_geral")
      .select("id, tema, titulo, status")
      .ilike("titulo", `%${termoAplicavel}%`)
      .order("tema", { ascending: false })
      .limit(limit)
      .then(({ data, error }) => {
        if (cancelado) return;
        setTemas(error ? [] : (data as TemaBusca[]) ?? []);
        setLoading(false);
      });
    return () => { cancelado = true; };
  }, [termoAplicavel, limit]);

  return { temas, loading };
}

export default function BuscaGeral({ casosIndex, ministros }: Props) {
  const [termoDigitado, setTermoDigitado] = useState("");
  const [termo, setTermo] = useState("");
  const [hidratado, setHidratado] = useState(false);

  // Lê ?q= só depois de montar — o HTML gerado no build nunca conhece
  // window.location.search, ler isso no useState inicial produziria
  // mismatch de hidratação (SSR sempre vazio, cliente às vezes não).
  useEffect(() => {
    const inicial = lerQDaURL();
    if (inicial) {
      setTermoDigitado(inicial);
      setTermo(inicial);
    }
    setHidratado(true);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setTermo(termoDigitado), 400);
    return () => clearTimeout(t);
  }, [termoDigitado]);

  // URL compartilhável (achado AUD-13: a busca de /decisoes não tinha
  // isso). Reflete o termo já com debounce aplicado, não cada tecla — evita
  // empilhar uma entrada de histórico por caractere digitado.
  useEffect(() => {
    if (!hidratado) return;
    const url = new URL(window.location.href);
    if (termo) url.searchParams.set("q", termo);
    else url.searchParams.delete("q");
    window.history.replaceState({}, "", url);
  }, [termo, hidratado]);

  const termoAplicavel = termo.trim().length > 2 ? termo.trim() : "";
  const casosEncontrados = termoAplicavel ? buscarCasos(casosIndex, termoAplicavel) : [];
  const { decisoes, loading: carregandoDecisoes, erro: erroDecisoes } = useBuscaTextoDecisoes(termo);
  const { temas, loading: carregandoTemas } = useBuscaTemasRG(termo);
  const nomePorMinistro = new Map(ministros.map((m) => [m.id, m.nome]));

  return (
    <div className="max-w-3xl">
      <div className="flex flex-col gap-1 mb-6">
        <label htmlFor="busca-geral" className="text-[11px] font-semibold uppercase tracking-[1px] text-subtle">
          Buscar
        </label>
        <input
          id="busca-geral"
          type="text"
          placeholder="Ex.: HC 276824, aposentadoria, Gilmar Mendes"
          value={termoDigitado}
          onChange={(e) => setTermoDigitado(e.target.value)}
          className="bg-card border border-border rounded-sm px-3 py-[8px] text-[13px] text-ink placeholder:text-subtle outline-none focus-visible:border-white/40 focus-visible:ring-2 focus-visible:ring-white/30 w-full max-w-md"
        />
      </div>

      {!termoAplicavel && (
        <p className="text-[12px] text-subtle border border-border rounded-sm px-4 py-8 text-center">
          Digite ao menos 3 caracteres pra buscar em casos, decisões e repercussão geral.
        </p>
      )}

      {termoAplicavel && (
        <div className="space-y-8">
          <section aria-labelledby="busca-casos-titulo">
            <h2 id="busca-casos-titulo" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-subtle mb-3">
              Casos {casosEncontrados.length > 0 && `(${casosEncontrados.length})`}
            </h2>
            {casosEncontrados.length === 0 && <p className="text-[12px] text-subtle">Nenhum caso encontrado.</p>}
            <ul className="space-y-2">
              {casosEncontrados.map((c) => (
                <li key={c.slug}>
                  <a href={`/casos/${c.slug}`} className="block border border-border rounded-sm px-4 py-3 hover:bg-card transition-colors">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[9px] font-semibold uppercase tracking-[0.8px] px-[6px] py-[2px] rounded-sm border border-border2 text-subtle">
                        {ROTULO_STATUS[c.status] ?? c.status}
                      </span>
                      <span className="text-[13px] font-semibold text-ink">{c.titulo}</span>
                    </div>
                    <p className="text-[11px] text-muted leading-[1.5] line-clamp-2">{c.resumo}</p>
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="busca-decisoes-titulo">
            <h2 id="busca-decisoes-titulo" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-subtle mb-3">
              Decisões {!carregandoDecisoes && !erroDecisoes && decisoes.length > 0 && `(${decisoes.length})`}
            </h2>
            {carregandoDecisoes && <p className="text-[12px] text-subtle">Buscando…</p>}
            {!carregandoDecisoes && erroDecisoes && (
              <p className="text-[12px] text-red-400">Não foi possível buscar decisões agora. Tente novamente em instantes.</p>
            )}
            {!carregandoDecisoes && !erroDecisoes && decisoes.length === 0 && (
              <p className="text-[12px] text-subtle">
                Nenhuma decisão encontrada por assunto. Pra número exato de processo, veja{" "}
                <a href="/decisoes" className="underline hover:text-ink">Buscar decisões</a>.
              </p>
            )}
            <ul className="space-y-2">
              {decisoes.map((d) => (
                <li key={d.id} className="border border-border rounded-sm px-4 py-3">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-[12px] text-ink">{d.processo}</span>
                    <span className="text-[10px] text-subtle">{fmtData(d.data_decisao)}</span>
                    {d.ministro_id && nomePorMinistro.get(d.ministro_id) && (
                      <span className="text-[10px] text-subtle">· {nomePorMinistro.get(d.ministro_id)}</span>
                    )}
                  </div>
                  {d.assunto && <p className="text-[11px] text-muted leading-[1.4] line-clamp-2">{d.assunto}</p>}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="busca-rg-titulo">
            <h2 id="busca-rg-titulo" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-subtle mb-3">
              Repercussão geral {!carregandoTemas && temas.length > 0 && `(${temas.length})`}
            </h2>
            {carregandoTemas && <p className="text-[12px] text-subtle">Buscando…</p>}
            {!carregandoTemas && temas.length === 0 && <p className="text-[12px] text-subtle">Nenhum tema encontrado.</p>}
            <ul className="space-y-2">
              {temas.map((t) => (
                <li key={t.id}>
                  <a href={`/repercussao-geral?busca=${encodeURIComponent(t.titulo)}`} className="block border border-border rounded-sm px-4 py-3 hover:bg-card transition-colors">
                    <span className="font-mono text-[11px] text-subtle mr-2">{String(t.tema).padStart(4, "0")}</span>
                    <span className="text-[12px] text-muted">{t.titulo}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
