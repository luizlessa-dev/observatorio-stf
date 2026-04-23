import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { ProcessoTable } from '@/components/shared/ProcessoTable'
import { SEO } from '@/components/shared/SEO'
import { useProcessos } from '@/hooks/useProcessos'
import { useTribunalFromPath } from '@/hooks/useTribunal'

export default function TribunalProcessos() {
  const { tribunalId, tribunal } = useTribunalFromPath()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  const { data, isLoading } = useProcessos({
    tribunal: tribunalId,
    search: search || undefined,
    page,
    pageSize: 50,
  })

  const totalPages = data ? Math.ceil(data.count / 50) : 0

  return (
    <div className="space-y-6">
      <SEO
        title={`Processos — ${tribunal?.nome || tribunalId}`}
        description={`Lista completa de processos do ${tribunal?.nomeCompleto || tribunalId}. Pesquise por ementa, tema ou número.`}
        path={`/${tribunalId.toLowerCase()}/processos`}
      />
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: tribunal?.cor }}>
          Processos — {tribunal?.nome}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data ? `${data.count.toLocaleString('pt-BR')} processos encontrados` : 'Carregando…'}
        </p>
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
