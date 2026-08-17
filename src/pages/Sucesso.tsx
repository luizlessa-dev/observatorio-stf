import { useNavigate } from "react-router-dom";

// Onda 1 (2026-08-17): esta tela dizia "Você já tem acesso a todos os
// recursos". Não existe recurso restrito no site — as policies RLS são
// `using (true)` para anon em todas as tabelas públicas. A confirmação passa a
// agradecer a contribuição, sem prometer acesso que ainda não existe.
// Quando a camada paga for lançada, esta tela é uma das que precisam mudar
// junto. Ver o comentário de enquadramento em src/pages/Assinar.tsx.
export default function PaginaSucesso() {
  const nav = useNavigate();
  return (
    <div className="flex-1 px-8 py-20 max-w-sm mx-auto text-center">
      <div className="text-[40px] mb-4">🎉</div>
      <h1 className="font-display text-[26px] font-bold text-white mb-2">
        Contribuição confirmada
      </h1>
      <p className="text-[12px] text-subtle mb-6 leading-[1.6]">
        Obrigado por sustentar o Observatório do STF. É a sua contribuição que
        paga a apuração por trás do que está publicado aqui.
      </p>
      <button
        onClick={() => nav("/")}
        className="bg-white text-canvas font-semibold text-[12px] px-6 py-[9px] rounded-sm hover:bg-white/90 transition-colors"
      >
        Ir para o Observatório
      </button>
    </div>
  );
}
