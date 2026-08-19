import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Layout from "./components/layout/Layout";
import PaginaMinistros from "./pages/Ministros";

// Achado E6: um único bundle de 505 KB, sem divisão por rota — quem abria
// /entrar baixava a tabela inteira de repercussão geral e o SDK do Stripe.
// A rota de ministros é a raiz e continua no bundle principal; as demais
// carregam sob demanda.
const PaginaProcessos   = lazy(() => import("./pages/ProcessosPoliticos"));
const PaginaRepercussao = lazy(() => import("./pages/RepercussaoGeral"));
const PaginaImpunidade  = lazy(() => import("./pages/Impunidade"));
const PaginaAssinar     = lazy(() => import("./pages/Assinar"));
const PaginaLogin       = lazy(() => import("./pages/Login"));
const PaginaSucesso     = lazy(() => import("./pages/Sucesso"));

function Carregando() {
  return (
    <div className="px-8 py-16 text-[12px] text-subtle">Carregando…</div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<Carregando />}>
        <Routes>
          <Route element={<Layout />}>
            <Route index                    element={<PaginaMinistros />} />
            <Route path="ministros"         element={<PaginaMinistros />} />
            <Route path="processos"         element={<PaginaProcessos />} />
            <Route path="repercussao-geral" element={<PaginaRepercussao />} />
            <Route path="impunidade"        element={<PaginaImpunidade />} />
            <Route path="assinar"           element={<PaginaAssinar />} />
            <Route path="entrar"            element={<PaginaLogin />} />
            <Route path="sucesso"           element={<PaginaSucesso />} />
          </Route>
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
