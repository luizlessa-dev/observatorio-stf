// Testes de regressão da Fase C1 (contenção residual dos scores).
// Estáticos e baseados em texto-fonte — não requerem build, runtime de React
// nem conexão com Supabase: `node --test tests/`.
//
// Objetivo: impedir que os scores ideológicos suspensos voltem a ser
// selecionados, tipados como públicos, embutidos no bundle ou vendidos na
// página de assinatura sem que alguém edite este teste conscientemente.
// Ver docs/auditoria-integridade-dados.md e docs/plano-aplicacao-c1-supabase.md.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(path.join(ROOT, rel), "utf8");
// comentários podem citar os termos suspensos ao documentar a contenção;
// o proibido é código/JSX/string renderizada
const semComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

const CAMPOS_SCORE = [
  "score_geral",
  "score_direitos_civis",
  "score_lib_imprensa",
  "score_seg_publica",
  "score_economico",
  "score_democracia",
  // variantes abreviadas usadas no modelo do front antes da C1
  "score_direitos",
  "score_imprensa",
  "score_seguranca",
];

const ARQUIVOS_PUBLICOS = [
  "src/lib/seed.ts",
  "src/hooks/useMinistros.ts",
  "src/hooks/useVotacoes.ts",
  "src/hooks/useGastos.ts",
  "src/hooks/useRepercussaoGeral.ts",
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
  "src/pages/Assinar.tsx",
];

test("nenhum arquivo público de UI/hook referencia campos de score", () => {
  for (const arquivo of ARQUIVOS_PUBLICOS) {
    const src = semComentarios(read(arquivo));
    for (const campo of CAMPOS_SCORE) {
      assert.ok(
        !src.includes(campo),
        `${arquivo} não deveria referenciar "${campo}" (suspenso na Fase C1)`
      );
    }
  }
});

