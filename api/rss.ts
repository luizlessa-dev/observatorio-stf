/**
 * Vercel Edge Function — /rss.xml
 * Gera feed RSS com os destaques ativos do Observatório Judiciário.
 */
export const config = { runtime: 'edge' }

// process.env is available in Vercel Edge Runtime (polyfilled)
declare const process: { env: Record<string, string | undefined> }

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? ''
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY ?? ''
const BASE_URL = 'https://judiciario.transparenciafederal.org'

interface Highlight {
  id: string
  titulo_curto: string
  resumo: string | null
  tribunal: string | null
  semana_referencia: string
  link_externo: string | null
  processo_id: string | null
  numero_processo: string | null
  classe: string | null
  relator: string | null
  posicao: number
}

/** RFC 822 date from YYYY-MM-DD */
function toRFC822(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00Z`)
  return d.toUTCString()
}

/** Build processo URL if we have enough info */
function resolveLink(h: Highlight): string {
  if (h.link_externo) return h.link_externo
  if (h.tribunal && h.processo_id) {
    return `${BASE_URL}/${h.tribunal.toLowerCase()}/processo/${h.processo_id}`
  }
  return BASE_URL
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export default async function handler(): Promise<Response> {
  // Fetch active highlights ordered by semana_referencia desc, posicao asc
  const url =
    `${SUPABASE_URL}/rest/v1/highlights` +
    `?select=id,titulo_curto,resumo,tribunal,semana_referencia,link_externo,processo_id,numero_processo,classe,relator,posicao` +
    `&ativo=eq.true&order=semana_referencia.desc,posicao.asc&limit=40`

  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${SUPABASE_ANON}`,
      Accept: 'application/json',
    },
  })

  const highlights: Highlight[] = res.ok ? await res.json() : []

  const items = highlights
    .map((h) => {
      const title = h.tribunal ? `[${h.tribunal}] ${h.titulo_curto}` : h.titulo_curto
      const description = h.resumo || ''
      const link = resolveLink(h)
      const pubDate = toRFC822(h.semana_referencia)
      return `    <item>
      <title>${escapeXml(title)}</title>
      <description>${escapeXml(description)}</description>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="false">${escapeXml(`highlight-${h.id}`)}</guid>
      <pubDate>${pubDate}</pubDate>
    </item>`
    })
    .join('\n')

  const lastBuildDate = highlights[0]
    ? toRFC822(highlights[0].semana_referencia)
    : new Date().toUTCString()

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Observatório Judiciário — Destaques</title>
    <link>${BASE_URL}</link>
    <atom:link href="${BASE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
    <description>Decisões jurídicas de destaque do STF, STJ, TST e TCU selecionadas pela equipe do Observatório Judiciário do Brasil.</description>
    <language>pt-BR</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <ttl>360</ttl>
${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
