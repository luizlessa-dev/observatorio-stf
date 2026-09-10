// Guardrail do "perfil decisório" (migrations 0016-0018), o substituto por
// regra do termômetro de IA que foi orçado (~US$100-400) e descartado.
// Estático e baseado em texto-fonte — não requer build nem conexão com
// Supabase: `node --test tests/`.
//
// Objetivo: (1) nunca deixar reaparecer linguagem ideológica
// (progressista/conservador) fora da explicação em /metodologia de que ela
// NÃO existe; (2) nunca permitir escrita pública nas tabelas cruas; (3)
// nunca remover o piso de amostra mínima que evita "100%" a partir de 1
// decisão.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(path.join(ROOT, rel), "utf8");
const semComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

// dados.ts e a ficha do ministro renderizam o perfil decisório — nenhum dos
// dois pode usar rótulo ideológico. metodologia.astro é a ÚNICA exceção,
// porque explica por que o site NÃO faz isso (testado à parte, abaixo).
const ARQUIVOS_SEM_LINGUAGEM_IDEOLOGICA = ["src/lib/dados.ts", "src/pages/ministros/[slug].astro"];

test("perfil decisório não usa rótulo ideológico (progressista/conservador)", () => {
  for (const arquivo of ARQUIVOS_SEM_LINGUAGEM_IDEOLOGICA) {
    const src = semComentarios(read(arquivo));
    assert.ok(!/progressista/i.test(src), `${arquivo} não deveria mencionar "progressista"`);
    assert.ok(!/conservador/i.test(src), `${arquivo} não deveria mencionar "conservador"`);
  }
});

test("metodologia.astro declara explicitamente que não há eixo ideológico", () => {
  const src = read("src/pages/metodologia.astro");
  assert.ok(/perfil-decisorio/.test(src), "deveria existir a âncora #perfil-decisorio");
  assert.ok(
    /não é uma leitura ideológica/i.test(src),
    "deveria declarar explicitamente que o perfil decisório não é uma leitura ideológica"
  );
});

test("carregarPerfilDecisorio tem piso de amostra mínima, sem fallback numérico fabricado", () => {
  const src = semComentarios(read("src/lib/dados.ts"));
  assert.ok(/AMOSTRA_MINIMA\s*=\s*(\d+)/.test(src), "deveria existir uma constante AMOSTRA_MINIMA");
  const minimo = Number(src.match(/AMOSTRA_MINIMA\s*=\s*(\d+)/)[1]);
  assert.ok(minimo >= 10, "AMOSTRA_MINIMA deveria ser >= 10 (bem acima do MIN_VOTOS_RELEVANTES=3 do termômetro antigo)");
  assert.ok(
    /total_classificadas\s*<\s*AMOSTRA_MINIMA/.test(src),
    "carregarPerfilDecisorio deveria retornar null abaixo da amostra mínima, não um valor fabricado"
  );
  // Nenhum retorno hardcoded tipo "?? 5" / "?? 50" nas colunas de percentual.
  assert.ok(!/pct\w*\s*:\s*perfil\.data\.pct_\w+\s*\?\?\s*\d/.test(src), "percentuais não deveriam ter fallback numérico");
});

test("select() do perfil decisório usa colunas explícitas, nunca '*'", () => {
  const src = semComentarios(read("src/lib/dados.ts"));
  const trechoPerfil = src.slice(src.indexOf("carregarPerfilDecisorio"));
  assert.ok(!trechoPerfil.includes('select("*")') && !trechoPerfil.includes("select('*')"));
});

// Migrations 0016-0018: nenhuma tabela crua pode ter grant de escrita
// pública, e o dicionário de natureza_ato só pode usar as 5 categorias
// documentadas (mérito/admissibilidade/cautelar/processual/devolução) — um
// valor novo fora dessa lista é decisão editorial, não deveria vazar por um
// typo de migration.
const MIGRATIONS_PERFIL_DECISORIO = [
  "supabase/migrations/0016_natureza_ato_regra.sql",
  "supabase/migrations/0017_perfil_decisorio_ministros.sql",
  "supabase/migrations/0018_perfil_decisorio_tabela_cache.sql",
];

test("migrations do perfil decisório revogam escrita pública nas tabelas cruas", () => {
  for (const rel of MIGRATIONS_PERFIL_DECISORIO) {
    const src = read(rel);
    if (!/^\s*create table/im.test(src)) continue; // 0017 é só view; substituída por 0018
    assert.ok(
      /revoke insert, update, delete on .* from anon, authenticated/i.test(src),
      `${rel} deveria revogar insert/update/delete de anon/authenticated`
    );
  }
});

test("dicionário natureza_ato só aceita as 5 categorias documentadas", () => {
  const src = read("supabase/migrations/0016_natureza_ato_regra.sql");
  const bloco = src.match(/natureza_ato\s+text\s+not null\s+check\s*\(natureza_ato in\s*\(([\s\S]*?)\)\)/);
  assert.ok(bloco, "deveria existir o check constraint de natureza_ato");
  const categorias = bloco[1].match(/'[a-z]+'/g).map((s) => s.replaceAll("'", ""));
  assert.deepEqual(
    new Set(categorias),
    new Set(["merito", "admissibilidade", "cautelar", "processual", "devolucao"]),
    "as 5 categorias de natureza_ato não deveriam mudar sem decisão editorial explícita"
  );
});

test("dicionário natureza_ato não descarta decisão nenhuma silenciosamente (só INSERT, nunca DELETE de stf_decisoes)", () => {
  const src = read("supabase/migrations/0016_natureza_ato_regra.sql");
  assert.ok(!/delete\s+from\s+public\.stf_decisoes/i.test(src), "esta migration não deveria apagar linha de stf_decisoes");
});
