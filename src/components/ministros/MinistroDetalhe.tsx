import type { Ministro } from "../../lib/seed";
import Termometro from "../termometro/Termometro";
import { useVotacoes } from "../../hooks/useVotacoes";

interface Props { ministro: Ministro; }

const DIMS = [
  { key: "score_direitos",  label: "Direitos Civis" },
  { key: "score_imprensa",  label: "Lib. Imprensa" },
  { key: "score_seguranca", label: "Seg. Pública" },
  { key: "score_economico", label: "Econômico" },
  { key: "score_democracia",label: "Democracia" },
] as const;

const MESES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
function fmtData(iso: string): string {
  const [, mes, dia] = iso.split("-");
  return `${dia} ${MESES[parseInt(mes, 10) - 1]}`;
}

const DOADORES_PENDENTE = [
  { nome: "Dados em ingestão", detalhe: "Receitas presidenciais TSE 2018/2022", valor: "—" },
];

export default function MinistroDetalhe({ ministro: m }: Props) {
  const { votacoes, loading: loadingVotos } = useVotacoes(m.id);

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

      {/* Termômetro */}
      <div className="mb-6">
        <div className="flex items-center gap-[10px] mb-[14px]">
          <div className="w-5 h-px bg-subtle" />
          <span className="text-[9px] font-semibold uppercase tracking-[1.5px] text-subtle">
            Termômetro de tendência de voto
          </span>
        </div>
        <div className="mb-[30px]">
          <Termometro score={m.score_geral} />
        </div>
        <div className="grid grid-cols-5 gap-2">
          {DIMS.map((d) => {
            const score = m[d.key] as number;
            return (
              <div key={d.key} className="bg-card border border-border rounded-sm p-[10px] text-center">
                <div className="text-[9px] uppercase tracking-[0.5px] text-subtle mb-[6px]">{d.label}</div>
                <div className="font-display text-[22px] font-bold text-white leading-none">{score.toFixed(1)}</div>
                <div className="h-[2px] bg-border mt-[6px] rounded-full overflow-hidden">
                  <div className="h-full bg-white" style={{ width: `${score * 10}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Votos reais */}
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
              style={{ gridTemplateColumns: "44px 1fr 56px" }}
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

        {/* Doadores */}
        <div className="flex flex-col gap-[10px]">
          <div className="border border-border rounded-sm overflow-hidden">
            <div className="px-4 py-[9px] bg-card border-b border-border text-[9px] font-bold uppercase tracking-[1.5px] text-subtle">
              Quem o indicou — situação atual
            </div>
            <div className="flex justify-between items-center px-4 py-[9px]">
              <div>
                <div className="text-[12px] font-medium text-ink">{m.indicado_por}</div>
                <div className="text-[10px] text-subtle mt-[1px]">{m.partido_indicante} · Presidente</div>
              </div>
            </div>
          </div>

          <div className="border border-border rounded-sm overflow-hidden">
            <div className="px-4 py-[9px] bg-card border-b border-border text-[9px] font-bold uppercase tracking-[1.5px] text-subtle">
              Maiores doadores de {m.indicado_por.split(" ")[0]} — TSE
            </div>
            {DOADORES_PENDENTE.map((d, i) => (
              <div key={i} className="flex justify-between items-center px-4 py-[9px] border-b border-border last:border-0">
                <div>
                  <div className="text-[12px] font-medium text-ink">{d.nome}</div>
                  <div className="text-[10px] text-subtle mt-[1px]">{d.detalhe}</div>
                </div>
                <div className="font-mono text-[11px] text-muted">{d.valor}</div>
              </div>
            ))}
          </div>
        </div>
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
