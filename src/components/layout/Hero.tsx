// Achado B6: "Os onze (hoje dez)", "1 vaga aberta" e "10 ministros em
// exercício" estavam escritos à mão em três lugares. No dia em que a vaga de
// Barroso for preenchida — o que pode sair a qualquer momento — o site passaria
// a mentir nos três ao mesmo tempo. Agora deriva da composição real.
const CADEIRAS = 11;   // art. 101 da Constituição

const POR_EXTENSO: Record<number, string> = {
  7: "sete", 8: "oito", 9: "nove", 10: "dez", 11: "onze",
};

interface HeroProps {
  emExercicio: number;
}

export default function Hero({ emExercicio }: HeroProps) {
  const vagas = Math.max(0, CADEIRAS - emExercicio);
  return (
    <section className="px-8 pt-[60px] pb-[52px] border-b border-border">
      <div className="flex items-center gap-3 mb-[22px]">
        <div className="w-7 h-[1.5px] bg-subtle" />
        <span className="text-[10px] font-semibold uppercase tracking-[2px] text-subtle">
          Observatório do Supremo Tribunal Federal
        </span>
      </div>

      <h1 className="font-display text-[48px] font-black leading-[1.1] text-white max-w-[780px] mb-[22px]">
        Os onze{" "}
        {vagas > 0 && (
          <em className="not-italic text-subtle text-[40px]">
            (hoje {POR_EXTENSO[emExercicio] ?? emExercicio})
          </em>
        )}
        <br />
        que decidem os rumos
        <br />
        da República.
      </h1>

      {vagas > 0 && (
      <div className="inline-flex items-center gap-2 text-[11px] text-subtle border border-border2 rounded-sm px-3 py-[5px] mb-7">
        <span className="w-[6px] h-[6px] rounded-full border border-subtle bg-border2 flex-shrink-0" />
        {vagas === 1 ? "1 vaga aberta" : `${vagas} vagas abertas`} · Barroso
        aposentou-se voluntariamente em out/2025, e o Senado rejeitou a
        indicação de Jorge Messias em abr/2026
      </div>
      )}

      <p className="text-[14px] text-muted max-w-[520px] leading-[1.65] mb-[30px]">
        Votações, gastos e histórico institucional dos ministros do STF —
        dados públicos organizados para jornalistas, advogados e cidadãos.
      </p>

      <div className="flex gap-[10px]">
        <button className="bg-white text-canvas text-[13px] font-bold rounded-sm px-[22px] py-[11px]">
          Explorar Ministros →
        </button>
        <button className="text-[13px] font-medium text-ink border border-border2 rounded-sm px-[22px] py-[11px]">
          Como funciona
        </button>
      </div>
    </section>
  );
}
