import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { ProcessoTable } from '@/components/shared/ProcessoTable'
import { SEO } from '@/components/shared/SEO'
import { useProcessos } from '@/hooks/useProcessos'
import { useClassesFiltro } from '@/hooks/useFiltros'
import { TRIBUNAIS_SUPERIORES, TRIBUNAIS_FEDERAIS, TRIBUNAIS_ESTADUAIS } from '@/lib/tribunais'

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

export default function BuscaPage() {
  const [searchParams] = useSearchParams()
  const initialQ = searchParams.get('q') || ''
  const initialFilters: Filters = { ...EMPTY_FILTERS, q: initialQ }

  const [draft, setDraft] = useState<Filters>(initialFilters)
  const [applied, setApplied] = useState<Filters>(initialFilters)
  const [page, setPage] = useState(0)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Se a URL mudar (usuário navegando), refletir no form
  useEffect(() => {
    if (initialQ && initialQ !== applied.q) {
      const f = { ...EMPTY_FILTERS, q: initialQ }
      setDraft(f)
      setApplied(f)
      setPage(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQ])

  const { data: classesOptions } = useClassesFiltro(applied.tribunal || undefined)

  const { data, isLoading } = useProcessos({
    search: applied.q || undefined,
    tribunal: applied.tribunal || undefined,
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

  const activeFilterCount = useMemo(
    () => Object.values(draft).filter((v) => v.length > 0).length,
    [draft],
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setApplied(draft)
    setPage(0)
  }

  function handleClear() {
    setDraft(EMPTY_FILTERS)
    setApplied(EMPTY_FILTERS)
    setPage(0)
  }

  function updateField<K extends keyof Filters>(key: K, value: Filters[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-6">
      <SEO
        title="Busca de Processos"
        description="Pesquise processos judiciais em todos os tribunais brasileiros. Filtros por tribunal, classe, relator e período."
        path="/busca"
      />

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Busca</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pesquise em mais de 100 mil processos de 36 tribunais
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-card p-4">
        <div className="flex gap-2">
          <Input
            placeholder="Buscar por ementa, tema ou número do processo…"
            value={draft.q}
            onChange={(e) => updateField('q', e.target.value)}
            className="flex-1"
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
            {activeFilterCount > 0 && !showAdvanced && (
              <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </button>
          {hasFilters && (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Limpar filtros
            </button>
          )}
        </div>

        {showAdvanced && (
          <div className="grid gap-4 border-t pt-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Tribunal</label>
              <select
                value={draft.tribunal}
                onChange={(e) => updateField('tribunal', e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">Todos os tribunais</option>
                <optgroup label="Tribunais Superiores">
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

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Relator</label>
              <Input
                placeholder="Nome do relator…"
                value={draft.relator}
                onChange={(e) => updateField('relator', e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Data início</label>
              <Input
                type="date"
                value={draft.dataInicio}
                onChange={(e) => updateField('dataInicio', e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Data fim</label>
              <Input
                type="date"
                value={draft.dataFim}
                onChange={(e) => updateField('dataFim', e.target.value)}
              />
            </div>
          </div>
        )}
      </form>

      {hasFilters && (
        <div className="flex flex-wrap gap-2">
          {applied.q && <FilterPill label={`texto: "${applied.q}"`} />}
          {applied.tribunal && <FilterPill label={`tribunal: ${applied.tribunal}`} />}
          {applied.classe && <FilterPill label={`classe: ${applied.classe}`} />}
          {applied.relator && <FilterPill label={`relator: ${applied.relator}`} />}
          {applied.dataInicio && <FilterPill label={`de: ${applied.dataInicio}`} />}
          {applied.dataFim && <FilterPill label={`até: ${applied.dataFim}`} />}
        </div>
      )}

      {hasFilters && (
        <>
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? 'Buscando…'
              : `${data?.count.toLocaleString('pt-BR') ?? 0} resultado${(data?.count ?? 0) === 1 ? '' : 's'}`}
          </p>

          <ProcessoTable processos={data?.data ?? []} showTribunal />

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded border px-3 py-1.5 text-sm disabled:opacity-40"
              >
                ← Anterior
              </button>
              <span className="text-sm text-muted-foreground">
                Página {page + 1} de {totalPages.toLocaleString('pt-BR')}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="rounded border px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Próxima →
              </button>
            </div>
          )}
        </>
      )}

      {!hasFilters && (
        <div className="rounded-lg border border-dashed bg-muted/40 p-8 text-center text-sm text-muted-foreground">
          Digite um termo de busca ou aplique filtros para começar.
        </div>
      )}
    </div>
  )
}

function FilterPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border bg-background px-2.5 py-0.5 text-xs font-medium">
      {label}
    </span>
  )
}
