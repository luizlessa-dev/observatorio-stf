import { useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { SEO } from '@/components/shared/SEO'
import { AdSlot } from '@/components/shared/AdSlot'
import { useProcesso } from '@/hooks/useProcessos'
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

function ShareButton({ title, text, url }: { title: string; text: string; url: string }) {
  const [status, setStatus] = useState<'idle' | 'copied'>('idle')

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url })
        return
      } catch {
        // user cancelled or not supported — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setStatus('copied')
      setTimeout(() => setStatus('idle'), 2000)
    } catch {
      // clipboard also failed — no-op
    }
  }, [title, text, url])

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
    >
      {status === 'copied' ? (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          Copiado!
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
          Compartilhar
        </>
      )}
    </button>
  )
}

export default function ProcessoDetalhe() {
  const { id } = useParams<{ id: string }>()
  const { tribunalId, tribunal } = useTribunalFromPath()
  const { data: p, isLoading, error } = useProcesso(id!)

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Carregando…</div>
  if (error || !p) return <div className="py-12 text-center text-muted-foreground">Processo não encontrado.</div>

  const fields = [
    { label: 'Classe', value: p.classe },
    { label: 'Classe processual', value: p.classe_processual },
    { label: 'Número', value: p.numero_processo },
    { label: 'Relator', value: p.relator },
    { label: 'Órgão julgador', value: p.orgao_julgador },
    { label: 'Tipo de decisão', value: p.tipo_decisao },
    { label: 'Data da decisão', value: fmtDate(p.data_decisao) },
    { label: 'Fonte', value: p.fonte },
  ]

  return (
    <div className="space-y-6">
      <SEO
        title={`${p.classe} ${p.numero_processo} — ${p.tribunal}`}
        description={p.ementa?.slice(0, 160) || `Processo ${p.numero_processo} do ${tribunal?.nomeCompleto || p.tribunal}. Relator: ${p.relator || 'N/A'}.`}
        path={`/${tribunalId.toLowerCase()}/processo/${id}`}
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LegalCase",
          "name": `${p.classe} ${p.numero_processo}`,
          "description": p.ementa?.slice(0, 500) || undefined,
          "court": { "@type": "Organization", "name": tribunal?.nomeCompleto || p.tribunal },
          ...(p.data_decisao ? { "datePublished": p.data_decisao } : {}),
          ...(p.relator ? { "judge": { "@type": "Person", "name": p.relator } } : {}),
          "url": `https://judiciario.transparenciafederal.org/${tribunalId.toLowerCase()}/processo/${id}`,
        })}</script>
      </Helmet>
      <div>
        <div className="flex items-center justify-between">
          <Link
            to={`/${tribunalId.toLowerCase()}/processos`}
            className="text-sm text-muted-foreground no-underline hover:underline"
          >
            ← Voltar para processos
          </Link>
          <ShareButton
            title={`${p.classe} ${p.numero_processo} — ${p.tribunal}`}
            text={p.ementa?.slice(0, 120) || `Processo ${p.numero_processo} do ${tribunal?.nomeCompleto || p.tribunal}`}
            url={`https://judiciario.transparenciafederal.org/${tribunalId.toLowerCase()}/processo/${id}`}
          />
        </div>
        <h1 className="mt-2 text-xl font-bold tracking-tight">
          <Badge style={{ backgroundColor: tribunal?.cor, color: '#fff' }} className="mr-2">
            {p.tribunal}
          </Badge>
          {p.classe} {p.numero_processo}
        </h1>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
          {fields.map(
            (f) =>
              f.value &&
              f.value !== '—' && (
                <div key={f.label}>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {f.label}
                  </div>
                  <div className="mt-0.5 text-sm">{f.value}</div>
                </div>
              ),
          )}
        </CardContent>
      </Card>

      {/* Ad entre metadados e ementa — alta visibilidade, dwell time alto */}
      <AdSlot slot="processo-detalhe-mid" format="horizontal" className="rounded-lg overflow-hidden" />

      {p.ementa && (
        <Card>
          <CardContent className="p-5">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Ementa
            </div>
            <p className="whitespace-pre-line text-sm leading-relaxed">{p.ementa}</p>
          </CardContent>
        </Card>
      )}

      {p.tema && (
        <Card>
          <CardContent className="p-5">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Tema
            </div>
            <p className="text-sm">{p.tema}</p>
          </CardContent>
        </Card>
      )}

      {p.link_oficial && (
        <a
          href={p.link_oficial}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm font-medium no-underline hover:underline"
          style={{ color: tribunal?.cor }}
        >
          Ver no portal oficial →
        </a>
      )}
    </div>
  )
}
