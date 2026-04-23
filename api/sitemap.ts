/**
 * Vercel Edge Function — /sitemap.xml (dinâmico)
 *
 * Inclui:
 *  - Todas as páginas estáticas (tribunais, institucional)
 *  - Top 60 processos mais recentes dos tribunais superiores (STF, STJ, TST, TCU)
 *  - Todos os relatores/ministros com pelo menos 5 decisões por tribunal
 */
export const config = { runtime: 'edge' }

declare const process: { env: Record<string, string | undefined> }

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? ''
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY ?? ''
const BASE_URL = 'https://judiciario.transparenciafederal.org'
const TODAY = new Date().toISOString().slice(0, 10)

// Todos os tribunais do site
const TRIBUNAIS = [
  'stf', 'stj', 'tst', 'tcu',
  'trf1', 'trf2', 'trf3', 'trf4', 'trf5', 'trf6',
  'tjsp', 'tjrj', 'tjmg', 'tjrs', 'tjpr', 'tjsc', 'tjba', 'tjpe', 'tjce',
  'tjgo', 'tjdft', 'tjes', 'tjac', 'tjal', 'tjam', 'tjap', 'tjma', 'tjms',
  'tjmt', 'tjpa', 'tjpb', 'tjpi', 'tjrn', 'tjro', 'tjrr', 'tjse', 'tjto',
]

// Tribunais com páginas de ministros com mais dados
const PRINCIPAIS = ['STF', 'STJ', 'TST', 'TCU']

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function supabaseFetch(path: string): Promise<unknown[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON) return []
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${SUPABASE_ANON}`,
    },
  })
  if (!res.ok) return []
  return res.json()
}

function url(loc: string, priority: string, changefreq: string, lastmod = TODAY) {
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
}

export default async function handler() {
  const urls: string[] = []

  // ── Páginas estáticas ────────────────────────────────────────────────────────
  urls.push(url(`${BASE_URL}/`, '1.0', 'daily'))
  urls.push(url(`${BASE_URL}/busca`, '0.8', 'daily'))
  urls.push(url(`${BASE_URL}/sobre`, '0.5', 'monthly'))
  urls.push(url(`${BASE_URL}/metodologia`, '0.5', 'monthly'))
  urls.push(url(`${BASE_URL}/dados-abertos`, '0.6', 'monthly'))
  urls.push(url(`${BASE_URL}/api`, '0.5', 'monthly'))
  urls.push(url(`${BASE_URL}/privacidade`, '0.3', 'yearly'))

  // ── Páginas de tribunal ───────────────────────────────────────────────────────
  for (const t of TRIBUNAIS) {
    urls.push(url(`${BASE_URL}/${t}`, '0.9', 'daily'))
    urls.push(url(`${BASE_URL}/${t}/processos`, '0.8', 'daily'))
    urls.push(url(`${BASE_URL}/${t}/ministros`, '0.7', 'weekly'))
  }

  // ── Processos recentes (top 60 por tribunal superior) ────────────────────────
  try {
    const processos = await supabaseFetch(
      `processos_publico?select=id,tribunal,data_decisao&tribunal=in.(STF,STJ,TST,TCU)&order=data_decisao.desc.nullslast&limit=240`,
    ) as Array<{ id: string; tribunal: string; data_decisao: string | null }>

    for (const p of processos) {
      const tSlug = p.tribunal.toLowerCase()
      const lastmod = p.data_decisao?.slice(0, 10) ?? TODAY
      urls.push(url(`${BASE_URL}/${tSlug}/processo/${p.id}`, '0.6', 'monthly', lastmod))
    }
  } catch {
    // silently skip if Supabase is unavailable
  }

  // ── Relatores / Ministros (≥5 decisões nos tribunais principais) ──────────────
  try {
    const relatores = await supabaseFetch(
      `stats_por_relator?select=relator,tribunal&tribunal=in.(${PRINCIPAIS.join(',')})&processos=gte.5&limit=500`,
    ) as Array<{ relator: string; tribunal: string }>

    for (const r of relatores) {
      if (!r.relator) continue
      const tSlug = r.tribunal.toLowerCase()
      const slug = slugify(r.relator)
      urls.push(url(`${BASE_URL}/${tSlug}/ministro/${slug}`, '0.7', 'weekly'))
    }
  } catch {
    // silently skip
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
