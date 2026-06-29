import { Outlet, NavLink } from "react-router-dom";
import { Scale } from "lucide-react";

const NAV = [
  { to: "/ministros",         label: "Ministros" },
  { to: "/processos",         label: "Processos Políticos" },
  { to: "/repercussao-geral", label: "Repercussão Geral" },
  { to: "/impunidade",        label: "Impunidade" },
];

export default function Layout() {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* Banner */}
      <div className="bg-card border-b border-border text-center py-[7px] px-6 text-[11px] text-muted">
        <strong className="text-ink font-semibold">Projeto independente.</strong>{" "}
        Sem vínculo com o Governo Federal. Dados de fontes públicas oficiais.
      </div>

      {/* Topbar */}
      <header className="bg-canvas border-b border-border px-8 flex items-center justify-between h-[62px]">
        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-3 no-underline">
          <BalancaSVG />
          <div>
            <div className="font-display text-[15px] font-bold text-white leading-none">
              Observatório do STF
            </div>
            <div className="text-[8.5px] text-subtle uppercase tracking-[1.5px] mt-[2px]">
              judiciário às claras
            </div>
          </div>
        </NavLink>

        {/* Nav */}
        <nav className="flex">
          {NAV.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `px-[13px] h-[62px] flex items-center text-[12px] font-medium border-b-2 transition-colors ${
                  isActive
                    ? "text-white border-white"
                    : "text-muted border-transparent hover:text-ink"
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <button className="text-[12px] font-semibold text-ink border border-border2 rounded-sm px-[18px] py-2">
          Entrar
        </button>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}

function BalancaSVG() {
  return (
    <svg width="34" height="34" viewBox="0 0 36 36" fill="none">
      <line x1="18" y1="4"  x2="18" y2="30" stroke="#f2f0e9" strokeWidth="1.2" />
      <line x1="10" y1="30" x2="26" y2="30" stroke="#f2f0e9" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="7"  y1="10" x2="29" y2="10" stroke="#f2f0e9" strokeWidth="1.2" />
      <line x1="9"  y1="10" x2="9"  y2="16" stroke="#f2f0e9" strokeWidth="1" />
      <line x1="27" y1="10" x2="27" y2="16" stroke="#f2f0e9" strokeWidth="1" />
      <path d="M5 16 Q9 19 13 16"        stroke="#f2f0e9" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M23 17.5 Q27 20.5 31 17.5" stroke="#f2f0e9" strokeWidth="1" fill="none" strokeLinecap="round" />
      <circle cx="18" cy="4" r="1.4" fill="#f2f0e9" />
    </svg>
  );
}
