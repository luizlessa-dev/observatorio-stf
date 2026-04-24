import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SEO } from '@/components/shared/SEO'
import { useMinistros } from '@/hooks/useMinistros'
import { useTribunalFromPath } from '@/hooks/useTribunal'

function fmtDate(d: string | null) {
  if (!d) return '—'
  const [y, m, day] = String(d).slice(0, 10).split('-')
  return `${day}/${m}/${y}`
}

export function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function TribunalMinistros() {
  const { tribunalId, tribunal } = useTribunalFromPath()
  const { data: ministros, isLoading } = useMinistros(tribunalId)

  return (
    <div className="space-y-6">
      <SEO
        title={`Relatores — ${tribunal?.nome || tribunalId}`}
        description={`Ministros e relatores do ${tribunal?.nomeCompleto || tribunalId} com quantidade de processos e classes mais frequentes.`}
        path={`/${tribunalId.toLowerCase()}/ministros`}
        breadcrumbs={[
          { name: tribunal?.nomeCompleto || tribunalId, path: `/${tribunalId.toLowerCase()}` },
          { name: 'Relatores', path: `/${tribunalId.toLowerCase()}/ministros` },
        ]}
      />
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: tribunal?.cor }}>
          Relatores — {tribunal?.nome}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {ministros ? `${ministros.length} relatores encontrados` : 'Carregando…'}
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted/40" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ministros?.map((m) => (
            <Link
              key={m.nome}
              to={`/${tribunalId.toLowerCase()}/ministro/${slugify(m.nome)}`}
              state={{ ministro: m }}
              className="no-underline"
            >
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="p-5">
                  <div className="text-sm font-semibold leading-snug">{m.nome}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {m.processos.toLocaleString('pt-BR')} processos · última decisão {fmtDate(m.ultimaDecisao)}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {m.classePrincipal && (
                      <Badge variant="secondary" className="text-[10px]">
                        {m.classePrincipal}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