test("nenhum hook do frontend usa select('*') — seleção deve ser explícita", () => {
  const hooks = [
    "src/hooks/useMinistros.ts",
    "src/hooks/useVotacoes.ts",
    "src/hooks/useGastos.ts",
    "src/hooks/useRepercussaoGeral.ts",
    "src/lib/auth.ts",
  ];
  for (const arquivo of hooks) {
    const src = semComentarios(read(arquivo));
    assert.ok(
      !/select\(\s*["'`]\s*\*\s*["'`]?\s*\)/.test(src) && !src.includes('select("*")') && !src.includes("select('*')"),
      `${arquivo} não deveria usar select('*') — colunas devem ser explícitas`
    );
  }
});

test("tipo público Ministro (seed.ts) não contém scores", () => {
  const src = read("src/lib/seed.ts");
  assert.ok(!/score/i.test(src.replace(/\/\/[^\n]*/g, "")),
    "seed.ts (fora de comentários) não deveria conter nenhum campo ou valor de score");
});

test("tipagem do cliente Supabase não expõe scores nem a view legada de scores", () => {
  const src = read("src/types/database.ts");
  // comentários explicativos podem citar os nomes; código não
  const semComentarios = src.replace(/\/\/[^\n]*/g, "");
  for (const campo of ["score_geral", "score_direitos_civis", "score_lib_imprensa", "score_seg_publica", "score_economico", "score_democracia"]) {
    assert.ok(!semComentarios.includes(campo),
      `database.ts não deveria tipar "${campo}" no cliente público`);
  }
  assert.ok(!semComentarios.includes("stf_v_ministros_scores"),
    "database.ts não deveria tipar a view legada stf_v_ministros_scores");
});

test("/assinar não promete scores, termômetro, G5 nem recursos inexistentes", () => {
  // comentários de código podem citar os termos ao explicar a suspensão;
  // o que não pode é o texto renderizado ao usuário
  const src = read("src/pages/Assinar.tsx")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");
  const promessasProibidas = [
    "score", "Score", "G5", "dimensão", "dimensões",
    "Termômetro", "termômetro", "tendência de voto",
    "Alertas", "alertas", "CSV", "PDF", "Relatório mensal",
    "Acesso antecipado", "exclusiv",
  ];
  for (const termo of promessasProibidas) {
    assert.ok(!src.includes(termo),
      `Assinar.tsx não deveria conter "${termo}" (funcionalidade suspensa ou inexistente)`);
  }
});

test("Hero não anuncia tendências de voto nem redes de indicação", () => {
  const src = read("src/components/layout/Hero.tsx");
  assert.ok(!/tend[êe]ncias? de voto/i.test(src), "Hero.tsx não deveria prometer 'tendências de voto'");
  assert.ok(!/redes de indica/i.test(src), "Hero.tsx não deveria prometer 'redes de indicação'");
});

test("MinistroDetalhe não usa o rótulo comercial 'Termômetro'", () => {
  const src = read("src/components/ministros/MinistroDetalhe.tsx")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  assert.ok(!/Term[ôo]metro de tend[êe]ncia/i.test(src),
    "MinistroDetalhe.tsx não deveria exibir o rótulo 'Termômetro de tendência de voto'");
});

test("migration 0003 existe, cria a view pública sem scores e restringe grants", () => {
  const rel = "supabase/migrations/0003_contencao_scores.sql";
  assert.ok(existsSync(path.join(ROOT, rel)), `${rel} deveria existir`);
  const sql = read(rel);

  // view pública criada, com security_invoker e sem colunas de score no corpo da view
  assert.ok(sql.includes("create or replace view public.stf_ministros_publicos"),
    "0003 deveria criar a view stf_ministros_publicos");
  assert.ok(sql.includes("security_invoker = true"),
    "0003: a view pública deveria ser security_invoker");
  const corpoView = sql.split("create or replace view public.stf_ministros_publicos")[1].split(";")[0];
  assert.ok(!/score_/.test(corpoView), "0003: a view pública não deveria selecionar colunas de score");

  // revoke do select de tabela inteira + grant por coluna sem scores
  assert.ok(/revoke select on table public\.stf_ministros from anon, authenticated/.test(sql),
    "0003 deveria revogar o SELECT de tabela inteira de stf_ministros");
  const grantColunas = sql.split("grant select (")[1].split(") on public.stf_ministros")[0];
  assert.ok(!/score_/.test(grantColunas), "0003: o grant por coluna não deveria incluir colunas de score");

  // view legada de scores sem acesso público
  assert.ok(/revoke all on table public\.stf_v_ministros_scores from anon, authenticated/.test(sql),
    "0003 deveria revogar o acesso público à view legada stf_v_ministros_scores");

  // preservação: nenhum comando destrutivo — atenção: "truncate"/"delete"
  // aparecem legitimamente como NOMES DE PRIVILÉGIO dentro de revoke;
  // o proibido é o comando (TRUNCATE <tabela>, DELETE FROM, DROP ...)
  const sqlSemComentarios = sql.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");
  for (const proibido of [/\bdrop\s+(table|view|column)\b/i, /^\s*truncate\b/im, /\bdelete\s+from\b/i]) {
    assert.ok(!proibido.test(sqlSemComentarios), `0003 não deveria conter comando destrutivo (${proibido})`);
  }
});

test("migration 0002 reconcilia stf_gastos sem tocar em dados existentes", () => {
  const sql = read("supabase/migrations/0002_reconciliacao_stf_gastos.sql");
  for (const col of ["fonte", "data_inicio", "data_fim", "destino", "num_diarias"]) {
    assert.ok(new RegExp(`add column if not exists ${col}`).test(sql),
      `0002 deveria adicionar stf_gastos.${col} com IF NOT EXISTS`);
  }
  const sqlSemComentarios = sql.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");
  for (const proibido of [/\bdrop\b/i, /\btruncate\b/i, /\bdelete\s+from\b/i, /\bupdate\s+stf_/i]) {
    assert.ok(!proibido.test(sqlSemComentarios), `0002 não deveria conter comando destrutivo/backfill (${proibido})`);
  }
});

test("workflow de ingestão mantém a etapa de scores desabilitada", () => {
  const yml = read(".github/workflows/ingestao-diaria.yml");
  const idx = yml.indexOf("calc_scores_termometro.py");
  assert.ok(idx !== -1, "a etapa suspensa deveria continuar documentada no workflow");
  const bloco = yml.slice(Math.max(0, idx - 600), idx);
  assert.ok(/if:\s*\$\{\{\s*false\s*\}\}/.test(bloco),
    "a etapa de scores do workflow deveria estar atrás de `if: false`");
});

test("lista de ministros continua alimentada (seed com 10 ministros ativos)", () => {
  const src = read("src/lib/seed.ts");
  const nomes = ["Alexandre de Moraes", "Edson Fachin", "Cármen Lúcia", "Dias Toffoli",
    "Luiz Fux", "Gilmar Mendes", "Cristiano Zanin", "Flávio Dino", "Nunes Marques", "André Mendonça"];
  for (const nome of nomes) {
    assert.ok(src.includes(nome), `seed.ts deveria continuar contendo ${nome}`);
  }
});

test("perfil do ministro preserva dados institucionais legítimos", () => {
  const src = read("src/components/ministros/MinistroDetalhe.tsx");
  for (const trecho of ["indicado_por", "data_posse", "aposentadoria", "useVotacoes", "useGastos"]) {
    assert.ok(src.includes(trecho), `MinistroDetalhe.tsx deveria continuar usando ${trecho}`);
  }
});
