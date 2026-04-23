import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { ProcessoTable } from '@/components/shared/ProcessoTable'
import { SEO } from '@/components/shared/SEO'
import { useProcessos } from '@/hooks/useProcessos'
import { useTribunalFromPath } from '@/hooks/useTribunal'
import { exportProcessosToCSV, fetchProcessosForExport } from '@/lib/exportCSV'

export default function TribunalProcessos() {
  const { tribunalId, tribunal } = useTribunalFromPath()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  const [isExporting, setIsExporting] = useState(false)

  const { data, isLoading } = useProcessos({
    tribunal: tribunalId,
    search: search || undefined,
    page,
    pageSize: 50,
  })

  async function handleExport() {
    setIsExporting(true)
    try {
      const rows = await fetchProcessosForExport({
        tribunal: tribunalId,
        search: search || undefined,
      })
      const date = new Date().toISOString().slice(0, 10)
      exportProcessosToCSV(rows, `processos-${tribunalId}-${date}.csv`)
    } catch (err) {
      console.error('Erro ao exportar CSV:', err)
    } finally {
      setIsExporting(false)
    }
  }

  const totalPages = data ? Math.ceil(data.count / 50) : 0

  return (
    <div className="space-y-6">
      <SEO
        title={`Processos — ${tribunal?.nome || tribunalId}`}
        description={`Lista completa de processos do ${tribunal?.nomeCompleto || tribunalId}. Pesquise por ementa, tema ou número.`}
        path={`/${tribunalId.toLowerCase()}/processos`}
      />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: tribunal?.cor }}>
            Processos — {tribunal?.nome}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data ? `${data.count.toLocaleString('pt-BR')} processos encontrados` : 'Carregando…'}
          </p>
        </div>
        {(data?.count ?? 0) > 0 && (
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
            title="Baixar até 500 resultados em CSV"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {isExporting ? 'Exportando…' : 'Baixar CSV'}
          </button>
        )}
      </div>

      <Input
        placeholder="Buscar por ementa, tema ou número…"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setPage(0)
        }}
        className="max-w-md"
      />

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Carregando…</div>
      ) : (
        <ProcessoTable processos={data?.data ?? []} />
      )}

      {/* Pagination */}
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
            Página {page + 1} de {totalPages}
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
    </div>
  )
}
