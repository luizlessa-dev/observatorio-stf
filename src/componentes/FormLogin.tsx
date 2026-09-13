import { useState } from "react";
import { signInWithEmail } from "../lib/auth";

export default function FormLogin() {
  const [email,   setEmail]   = useState("");
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro,    setErro]    = useState("");

  async function entrar() {
    setErro("");
    if (!email.includes("@")) { setErro("E-mail inválido"); return; }
    setLoading(true);
    const { error } = await signInWithEmail(email);
    setLoading(false);
    if (error) setErro(error.message);
    else setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="flex-1 px-8 py-16 max-w-sm mx-auto text-center">
        <div className="text-[32px] mb-4">✉️</div>
        <h1 className="font-display text-[22px] font-bold text-white mb-2">Verifique seu e-mail</h1>
        <p className="text-[12px] text-subtle">
          Enviamos um link de acesso para <strong className="text-ink">{email}</strong>.
          Clique no link para entrar.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 px-8 py-16 max-w-sm mx-auto">
      <h1 className="font-display text-[26px] font-bold text-white mb-1">Entrar</h1>
      <p className="text-[12px] text-subtle mb-6">
        Enviaremos um link de acesso para o seu e-mail.
      </p>

      <label htmlFor="email-login" className="block text-[10px] font-semibold uppercase tracking-[1px] text-subtle mb-[6px]">
        E-mail
      </label>
      <input
        id="email-login"
        type="email"
        placeholder="seu@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && entrar()}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? "erro-login" : undefined}
        className="w-full bg-card border border-border rounded-sm px-4 py-[10px] text-[12px] text-ink placeholder:text-subtle outline-none focus-visible:border-white/40 focus-visible:ring-2 focus-visible:ring-white/30 mb-3"
      />

      {erro && <p id="erro-login" role="alert" className="text-[11px] text-red-400 mb-3">{erro}</p>}

      <button
        onClick={entrar}
        disabled={loading}
        className="w-full bg-white text-canvas font-semibold text-[13px] py-[10px] rounded-sm hover:bg-white/90 transition-colors disabled:opacity-50"
      >
        {loading ? "Enviando…" : "Enviar link de acesso"}
      </button>
    </div>
  );
}
