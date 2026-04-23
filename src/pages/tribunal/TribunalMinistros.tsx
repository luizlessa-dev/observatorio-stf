import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SEO } from '@/components/shared/SEO'
import { useMinistros } from '@/hooks/useMinistros'
import { useTribunalFromPath } from '@/hooks/useTribunal'

function fmtDate(d: string | null) {
  if (!d) return '—'
  const s = String(d)
  if (s.length >= 10) {
    const [y, m, day] = s.slice(0, 10).split('-')
    return `${day}/${m}/${y}`
  }
  return s
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
        <div className="py-12 text-center text-muted-foreground">Carregando…</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ministros?.map((m) => {
            const topClasses = Object.entries(m.classes)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)

            return (
              <Card key={m.nome} className="transition-shadow hover:shadow-md">
                <CardContent className="p-5">
                  <div className="text-sm font-semibold">{m.nome}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {m.processos.toLocaleString('pt-BR')} processos · última decisão {fmtDate(m.ultimaDecisao)}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {topClasses.map(([cls, count]) => (
                      <Badge key={cls} variant="secondary" className="text-[10px]">
                        {cls} ({count})
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
