import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { TRIBUNAIS_SUPERIORES } from '@/lib/tribunais'

const POPULAR_TRIBUNAIS = [...TRIBUNAIS_SUPERIORES, { id: 'TRF3', nome: 'TRF3', path: '/trf3', cor: '#1d4ed8' }, { id: 'TJSP', nome: 'TJSP', path: '/tjsp', cor: '#6d28d9' }]

interface Props {
  lastSync?: string
  totalProcessos?: number
  totalTribunais?: number
  totalRelatores?: number
}

export function HeroSearch({ lastSync, totalProcessos, totalTribunais, totalRelatores }: Props) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q) {
      navigate('/busca')
      return
    }
    navigate(`/busca?q=${encodeURIComponent(q)}`)
  }

  const formattedTotal = totalProcessos ? totalProcessos.toLocaleString('pt-BR') : '186.000+'

  return (
    <section className="relative -mx-4 mb-6 overflow-hidden rounded-none bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 px-4 py-10 text-white sm:-mx-6 sm:px-6 md:rounded-lg md:py-14">
      <div className="mx-auto max-w-3xl space-y-5 text-center">
        <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          O maior acervo aberto de decisões judiciais do Brasil
        </h1>

        <p className="text-sm text-white/80 sm:text-base">
          <strong>{formattedTotal}</strong> decisões
          {totalTribunais ? <> · <strong>{totalTribunais}</strong> tribunais</> : ' · 36 tribunais'}
          {totalRelatores ? <> · <strong>{totalRelatores.toLocaleString('pt-BR')}</strong> relatores</> : null}
          {' · '}atualizado diariamente
        </p>

        <form onSubmit={handleSubmit} className="mx-auto max-w-2xl">
          <div className="flex flex-col gap-2 rounded-lg bg-white p-2 shadow-lg sm:flex-row">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Busque por ementa, relator, número do processo…"
              className="flex-1 rounded-md px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              aria-label="Buscar no acervo do Observatório Judiciário"
            />
            <button
              type="submit"
              className="rounded-md bg-gold-500 px-5 py-2.5 text-sm font-semibold text-navy-900 transition hover:bg-gold-400"
              style={{ backgroundColor: '#d4af37', color: '#1e3a5f' }}
            >
              Buscar
            </button>
          </div>
        </form>

        <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs text-white/70">
          <span>Populares:</span>
          {POPULAR_TRIBUNAIS.map((t) => (
            <Link
              key={t.id}
              to={t.path}
              className="rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 font-medium text-white no-underline transition hover:bg-white/20"
            >
              {t.nome}
            </Link>
          ))}
        </div>

        {lastSync && (
          <p className="text-[11px] text-white/60">
            Última sincronização: {lastSync}
          </p>
        )}
      </div>
    </section>
  )
}
