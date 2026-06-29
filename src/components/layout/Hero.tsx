export default function Hero() {
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
        <em className="not-italic text-subtle text-[40px]">(hoje dez)</em>
        <br />
        que decidem os rumos
        <br />
        da República.
      </h1>

      <div className="inline-flex items-center gap-2 text-[11px] text-subtle border border-border2 rounded-sm px-3 py-[5px] mb-7">
        <span className="w-[6px] h-[6px] rounded-full border border-subtle bg-border2 flex-shrink-0" />
        1 vaga aberta · Barroso aposentou-se voluntariamente em out/2025, aos 67 anos, após 12 anos na Corte
      </div>

      <p className="text-[14px] text-muted max-w-[520px] leading-[1.65] mb-[30px]">
        Votações, gastos, redes de indicação e tendências de voto dos ministros
        do STF — dados públicos organizados para jornalistas, advogados e
        cidadãos.
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
