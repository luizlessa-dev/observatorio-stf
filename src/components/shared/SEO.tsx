import { Helmet } from 'react-helmet-async'

const BASE_URL = 'https://judiciario.transparenciafederal.org'
const SITE_NAME = 'Observatório Judiciário do Brasil'

interface SEOProps {
  title?: string
  description?: string
  path?: string
  type?: string
}

export function SEO({ title, description, path = '/', type = 'website' }: SEOProps) {
  const fullTitle = title ? `${title} — ${SITE_NAME}` : SITE_NAME
  const desc = description || 'Plataforma pública com dados abertos de 36 tribunais brasileiros. Pesquise processos, relatores e estatísticas do Judiciário.'
  const url = `${BASE_URL}${path}`

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
    </Helmet>
  )
}
