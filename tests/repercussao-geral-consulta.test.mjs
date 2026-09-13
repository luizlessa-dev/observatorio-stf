// Testes comportamentais para o achado AUD-01 (Repercussão Geral mostrando
// "Nenhum tema encontrado" para uma falha de consulta real).
//
// Testa src/hooks/consultaCancelavel.js diretamente — a função pura que o
// hook React usa dentro do useEffect — com setters-espião no lugar de
// useState. Isso cobre o comportamento de verdade (ordem de resolução de
// Promise, cancelamento, distinção erro/vazio) sem precisar de DOM nem de
// framework de teste de React, mantendo o padrão do projeto (node --test
// puro). Ver src/hooks/consultaCancelavel.js para o porquê da extração.

import { test } from "node:test";
import assert from "node:assert/strict";
import { setTimeout as aguardar } from "node:timers/promises";
import { executarConsultaCancelavel } from "../src/hooks/consultaCancelavel.js";

// Dá uma volta no event loop para deixar o `.then()`/`.catch()` de
// executarConsultaCancelavel rodar antes de inspecionar os espiões. Importado
// de node:timers/promises (não o `setTimeout` global) porque a config de
// lint do projeto não expõe globals de Node em tests/.
const esperarMicrotarefas = () => aguardar(0);

function espiarDeps() {
  const chamadas = { loading: [], erro: [], temas: [], total: [] };
  const deps = {
    setLoading: (v) => chamadas.loading.push(v),
    setErro: (v) => chamadas.erro.push(v),
    setTemas: (v) => chamadas.temas.push(v),
    setTotal: (v) => chamadas.total.push(v),
  };
  return { deps, chamadas };
}

