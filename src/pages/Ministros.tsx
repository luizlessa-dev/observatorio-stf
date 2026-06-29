import { useState, useEffect } from "react";
import Hero from "../components/layout/Hero";
import StatsStrip from "../components/layout/StatsStrip";
import MinistroSidebar from "../components/ministros/MinistroSidebar";
import MinistroDetalhe from "../components/ministros/MinistroDetalhe";
import { useMinistros } from "../hooks/useMinistros";

export default function PaginaMinistros() {
  const { ministros, loading } = useMinistros();
  const [selecionado, setSelecionado] = useState(ministros[0]);

  // Quando os dados do banco chegarem, atualiza o selecionado para a versão real
  useEffect(() => {
    if (ministros.length > 0) {
      setSelecionado((prev) => ministros.find((m) => m.id === prev?.id) ?? ministros[0]);
    }
  }, [ministros]);

  return (
    <>
      <Hero />
      <StatsStrip />
      <div className="flex" style={{ minHeight: "600px" }}>
        <MinistroSidebar
          ministros={ministros}
          selecionado={selecionado}
          onSelect={setSelecionado}
          loading={loading}
        />
        <MinistroDetalhe ministro={selecionado} />
      </div>
    </>
  );
}
