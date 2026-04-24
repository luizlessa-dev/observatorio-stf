import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Card, CardContent } from '@/components/ui/card'
import { ProcessoTable } from '@/components/shared/ProcessoTable'
import { SEO } from '@/components/shared/SEO'
import { NewsletterForm } from '@/components/shared/NewsletterForm'
import { AdSlot } from '@/components/shared/AdSlot'
import { HeroSearch } from '@/components/shared/HeroSearch'
import { HighlightsSection } from '@/components/shared/HighlightsSection'
import { AudienceSection } from '@/components/shared/AudienceSection'
import { useStats } from '@/hooks/useStats'
import { useProcessos } from '@/hooks/useProcessos'
import { useLastSync, formatRelativeTime } from '@/hooks/useLastSync'
import { TRIBUNAIS_SUPERIORES, TRIBUNAIS_FEDERAIS, TRIBUNAIS_ESTADUAIS, type TribunalConfig } from '@/lib/tribunais'

const FAQ_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'O que é o Observatório Judiciário do Brasil?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Plataforma pública e gratuita com mais de 200.000 decisões judiciais de 37 tribunais brasileiros, incluindo STF, STJ, TST, TCU e todos os TRFs e Tribunais de Justiça estaduais. Os dados são atualizados diariamente via DataJud/CNJ e APIs públicas dos tribunais.',
      },
    },
    {
      '@type': 'Question',
      name: 'Como pesquisar jurisprudência nos tribunais brasileiros?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Acesse a busca em judiciario.transparenciafederal.org/busca e filtre por ementa, relator, classe processual, tribunal e período. O acesso é gratuito e não exige cadastro. É possível exportar resultados em CSV.',
      },
    },
    {
      '@type': 'Question',
      name: 'Quais tribunais estão cobertos pelo Observatório?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'STF, STJ, TST, TCU, TRF1, TRF2, TRF3, TRF4, TRF5, TRF6 e 27 Tribunais de Justiça estaduais — 37 tribunais brasileiros no total, com cobertura de decisões de 2015 até hoje.',
      },
    },
    {
      '@type': 'Question',
      name: 'As decisões judiciais do Observatório são confiáveis?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sim. Os dados são coletados diretamente das APIs oficiais dos tribunais (DataJud/CNJ para a maioria) e do portal oficial do STF, sem intermediários editoriais. Cada decisão inclui link para o portal oficial do tribunal.',
      },
    },
    {
      '@type': 'Question',
      name: 'É possível acompanhar um processo judicial específico?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sim. Pesquise o número do processo na busca e crie um alerta por email — você receberá notificação quando uma nova decisão for publicada para aquele processo. O serviço é gratuito.',
      },
    },
  ],
}

// TJs mais populares por volume/conhecimento — exibidos expandidos
const TJS_POPULARES = ['TJSP', 'TJRJ', 'TJMG', 'TJRS', 'TJPR', 'TJSC', 'TJBA', 'TJDFT']

function TribunalCard({ t, stats }: { t: TribunalConfig; stats: { tribunal: string; total: number }[] | undefined }) {
  const s = stats?.find((st) => st.tribunal === t.id)
  return (
    <Link to={t.path} className="no-underline">
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[10px] font-bold text-white"
              style={{ backgroundColor: t.cor }}
            >
              {t.nome}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{t.nomeCompleto}</div>
              <div className="text-xs text-muted-foreground">
                {s ? `${s.total.toLocaleString('pt-BR')} processos` : stats ? '0 processos' : 'Carregando...'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function TribunalSection({
  title,
  tribunais,
  stats,
}: {
  title: string
  tribunais: TribunalConfig[]
  stats: { tribunal: string; total: number }[] | undefined
}) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tribunais.map((t) => (
          <TribunalCard key={t.id} t={t} stats={stats} />
        ))}
      </div>
    </div>
  )
}

function TJsEstaduaisAccordion({ stats }: { stats: { tribunal: string; total: number }[] | undefined }) {
  const [expanded, setExpanded] = useState(false)
  const populares = TRIBUNAIS_ESTADUAIS.filter((t) => TJS_POPULARES.includes(t.id))
  const demais = TRIBUNAIS_ESTADUAIS.filter((t) => !TJS_POPULARES.includes(t.id))

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Justiça Estadual
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {populares.map((t) => (
          <TribunalCard key={t.id} t={t} stats={stats} />
        ))}
      </div>

      {expanded && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {demais.map((t) => (
            <TribunalCard key={t.id} t={t} stats={stats} />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-4 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
      >
        {expanded ? `− Ocultar os outros ${demais.length} TJs` : `+ Ver todos os ${demais.length} outros TJs`}
      </button>
    </div>
  )
}

export default function HomePage() {
  const { data: stats } = useStats()
  const { data: recentes } = useProcessos({ pageSize: 10 })
  const { data: lastSyncDate } = useLastSync()

  const totals = stats?.reduce(
    (acc, s) => ({
      total: acc.total + s.total,
      com_decisao: acc.com_decisao + s.com_decisao,
      relatores: acc.relatores + s.relatores,
      classes: acc.classes + s.classes,
    }),
    { total: 0, com_decisao: 0, relatores: 0, classes: 0 },
  )

  const tribunaisCount = stats?.length ?? 0

  return (
    <div className="space-y-10">
      <SEO
        title="Pesquise decisões do Judiciário brasileiro"
        description="Plataforma pública e independente com 200.000+ decisões judiciais do STF, STJ, TST, TRFs e TJs. Pesquise processos, relatores e estatísticas do Judiciário brasileiro."
        path="/"
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(FAQ_JSON_LD)}</script>
      </Helmet>

      <HeroSearch
        lastSync={formatRelativeTime(lastSyncDate)}
        totalProcessos={totals?.total}
        totalTribunais={tribunaisCount || undefined}
        totalRelatores={totals?.relatores}
      />

      {/* Destaques curados — acima de tudo para criar valor editorial imediato */}
      <HighlightsSection />

      <TribunalSection title="Tribunais Superiores" tribunais={TRIBUNAIS_SUPERIORES} stats={stats} />

      {/* Segmentação por audiência */}
      <AudienceSection />

      <TribunalSection title="Justiça Federal" tribunais={TRIBUNAIS_FEDERAIS} stats={stats} />

      {/* Ad entre seções */}
      <AdSlot slot="homepage-middle" />

      <TJsEstaduaisAccordion stats={stats} />

      {/* Recent processes */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Decisões recentes</h2>
        <ProcessoTable processos={recentes?.data ?? []} showTribunal />
      </div>

      {/* Newsletter */}
      <NewsletterForm />
    </div>
  )
}
