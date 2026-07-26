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
  const src = read("src/components/layout/StatsStrip.tsx");
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
    assert.ok(!src.includes(termo), `StatsStrip.tsx não deveria conter "${termo}"`);
  }
});

test("Nenhum arquivo de UI pública contém CEAPS associado a ministro", () => {
  const arquivosPublicos = [
    "src/components/layout/StatsStrip.tsx",
    "src/components/layout/Hero.tsx",
    "src/components/layout/Layout.tsx",
    "src/components/ministros/MinistroSidebar.tsx",
    "src/components/ministros/MinistroDetalhe.tsx",
    "src/components/termometro/Termometro.tsx",
    "src/pages/Ministros.tsx",
    "src/pages/ProcessosPoliticos.tsx",
    "src/pages/Impunidade.tsx",
    "src/pages/RepercussaoGeral.tsx",
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
  const src = read("src/components/ministros/MinistroSidebar.tsx");
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
  const src = read("src/lib/seed.ts");
  const rotulosProibidos = ["Religioso", "Anti-aborto", "Evangélico", "Conservador atual", "Mercado", "Garantismo", "Dir. humanos", "Democracia digital", "Seg. pública"];
  for (const rotulo of rotulosProibidos) {
    assert.ok(
      !src.includes(`"${rotulo}"`),
      `seed.ts não deveria mais conter o valor de tag "${rotulo}" (fica no JS público mesmo sem ser renderizado)`
    );
  }
});

test("MinistroDetalhe não renderiza mais os rótulos pessoais/ideológicos do ministro", () => {
  const src = read("src/components/ministros/MinistroDetalhe.tsx");
  const rotulosProibidos = ["Religioso", "Anti-aborto", "Evangélico", "Conservador atual", "Mercado"];
  for (const rotulo of rotulosProibidos) {
    assert.ok(!src.includes(rotulo), `MinistroDetalhe.tsx não deveria conter o rótulo "${rotulo}"`);
  }
});

test("Termômetro não expõe mais escala ou rótulos ideológicos (conservador/progressista)", () => {
  const src = read("src/components/termometro/Termometro.tsx");
  assert.ok(!/conservador/i.test(src), "Termometro.tsx não deveria conter o termo 'conservador'");
  assert.ok(!/progressista/i.test(src), "Termometro.tsx não deveria conter o termo 'progressista'");
});

test("MinistroDetalhe não renderiza mais o grid de 5 dimensões do score ideológico", () => {
  const src = read("src/components/ministros/MinistroDetalhe.tsx");
  const rotulosDimensoes = ["Direitos Civis", "Lib. Imprensa", "Seg. Pública", "Democracia"];
  for (const rotulo of rotulosDimensoes) {
    assert.ok(!src.includes(rotulo), `MinistroDetalhe.tsx não deveria mais renderizar o rótulo de dimensão "${rotulo}"`);
  }
  assert.ok(!src.includes("score_direitos"), "MinistroDetalhe.tsx não deveria mais ler score_direitos para exibição");
});

test("Rotas /processos e /impunidade não exibem números nem se apresentam como conteúdo publicado", () => {
  for (const arquivo of ["src/pages/ProcessosPoliticos.tsx", "src/pages/Impunidade.tsx"]) {
    const src = read(arquivo);
    assert.ok(!/\d/.test(src.replace(/className="[^"]*"/g, "")), `${arquivo} não deveria exibir números fora de classes CSS`);
    assert.ok(/ainda não publicado/i.test(src), `${arquivo} deveria sinalizar claramente que a seção não está publicada`);
  }
});
