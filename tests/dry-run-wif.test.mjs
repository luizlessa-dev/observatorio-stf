// Testes de regressão da Fase D1 (recuperação governada da ingestão via WIF).
// Estáticos e baseados em texto-fonte — não requerem build, runtime de Python
// nem conexão com Supabase/GCP: `node --test tests/`.
//
// Objetivo: impedir que a autenticação volte a depender de GCP_SA_KEY, que o
// dry-run manual deixe de ser o padrão seguro, que o cron seja reativado sem
// aprovação, ou que os secrets do Supabase vazem para steps que não sejam o
// do script de ingestão.
// Ver docs/ingestao-votacoes-stf.md para o diagnóstico e a arquitetura completos.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(path.join(ROOT, rel), "utf8");

const WORKFLOW = ".github/workflows/ingestao-diaria.yml";
const workflowSrc = () => read(WORKFLOW);

test("workflow não referencia GCP_SA_KEY nem credentials_json", () => {
  const src = workflowSrc();
  assert.ok(!src.includes("GCP_SA_KEY"), "workflow não deveria referenciar GCP_SA_KEY");
  assert.ok(!src.includes("credentials_json"), "workflow não deveria usar credentials_json");
});

test("workflow autentica no GCP via Workload Identity Federation", () => {
  const src = workflowSrc();
  assert.ok(src.includes("workload_identity_provider:"), "workflow deveria configurar workload_identity_provider");
  assert.ok(
    src.includes("service_account: stf-votacoes-ingest@brinsider-dou.iam.gserviceaccount.com"),
    "workflow deveria impersonar a service account dedicada"
  );
  assert.ok(/id-token:\s*write/.test(src), "workflow deveria declarar permissions.id-token: write");
});

test("workflow_dispatch expõe dry_run booleano, obrigatório, com padrão true", () => {
  const src = workflowSrc();
  const bloco = src.match(/dry_run:\s*\n([\s\S]*?)\n\s*ano:/);
  assert.ok(bloco, "input dry_run deveria existir antes do input ano");
  const corpo = bloco[1];
  assert.ok(/required:\s*true/.test(corpo), "dry_run deveria ser required: true");
  assert.ok(/default:\s*true/.test(corpo), "dry_run deveria ter default: true");
  assert.ok(/type:\s*boolean/.test(corpo), "dry_run deveria ser type: boolean");
});

test("cron está suspenso (comentado), não removido silenciosamente", () => {
  const src = workflowSrc();
  assert.ok(!/^\s*schedule:\s*$/m.test(src), "schedule: não deveria estar ativo");
  assert.ok(!/^\s*-\s*cron:/m.test(src), "nenhuma linha de cron ativa deveria existir");
  assert.ok(src.includes('#   - cron: "0 8 * * *"'), "cron original deveria continuar documentado, só comentado");
  assert.ok(
    /temporariamente suspenso/i.test(src),
    "workflow deveria documentar explicitamente que o schedule está suspenso"
  );
});

test("execução manual usa --dry-run por padrão (fail-closed) e só desarma com dry_run=false explícito", () => {
  const src = workflowSrc();
  assert.ok(src.includes('DRY_RUN_FLAG="--dry-run"'), "flag deveria iniciar como --dry-run (seguro por padrão)");
  assert.ok(
    /if \[ "\$DRY_RUN_INPUT" = "false" \]; then\s*\n\s*DRY_RUN_FLAG=""/.test(src),
    "só deveria desarmar o dry-run quando o input for exatamente 'false'"
  );
});

test("concurrency está configurada para serializar ingestões", () => {
  const src = workflowSrc();
  assert.ok(src.includes("group: ingestao-stf-votacoes"), "deveria existir grupo de concurrency dedicado");
  assert.ok(/cancel-in-progress:\s*false/.test(src), "não deveria cancelar uma ingestão em andamento");
});

test("job tem timeout-minutes definido", () => {
  const src = workflowSrc();
  assert.ok(/timeout-minutes:\s*\d+/.test(src), "job votacoes deveria declarar timeout-minutes");
});

test("workflow não usa continue-on-error em nenhum step", () => {
  const src = workflowSrc();
  assert.ok(!src.includes("continue-on-error"), "workflow não deveria mascarar falhas com continue-on-error");
});

test("secrets do Supabase só aparecem no step de fetch de votações, não no de autenticação GCP", () => {
  const src = workflowSrc();
  const stepAuth = src.match(/- name: Autenticar no Google Cloud[\s\S]*?(?=\n\s*- name:)/);
  assert.ok(stepAuth, "step de autenticação GCP deveria existir");
  assert.ok(
    !stepAuth[0].includes("secrets.SUPABASE"),
    "step de autenticação GCP não deveria referenciar secrets do Supabase"
  );
  const stepFetch = src.match(/- name: Fetch votações[\s\S]*?(?=\n\s*# Fase C1)/);
  assert.ok(stepFetch, "step de fetch de votações deveria existir");
  assert.ok(
    stepFetch[0].includes("secrets.SUPABASE_URL") && stepFetch[0].includes("secrets.SUPABASE_SERVICE_ROLE_KEY"),
    "step de fetch de votações deveria ser o único a usar os secrets do Supabase"
  );
});

test("etapa de scores termômetro continua desativada (if: false)", () => {
  const src = workflowSrc();
  const stepScore = src.match(/- name: Calcular scores termômetro[\s\S]*/);
  assert.ok(stepScore, "step de scores deveria continuar presente (documentado, não removido)");
  assert.ok(/if:\s*\$\{\{\s*false\s*\}\}/.test(stepScore[0]), "step de scores deveria ter if: ${{ false }}");
});

test("nenhum workflow secundário chama calc_scores_termometro.py fora do step suspenso", () => {
  const dir = path.join(ROOT, ".github/workflows");
  const arquivos = readdirSync(dir).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));
  for (const arquivo of arquivos) {
    const src = readFileSync(path.join(dir, arquivo), "utf8");
    if (!src.includes("calc_scores_termometro")) continue;
    assert.strictEqual(
      arquivo,
      "ingestao-diaria.yml",
      `${arquivo} não deveria chamar calc_scores_termometro.py`
    );
    const chamada = src.indexOf("calc_scores_termometro");
    const antesDaChamada = src.slice(0, chamada);
    const ultimoIf = antesDaChamada.lastIndexOf("if:");
    assert.ok(
      ultimoIf !== -1 && /if:\s*\$\{\{\s*false\s*\}\}/.test(antesDaChamada.slice(ultimoIf)),
      `${arquivo} só deveria chamar calc_scores_termometro.py atrás de if: \${{ false }}`
    );
  }
});
