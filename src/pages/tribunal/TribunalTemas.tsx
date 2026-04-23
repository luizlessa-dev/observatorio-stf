import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { SEO } from '@/components/shared/SEO'
import { ProcessoTable } from '@/components/shared/ProcessoTable'
import { useTribunalFromPath } from '@/hooks/useTribunal'
import { useTemasCategoria, useTemaDetalhe, useProcessosPorTema } from '@/hooks/useTemas'

// Ícone por área do direito
function areaIcon(categoria: string) {
  const cat = categoria.toUpperCase()
  if (cat.includes('TRIBUTÁRIO') || cat.includes('TRIBUTARIO')) return '📊'
  if (cat.includes('PENAL') || cat.includes('CRIMINAL')) return '⚖️'
  if (cat.includes('CONSTITUCIONAL') || cat.includes('CONSTITUCIONALIDADE')) return '🏛️'
  if (cat.includes('TRABALHISTA') || cat.includes('TRABALHO')) return '👷'
  if (cat.includes('AMBIENTAL')) return '🌿'
  if (cat.includes('PREVIDENCIÁRIO') || cat.includes('PREVIDENCIA')) return '🏥'
  if (cat.includes('CONSUMIDOR')) return '🛒'
  if (cat.includes('CIVIL') || cat.includes('CONTRATOS')) return '📝'
  if (cat.includes('ELEITORAL')) return '🗳️'
  if (cat.includes('ADMINISTRATIVO')) return '🏢'
  if (cat.includes('COMPLEXIDADE') || cat.includes('IMPACTO') || cat.includes('COVID')) return '🚨'
  return '📋'
}

// ─── Nível 3: lista de processos de um tema específico ─────────────────────
function ProcessosPorTema({
  tribunal, tribunalId, tema, onBack,
}: {
  tribunal: ReturnType<typeof useTribunalFromPath>['tribunal']
  tribunalId: string
  tema: string
  onBack: () => void
}) {
  const [page, setPage] = useState(0)
  const { data, isLoading } = useProcessosPorTema(tribunalId, tema, page)
  const totalPages = data ? Math.ceil(data.count / 50) : 0

  return (
    <div className="space-y-4">
      <div>
        <button
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Voltar
        </button>
        <h2 className="mt-2 text-base font-semibold">{tema}</h2>
        <p className="text-sm text-muted-foreground">
          {isLoading ? 'Carregando…' : `${(data?.count ?? 0).toLocaleString('pt-BR')} processos`}
        </p>
      </div>

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-lg bg-muted/40" />
      ) : (
        <ProcessoTable processos={data?.data ?? []} />
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded border px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-muted"
          >
            ← Anterior
          </button>
          <span className="text-sm text-muted-foreground">{page + 1} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="rounded border px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-muted"
          >
            Próxima →
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Nível 2: sub-temas de uma categoria ────────────────────────────────────
function SubTemas({
  tribunal, tribunalId, categoria, onBack,
}: {
  tribunal: ReturnType<typeof useTribunalFromPath>['tribunal']
  tribunalId: string
  categoria: string
  onBack: () => void
}) {
  const [selectedTema, setSelectedTema] = useState<string | null>(null)
  const { data: subtemas, isLoading } = useTemaDetalhe(tribunalId, categoria)

  if (selectedTema) {
    return (
      <ProcessosPorTema
        tribunal={tribunal}
        tribunalId={tribunalId}
        tema={selectedTema}
        onBack={() => setSelectedTema(null)}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <button
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Voltar para categorias
        </button>
        <h2 className="mt-2 flex items-center gap-2 text-base font-semibold">
          <span>{areaIcon(categoria)}</span>
          <span>{categoria}</span>
        </h2>
      </div>

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-lg bg-muted/40" />
      ) : (
        <div className="divide-y rounded-xl border bg-card shadow-sm">
          {(subtemas ?? []).map((s) => (
            <button
              key={s.tema}
              type="button"
              onClick={() => setSelectedTema(s.tema)}
              className="flex w-full items-start justify-between gap-4 px-4 py-3 text-left hover:bg-muted/50"
            >
              <span className="text-sm leading-snug">{s.tema}</span>
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                {s.total.toLocaleString('pt-BR')}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Nível 1 (index): categorias de tema ────────────────────────────────────
export default function TribunalTemas() {
  const { tribunalId, tribunal } = useTribunalFromPath()
  const [selectedCategoria, setSelectedCategoria] = useState<string | null>(null)
  const { data: categorias, isLoading } = useTemasCategoria(tribunalId)

  if (selectedCategoria) {
    return (
      <div className="space-y-6">
        <SEO
          title={`Temas — ${tribunal?.nome || tribunalId}`}
          description={`Processos por área temática no ${tribunal?.nomeCompleto || tribunalId}.`}
          path={`/${tribunalId.toLowerCase()}/temas`}
        />
        <SubTemas
          tribunal={tribunal}
          tribunalId={tribunalId}
          categoria={selectedCategoria}
          onBack={() => setSelectedCategoria(null)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SEO
        title={`Temas — ${tribunal?.nome || tribunalId}`}
        description={`Processos organizados por área temática no ${tribunal?.nomeCompleto || tribunalId}.`}
        path={`/${tribunalId.toLowerCase()}/temas`}
      />

      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: tribunal?.cor }}>
          Temas — {tribunal?.nome}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isLoading
            ? 'Carregando…'
            : `${(categorias?.length ?? 0)} áreas temáticas`}
        </p>
      </div>

      {isLoading ? (
        <div className="h-64 animate-pulse rounded-xl bg-muted/40" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(categorias ?? []).map((c) => (
            <button
              key={c.categoria}
              type="button"
              onClick={() => setSelectedCategoria(c.categoria)}
              className="flex items-start gap-3 rounded-xl border bg-card p-4 text-left shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="mt-0.5 text-2xl">{areaIcon(c.categoria)}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-snug">{c.categoria}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {c.total.toLocaleString('pt-BR')} processos
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="text-center">
        <Link
          to={`/${tribunalId.toLowerCase()}/processos`}
          className="text-sm font-medium no-underline hover:underline"
          style={{ color: tribunal?.cor }}
        >
          Ver todos os processos →
        </Link>
      </div>
    </div>
  )
}
