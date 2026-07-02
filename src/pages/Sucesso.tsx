import { useNavigate } from "react-router-dom";

export default function PaginaSucesso() {
  const nav = useNavigate();
  return (
    <div className="flex-1 px-8 py-20 max-w-sm mx-auto text-center">
      <div className="text-[40px] mb-4">🎉</div>
      <h1 className="font-display text-[26px] font-bold text-white mb-2">Assinatura confirmada!</h1>
      <p className="text-[12px] text-subtle mb-6">
        Bem-vindo ao Observatório do STF. Você já tem acesso a todos os recursos.
      </p>
      <button
        onClick={() => nav("/")}
        className="bg-white text-canvas font-semibold text-[12px] px-6 py-[9px] rounded-sm hover:bg-white/90 transition-colors"
      >
        Acessar o Observatório
      </button>
    </div>
  );
}
