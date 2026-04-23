import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { useHighlights } from '@/hooks/useHighlights'
import { getTribunal } from '@/lib/tribunais'

function fmtDate(d: string | null) {
  if (!d) return ''
  const [y, m, day] = d.slice(0, 10).split('-')
  return `${day}/${m}/${y}`
}

export function HighlightsSection() {
  const { data: highlights, isLoading } = useHighlights(5)

  if (isLoading) {
    return (
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Destaques da semana</h2>
        </div>
        <div className="h-32 animate-pulse rounded-lg bg-muted/40" />
      </section>
    )
  }

  if (!highlights || highlights.length === 0) return null

  const [featured, ...rest] = highlights

  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-lg font-semibold">Destaques da semana</h2>
          <p className="text-xs text-muted-foreground">
            Decisões curadas com maior repercussão jurídica
          </p>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Curadoria Editorial
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Destaque principal — ocupa 3 colunas */}
        {featured && <HighlightMain h={featured} />}

        {/* Lista lateral — ocupa 2 colunas */}
        <div className="space-y-3 lg:col-span-2">
          {rest.map((h) => (
            <HighlightSide key={h.id} h={h} />
          ))}
        </div>
      </div>
    </section>
  )
}

function HighlightMain({ h }: { h: ReturnType<typeof useHighlights>['data'] extends readonly (infer T)[] ? T : never }) {
  const tribunal = h.tribunal ? getTribunal(h.tribunal) : undefined
  const href = h.processo_id && h.tribunal
    ? `/${h.tribunal.toLowerCase()}/processo/${h.processo_id}`
    : h.link_externo || '#'

  return (
    <Link
      to={href}
      className="group relative flex flex-col justify-between overflow-hidden rounded-lg border bg-card p-6 no-underline transition-shadow hover:shadow-lg lg:col-span-3"
      style={{
        backgroundImage: `linear-gradient(135deg, ${tribunal?.cor}10 0%, transparent 60%)`,
      }}
    >
      <div>
        <div className="mb-3 flex items-center gap-2">
          {tribunal && (
            <Badge
              style={{ backgroundColor: tribunal.cor, color: '#fff' }}
              className="text-[10px] font-bold"
            >
              {tribunal.nome}
            </Badge>
          )}
          {h.classe && (
            <span className="text-[11px] font-medium text-muted-foreground">{h.classe}</span>
          )}
        </div>
        <h3 className="text-xl font-bold leading-tight tracking-tight text-foreground group-hover:underline">
          {h.titulo_curto}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {h.resumo.length > 240 ? `${h.resumo.slice(0, 240)}…` : h.resumo}
        </p>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>{h.relator || 'Relator não informado'}</span>
        <span>{fmtDate(h.data_decisao)}</span>
      </div>
    </Link>
  )
}

function HighlightSide({ h }: { h: ReturnType<typeof useHighlights>['data'] extends readonly (infer T)[] ? T : never }) {
  const tribunal = h.tribunal ? getTribunal(h.tribunal) : undefined
  const href = h.processo_id && h.tribunal
    ? `/${h.tribunal.toLowerCase()}/processo/${h.processo_id}`
    : h.link_externo || '#'

  return (
    <Link
      to={href}
      className="group block rounded-lg border bg-card p-4 no-underline transition-shadow hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        {tribunal && (
          <div
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-[9px] font-bold text-white"
            style={{ backgroundColor: tribunal.cor }}
          >
            {tribunal.nome}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold leading-snug group-hover:underline">
            {h.titulo_curto}
          </h4>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{h.resumo}</p>
        </div>
      </div>
    </Link>
  )
}
