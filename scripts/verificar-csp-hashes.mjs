#!/usr/bin/env node
/**
 * AUD-09: a CSP em vercel.json passou de Report-Only para enforcement real,
 * com script-src travado em 'self' + 3 hashes sha256 dos únicos scripts
 * inline do site inteiro (o fechamento do menu mobile + o runtime de
 * hidratação que o Astro injeta nas páginas com ilha React). Esses hashes
 * foram computados uma vez, a mão, inspecionando o dist/ real — não são
 * gerados automaticamente a cada build.
 *
 * Isso os torna frágeis a qualquer mudança no conteúdo desses scripts: um
 * upgrade do Astro que altere o runtime de hidratação, ou uma edição no
 * script inline do menu em Base.astro, muda o hash — e a CSP em enforcement
 * passaria a BLOQUEAR esse script em produção, silenciosamente (o usuário só
 * veria o menu mobile ou a hidratação de uma ilha parar de funcionar, sem
 * nenhum erro visível fora do console).
 *
 * Este script roda depois do build (ver .github/workflows/ci.yml, job
 * `build`) e falha alto — exit 1 — se algum hash presente no dist/ real não
 * estiver na lista de vercel.json. Rodar manualmente após `npm run build`
 * sempre que Base.astro mudar ou o Astro for atualizado.
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { globSync } from "node:fs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function extrairHashesDoDist() {
  const arquivos = globSync("dist/**/*.html", { cwd: ROOT });
  if (arquivos.length === 0) {
    throw new Error("dist/ vazio ou inexistente — rode `npm run build` antes deste script.");
  }
  const hashes = new Set();
  const regexScript = /<script(?![^>]*application\/ld\+json)([^>]*)>([\s\S]*?)<\/script>/g;
  for (const rel of arquivos) {
    const html = readFileSync(path.join(ROOT, rel), "utf8");
    for (const m of html.matchAll(regexScript)) {
      const corpo = m[2];
      if (!corpo.trim()) continue;
      const hash = createHash("sha256").update(corpo, "utf8").digest("base64");
      hashes.add(`sha256-${hash}`);
    }
  }
  return hashes;
}

function extrairHashesDeclarados() {
  const vercelJson = JSON.parse(readFileSync(path.join(ROOT, "vercel.json"), "utf8"));
  const globalHeaders = vercelJson.headers.find((h) => h.source === "/(.*)");
  const csp = globalHeaders?.headers?.find((h) => h.key === "Content-Security-Policy");
  if (!csp) throw new Error("vercel.json não declara um header Content-Security-Policy (enforcement) em /(.*)");
  const hashes = new Set([...csp.value.matchAll(/'(sha256-[^']+)'/g)].map((m) => m[1]));
  return hashes;
}

function main() {
  const doDist = extrairHashesDoDist();
  const declarados = extrairHashesDeclarados();

  const faltando = [...doDist].filter((h) => !declarados.has(h));
  const naoUsados = [...declarados].filter((h) => !doDist.has(h));

  if (faltando.length > 0) {
    console.error("CSP quebrada: dist/ tem script(s) inline cujo hash NÃO está em vercel.json — a CSP em enforcement vai bloquear isso em produção:");
    for (const h of faltando) console.error(`  '${h}'`);
    console.error("\nAdicione o(s) hash(es) acima ao script-src de vercel.json, ou investigue por que um script novo apareceu (upgrade do Astro? edição em Base.astro?).");
    process.exit(1);
  }

  if (naoUsados.length > 0) {
    console.warn("Aviso (não bloqueia o build): vercel.json declara hash(es) que não correspondem a nenhum script no dist/ atual — provavelmente sobrou de uma versão anterior do Astro/Base.astro:");
    for (const h of naoUsados) console.warn(`  '${h}'`);
  }

  console.log(`OK: todos os ${doDist.size} hash(es) de script inline encontrados no dist/ estão cobertos pela CSP em vercel.json.`);
}

main();
