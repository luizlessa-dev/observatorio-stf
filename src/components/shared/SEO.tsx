import { Helmet } from 'react-helmet-async'

const BASE_URL = 'https://judiciario.transparenciafederal.org'
const SITE_NAME = 'Observatório Judiciário do Brasil'

// Descrição padrão atualizada — usada quando a página não passa description
const DEFAULT_DESC = 'Plataforma pública e independente com 200.000+ decisões judiciais do STF, STJ, TST, TRFs e TJs. Pesquise processos, relatores e estatísticas do Judiciário brasileiro.'

export interface BreadcrumbItem {
  name: string
  path: string // relativo ao domínio, ex: '/stf'
}

interface SEOProps {
  title?: string
  description?: string
  path?: string
  type?: string
  breadcrumbs?: BreadcrumbItem[]
}

export function SEO({ title, description, path = '/', type = 'website', breadcrumbs }: SEOProps) {
  const fullTitle = title ? `${title} — ${SITE_NAME}` : SITE_NAME
  const desc = description || DEFAULT_DESC
  const url = `${BASE_URL}${path}`

  const breadcrumbSchema = breadcrumbs && breadcrumbs.length > 0
    ? JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Início', item: BASE_URL },
          ...breadcrumbs.map((b, i) => ({
            '@type': 'ListItem',
            position: i + 2,
            name: b.name,
            item: `${BASE_URL}${b.path}`,
          })),
        ],
      })
    : null

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {/* canonical e meta description gerenciados por página — index.html NÃO deve ter canonical estático */}
      <link rel="canonical" href={url} />
      <meta name="description" content={desc} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      {breadcrumbSchema && (
        <script type="application/ld+json">{breadcrumbSchema}</script>
      )}
    </Helmet>
  )
}
