import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { SEO } from '@/components/shared/SEO'
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
        <Link
          to={`/${tribunalId.toLowerCase()}/processos`}
          className="text-sm text-muted-foreground no-underline hover:underline"
        >
          ← Voltar para processos
        </Link>
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
