import { Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import PaginaMinistros from "./pages/Ministros";
import PaginaProcessos from "./pages/ProcessosPoliticos";
import PaginaRepercussao from "./pages/RepercussaoGeral";
import PaginaImpunidade from "./pages/Impunidade";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index          element={<PaginaMinistros />} />
        <Route path="ministros"         element={<PaginaMinistros />} />
        <Route path="processos"         element={<PaginaProcessos />} />
        <Route path="repercussao-geral" element={<PaginaRepercussao />} />
        <Route path="impunidade"        element={<PaginaImpunidade />} />
      </Route>
    </Routes>
  );
}
