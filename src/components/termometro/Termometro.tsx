interface Props {
  score: number;   // 0–10, onde 0=conservador 10=progressista
  mini?: boolean;
}

const GRADIENT = "linear-gradient(to right, #2563c4 0%, #5b84d4 25%, #888 48%, #888 52%, #d4706b 75%, #b91c1c 100%)";

export default function Termometro({ score, mini = false }: Props) {
  const pct = (score / 10) * 100;
  const label = score < 3.5 ? "Conservador" : score > 6.5 ? "Progressista" : "Centro";

  if (mini) {
    return (
      <div>
        <div className="relative h-1 rounded-full overflow-hidden mb-1" style={{ background: GRADIENT }}>
          <div
            className="absolute top-[-3px] bottom-[-3px] w-[2px] bg-white rounded-sm"
            style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
          />
        </div>
        <div className="flex justify-between text-[8.5px]">
          <span style={{ color: "#2563c4" }}>Conservador</span>
          <span style={{ color: "#b91c1c" }}>Progressista</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="relative h-[22px] rounded-sm border border-border2 overflow-visible mb-2" style={{ background: GRADIENT }}>
        <div
          className="absolute top-[-5px] bottom-[-5px] w-[3px] bg-white rounded-sm shadow-[0_0_8px_rgba(255,255,255,0.2)]"
          style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
        >
          <div
            className="absolute top-[-20px] left-1/2 -translate-x-1/2 font-mono text-[9px] text-white bg-surface border border-border px-[6px] py-[2px] rounded-sm whitespace-nowrap"
          >
            {score.toFixed(1)} — {label}
          </div>
        </div>
      </div>
      <div className="flex justify-between text-[10px] font-medium mt-1">
        <span style={{ color: "#2563c4" }}>◀ Conservador</span>
        <span className="text-subtle">Centro</span>
        <span style={{ color: "#b91c1c" }}>Progressista ▶</span>
      </div>
    </div>
  );
}
