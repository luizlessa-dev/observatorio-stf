// Testes de guardrail para a seção "Casos" (src/content/casos/*.md).
//
// Estáticos e baseados em texto-fonte — não requerem build do Astro nem
// conexão com Supabase: `node --test tests/`. Não fazem cross-check contra
// os slugs reais de stf_ministros (isso só acontece em build-time, no
// getStaticPaths de src/pages/casos/[slug].astro, que falha alto se um caso
// referenciar um ministro inexistente).
//
// Objetivo: impedir que um caso publicado viole os requisitos mínimos de
// integridade do projeto — ver docs/politica-editorial-casos.md e o
// precedente em docs/decisao-doadores-indicantes.md. Este teste é um piso
// mecânico, não um substituto do julgamento editorial de quem escreve.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { load as parseYaml } from "js-yaml";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR_CASOS = path.join(ROOT, "src/content/casos");

const STATUS_VALIDOS = ["em_apuracao", "confirmado", "arquivado"];

// Mesma lista de rótulos ideológicos proibidos usada em
// tests/integridade-c0.test.mjs e tests/contencao-c1.test.mjs — estender a
// garantia existente a um tipo de conteúdo novo, não duplicá-la.
const ROTULOS_PROIBIDOS = ["Religioso", "Anti-aborto", "Evangélico", "Conservador", "Mercado", "Garantismo"];

// Linguagem de culpa/condenação — piso mecânico, não substituto de revisão
// editorial. Só se aplica a casos que ainda não têm status "confirmado".
const LINGUAGEM_DE_CULPA = [
  "condenado", "condenada", "culpado", "culpada",
  "comprovadamente", "ficou provado que", "confessou",
];

function listarArquivosDeCaso() {
  if (!existsSync(DIR_CASOS)) return [];
  return readdirSync(DIR_CASOS).filter((f) => f.endsWith(".md"));
}

function lerFrontmatter(arquivo) {
  const src = readFileSync(path.join(DIR_CASOS, arquivo), "utf8");
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(src);
  assert.ok(match, `${arquivo}: frontmatter mal formado — precisa abrir e fechar com "---"`);
  const [, bloco, corpo] = match;
  return { data: parseYaml(bloco) ?? {}, corpo };
}

for (const arquivo of listarArquivosDeCaso()) {
  test(`${arquivo}: nome de arquivo em kebab-case ASCII`, () => {
    assert.ok(/^[a-z0-9]+(-[a-z0-9]+)*\.md$/.test(arquivo), `"${arquivo}" deveria ser kebab-case ASCII`);
  });

  test(`${arquivo}: frontmatter bem formado`, () => {
    lerFrontmatter(arquivo);
  });

  test(`${arquivo}: tem ao menos uma fonte, com label e url http(s)`, () => {
    const { data } = lerFrontmatter(arquivo);
    assert.ok(Array.isArray(data.fontes) && data.fontes.length > 0, "fontes deveria ser um array não-vazio");
    for (const f of data.fontes) {
      assert.ok(f.label && String(f.label).trim().length > 0, "toda fonte precisa de label");
      assert.ok(/^https?:\/\//.test(f.url ?? ""), `fonte "${f.label}" precisa de url http(s)`);
    }
  });

  test(`${arquivo}: status é um valor válido`, () => {
    const { data } = lerFrontmatter(arquivo);
    assert.ok(STATUS_VALIDOS.includes(data.status), `status "${data.status}" não está em ${STATUS_VALIDOS.join(", ")}`);
  });

  test(`${arquivo}: ministros é um array não-vazio de strings`, () => {
    const { data } = lerFrontmatter(arquivo);
    assert.ok(Array.isArray(data.ministros) && data.ministros.length > 0, "ministros deveria ser um array não-vazio");
    for (const s of data.ministros) assert.equal(typeof s, "string", "cada ministro deveria ser um slug string");
  });

  test(`${arquivo}: resumo presente e até 300 caracteres`, () => {
    const { data } = lerFrontmatter(arquivo);
    assert.ok(data.resumo && String(data.resumo).trim().length > 0, "resumo não pode estar vazio");
    assert.ok(String(data.resumo).length <= 300, "resumo deveria ter no máximo 300 caracteres");
  });

  test(`${arquivo}: nenhum rótulo ideológico proibido`, () => {
    const { data, corpo } = lerFrontmatter(arquivo);
    const texto = `${data.titulo ?? ""}\n${data.resumo ?? ""}\n${corpo}`;
    for (const rotulo of ROTULOS_PROIBIDOS) {
      assert.ok(!texto.includes(rotulo), `${arquivo} não deveria conter o rótulo "${rotulo}"`);
    }
  });

  test(`${arquivo}: sem linguagem de culpa fora do status "confirmado"`, () => {
    const { data, corpo } = lerFrontmatter(arquivo);
    if (data.status === "confirmado") return;
    const texto = corpo.toLowerCase();
    for (const termo of LINGUAGEM_DE_CULPA) {
      assert.ok(!texto.includes(termo), `${arquivo}: status "${data.status}" não deveria conter "${termo}"`);
    }
  });
}
