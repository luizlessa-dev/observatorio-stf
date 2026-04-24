#!/usr/bin/env node
/**
 * Fetches current stats from Supabase and injects them into index.html
 * meta tags (description, og:description, twitter:description, title).
 *
 * Runs at build time so SEO always reflects current numbers.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

// Default fallback values (used when env vars are missing, e.g. local dev)
// Atualizar quando houver saltos grandes no acervo
const FALLBACK = { total: 210000, tribunais: 37 }

async function fetchStats() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('[inject-stats] Supabase env vars missing, using fallback values')
    return FALLBACK
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/stats_por_tribunal?select=total`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const rows = await res.json()
    const total = rows.reduce((acc, r) => acc + (r.total || 0), 0)
    return { total, tribunais: rows.length || FALLBACK.tribunais }
  } catch (e) {
    console.warn('[inject-stats] fetch failed, using fallback:', e.message)
    return FALLBACK
  }
}

function roundDown(n) {
  if (n < 1000) return n
  if (n < 10000) return Math.floor(n / 100) * 100
  if (n < 100000) return Math.floor(n / 1000) * 1000
  return Math.floor(n / 10000) * 10000
}

function formatBR(n) {
  return n.toLocaleString('pt-BR')
}

async function main() {
  const stats = await fetchStats()
  const rounded = roundDown(stats.total)
  const totalFmt = formatBR(rounded) + '+'

  const indexPath = resolve('index.html')
  if (!existsSync(indexPath)) {
    console.error('[inject-stats] index.html not found')
    process.exit(1)
  }

  let html = readFileSync(indexPath, 'utf-8')

  const titleNew = `Observatório Judiciário do Brasil — ${totalFmt} decisões de ${stats.tribunais} tribunais`
  const descNew = `Plataforma pública e independente com ${totalFmt} decisões judiciais do STF, STJ, TST, TRFs e TJs. Pesquise processos, relatores e estatísticas do Judiciário brasileiro.`
  const ogDescNew = `${totalFmt} decisões de ${stats.tribunais} tribunais brasileiros. Pesquise processos, relatores e estatísticas.`

  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${titleNew}</title>`,
  )
  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${descNew}" />`,
  )
  html = html.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:description" content="${ogDescNew}" />`,
  )
  html = html.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:description" content="${ogDescNew}" />`,
  )

  writeFileSync(indexPath, html)
  console.log(`[inject-stats] Injected: ${totalFmt} decisões, ${stats.tribunais} tribunais`)
}

main().catch((e) => {
  console.error('[inject-stats] failed:', e)
  process.exit(1)
})
