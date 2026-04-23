import { Link } from 'react-router-dom'

interface AudienceCard {
  emoji: string
  persona: string
  titulo: string
  descricao: string
  ctaLabel: string
  ctaTo: string
  useCases: string[]
}

const AUDIENCES: AudienceCard[] = [
  {
    emoji: '⚖️',
    persona: 'Advogados',
    titulo: 'Jurisprudência em segundos',
    descricao:
      'Pesquise decisões por ementa, tema ou relator. Encontre precedentes em 36 tribunais sem sair de uma única ferramenta.',
    ctaLabel: 'Ir para busca',
    ctaTo: '/busca',
    useCases: [
      'Precedentes por tema',
      'Entendimento de relator',
      'Tendências por classe',
    ],
  },
  {
    emoji: '📰',
    persona: 'Jornalistas e Pesquisadores',
    titulo: 'Dados abertos e auditáveis',
    descricao:
      'Acesse metadados de processos para reportagens investigativas, análises estatísticas e pesquisa acadêmica. Todas as fontes são rastreáveis.',
    ctaLabel: 'Conhecer a metodologia',
    ctaTo: '/metodologia',
    useCases: [
      'Pautas data-driven',
      'Séries históricas',
      'Citações com fonte oficial',
    ],
  },
  {
    emoji: '📚',
    persona: 'Estudantes e Concurseiros',
    titulo: 'Entenda o Judiciário',
    descricao:
      'Navegue pelas decisões dos ministros mais citados, veja o tipo de processo mais comum em cada corte e prepare-se para concursos com dados reais.',
    ctaLabel: 'Explorar ministros',
    ctaTo: '/stf/ministros',
    useCases: [
      'Perfil decisório',
      'Classes mais recorrentes',
      'Histórico por tribunal',
    ],
  },
]

export function AudienceSection() {
  return (
    <section className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Para quem é o Observatório</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Três formas de usar os dados públicos do Judiciário brasileiro
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {AUDIENCES.map((a) => (
          <div
            key={a.persona}
            className="flex flex-col rounded-lg border bg-card p-5 transition-shadow hover:shadow-md"
          >
            <div className="mb-3 text-3xl" aria-hidden>
              {a.emoji}
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {a.persona}
            </p>
            <h3 className="mt-1 text-base font-bold">{a.titulo}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a.descricao}</p>

            <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
              {a.useCases.map((u) => (
                <li key={u} className="flex items-center gap-1.5">
                  <span className="text-green-700" aria-hidden>✓</span>
                  {u}
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-4">
              <Link
                to={a.ctaTo}
                className="inline-block text-sm font-semibold text-navy-800 no-underline hover:underline"
              >
                {a.ctaLabel} →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