// Uma promise cujo resolve/reject o teste dispara manualmente, para
// controlar a ordem de chegada das respostas de forma determinística (sem
// setTimeout/sleep).
function criarDiferida() {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function ultimo(lista) { return lista[lista.length - 1]; }

test("AUD-01/1: consulta bem-sucedida com registros aplica os dados, sem erro", async () => {
  const { deps, chamadas } = espiarDeps();
  const temasFake = [{ id: "1", tema: 100, titulo: "x", tese: null, status: "julgado", data_reconh: null, data_julg: null, leading_case: null, processos_imp: null, destaque: false, relator_id: null }];

  executarConsultaCancelavel(() => Promise.resolve({ data: temasFake, count: 1, error: null }), deps);
  await esperarMicrotarefas();

  assert.deepEqual(ultimo(chamadas.temas), temasFake);
  assert.equal(ultimo(chamadas.total), 1);
  assert.equal(ultimo(chamadas.erro), null);
  assert.equal(ultimo(chamadas.loading), false);
});

test("AUD-01/2: consulta bem-sucedida e legitimamente vazia não vira erro", async () => {
  const { deps, chamadas } = espiarDeps();

  executarConsultaCancelavel(() => Promise.resolve({ data: [], count: 0, error: null }), deps);
  await esperarMicrotarefas();

  assert.deepEqual(ultimo(chamadas.temas), []);
  assert.equal(ultimo(chamadas.total), 0);
  assert.equal(ultimo(chamadas.erro), null, "vazio real não deveria setar erro");
  assert.equal(ultimo(chamadas.loading), false);
});

test("AUD-01/3: erro de rede (Promise rejeitada) vira estado de erro, nunca vazio silencioso", async () => {
  const { deps, chamadas } = espiarDeps();

  executarConsultaCancelavel(() => Promise.reject(new TypeError("Failed to fetch")), deps);
  await esperarMicrotarefas();

  // A partir da revisão de 2026-09-13 (item 3.3), `erro` já é a mensagem
  // pública sanitizada, não mais o `.message` cru — ver os testes dedicados
  // de não-vazamento mais abaixo para o comportamento de sanitização em si.
  assert.notEqual(ultimo(chamadas.erro), null);
  assert.deepEqual(ultimo(chamadas.temas), []);
  assert.equal(ultimo(chamadas.loading), false, "não pode ficar preso em loading eternamente");
});

test("AUD-01/4: erro retornado pelo Supabase (campo error, sem rejeição) vira estado de erro", async () => {
  const { deps, chamadas } = espiarDeps();

  executarConsultaCancelavel(
    () => Promise.resolve({ data: null, count: null, error: { message: "permission denied for table stf_repercussao_geral" } }),
    deps,
  );
  await esperarMicrotarefas();

  assert.deepEqual(ultimo(chamadas.temas), []);
  assert.notEqual(ultimo(chamadas.erro), null, "erro de RLS não pode ser indistinguível de vazio real (o próprio bug do AUD-01)");
});

test("AUD-01/5+6: resposta lenta que chega depois de uma nova consulta é descartada (sem sobrescrever o estado atual)", async () => {
  const { deps, chamadas } = espiarDeps();
  const lenta = criarDiferida();
  const rapida = criarDiferida();

  const cancelarLenta = executarConsultaCancelavel(() => lenta.promise, deps);
  // Uma nova consulta (ex.: usuário trocou o filtro) começa antes da lenta
  // responder — o hook real chama isso no cleanup do useEffect anterior.
  cancelarLenta();
  executarConsultaCancelavel(() => rapida.promise, deps);

  // A rápida resolve primeiro...
  rapida.resolve({ data: [{ id: "rapida" }], count: 1, error: null });
  await esperarMicrotarefas();
  // ...e só depois a lenta (obsoleta) resolve.
  lenta.resolve({ data: [{ id: "lenta-obsoleta" }], count: 999, error: null });
  await esperarMicrotarefas();

  assert.deepEqual(ultimo(chamadas.temas), [{ id: "rapida" }], "a resposta obsoleta não pode sobrescrever a mais recente");
  assert.equal(ultimo(chamadas.total), 1);
});

test("AUD-01/6b: resposta obsoleta que chega com erro também é descartada", async () => {
  const { deps, chamadas } = espiarDeps();
  const lenta = criarDiferida();
  const rapida = criarDiferida();

  const cancelarLenta = executarConsultaCancelavel(() => lenta.promise, deps);
  cancelarLenta();
  executarConsultaCancelavel(() => rapida.promise, deps);

  rapida.resolve({ data: [{ id: "ok" }], count: 1, error: null });
  await esperarMicrotarefas();
  lenta.reject(new Error("timeout da consulta antiga"));
  await esperarMicrotarefas();

  assert.equal(ultimo(chamadas.erro), null, "erro de uma consulta já cancelada não pode aparecer depois de um sucesso mais recente");
  assert.deepEqual(ultimo(chamadas.temas), [{ id: "ok" }]);
});

test("AUD-01/7: \"Tentar novamente\" após erro limpa o erro e aplica o novo resultado", async () => {
  const { deps, chamadas } = espiarDeps();

  executarConsultaCancelavel(() => Promise.resolve({ data: null, count: null, error: { message: "falha temporária" } }), deps);
  await esperarMicrotarefas();
  assert.notEqual(ultimo(chamadas.erro), null);

  // "Tentar novamente" = uma nova chamada (no hook real, via `tentativa++`
  // reexecutando o useEffect).
  executarConsultaCancelavel(() => Promise.resolve({ data: [{ id: "1" }], count: 1, error: null }), deps);
  await esperarMicrotarefas();

  assert.equal(ultimo(chamadas.erro), null, "erro anterior precisa ser limpo assim que uma nova tentativa começa");
  assert.deepEqual(ultimo(chamadas.temas), [{ id: "1" }]);
});

test("AUD-01/8: filtros e paginação continuam funcionando após uma recuperação de erro", async () => {
  const { deps, chamadas } = espiarDeps();

  executarConsultaCancelavel(() => Promise.reject(new Error("rede")), deps);
  await esperarMicrotarefas();
  assert.notEqual(ultimo(chamadas.erro), null);

  // Simula troca de filtro (nova consulta, parâmetros diferentes) após o erro.
  executarConsultaCancelavel(() => Promise.resolve({ data: [{ id: "pendente-1" }], count: 1, error: null }), deps);
  await esperarMicrotarefas();
  assert.equal(ultimo(chamadas.erro), null);
  assert.deepEqual(ultimo(chamadas.temas), [{ id: "pendente-1" }]);

  // Simula "carregar mais" (limit maior) logo em seguida — precisa continuar
  // aplicando resultados normalmente, sem carregar o erro anterior consigo.
  executarConsultaCancelavel(() => Promise.resolve({ data: [{ id: "pendente-1" }, { id: "pendente-2" }], count: 2, error: null }), deps);
  await esperarMicrotarefas();
  assert.equal(ultimo(chamadas.erro), null);
  assert.equal(ultimo(chamadas.total), 2);
});

test("revisão 2026-09-13/3.3: mensagem técnica interna (RLS/rede/coluna) nunca é exposta em erro — só a mensagem pública genérica", async () => {
  const { deps, chamadas } = espiarDeps();

  executarConsultaCancelavel(
    () => Promise.resolve({ data: null, count: null, error: { message: "permission denied for table stf_repercussao_geral" } }),
    deps,
  );
  await esperarMicrotarefas();

  const erroExposto = ultimo(chamadas.erro);
  assert.notEqual(erroExposto, null);
  assert.ok(!erroExposto.includes("permission denied"), "detalhe técnico de RLS vazou para o estado exposto à UI");
  assert.ok(!erroExposto.includes("stf_repercussao_geral"), "nome de tabela interna vazou para o estado exposto à UI");
});

test("revisão 2026-09-13/3.3: mensagem técnica de rejeição de rede também não é exposta", async () => {
  const { deps, chamadas } = espiarDeps();

  executarConsultaCancelavel(() => Promise.reject(new TypeError("Failed to fetch at https://xxxx.supabase.co/rest/v1/stf_repercussao_geral")), deps);
  await esperarMicrotarefas();

  const erroExposto = ultimo(chamadas.erro);
  assert.notEqual(erroExposto, null);
  assert.ok(!erroExposto.includes("supabase.co"), "URL/host interno vazou para o estado exposto à UI");
  assert.ok(!erroExposto.includes("Failed to fetch"), "mensagem crua do fetch vazou para o estado exposto à UI");
});

test("revisão 2026-09-13/4: exceção síncrona lançada por `consultar` vira estado de erro, sem escapar de executarConsultaCancelavel", async () => {
  const { deps, chamadas } = espiarDeps();

  assert.doesNotThrow(() => {
    executarConsultaCancelavel(() => {
      throw new Error("falha ao montar a query (coluna renomeada)");
    }, deps);
  });
  await esperarMicrotarefas();

  assert.notEqual(ultimo(chamadas.erro), null, "exceção síncrona precisa virar erro, não desaparecer");
  assert.ok(!ultimo(chamadas.erro).includes("coluna renomeada"), "detalhe técnico da exceção síncrona não pode vazar para a UI");
  assert.deepEqual(ultimo(chamadas.temas), []);
  assert.equal(ultimo(chamadas.loading), false, "não pode ficar preso em loading após exceção síncrona");
});

test("AUD-01: setLoading(true) e setErro(null) são aplicados de forma síncrona ao iniciar, antes de qualquer await", () => {
  const { deps, chamadas } = espiarDeps();
  const nuncaResolve = new Promise(() => {});

  executarConsultaCancelavel(() => nuncaResolve, deps);

  // Sem nenhum await: se loading/erro só fossem setados depois da Promise
  // resolver, a UI mostraria o estado antigo por um instante antes de
  // "carregando" aparecer.
  assert.equal(ultimo(chamadas.loading), true);
  assert.equal(ultimo(chamadas.erro), null);
});
