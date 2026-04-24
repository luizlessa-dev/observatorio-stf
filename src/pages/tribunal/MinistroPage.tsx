/**
 * /[tribunal]/ministro/[slug] — Perfil individual de relator/ministro
 */
import { useParams, useLocation, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { SEO } from '@/components/shared/SEO'
import { ProcessoTable } from '@/components/shared/ProcessoTable'
import { StatCardsRow } from '@/components/shared/StatCards'
import { useTribunalFromPath } from '@/hooks/useTribunal'
import { useProcessos } from '@/hooks/useProcessos'
import { supabase } from '@/lib/supabase'
import type { MinistroSummary } from '@/hooks/useMinistros'

function fmtDate(d: string | null) {
  if (!d) return '—'
  const [y, m, day] = String(d).slice(0, 10).split('-')
  return `${day}/${m}/${y}`
}

/** Stats de classe para um relator específico */
function useMinistroClasses(tribunal: string, relator: string) {
  return useQuery({
    queryKey: ['ministro-classes', tribunal, relator],
    staleTime: 10 * 60 * 1000,
    enabled: !!relator,
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase não configurado')
      const { data, error } = await supabase
        .from('stats_por_classe_tribunal')
        .select('classe, total')
        .eq('tribunal', tribunal)
        .order('total', { ascending: false })
        .limit(10)
      if (error) throw error

      // Busca processos do relator para cruzar com as classes do tribunal
      const { data: relData, error: relError } = await supabase
        .from('processos_publico')
        .select('classe')
        .eq('tribunal', tribunal)
        .eq('relator', relator)
        .not('classe', 'is', null)
      if (relError) throw relError

      const counts: Record<string, number> = {}
      for (const r of relData ?? []) {
        const c = String(r.classe)
        counts[c] = (counts[c] || 0) + 1
      }

      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, value]) => ({ name, value }))
    },
  })
}

/** Stats por ano para um relator específico */
function useMinistroAnos(tribunal: string, relator: string) {
  return useQuery({
    queryKey: ['ministro-anos', tribunal, relator],
    staleTime: 10 * 60 * 1000,
    enabled: !!relator,
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase não configurado')
      const { data, error } = await supabase
        .from('processos_publico')
        .select('data_decisao')
        .eq('tribunal', tribunal)
        .eq('relator', relator)
        .not('data_decisao', 'is', null)
      if (error) throw error

      const counts: Record<string, number> = {}
      for (const r of data ?? []) {
        const year = String(r.data_decisao).slice(0, 4)
        counts[year] = (counts[year] || 0) + 1
      }

      return Object.entries(counts)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name, value]) => ({ name, value }))
    },
  })
}

export default function MinistroPage() {
  const { slug } = useParams<{ slug: string }>()
  const location = useLocation()
  const { tribunalId, tribunal } = useTribunalFromPath()

  // Se vier via Link state, já temos os dados básicos
  const stateMinistro = location.state?.ministro as MinistroSummary | undefined

  // Reconstrói o nome do relator a partir do slug (state tem o nome real)
  const relatorNome = stateMinistro?.nome ?? slug ?? ''

  const { data: classes, isLoading: loadingClasses } = useMinistroClasses(tribunalId, relatorNome)
  const { data: anos } = useMinistroAnos(tribunalId, relatorNome)
  const { data: recentes } = useProcessos({ tribunal: tribunalId, relator: relatorNome, pageSize: 10 })

  const cor = tribunal?.cor ?? '#1e3a5f'
  const totalProcessos = stateMinistro?.processos ?? recentes?.count ?? 0

  return (
    <div className="space-y-8">
      <SEO
        title={`${relatorNome} — ${tribunal?.nome}`}
        description={`Perfil decisório de ${relatorNome} no ${tribunal?.nomeCompleto}. ${totalProcessos} processos relatados.`}
        path={`/${tribunalId.toLowerCase()}/ministro/${slug}`}
        breadcrumbs={[
          { name: tribunal?.nomeCompleto || tribunalId, path: `/${tribunalId.toLowerCase()}` },
          { name: 'Relatores', path: `/${tribunalId.toLowerCase()}/ministros` },
          { name: relatorNome, path: `/${tribunalId.toLowerCase()}/ministro/${slug}` },
        ]}
      />

      {/* Header */}
      <div>
        <Link
          to={`/${tribunalId.toLowerCase()}/ministros`}
          className="mb-3 inline-block text-xs text-muted-foreground no-underline hover:underline"
        >
          ← Todos os relatores
        </Link>
        <div className="flex items-start gap-4">
          <div
            className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
            style={{ backgroundColor: cor }}
          >
            {tribunal?.nome}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{relatorNome}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {tribunal?.nomeCompleto}
              {stateMinistro?.ultimaDecisao && ` · última decisão ${fmtDate(stateMinistro.ultimaDecisao)}`}
            </p>
            {stateMinistro?.classePrincipal && (
              <Badge
                className="mt-2 text-[10px]"
                style={{ backgroundColor: cor, color: '#fff' }}
              >
                {stateMinistro.classePrincipal}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      {stateMinistro && (
        <StatCardsRow
          items={[
            { label: 'Processos relatados', value: stateMinistro.processos, accent: cor },
            { label: 'Com data de decisão', value: stateMinistro.comDecisao },
            {
              label: '% com decisão',
              value: stateMinistro.processos
                ? `${Math.round((stateMinistro.comDecisao / stateMinistro.processos) * 100)}%`
                : '—',
            },
          ]}
        />
      )}

      {/* Gráficos */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Por classe */}
        <div>
          <h3 className="mb-3 text-sm font-semibold">Distribuição por classe</h3>
          {loadingClasses ? (
            <div className="h-48 animate-pulse rounded-lg bg-muted/40" />
          ) : classes && classes.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classes} layout="vertical" margin={{ left: 80 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    width={75}
                    tickFormatter={(v: string) => v.length > 12 ? `${v.slice(0, 12)}…` : v}
                  />
                  <Tooltip />
                  <Bar dataKey="value" fill={cor} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sem dados de classe</p>
          )}
        </div>

        {/* Por ano */}
        {anos && anos.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-semibold">Decisões por ano</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={anos}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill={cor} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Processos recentes */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Decisões recentes</h2>
          {recentes?.count != null && (
            <span className="text-sm text-muted-foreground">
              {recentes.count.toLocaleString('pt-BR')} total
            </span>
          )}
        </div>
        <ProcessoTable processos={recentes?.data ?? []} />
      </div>
    </div>
  )
}
