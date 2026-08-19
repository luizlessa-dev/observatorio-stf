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

// Fase C1 (2026-07-26): a lista anterior prometia funcionalidades suspensas ou
// ainda não implementadas (painel de scores, alertas, exportação CSV, relatório
// PDF). A assinatura passa a ser comunicada de forma neutra, como apoio ao
// projeto, até que exista uma oferta premium real.
//
// Onda 1 (2026-08-17): a C1 limpou a lista mas deixou de pé o enquadramento —
// título "Acesso completo ao Observatório", botão "Assinar plano", e a página
// /sucesso dizendo "acesso a todos os recursos". Não existe recurso restrito:
// as policies RLS de stf_ministros, stf_gastos, stf_votacoes e
// stf_repercussao_geral são todas `using (true)` para anon. Vender "acesso" ao
// que já é aberto é publicidade enganosa (art. 37 do CDC) — e o produto é um
// veículo de fiscalização de integridade.
//
// A página passa a ser APOIO, não acesso.
//
// REGRA (temporal, não permanente): não prometa acesso, exclusividade ou área
// de assinante enquanto a funcionalidade restrita não existir E não estiver no
// ar. Uma camada paga ESTÁ no roteiro do projeto — quando ela existir, esta
// tela volta a poder falar de acesso, e os textos bloqueados em
// tests/onda-1.test.mjs devem ser liberados na mesma mudança que publica a
// funcionalidade. O que o teste impede é a promessa chegar antes da entrega,
// não a existência de uma oferta paga.
const O_QUE_O_APOIO_SUSTENTA = [
  "Coleta e checagem contínua de dados públicos do STF",
  "Custo de infraestrutura, banco de dados e ingestão automatizada",
  "Tempo de apuração e correção de erros nos dados publicados",
  "Independência editorial — sem publicidade e sem patrocínio institucional",
];

export default function FormApoio() {
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
        <h1 className="font-display text-[24px] font-bold text-white mb-2">
          Sua contribuição está ativa
        </h1>
        <p className="text-[13px] text-subtle">
          Obrigado por sustentar o Observatório do STF. Sua contribuição é o que
          mantém a apuração de pé.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-8 py-10 max-w-2xl mx-auto w-full">
      <div className="text-[11px] text-subtle mb-6">Apoio</div>

      <h1 className="font-display text-[32px] font-bold text-white leading-[1.2] mb-2">
        Apoie o Observatório
      </h1>
      <p className="text-[13px] text-subtle mb-4 max-w-md">
        Sua contribuição sustenta a coleta, a checagem e a publicação de dados
        públicos do STF. Cancele a qualquer momento.
      </p>

      <div className="border border-border2 rounded-sm bg-card px-4 py-3 mb-8 max-w-md">
        <p className="text-[12px] text-ink leading-[1.55]">
          <strong className="font-semibold text-white">Hoje não há área restrita.</strong>{" "}
          Tudo o que está publicado é aberto, e contribuir não desbloqueia nada.
          Você está financiando a apuração, não comprando acesso.
        </p>
      </div>

      {/* O que a contribuição sustenta */}
      <div className="mb-8">
        <div className="text-[9px] font-semibold uppercase tracking-[1.5px] text-subtle mb-2">
          O que sua contribuição sustenta
        </div>
        {O_QUE_O_APOIO_SUSTENTA.map((b) => (
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
        {loading ? "Aguarde…" : `Contribuir ${plano === "mensal" ? "R$ 29,90/mês" : "R$ 299,00/ano"}`}
      </button>

      <p className="text-[10px] text-subtle text-center mt-3">
        Pagamento seguro via Stripe. Cancele quando quiser.
      </p>
    </div>
  );
}
