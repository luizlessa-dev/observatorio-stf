import { Link } from 'react-router-dom'
import { StatCardsRow } from '@/components/shared/StatCards'
import { ProcessoTable } from '@/components/shared/ProcessoTable'
import { SEO } from '@/components/shared/SEO'
import { useStats, useStatsPorClasse, useStatsPorAno } from '@/hooks/useStats'
import { useProcessos } from '@/hooks/useProcessos'
import { useTribunalFromPath } from '@/hooks/useTribunal'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function TribunalDashboard() {
  const { tribunalId, tribunal } = useTribunalFromPath()
  const { data: stats } = useStats(tribunalId)
  const { data: porClasse } = useStatsPorClasse(tribunalId)
  const { data: porAno } = useStatsPorAno(tribunalId)
  const { data: recentes } = useProcessos({ tribunal: tribunalId, pageSize: 10 })

  const s = stats?.[0]

  return (
    <div className="space-y-8">
      <SEO
        title={tribunal?.nomeCompleto || tribunalId}
        description={`Dashboard do ${tribunal?.nomeCompleto || tribunalId} com estatísticas, processos recentes, decisões por classe e por ano.`}
        path={tribunal?.path || `/${tribunalId.toLowerCase()}`}
      />
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: tribunal?.cor }}>
          {tribunal?.nomeCompleto}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dashboard de processos e decisões
        </p>
      </div>

      {s && (
        <StatCardsRow
          items={[
            { label: 'Processos', value: s.total, accent: tribunal?.cor },
            { label: 'Com decisão', value: s.com_decisao },
            { label: 'Relatores', value: s.relatores },
            { label: 'Classes', value: s.classes },
          ]}
        />
      )}

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {porClasse && porClasse.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-semibold">Por classe processual</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porClasse} layout="vertical" margin={{ left: 60 }}>
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={55} />
                  <Tooltip />
                  <Bar dataKey="value" fill={tribunal?.cor} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {porAno && porAno.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-semibold">Por ano de decisão</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[...porAno].reverse()}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill={tribunal?.cor} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Recent + link */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Decisões recentes</h2>
          <Link
            to={`/${tribunalId.toLowerCase()}/processos`}
            className="text-sm font-medium no-underline hover:underline"
            style={{ color: tribunal?.cor }}
          >
            Ver todos →
          </Link>
        </div>
        <ProcessoTable processos={recentes?.data ?? []} />
      </div>

      {/* Ministros link */}
      <div className="text-center">
        <Link
          to={`/${tribunalId.toLowerCase()}/ministros`}
          className="text-sm font-medium no-underline hover:underline"
          style={{ color: tribunal?.cor }}
        >
          Ver relatores / ministros →
        </Link>
      </div>
    </div>
  )
}
