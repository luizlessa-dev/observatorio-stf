import { useState } from "react";
import { signInWithEmail } from "../lib/auth";

export default function PaginaLogin() {
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

      <input
        type="email"
        placeholder="seu@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && entrar()}
        className="w-full bg-card border border-border rounded-sm px-4 py-[10px] text-[12px] text-ink placeholder:text-subtle outline-none focus:border-white/20 mb-3"
      />

      {erro && <p className="text-[11px] text-red-400 mb-3">{erro}</p>}

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
