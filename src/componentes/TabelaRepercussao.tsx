import { useState } from "react";
import { useRepercussaoGeral } from "../hooks/useRepercussaoGeral";

const MESES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
function fmtData(iso: string | null): string {
  if (!iso) return "—";
  const [, mes, dia] = iso.split("-");
  return `${dia} ${MESES[parseInt(mes,10)-1]}`;
}

function fmtAno(iso: string | null): string {
  if (!iso) return "—";
  return iso.split("-")[0];
}

const STATUS_LABEL: Record<string, string> = {
  pendente:  "Pendente",
  julgado:   "Julgado",
  sobrestado:"Sobrestado",
};
const STATUS_CLS: Record<string, string> = {
  pendente:  "border-amber-800/60 text-amber-400",
  julgado:   "border-[#3a5a3a] text-[#8ab88a]",
  sobrestado:"border-border2 text-subtle",
};

export default function TabelaRepercussao() {
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(50);

  // Cabeçalho (H1 + contagem real) já vem do wrapper estático em
  // src/pages/repercussao-geral.astro, computado no build — não duplicar
  // aqui. Duplicar produzia dois H1 na página e um "0 temas" piscando antes
  // da hidratação, porque o total desta ilha só chega depois do fetch
  // client-side (achado da auditoria de SEO, item 8).
  const { temas, loading } = useRepercussaoGeral(filtroStatus, search, limit);

  return (
    <div className="flex-1 overflow-y-auto px-8 py-7">
      {/* Filtros */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-[2px] bg-card border border-border rounded-sm overflow-hidden">
          {(["todos","pendente","julgado","sobrestado"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFiltroStatus(s)}
              className={`px-3 py-[5px] text-[10px] font-semibold uppercase tracking-[0.8px] transition-colors ${
                filtroStatus === s
                  ? "bg-white/10 text-ink"
                  : "text-subtle hover:text-muted"
              }`}
            >
              {s === "todos" ? "Todos" : STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Buscar por título…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-card border border-border rounded-sm px-3 py-[5px] text-[11px] text-ink placeholder:text-subtle outline-none focus:border-white/20 w-64"
        />

        {loading && (
          <span className="text-[10px] text-subtle animate-pulse">carregando…</span>
        )}
      </div>

      {/* Tabela */}
      <div className="border border-border rounded-sm overflow-hidden">
        <div className="grid text-[9px] font-bold uppercase tracking-[1px] text-subtle bg-card border-b border-border px-4 py-[8px]"
          style={{ gridTemplateColumns: "56px 1fr 110px 90px 70px 70px" }}>
          <span>Tema</span>
          <span>Título</span>
          <span>Leading Case</span>
          <span>Reconh.</span>
          <span>Status</span>
          <span>Processos</span>
        </div>

        {temas.length === 0 && !loading && (
          <div className="px-4 py-8 text-[11px] text-subtle text-center">
            Nenhum tema encontrado
          </div>
        )}

        {temas.map((t) => (
          <div
            key={t.id}
            className={`grid border-b border-border last:border-0 px-4 py-[10px] items-start gap-2 hover:bg-white/[0.02] transition-colors ${
              t.destaque ? "border-l-2 border-l-white/20" : ""
            }`}
            style={{ gridTemplateColumns: "56px 1fr 110px 90px 70px 70px" }}
          >
            <div className="font-mono text-[11px] text-subtle">
              {String(t.tema).padStart(4, "0")}
              {t.destaque && <span className="ml-1 text-[8px] text-white/40">★</span>}
            </div>
            <div>
              <div className="text-[11px] text-muted leading-[1.4] mb-[2px] line-clamp-2">
                {t.titulo}
              </div>
              {t.tese && (
                <div className="text-[9px] text-subtle leading-[1.4] line-clamp-2 mt-[2px]">
                  {t.tese}
                </div>
              )}
            </div>
            <div className="font-mono text-[10px] text-subtle">{t.leading_case ?? "—"}</div>
            <div className="text-[10px] text-subtle">
              {fmtData(t.data_reconh)} {fmtAno(t.data_reconh)}
            </div>
            <div>
              <span className={`text-[9px] font-semibold px-[7px] py-[2px] rounded-sm border whitespace-nowrap ${
                STATUS_CLS[t.status] ?? "border-border2 text-subtle"
              }`}>
                {STATUS_LABEL[t.status] ?? t.status}
              </span>
            </div>
            <div className="text-[10px] text-subtle text-right">
              {t.processos_imp != null
                ? t.processos_imp.toLocaleString("pt-BR")
                : <span className="opacity-30">—</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Carregar mais */}
      {temas.length >= limit && (
        <button
          onClick={() => setLimit((l) => l + 50)}
          className="mt-4 w-full py-2 text-[10px] font-semibold uppercase tracking-[1px] text-subtle border border-border rounded-sm hover:bg-card transition-colors"
        >
          Carregar mais 50
        </button>
      )}
    </div>
  );
}
