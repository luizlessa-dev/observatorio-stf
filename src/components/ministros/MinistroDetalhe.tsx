import type { Ministro } from "../../lib/seed";
import Termometro from "../termometro/Termometro";

interface Props { ministro: Ministro; }

const DIMS = [
  { key: "score_direitos",  label: "Direitos Civis" },
  { key: "score_imprensa",  label: "Lib. Imprensa" },
  { key: "score_seguranca", label: "Seg. Pública" },
  { key: "score_economico", label: "Econômico" },
  { key: "score_democracia",label: "Democracia" },
] as const;

const VOTOS_MOCK = [
  { data: "12 jun 2026", desc: "Descriminalização do porte de maconha para uso pessoal",   proc: "RE 635.659",    voto: "favor" },
  { data: "03 jun 2026", desc: "Constitucionalidade da taxa de lixo municipal",              proc: "RE 576.321",    voto: "favor" },
  { data: "21 mai 2026", desc: "Validade da prisão em segunda instância",                    proc: "HC 198.402",    voto: "contra" },
  { data: "14 mai 2026", desc: "Marco temporal para demarcação de terras indígenas",          proc: "RE 1.017.365",  voto: "favor" },
  { data: "28 abr 2026", desc: "Prisão de parlamentar sem autorização da Casa",              proc: "AP 1.044",      voto: "abstencao" },
];

const DOADORES_MOCK = [
  { nome: "Grupo JBS",      detalhe: "Joesley Batista · delação 2017", valor: "R$ 8,2M" },
  { nome: "Odebrecht",      detalhe: "Marcelo Odebrecht · Lava Jato",  valor: "R$ 5,1M" },
  { nome: "BTG Pactual",    detalhe: "André Esteves",                   valor: "R$ 2,8M" },
  { nome: "Queiroz Galvão", detalhe: "Construtora · investigada TCU",   valor: "R$ 1,4M" },
];

export default function MinistroDetalhe({ ministro: m }: Props) {
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
              281 inquéritos como relator
            </span>
            <span className="text-[10px] font-medium px-[9px] py-[3px] rounded-sm border border-border2 text-muted">
              94% presença no plenário
            </span>
          </div>
        </div>
      </div>

      {/* Bloco indicação */}
      <div className="grid grid-cols-4 border border-border rounded-sm overflow-hidden mb-6">
        {[
          { label: "Indicado por",          val: m.indicado_por,      sub: `${m.partido_indicante}` },
          { label: "Cargo anterior",         val: m.cargo_anterior,    sub: `Governo ${m.indicado_por.split(" ")[0]}` },
          { label: "Formação",               val: "USP · Sorbonne",    sub: "Doutor em Direito do Estado" },
          { label: "Indicante hoje",         val: "Réu no STF",        sub: "AP 1.044 · crimes financeiros" },
        ].map((c, i) => (
          <div key={i} className={`px-4 py-[13px] ${i < 3 ? "border-r border-border" : ""}`}>
            <div className="text-[9px] font-semibold uppercase tracking-[1px] text-subtle mb-1">{c.label}</div>
            <div className="text-[13px] font-semibold text-ink">{c.val}</div>
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
        {/* Votos */}
        <div className="border border-border rounded-sm overflow-hidden">
          <div className="px-4 py-[9px] bg-card border-b border-border text-[9px] font-bold uppercase tracking-[1.5px] text-subtle">
            Últimos votos relevantes
          </div>
          {VOTOS_MOCK.map((v, i) => (
            <div key={i} className="grid border-b border-border last:border-0 px-4 py-[9px] items-center gap-2" style={{ gridTemplateColumns: "62px 1fr 50px" }}>
              <div className="font-mono text-[9px] text-subtle">{v.data}</div>
              <div>
                <div className="text-[11px] text-muted leading-[1.35]">{v.desc}</div>
                <div className="font-mono text-[8.5px] text-subtle mt-[2px]">{v.proc}</div>
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
              <div className="text-right">
                <div className="font-mono text-[11px] text-[#b88a8a]">Réu no STF</div>
                <div className="text-[9px] text-subtle">AP 1.044</div>
              </div>
            </div>
          </div>

          <div className="border border-border rounded-sm overflow-hidden">
            <div className="px-4 py-[9px] bg-card border-b border-border text-[9px] font-bold uppercase tracking-[1.5px] text-subtle">
              Maiores doadores de {m.indicado_por.split(" ")[0]} — TSE
            </div>
            {DOADORES_MOCK.map((d, i) => (
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
    favor:     { label: "A favor",   cls: "border-[#3a5a3a] text-[#8ab88a]" },
    contra:    { label: "Contra",    cls: "border-[#5a3a3a] text-[#b88a8a]" },
    abstencao: { label: "Abstenção", cls: "border-border2 text-subtle" },
  };
  const { label, cls } = map[voto] ?? { label: voto, cls: "border-border2 text-subtle" };
  return (
    <span className={`text-[9px] font-semibold px-[7px] py-[2px] rounded-sm border text-center ${cls}`}>
      {label}
    </span>
  );
}
