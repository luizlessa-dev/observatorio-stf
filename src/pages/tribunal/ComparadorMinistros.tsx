/**
 * /[tribunal]/comparar?a=slug-ministro-a&b=slug-ministro-b
 *
 * Comparação lado-a-lado de dois relatores: total, classes, decisões recentes.
 */
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SEO } from '@/components/shared/SEO'
import { useTribunalFromPath } from '@/hooks/useTribunal'
import { useMinistros } from '@/hooks/useMinistros'
import { useProcessos } from '@/hooks/useProcessos'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'

// ─── Mini stat card ──────────────────────────────────────────────────────────
function StatCell({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums" style={{ color }}>
        {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
      </p>
    </div>
  )
}

// ─── Painel de um ministro ───────────────────────────────────────────────────
function MinistroPanel({
  tribunalId,
  nome,
  color,
}: {
  tribunalId: string
  nome: string
  color?: string
}) {
  const { data: ministros } = useMinistros(tribunalId as Parameters<typeof useMinistros>[0])
  const { data: processos } = useProcessos({
    tribunal: tribunalId as Parameters<typeof useProcessos>[0]['tribunal'],
    relator: nome,
    pageSize: 5,
  })

  const stats = ministros?.find((m) => m.nome === nome)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div
        className="rounded-xl p-4 text-white"
        style={{ background: color ?? '#1e3a5f' }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider opacity-70">Relator</p>
        <p className="mt-0.5 text-lg font-bold leading-tight">{nome}</p>
        <p className="mt-1 text-xs opacity-70">{tribunalId}</p>
      </div>

      {/* Stats */}
      {stats ? (
        <div className="grid grid-cols-2 gap-2">
          <StatCell label="Total de processos" value={stats.processos ?? 0} color={color} />
          <StatCell label="Com decisão" value={stats.comDecisao ?? 0} color={color} />
          <StatCell
            label="Última decisão"
            value={stats.ultimaDecisao ? stats.ultimaDecisao.slice(0, 10).split('-').reverse().join('/') : '—'}
          />
          <StatCell label="Classe principal" value={stats.classePrincipal ?? '—'} />
        </div>
      ) : (
        <div className="h-24 animate-pulse rounded-lg bg-muted/40" />
      )}

      {/* Últimas decisões */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Últimas decisões
        </p>
        <div className="divide-y rounded-xl border bg-card">
          {processos?.data.length === 0 && (
            <p className="px-4 py-3 text-xs text-muted-foreground">Nenhum processo encontrado.</p>
          )}
          {processos?.data.slice(0, 5).map((p) => (
            <a
              key={p.id}
              href={`/${tribunalId.toLowerCase()}/processo/${p.id}`}
              className="block px-4 py-2.5 hover:bg-muted/50"
            >
              <p className="text-xs font-medium">{p.classe} {p.numero_processo}</p>
              <p className="text-xs text-muted-foreground line-clamp-1">{p.ementa ?? p.tema ?? '—'}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Seletor de ministro ─────────────────────────────────────────────────────
function MinistroSelector({
  tribunalId,
  value,
  onChange,
  label,
}: {
  tribunalId: string
  value: string
  onChange: (nome: string) => void
  label: string
}) {
  const { data: ministros, isLoading } = useMinistros(
    tribunalId as Parameters<typeof useMinistros>[0],
  )
  const [q, setQ] = useState('')

  const filtered = (ministros ?? []).filter((m) =>
    m.nome.toLowerCase().includes(q.toLowerCase()),
  )

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <input
        type="text"
        placeholder="Filtrar por nome…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
      />
      <div className="max-h-48 overflow-y-auto rounded-md border divide-y">
        {isLoading && <p className="px-3 py-2 text-xs text-muted-foreground">Carregando…</p>}
        {filtered.slice(0, 30).map((m) => (
          <button
            key={m.nome}
            type="button"
            onClick={() => onChange(m.nome)}
            className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/50 ${
              value === m.nome ? 'bg-muted font-medium' : ''
            }`}
          >
            <span>{m.nome}</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {(m.processos ?? 0).toLocaleString('pt-BR')}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Gráfico comparativo ──────────────────────────────────────────────────────
function GraficoComparativo({
  nomeA, nomeB, tribunalId, corA, corB,
}: {
  nomeA: string; nomeB: string; tribunalId: string; corA: string; corB: string
}) {
  const { data: ministros } = useMinistros(tribunalId as Parameters<typeof useMinistros>[0])
  const statsA = ministros?.find((m) => m.nome === nomeA)
  const statsB = ministros?.find((m) => m.nome === nomeB)

  if (!statsA || !statsB) return null

  const data = [
    { label: 'Total', a: statsA.processos ?? 0, b: statsB.processos ?? 0 },
    { label: 'Com decisão', a: statsA.comDecisao ?? 0, b: statsB.comDecisao ?? 0 },
  ]

  const shortA = nomeA.split(' ').at(-1) ?? nomeA
  const shortB = nomeB.split(' ').at(-1) ?? nomeB

  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Comparação
      </p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} barCategoryGap="30%">
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} width={50} />
          <Tooltip formatter={(val, name) => [Number(val).toLocaleString('pt-BR'), name === 'a' ? shortA : shortB]} />
          <Bar dataKey="a" name="a" fill={corA} radius={[4, 4, 0, 0]} />
          <Bar dataKey="b" name="b" fill={corB} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 flex justify-center gap-6 text-xs">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: corA }} />
          {shortA}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: corB }} />
          {shortB}
        </span>
      </div>
    </div>
  )
}

// ─── Página principal ────────────────────────────────────────────────────────
export default function ComparadorMinistros() {
  const { tribunalId, tribunal } = useTribunalFromPath()
  const [searchParams, setSearchParams] = useSearchParams()

  const [nomeA, setNomeA] = useState(searchParams.get('a') || '')
  const [nomeB, setNomeB] = useState(searchParams.get('b') || '')
  const [showSelectors, setShowSelectors] = useState(!nomeA || !nomeB)

  // Sincroniza nomes → URL
  useEffect(() => {
    const params: Record<string, string> = {}
    if (nomeA) params.a = nomeA
    if (nomeB) params.b = nomeB
    setSearchParams(params, { replace: true })
  }, [nomeA, nomeB, setSearchParams])

  const cor = tribunal?.cor ?? '#1e3a5f'
  // Segunda cor: complementar (tom mais claro)
  const corA = cor
  const corB = '#d4af37'

  const comparing = !!(nomeA && nomeB)

  return (
    <div className="space-y-6">
      <SEO
        title={`Comparador — ${tribunal?.nome || tribunalId}`}
        description={`Compare a atuação de dois relatores/ministros do ${tribunal?.nomeCompleto || tribunalId}.`}
        path={`/${tribunalId.toLowerCase()}/comparar`}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: cor }}>
            Comparador — {tribunal?.nome}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Compare a atuação de dois relatores lado a lado
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowSelectors((v) => !v)}
          className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
        >
          {showSelectors ? 'Ocultar seleção' : 'Trocar relatores'}
        </button>
      </div>

      {/* Seletores */}
      {showSelectors && (
        <div className="grid gap-4 rounded-xl border bg-card p-4 shadow-sm sm:grid-cols-2">
          <MinistroSelector
            tribunalId={tribunalId}
            value={nomeA}
            onChange={(n) => { setNomeA(n); if (nomeB) setShowSelectors(false) }}
            label="Relator A"
          />
          <MinistroSelector
            tribunalId={tribunalId}
            value={nomeB}
            onChange={(n) => { setNomeB(n); if (nomeA) setShowSelectors(false) }}
            label="Relator B"
          />
        </div>
      )}

      {/* Nenhum selecionado */}
      {!comparing && !showSelectors && (
        <div className="rounded-xl border bg-muted/20 py-12 text-center text-sm text-muted-foreground">
          Selecione dois relatores acima para comparar.
        </div>
      )}

      {/* Comparação */}
      {comparing && (
        <>
          {/* Gráfico */}
          <GraficoComparativo
            nomeA={nomeA} nomeB={nomeB}
            tribunalId={tribunalId} corA={corA} corB={corB}
          />

          {/* Painéis lado a lado */}
          <div className="grid gap-6 md:grid-cols-2">
            <MinistroPanel tribunalId={tribunalId} nome={nomeA} color={corA} />
            <MinistroPanel tribunalId={tribunalId} nome={nomeB} color={corB} />
          </div>
        </>
      )}
    </div>
  )
}
