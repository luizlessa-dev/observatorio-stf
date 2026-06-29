const STATS = [
  { label: "Processos políticos ativos", num: "2.847", sub: "▲ 143 neste mês" },
  { label: "Teses repercussão geral",    num: "89",    sub: "12 pendentes de julgamento" },
  { label: "Casos prescritos (5 anos)",  num: "34",    sub: "taxa 18% no foro privilegiado" },
  { label: "Gasto médio CEAPS / ministro", num: "R$ 47k", sub: "▲ 12% vs 2025" },
];

export default function StatsStrip() {
  return (
    <div className="grid grid-cols-4 border-b border-border">
      {STATS.map((s, i) => (
        <div
          key={i}
          className={`px-8 py-[22px] ${i < 3 ? "border-r border-border" : ""}`}
        >
          <div className="text-[9px] font-semibold uppercase tracking-[1.5px] text-subtle mb-[6px]">
            {s.label}
          </div>
          <div className="font-display text-[30px] font-bold text-white leading-none">
            {s.num}
          </div>
          <div className="text-[10px] text-subtle mt-1">{s.sub}</div>
        </div>
      ))}
    </div>
  );
}
