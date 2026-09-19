// Testes de guardrail para src/lib/exportaveis.ts (AUD-16, /api/exportar) e
// src/lib/csv.ts. O mais importante aqui não é comportamento de UI — é
// impedir que o whitelist de tabelas exportáveis vaze pra fora do
// Observatório: o Supabase deste projeto é COMPARTILHADO com outros
// produtos (parlamentares, TSE, CVM etc.), todos com `anon` tendo SELECT.
// Se algum dia alguém adicionar uma entrada com `tabela` fora do prefixo
// stf_, isto precisa quebrar o build, não silenciosamente vazar dado de
// outro projeto por um endpoint público do Observatório do STF.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { TABELAS_EXPORTAVEIS, encontrarTabelaExportavel, LIMITE_PADRAO, LIMITE_MAXIMO } from "../src/lib/exportaveis.js";
import { paraCsv } from "../src/lib/csv.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(path.join(ROOT, rel), "utf8");

function corpoDe(src, assinatura) {
  const inicio = src.indexOf(assinatura);
  if (inicio === -1) throw new Error(`assinatura "${assinatura}" não encontrada`);
  const abre = src.indexOf("{", inicio);
  const fecha = src.indexOf("\n}", abre);
  return src.slice(abre + 1, fecha).trim();
}

test("AUD-16: toda tabela exportável pertence ao Observatório do STF (prefixo stf_)", () => {
  for (const t of TABELAS_EXPORTAVEIS) {
    assert.ok(t.tabela.startsWith("stf_"), `"${t.tabela}" não começa com stf_ — não deveria ser exportável por este endpoint`);
  }
});

test("AUD-16: slugs de tabela são únicos", () => {
  const slugs = TABELAS_EXPORTAVEIS.map((t) => t.slug);
  assert.equal(new Set(slugs).size, slugs.length, "há slugs duplicados em TABELAS_EXPORTAVEIS");
});

test("AUD-16: toda tabela tem ao menos uma coluna e uma ordenação estável", () => {
  for (const t of TABELAS_EXPORTAVEIS) {
    assert.ok(t.colunas.length > 0, `${t.slug} não tem colunas declaradas`);
    assert.ok(t.ordenarPor.length > 0, `${t.slug} não tem ordenarPor — paginação por offset não seria estável`);
  }
});

test("AUD-16: encontrarTabelaExportavel só resolve slugs do catálogo", () => {
  assert.equal(encontrarTabelaExportavel("stf_decisoes"), undefined, "não deveria aceitar o nome real da tabela, só o slug");
  assert.equal(encontrarTabelaExportavel("qualquer_coisa"), undefined);
  assert.equal(encontrarTabelaExportavel("decisoes")?.tabela, "stf_decisoes");
});

test("AUD-16: limites de paginação são coerentes", () => {
  assert.ok(LIMITE_PADRAO > 0 && LIMITE_PADRAO <= LIMITE_MAXIMO);
});

test("paraCsv: cabeçalho e linhas na ordem das colunas pedidas", () => {
  const csv = paraCsv([{ b: "2", a: "1" }], ["a", "b"]);
  assert.equal(csv, "a,b\r\n1,2");
});

test("paraCsv: escapa campo com vírgula, aspas e quebra de linha", () => {
  const csv = paraCsv([{ nome: 'Diz "oi", depois\nsai' }], ["nome"]);
  assert.equal(csv, 'nome\r\n"Diz ""oi"", depois\nsai"');
});

test("paraCsv: null/undefined viram célula vazia, não a string \"null\"", () => {
  const csv = paraCsv([{ a: null, b: undefined }], ["a", "b"]);
  assert.equal(csv, "a,b\r\n,");
});

test("paraCsv: lista vazia produz só o cabeçalho", () => {
  const csv = paraCsv([], ["a", "b"]);
  assert.equal(csv, "a,b");
});

// api/exportar.ts duplica slugMinistro() em vez de importar de src/lib/slug.ts
// (mesmo motivo de scripts/gerar-og-images.mjs: import de valor pra .ts
// exige o remapeamento .js→.ts que só o bundler do Astro/Vercel faz, um
// `node --test` direto não faz). Trava que as duas cópias não divergem.
test("slugMinistro duplicado em api/exportar.ts bate com src/lib/slug.ts", () => {
  const original = corpoDe(read("src/lib/slug.ts"), "export function slugMinistro(nome: string): string");
  const duplicado = corpoDe(read("api/exportar.ts"), "function slugMinistro(nome: string): string");
  assert.equal(duplicado, original, "as duas implementações de slugMinistro divergiram — atualize as duas juntas");
});
