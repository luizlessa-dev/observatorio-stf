// NOTA (2026-08-19): a migração para Astro dissolveu StatsStrip, Hero,
// MinistroSidebar, MinistroDetalhe e Termometro em duas páginas — a home
// (src/pages/index.astro) e a ficha (src/pages/ministros/[slug].astro). Os
// nomes dos testes mantêm o componente original porque é assim que a Fase C0
// está documentada; o alvo é o arquivo que hoje renderiza aquele conteúdo.
// Testes de regressão da Fase C0 (contenção emergencial de integridade).
// Estáticos e baseados em texto-fonte — não requerem build nem runtime de React,
// então funcionam com o Node puro: `node --test tests/`.
//
// Objetivo: impedir que os dados fabricados/sem sustentação metodológica
// retirados de exposição pública em 2026-07-26 sejam reintroduzidos sem
// que alguém edite este teste conscientemente.
// Ver docs/auditoria-integridade-dados.md para o diagnóstico completo.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(path.join(ROOT, rel), "utf8");

test("StatsStrip não reintroduz as métricas fabricadas da home", () => {
  const src = read("src/pages/index.astro");
  const proibidos = [
    "2.847",
    "Processos políticos ativos",
    "Teses repercussão geral",
    "Casos prescritos",
    "Gasto médio CEAPS",
    "R$ 47k",
    "▲ 12% vs 2025",
  ];
  for (const termo of proibidos) {
    assert.ok(!src.includes(termo), `a home não deveria conter "${termo}"`);
  }
});

test("Nenhum arquivo de UI pública contém CEAPS associado a ministro", () => {
  const arquivosPublicos = [
    "src/pages/index.astro",
    "src/pages/index.astro",
    "src/layouts/Base.astro",
    "src/pages/index.astro",
    "src/pages/ministros/[slug].astro",
    "src/pages/ministros/[slug].astro",
    "src/pages/index.astro",
    "src/pages/index.astro",
    "src/pages/index.astro",
    "src/componentes/TabelaRepercussao.tsx",
  ];
  for (const arquivo of arquivosPublicos) {
    const src = read(arquivo);
    assert.ok(
      !/ceaps/i.test(src),
      `${arquivo} não deveria mencionar CEAPS (indicador retirado por falta de sustentação)`
    );
  }
});

test("MinistroSidebar não renderiza mais as tags pessoais/ideológicas do ministro", () => {
  const src = read("src/pages/index.astro");
  assert.ok(
    !src.includes("m.tags"),
    "MinistroSidebar.tsx não deveria renderizar o campo m.tags (suspenso na Fase C0)"
  );
  const rotulosProibidos = ["Religioso", "Anti-aborto", "Evangélico", "Conservador atual", "Mercado", "Garantismo"];
  for (const rotulo of rotulosProibidos) {
    assert.ok(!src.includes(rotulo), `MinistroSidebar.tsx não deveria conter o rótulo "${rotulo}"`);
  }
});

test("seed.ts não contém mais os valores de tags pessoais/ideológicas (dado é bundlado no cliente)", () => {
  const src = read("src/lib/dados.ts");
  const rotulosProibidos = ["Religioso", "Anti-aborto", "Evangélico", "Conservador atual", "Mercado", "Garantismo", "Dir. humanos", "Democracia digital", "Seg. pública"];
  for (const rotulo of rotulosProibidos) {
    assert.ok(
      !src.includes(`"${rotulo}"`),
      `seed.ts não deveria mais conter o valor de tag "${rotulo}" (fica no JS público mesmo sem ser renderizado)`
    );
  }
});

test("MinistroDetalhe não renderiza mais os rótulos pessoais/ideológicos do ministro", () => {
  const src = read("src/pages/ministros/[slug].astro");
  const rotulosProibidos = ["Religioso", "Anti-aborto", "Evangélico", "Conservador atual", "Mercado"];
  for (const rotulo of rotulosProibidos) {
    assert.ok(!src.includes(rotulo), `MinistroDetalhe.tsx não deveria conter o rótulo "${rotulo}"`);
  }
});

test("Termômetro não expõe mais escala ou rótulos ideológicos (conservador/progressista)", () => {
  const src = read("src/pages/ministros/[slug].astro");
  assert.ok(!/conservador/i.test(src), "Termometro.tsx não deveria conter o termo 'conservador'");
  assert.ok(!/progressista/i.test(src), "Termometro.tsx não deveria conter o termo 'progressista'");
});

test("MinistroDetalhe não renderiza mais o grid de 5 dimensões do score ideológico", () => {
  const src = read("src/pages/ministros/[slug].astro");
  const rotulosDimensoes = ["Direitos Civis", "Lib. Imprensa", "Seg. Pública", "Democracia"];
  for (const rotulo of rotulosDimensoes) {
    assert.ok(!src.includes(rotulo), `MinistroDetalhe.tsx não deveria mais renderizar o rótulo de dimensão "${rotulo}"`);
  }
  assert.ok(!src.includes("score_direitos"), "MinistroDetalhe.tsx não deveria mais ler score_direitos para exibição");
});

test("as seções sem conteúdo não voltam ao menu", () => {
  // /processos e /impunidade mostravam a mesma tela de "ainda não publicado" e
  // ocupavam metade do menu (achado G1). Na migração para Astro deixaram de
  // existir. Quando tiverem conteúdo, voltam — e este teste muda na mesma
  // mudança que as publica, nunca antes.
  const base = read("src/layouts/Base.astro");
  for (const rota of ["/processos", "/impunidade"]) {
    assert.ok(!base.includes(`href: "${rota}"`), `${rota} voltou ao menu sem ter conteúdo`);
  }
});
