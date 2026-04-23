import { useState } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { TRIBUNAIS_SUPERIORES, TRIBUNAIS_FEDERAIS, TRIBUNAIS_ESTADUAIS } from '@/lib/tribunais'

const NAV_MAIN = [
  { to: '/', label: 'Painel', end: true },
  ...TRIBUNAIS_SUPERIORES.map((t) => ({ to: t.path, label: t.nome })),
  { to: '/busca', label: 'Busca' },
]

export default function Layout() {
  const [open, setOpen] = useState(false)

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors hover:text-white ${
      isActive ? 'text-white' : 'text-slate-400'
    }`

  return (
    <div className="flex min-h-screen flex-col">
      <Helmet>
        <link
          rel="alternate"
          type="application/rss+xml"
          title="Observatório Judiciário — Destaques"
          href="https://judiciario.transparenciafederal.org/rss.xml"
        />
      </Helmet>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-navy-800 shadow-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <NavLink to="/" className="flex items-center gap-2.5 text-white no-underline">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-navy-700 text-xs font-bold text-gold-400">
              OJ
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold tracking-tight">Observatório Judiciário</span>
              <span className="text-[10px] font-medium uppercase tracking-widest text-gold-500">
                Brasil
              </span>
            </div>
          </NavLink>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-5 md:flex">
            {NAV_MAIN.map((item) => (
              <NavLink key={item.to} to={item.to} end={'end' in item} className={linkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Mobile menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger className="flex flex-col gap-1.5 rounded-md border border-white/15 p-2 md:hidden">
              <span className="block h-0.5 w-5 bg-white" />
              <span className="block h-0.5 w-5 bg-white" />
              <span className="block h-0.5 w-5 bg-white" />
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-navy-800 pt-12">
              <nav className="flex flex-col gap-1">
                <NavLink to="/" end onClick={() => setOpen(false)}
                  className={({ isActive }) => `rounded-md px-3 py-2.5 text-sm font-medium ${isActive ? 'bg-navy-700 text-white' : 'text-slate-400 hover:bg-navy-700 hover:text-white'}`}
                >Painel</NavLink>

                <div className="mt-3 px-3 text-[10px] font-semibold uppercase tracking-wider text-gold-500">Superiores</div>
                {TRIBUNAIS_SUPERIORES.map((t) => (
                  <NavLink key={t.id} to={t.path} onClick={() => setOpen(false)}
                    className={({ isActive }) => `rounded-md px-3 py-2 text-sm font-medium ${isActive ? 'bg-navy-700 text-white' : 'text-slate-400 hover:bg-navy-700 hover:text-white'}`}
                  >{t.nome}</NavLink>
                ))}

                <div className="mt-3 px-3 text-[10px] font-semibold uppercase tracking-wider text-gold-500">Justiça Federal</div>
                {TRIBUNAIS_FEDERAIS.map((t) => (
                  <NavLink key={t.id} to={t.path} onClick={() => setOpen(false)}
                    className={({ isActive }) => `rounded-md px-3 py-2 text-sm font-medium ${isActive ? 'bg-navy-700 text-white' : 'text-slate-400 hover:bg-navy-700 hover:text-white'}`}
                  >{t.nome}</NavLink>
                ))}

                <div className="mt-3 px-3 text-[10px] font-semibold uppercase tracking-wider text-gold-500">Justiça Estadual</div>
                {TRIBUNAIS_ESTADUAIS.map((t) => (
                  <NavLink key={t.id} to={t.path} onClick={() => setOpen(false)}
                    className={({ isActive }) => `rounded-md px-3 py-2 text-sm font-medium ${isActive ? 'bg-navy-700 text-white' : 'text-slate-400 hover:bg-navy-700 hover:text-white'}`}
                  >{t.nome}</NavLink>
                ))}

                <div className="mt-3 border-t border-white/10 pt-3">
                  <NavLink to="/busca" onClick={() => setOpen(false)}
                    className={({ isActive }) => `rounded-md px-3 py-2.5 text-sm font-medium ${isActive ? 'bg-navy-700 text-white' : 'text-slate-400 hover:bg-navy-700 hover:text-white'}`}
                  >Busca</NavLink>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-navy-900 text-slate-400">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="mb-3 text-base font-bold text-white">Observatório Judiciário</div>
              <p className="text-xs leading-relaxed text-slate-500">
                Infraestrutura pública e independente de dados do Judiciário brasileiro.
                Dados auditáveis, sem opinião política.
              </p>
            </div>
            <div>
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gold-500">Superiores</div>
              <div className="flex flex-col gap-1.5">
                {TRIBUNAIS_SUPERIORES.map((t) => (
                  <NavLink key={t.id} to={t.path} className="text-xs text-slate-500 no-underline hover:text-gold-400">{t.nomeCompleto}</NavLink>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gold-500">Justiça Federal</div>
              <div className="flex flex-col gap-1.5">
                {TRIBUNAIS_FEDERAIS.map((t) => (
                  <NavLink key={t.id} to={t.path} className="text-xs text-slate-500 no-underline hover:text-gold-400">{t.nomeCompleto}</NavLink>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gold-500">Institucional</div>
              <div className="flex flex-col gap-1.5">
                <NavLink to="/sobre" className="text-xs text-slate-500 no-underline hover:text-gold-400">Sobre</NavLink>
                <NavLink to="/metodologia" className="text-xs text-slate-500 no-underline hover:text-gold-400">Metodologia</NavLink>
                <NavLink to="/dados-abertos" className="text-xs text-slate-500 no-underline hover:text-gold-400">Dados abertos</NavLink>
                <NavLink to="/api" className="text-xs text-slate-500 no-underline hover:text-gold-400">API pública</NavLink>
                <a
                  href="/rss.xml"
                  className="inline-flex items-center gap-1 text-xs text-slate-500 no-underline hover:text-gold-400"
                  title="Feed RSS de destaques"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19.01 7.38 20 6.18 20C4.98 20 4 19.01 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1z"/></svg>
                  RSS
                </a>
              </div>
            </div>
          </div>
          <div className="mt-8 border-t border-white/5 pt-4 text-[11px] text-slate-600">
            Dados públicos do Judiciário brasileiro. Fonte: portais dos tribunais e DataJud/CNJ.
          </div>
        </div>
      </footer>
    </div>
  )
}
