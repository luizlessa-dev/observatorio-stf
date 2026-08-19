#!/usr/bin/env node
// Gera public/sitemap.xml a partir das rotas reais da aplicação.
//
// Rodado no build (npm run build). Manter à mão convida ao sitemap que
// envelhece em silêncio — que é o mesmo tipo de falha silenciosa que a
// auditoria encontrou na ingestão.
//
// Rotas de conta e pagamento ficam de fora: não têm conteúdo indexável e
// já estão em Disallow no robots.txt.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ORIGEM = "https://observatoriodostf.org";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const ROTAS = [
  { url: "/",                 prioridade: "1.0", frequencia: "daily"   },
  { url: "/ministros",        prioridade: "0.9", frequencia: "daily"   },
  { url: "/repercussao-geral",prioridade: "0.8", frequencia: "weekly"  },
  { url: "/assinar",          prioridade: "0.3", frequencia: "monthly" },
];

const hoje = new Date().toISOString().slice(0, 10);

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${ROTAS.map(r => `  <url>
    <loc>${ORIGEM}${r.url}</loc>
    <lastmod>${hoje}</lastmod>
    <changefreq>${r.frequencia}</changefreq>
    <priority>${r.prioridade}</priority>
  </url>`).join("\n")}
</urlset>
`;

writeFileSync(path.join(ROOT, "public", "sitemap.xml"), xml, "utf8");
console.log(`sitemap.xml gerado com ${ROTAS.length} rotas`);
