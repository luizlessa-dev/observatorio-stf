import { writeFileSync } from 'fs'

const BASE = 'https://judiciario.transparenciafederal.org'
const TODAY = new Date().toISOString().slice(0, 10)

const tribunais = [
  'stf', 'stj', 'tst', 'tcu',
  'trf1', 'trf2', 'trf3', 'trf4', 'trf5', 'trf6',
  'tjsp', 'tjrj', 'tjmg', 'tjrs', 'tjpr', 'tjsc', 'tjba', 'tjpe', 'tjce', 'tjgo',
  'tjdft', 'tjes', 'tjac', 'tjal', 'tjam', 'tjap', 'tjma', 'tjms', 'tjmt',
  'tjpa', 'tjpb', 'tjpi', 'tjrn', 'tjro', 'tjrr', 'tjse', 'tjto',
]

const staticPages = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/busca', priority: '0.8', changefreq: 'daily' },
  { path: '/sobre', priority: '0.4', changefreq: 'monthly' },
  { path: '/metodologia', priority: '0.4', changefreq: 'monthly' },
  { path: '/dados-abertos', priority: '0.5', changefreq: 'monthly' },
]

const tribunalPages = tribunais.flatMap((t) => [
  { path: `/${t}`, priority: '0.9', changefreq: 'daily' },
  { path: `/${t}/processos`, priority: '0.8', changefreq: 'daily' },
  { path: `/${t}/ministros`, priority: '0.7', changefreq: 'weekly' },
])

const allPages = [...staticPages, ...tribunalPages]

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages
  .map(
    (p) => `  <url>
    <loc>${BASE}${p.path}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`

writeFileSync('public/sitemap.xml', xml)
console.log(`Sitemap generated: ${allPages.length} URLs`)
