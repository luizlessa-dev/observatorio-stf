import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Layout from "./components/layout/Layout";
import PaginaMinistros from "./pages/Ministros";
import PaginaProcessos from "./pages/ProcessosPoliticos";
import PaginaRepercussao from "./pages/RepercussaoGeral";
import PaginaImpunidade from "./pages/Impunidade";
import PaginaAssinar from "./pages/Assinar";
import PaginaLogin from "./pages/Login";
import PaginaSucesso from "./pages/Sucesso";

export default function App() {
  return (
    <AuthProvider>
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
    </AuthProvider>
  );
}
