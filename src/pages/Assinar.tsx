import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

const PLANOS = [
  {
    id:     "mensal" as const,
    label:  "Mensal",
    preco:  "R$ 29,90",
    sub:    "por mês",
    detalhe:"Cancele quando quiser",
  },
  {
    id:     "anual" as const,
    label:  "Anual",
    preco:  "R$ 299,00",
    sub:    "por ano",
    detalhe:"Equivale a R$ 24,90/mês",
    destaque: true,
  },
];

const BENEFICIOS = [
  "Exportar votações de qualquer ministro em CSV",
  "Histórico completo de votações por processo",
  "Alertas de novos julgamentos por tema",
  "Painel de scores G5 com detalhamento por dimensão",
  "Relatório mensal em PDF",
  "Acesso antecipado a novos módulos",
];

export default function PaginaAssinar() {
  const { user, assinante } = useAuth();
  const [plano,    setPlano]    = useState<"mensal" | "anual">("anual");
  const [email,    setEmail]    = useState(user?.email ?? "");
  const [loading,  setLoading]  = useState(false);
  const [erro,     setErro]     = useState("");

  async function assinar() {
    setErro("");
    if (!email.includes("@")) { setErro("E-mail inválido"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ plano, email }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setErro(data.error ?? "Erro ao iniciar pagamento");
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (assinante) {
    return (
      <div className="flex-1 px-8 py-16 max-w-lg mx-auto text-center">
        <div className="text-[32px] mb-3">✓</div>
        <h1 className="font-display text-[24px] font-bold text-white mb-2">Você já é assinante</h1>
        <p className="text-[13px] text-subtle">
          Seu acesso completo ao Observatório do STF está ativo.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-8 py-10 max-w-2xl mx-auto w-full">
      <div className="text-[11px] text-subtle mb-6">Assinatura</div>

      <h1 className="font-display text-[32px] font-bold text-white leading-[1.2] mb-2">
        Acesso completo ao Observatório
      </h1>
      <p className="text-[13px] text-subtle mb-8 max-w-md">
        Dados do STF organizados e atualizados diariamente. Assinatura cancela a qualquer momento.
      </p>

      {/* Benefícios */}
      <div className="mb-8">
        {BENEFICIOS.map((b) => (
          <div key={b} className="flex items-start gap-[10px] py-[7px] border-b border-border last:border-0">
            <span className="text-[10px] text-white/40 mt-[2px] flex-shrink-0">✓</span>
            <span className="text-[12px] text-muted">{b}</span>
          </div>
        ))}
      </div>

      {/* Seleção de plano */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {PLANOS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPlano(p.id)}
            className={`relative border rounded-sm px-5 py-4 text-left transition-colors ${
              plano === p.id
                ? "border-white/40 bg-white/5"
                : "border-border hover:border-border2"
            }`}
          >
            {p.destaque && (
              <span className="absolute top-2 right-2 text-[9px] font-semibold uppercase tracking-[0.8px] text-white/50 border border-white/20 rounded-sm px-[6px] py-[2px]">
                Melhor valor
              </span>
            )}
            <div className="text-[10px] font-semibold uppercase tracking-[1px] text-subtle mb-1">{p.label}</div>
            <div className="font-display text-[22px] font-bold text-white leading-none">{p.preco}</div>
            <div className="text-[10px] text-subtle mt-[3px]">{p.sub}</div>
            <div className="text-[10px] text-white/40 mt-[6px]">{p.detalhe}</div>
          </button>
        ))}
      </div>

      {/* E-mail + CTA */}
      {!user && (
        <input
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-card border border-border rounded-sm px-4 py-[10px] text-[12px] text-ink placeholder:text-subtle outline-none focus:border-white/20 mb-3"
        />
      )}

      {erro && <p className="text-[11px] text-red-400 mb-3">{erro}</p>}

      <button
        onClick={assinar}
        disabled={loading}
        className="w-full bg-white text-canvas font-semibold text-[13px] py-[11px] rounded-sm hover:bg-white/90 transition-colors disabled:opacity-50"
      >
        {loading ? "Aguarde…" : `Assinar plano ${plano} — ${plano === "mensal" ? "R$ 29,90/mês" : "R$ 299,00/ano"}`}
      </button>

      <p className="text-[10px] text-subtle text-center mt-3">
        Pagamento seguro via Stripe. Cancele quando quiser.
      </p>
    </div>
  );
}
