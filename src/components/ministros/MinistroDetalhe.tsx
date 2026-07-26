import type { Ministro } from "../../lib/seed";
import Termometro from "../termometro/Termometro";
import { useVotacoes } from "../../hooks/useVotacoes";
import { useGastos } from "../../hooks/useGastos";

interface Props { ministro: Ministro; }

const MESES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
function fmtData(iso: string): string {
  const [, mes, dia] = iso.split("-");
  return `${dia} ${MESES[parseInt(mes, 10) - 1]}`;
}

const MESES_NOME = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
function fmtMes(mes: number, ano: number) {
  return `${MESES_NOME[mes - 1]}/${ano}`;
}
function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export default function MinistroDetalhe({ ministro: m }: Props) {
  const { votacoes, loading: loadingVotos } = useVotacoes(m.id);
  const { gastos, loading: loadingGastos } = useGastos(m.id);

  return (
    <div className="flex-1 overflow-y-auto px-8 py-7">
      {/* Breadcrumb */}
      <div className="text-[11px] text-subtle mb-[22px] flex items-center gap-[6px]">
        <span>Ministros</span>
        <span className="text-border2">›</span>
        <span className="text-ink font-medium">{m.nome}</span>
      </div>

      {/* Cabeçalho */}
      <div className="flex items-start gap-5 pb-6 border-b border-border mb-[22px]">
        <div className="w-[68px] h-[68px] rounded-full bg-surface border border-border2 flex items-center justify-center font-display text-[22px] font-bold text-muted flex-shrink-0">
          {m.iniciais}
        </div>
        <div>
          <div className="font-display text-[26px] font-bold text-white leading-[1.2] mb-1">
            {m.nome}
          </div>
          <div className="text-[12px] text-subtle mb-[10px]">
            Ministro desde {m.data_posse} · Aposentadoria compulsória {m.aposentadoria}
          </div>
          <div className="flex gap-[5px] flex-wrap">
            <span className="text-[10px] font-medium px-[9px] py-[3px] rounded-sm border border-white/40 text-white">
              Indicado por {m.indicado_por}
            </span>
            <span className="text-[10px] font-medium px-[9px] py-[3px] rounded-sm border border-border2 text-muted">
              {m.partido_indicante}
            </span>
          </div>
        </div>
      </div>

      {/* Bloco indicação */}
      <div className="grid grid-cols-4 border border-border rounded-sm overflow-hidden mb-6">
        {[
          { label: "Indicado por",  val: m.indicado_por,      sub: m.partido_indicante },
          { label: "Cargo anterior", val: m.cargo_anterior,   sub: `Governo ${m.indicado_por.split(" ")[0]}` },
          { label: "Posse",         val: m.data_posse,        sub: "Data de posse no STF" },
          { label: "Aposentadoria", val: m.aposentadoria || "—", sub: "Compulsória aos 75 anos" },
        ].map((c, i) => (
          <div key={i} className={`px-4 py-[13px] ${i < 3 ? "border-r border-border" : ""}`}>
            <div className="text-[9px] font-semibold uppercase tracking-[1px] text-subtle mb-1">{c.label}</div>
            <div className="text-[13px] font-semibold text-ink leading-snug">{c.val}</div>
            <div className="text-[10px] text-subtle mt-[2px]">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Análise de padrões decisórios — suspensa na Fase C0; rótulo do
          produto ("Termômetro") retirado na Fase C1 para não anunciar
          funcionalidade indisponível. Ver docs/auditoria-integridade-dados.md. */}
      <div className="mb-6">
        <div className="flex items-center gap-[10px] mb-[14px]">
          <div className="w-5 h-px bg-subtle" />
          <span className="text-[9px] font-semibold uppercase tracking-[1.5px] text-subtle">
            Análise de padrões decisórios
          </span>
        </div>
        <Termometro />
      </div>

      {/* Gastos */}
      {(loadingGastos || gastos.length > 0) && (
        <div className="border border-border rounded-sm overflow-hidden mb-6">
          <div className="px-4 py-[9px] bg-card border-b border-border flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-[1.5px] text-subtle">
              Custo ao erário
            </span>
            {loadingGastos && (
              <span className="text-[8px] text-subtle animate-pulse">carregando…</span>
            )}
          </div>
          {gastos.length > 0 && (() => {
            const subsidio = gastos.find(g => g.categoria === "subsidio_ministro");
            const gabinete = gastos.find(g => g.categoria === "custo_gabinete");
            const mesRef = subsidio ?? gabinete;
            const totalMes = (subsidio?.valor ?? 0) + (gabinete?.valor ?? 0);
            return (
              <div className="grid grid-cols-3 divide-x divide-border">
                <div className="px-4 py-[13px]">
                  <div className="text-[9px] font-semibold uppercase tracking-[1px] text-subtle mb-1">Subsídio</div>
                  <div className="text-[15px] font-bold text-ink">{fmtBRL(subsidio?.valor ?? 0)}</div>
                  <div className="text-[9px] text-subtle mt-[2px]">por mês</div>
                </div>
                <div className="px-4 py-[13px]">
                  <div className="text-[9px] font-semibold uppercase tracking-[1px] text-subtle mb-1">Custo do gabinete</div>
                  <div className="text-[15px] font-bold text-ink">{fmtBRL(gabinete?.valor ?? 0)}</div>
                  <div className="text-[9px] text-subtle mt-[2px]">
                    {gabinete ? `${parseInt(gabinete.descricao.match(/\d+/)?.[0] ?? "0")} servidores` : "—"}
                  </div>
                </div>
                <div className="px-4 py-[13px]">
                  <div className="text-[9px] font-semibold uppercase tracking-[1px] text-subtle mb-1">Total mensal</div>
                  <div className="text-[15px] font-bold text-white">{fmtBRL(totalMes)}</div>
                  <div className="text-[9px] text-subtle mt-[2px]">
                    ref. {mesRef ? fmtMes(mesRef.mes, mesRef.ano) : "—"}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Decisões — ocupa largura total */}
      <div className="border border-border rounded-sm overflow-hidden">
        <div className="px-4 py-[9px] bg-card border-b border-border flex items-center justify-between">
          <span className="text-[9px] font-bold uppercase tracking-[1.5px] text-subtle">
            Últimas decisões monocráticas
          </span>
          {loadingVotos && (
            <span className="text-[8px] text-subtle animate-pulse">carregando…</span>
          )}
        </div>

        {!loadingVotos && votacoes.length === 0 && (
          <div className="px-4 py-5 text-[11px] text-subtle text-center">
            Sem dados de votação disponíveis
          </div>
        )}

        {votacoes.map((v) => (
          <div
            key={v.id}
            className="grid border-b border-border last:border-0 px-4 py-[9px] items-start gap-2"
            style={{ gridTemplateColumns: "44px 1fr 70px" }}
          >
            <div className="font-mono text-[9px] text-subtle pt-[1px]">{fmtData(v.data)}</div>
            <div>
              <div className="text-[11px] text-muted leading-[1.35] line-clamp-2">
                {v.ementa.replace(/ \|\| /g, " — ")}
              </div>
              <div className="font-mono text-[8.5px] text-subtle mt-[2px]">{v.processo}</div>
            </div>
            <VotoChip voto={v.voto} />
          </div>
        ))}
      </div>
    </div>
  );
}

function VotoChip({ voto }: { voto: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    favor:     { label: "Deferido",   cls: "border-[#3a5a3a] text-[#8ab88a]" },
    contra:    { label: "Indeferido", cls: "border-[#5a3a3a] text-[#b88a8a]" },
    abstencao: { label: "Prejudicado",cls: "border-border2 text-subtle" },
    ausente:   { label: "Ausente",    cls: "border-border2 text-subtle" },
  };
  const { label, cls } = map[voto] ?? { label: voto, cls: "border-border2 text-subtle" };
  return (
    <span className={`text-[9px] font-semibold px-[7px] py-[2px] rounded-sm border text-center whitespace-nowrap ${cls}`}>
      {label}
    </span>
  );
}
