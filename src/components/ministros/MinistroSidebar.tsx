import type { Ministro } from "../../lib/seed";
import Termometro from "../termometro/Termometro";

interface Props {
  ministros:  Ministro[];
  selecionado: Ministro;
  onSelect:   (m: Ministro) => void;
  loading?:   boolean;
}

export default function MinistroSidebar({ ministros, selecionado, onSelect, loading }: Props) {
  return (
    <aside className="w-[296px] flex-shrink-0 border-r border-border flex flex-col">
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2 mb-[10px]">
          <div className="w-4 h-px bg-subtle" />
          <span className="text-[9px] font-semibold uppercase tracking-[1.5px] text-subtle">
            10 ministros em exercício
          </span>
        </div>
        <input
          className="w-full bg-card border border-border rounded-sm px-[10px] py-[7px] text-[11px] text-muted outline-none placeholder:text-subtle"
          placeholder="Buscar ministro…"
        />
        {loading && (
          <div className="text-[9px] text-subtle mt-[6px]">Carregando dados reais…</div>
        )}
      </div>

      <div className="overflow-y-auto flex-1">
        {ministros.map((m) => (
          <button
            key={m.id}
            onClick={() => onSelect(m)}
            className={`w-full text-left px-5 py-[13px] border-b border-border border-l-2 transition-colors ${
              m.id === selecionado.id
                ? "bg-card border-l-white"
                : "border-l-transparent hover:bg-card"
            }`}
          >
            <div className="flex items-center gap-[10px] mb-[9px]">
              <div
                className={`w-8 h-8 rounded-full bg-surface border flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                  m.id === selecionado.id
                    ? "border-white text-white"
                    : "border-border2 text-muted"
                }`}
              >
                {m.iniciais}
              </div>
              <div>
                <div className="text-[12.5px] font-semibold text-ink leading-tight">
                  {m.nome}
                </div>
                <div className="text-[10px] text-subtle mt-[1px]">
                  Ind. {m.indicado_por.split(" ")[0]} · desde{" "}
                  {m.data_posse.split(" ").slice(1).join(" ")}
                </div>
              </div>
            </div>

            <Termometro score={m.score_geral} mini />

            {m.tags.length > 0 && (
              <div className="flex gap-1 mt-[5px] flex-wrap">
                {m.tags.map((t) => (
                  <span
                    key={t}
                    className="text-[8.5px] font-medium px-[5px] py-[1px] rounded-sm bg-surface border border-border2 text-subtle"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>
    </aside>
  );
}
