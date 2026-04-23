import { useState, useMemo, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { ProcessoTable } from '@/components/shared/ProcessoTable'
import { SEO } from '@/components/shared/SEO'
import { useProcessos } from '@/hooks/useProcessos'
import { useClassesFiltro } from '@/hooks/useFiltros'
import { TRIBUNAIS_SUPERIORES, TRIBUNAIS_FEDERAIS, TRIBUNAIS_ESTADUAIS } from '@/lib/tribunais'
import { exportProcessosToCSV, fetchProcessosForExport } from '@/lib/exportCSV'
import { NewsletterForm } from '@/components/shared/NewsletterForm'
import { AdSlot } from '@/components/shared/AdSlot'
import { AlertaForm } from '@/components/shared/AlertaForm'

interface Filters {
  q: string
  tribunal: string
  classe: string
  relator: string
  dataInicio: string
  dataFim: string
}

const EMPTY_FILTERS: Filters = {
  q: '',
  tribunal: '',
  classe: '',
  relator: '',
  dataInicio: '',
  dataFim: '',
}

/** Sugestões de busca para o empty state */
const QUICK_SEARCHES = [
  { label: 'Habeas corpus STF', q: 'habeas corpus', tribunal: 'STF' },
  { label: 'Licitação TCU', q: 'licitação contrato', tribunal: 'TCU' },
  { label: 'FGTS TST', q: 'FGTS', tribunal: 'TST' },
  { label: 'Recurso especial STJ', q: 'recurso especial', tribunal: 'STJ' },
]

export default function BuscaPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQ = searchParams.get('q') || ''
  const initialTribunal = searchParams.get('tribunal') || ''

  const [draft, setDraft] = useState<Filters>({
    ...EMPTY_FILTERS,
    q: initialQ,
    tribunal: initialTribunal,
  })
  const [applied, setApplied] = useState<Filters>({
    ...EMPTY_FILTERS,
    q: initialQ,
    tribunal: initialTribunal,
  })
  const [page, setPage] = useState(0)
  const [isExporting, setIsExporting] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(
    !!(initialTribunal || searchParams.get('classe') || searchParams.get('relator')),
  )

  // Sincroniza URL → state (navegação para trás/frente)
  useEffect(() => {
    const q = searchParams.get('q') || ''
    const tribunal = searchParams.get('tribunal') || ''
    if (q !== applied.q || tribunal !== applied.tribunal) {
      const f = { ...EMPTY_FILTERS, q, tribunal }
      setDraft(f)
      setApplied(f)
      setPage(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const { data: classesOptions } = useClassesFiltro(
    (applied.tribunal as Parameters<typeof useClassesFiltro>[0]) || undefined,
  )

  // Últimas decisões para empty state (sem filtros)
  const { data: recentes, isLoading: loadingRecentes } = useProcessos({
    page: 0,
    pageSize: 10,
  })

  const { data, isLoading } = useProcessos({
    search: applied.q || undefined,
    tribunal: applied.tribunal as Parameters<typeof useProcessos>[0]['tribunal'] || undefined,
    classe: applied.classe || undefined,
    relator: applied.relator || undefined,
    dataInicio: applied.dataInicio || undefined,
    dataFim: applied.dataFim || undefined,
    page,
    pageSize: 50,
  })

  const totalPages = data ? Math.ceil(data.count / 50) : 0

  const hasFilters = useMemo(
    () => Object.values(applied).some((v) => v.length > 0),
    [applied],
  )

  function updateField<K extends keyof Filters>(key: K, value: Filters[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }))
    // Resetar classe ao trocar tribunal
    if (key === 'tribunal') setDraft((prev) => ({ ...prev, tribunal: value as string, classe: '' }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setApplied(draft)
    setPage(0)
    // Atualiza URL (compartilhável)
    const params: Record<string, string> = {}
    if (draft.q) params.q = draft.q
    if (draft.tribunal) params.tribunal = draft.tribunal
    if (draft.classe) params.classe = draft.classe
    if (draft.relator) params.relator = draft.relator
    if (draft.dataInicio) params.dataInicio = draft.dataInicio
    if (draft.dataFim) params.dataFim = draft.dataFim
    setSearchParams(params, { replace: true })
  }

  function removeFilter(key: keyof Filters) {
    const next = { ...applied, [key]: '' }
    setApplied(next)
    setDraft(next)
    setPage(0)
    const params: Record<string, string> = {}
    Object.entries(next).forEach(([k, v]) => { if (v) params[k] = v })
    setSearchParams(params, { replace: true })
  }

  function handleClear() {
    setDraft(EMPTY_FILTERS)
    setApplied(EMPTY_FILTERS)
    setPage(0)
    setSearchParams({}, { replace: true })
  }

  const applyQuick = useCallback(({ q, tribunal }: { q: string; tribunal: string }) => {
    const f = { ...EMPTY_FILTERS, q, tribunal }
    setDraft(f)
    setApplied(f)
    setPage(0)
    setSearchParams({ q, tribunal }, { replace: true })
  }, [setSearchParams])

  async function handleExport() {
    setIsExporting(true)
    try {
      const rows = await fetchProcessosForExport({
        search: applied.q || undefined,
        tribunal: applied.tribunal || undefined,
        classe: applied.classe || undefined,
        relator: applied.relator || undefined,
        dataInicio: applied.dataInicio || undefined,
        dataFim: applied.dataFim || undefined,
      })
      const label = applied.tribunal || 'todos'
      const date = new Date().toISOString().slice(0, 10)
      exportProcessosToCSV(rows, `processos-${label}-${date}.csv`)
    } catch (err) {
      console.error('Erro ao exportar CSV:', err)
    } finally {
      setIsExporting(false)
    }
  }

  const activePills: { key: keyof Filters; label: string }[] = [
    applied.q ? { key: 'q', label: `"${applied.q}"` } : null,
    applied.tribunal ? { key: 'tribunal', label: `tribunal: ${applied.tribunal}` } : null,
    applied.classe ? { key: 'classe', label: `classe: ${applied.classe}` } : null,
    applied.relator ? { key: 'relator', label: `relator: ${applied.relator}` } : null,
    applied.dataInicio ? { key: 'dataInicio', label: `de: ${applied.dataInicio}` } : null,
    applied.dataFim ? { key: 'dataFim', label: `até: ${applied.dataFim}` } : null,
  ].filter(Boolean) as { key: keyof Filters; label: string }[]

  return (
    <div className="space-y-6">
      <SEO
        title="Busca de Processos"
        description="Pesquise processos judiciais em todos os tribunais brasileiros por ementa, tema, relator, classe e período."
        path="/busca"
      />

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Busca</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pesquise em mais de 190 mil decisões de 37 tribunais
        </p>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex gap-2">
          <Input
            placeholder="Buscar por ementa, tema, número do processo…"
            value={draft.q}
            onChange={(e) => setDraft((p) => ({ ...p, q: e.target.value }))}
            className="flex-1"
            autoFocus
          />
          <button
            type="submit"
            className="rounded-md bg-navy-800 px-4 py-2 text-sm font-medium text-white hover:bg-navy-700"
          >
            Buscar
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {showAdvanced ? '− Ocultar filtros' : '+ Filtros avançados'}
          </button>
          {hasFilters && (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs font-medium text-destructive/70 hover:text-destructive"
            >
              Limpar tudo
            </button>
          )}
        </div>

        {showAdvanced && (
          <div className="grid gap-4 border-t pt-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Tribunal */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Tribunal</label>
              <select
                value={draft.tribunal}
                onChange={(e) => updateField('tribunal', e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">Todos os tribunais</option>
                <optgroup label="Superiores">
                  {TRIBUNAIS_SUPERIORES.map((t) => (
                    <option key={t.id} value={t.id}>{t.nome} — {t.nomeCompleto}</option>
                  ))}
                </optgroup>
                <optgroup label="Justiça Federal">
                  {TRIBUNAIS_FEDERAIS.map((t) => (
                    <option key={t.id} value={t.id}>{t.nome} — {t.nomeCompleto}</option>
                  ))}
                </optgroup>
                <optgroup label="Justiça Estadual">
                  {TRIBUNAIS_ESTADUAIS.map((t) => (
                    <option key={t.id} value={t.id}>{t.nome} — {t.nomeCompleto}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Classe */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Classe</label>
              <select
                value={draft.classe}
                onChange={(e) => updateField('classe', e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">Todas as classes</option>
                {classesOptions?.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.count.toLocaleString('pt-BR')})
                  </option>
                ))}
              </select>
            </div>

            {/* Relator */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Relator</label>
              <Input
                placeholder="Nome do relator…"
                value={draft.relator}
                onChange={(e) => updateField('relator', e.target.value)}
              />
            </div>

            {/* Data início */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Decisão a partir de</label>
              <Input
                type="date"
                value={draft.dataInicio}
                onChange={(e) => updateField('dataInicio', e.target.value)}
              />
            </div>

            {/* Data fim */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Decisão até</label>
              <Input
                type="date"
                value={draft.dataFim}
                onChange={(e) => updateField('dataFim', e.target.value)}
              />
            </div>
          </div>
        )}
      </form>

      {/* Pills de filtros ativos — clicáveis para remover */}
      {activePills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activePills.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => removeFilter(key)}
              className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-0.5 text-xs font-medium hover:border-destructive/50 hover:text-destructive"
              title="Remover filtro"
            >
              {label}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          ))}
        </div>
      )}

      {/* Resultados */}
      {hasFilters ? (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {isLoading
                ? 'Buscando…'
                : `${(data?.count ?? 0).toLocaleString('pt-BR')} resultado${(data?.count ?? 0) !== 1 ? 's' : ''}`}
            </p>
            {(data?.count ?? 0) > 0 && (
              <button
                type="button"
                onClick={handleExport}
                disabled={isExporting}
                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
                title="Baixar até 500 resultados em CSV"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                {isExporting ? 'Exportando…' : 'Baixar CSV'}
              </button>
            )}
          </div>

          <ProcessoTable processos={data?.data ?? []} showTribunal />

          {/* Ad após a tabela — não interrompe fluxo, usuário já consumiu conteúdo */}
          <AdSlot slot="busca-results-bottom" format="horizontal" />

          {/* Alerta — só quando há busca por texto */}
          {applied.q && (
            <AlertaForm
              termoBusca={applied.q}
              tribunal={applied.tribunal || undefined}
              variant="inline"
              className="rounded-xl border bg-amber-50/60 p-4"
            />
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => { setPage((p) => Math.max(0, p - 1)); window.scrollTo(0, 0) }}
                disabled={page === 0}
                className="rounded border px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-muted"
              >
                ← Anterior
              </button>
              <span className="text-sm text-muted-foreground">
                {page + 1} / {totalPages.toLocaleString('pt-BR')}
              </span>
              <button
                onClick={() => { setPage((p) => Math.min(totalPages - 1, p + 1)); window.scrollTo(0, 0) }}
                disabled={page >= totalPages - 1}
                className="rounded border px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-muted"
              >
                Próxima →
              </button>
            </div>
          )}
        </>
      ) : (
        /* Empty state — sugestões + últimas decisões */
        <div className="space-y-8">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pesquisas rápidas
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_SEARCHES.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => applyQuick(s)}
                  className="rounded-full border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Decisões recentes
            </p>
            {loadingRecentes ? (
              <div className="h-40 animate-pulse rounded-lg bg-muted/40" />
            ) : (
              <ProcessoTable processos={recentes?.data ?? []} showTribunal />
            )}
          </div>

          <NewsletterForm />
        </div>
      )}
    </div>
  )
}
