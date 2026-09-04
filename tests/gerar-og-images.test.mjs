// scripts/gerar-og-images.mjs roda como Node puro (não importa .ts), então
// duplica slugMinistro() de src/lib/slug.ts em vez de importar. Este teste
// garante que as duas cópias não divergem silenciosamente — se uma mudar
// sem a outra, a URL de uma imagem og: para de bater com a URL real do
// ministro.
//
// Estático, baseado em texto-fonte — sem build, sem runtime: `node --test tests/`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(path.join(ROOT, rel), "utf8");

function corpoDe(src, assinatura) {
  const inicio = src.indexOf(assinatura);
  if (inicio === -1) throw new Error(`assinatura "${assinatura}" não encontrada`);
  const abre = src.indexOf("{", inicio);
  const fecha = src.indexOf("\n}", abre);
  return src.slice(abre + 1, fecha).trim();
}

test("slugMinistro duplicado em scripts/gerar-og-images.mjs bate com src/lib/slug.ts", () => {
  const original = corpoDe(read("src/lib/slug.ts"), "export function slugMinistro(nome: string): string");
  const duplicado = corpoDe(read("scripts/gerar-og-images.mjs"), "function slugMinistro(nome)");
  assert.equal(
    duplicado,
    original,
    "as duas implementações de slugMinistro divergiram — atualize as duas juntas"
  );
});
