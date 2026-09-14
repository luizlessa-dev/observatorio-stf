// Testes comportamentais para src/lib/contagemRepercussao.js — extraído de
// TabelaRepercussao.tsx na revisão de 2026-09-13 (itens 3.2 e 4) justamente
// para permitir estes testes diretos, em vez de grepar o texto-fonte do
// componente React.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buscaEstaAplicada,
  descreverContagem,
  deveMostrarCarregarMais,
} from "../src/lib/contagemRepercussao.js";

test("buscaEstaAplicada: 0, 1 ou 2 caracteres não conta como busca aplicada (mesmo limiar do hook)", () => {
  assert.equal(buscaEstaAplicada(""), false);
  assert.equal(buscaEstaAplicada("a"), false);
  assert.equal(buscaEstaAplicada("ab"), false, "2 caracteres ainda não aciona o ilike no hook");
});

test("buscaEstaAplicada: 3+ caracteres conta como busca aplicada", () => {
  assert.equal(buscaEstaAplicada("abc"), true);
  assert.equal(buscaEstaAplicada("prisão"), true);
});

test("descreverContagem: carregados de total, sem busca, respeita o filtro de status", () => {
  assert.equal(descreverContagem(50, 1470, "todos", false), "50 de 1.470 temas exibidos");
  assert.equal(descreverContagem(12, 12, "pendente", false), "12 de 12 temas pendentes exibidos");
  assert.equal(descreverContagem(3, 40, "julgado", false), "3 de 40 temas julgados exibidos");
});

test("descreverContagem: zero resultados sem busca usa singular por status (não '0 de 12 temas')", () => {
  assert.equal(descreverContagem(0, 0, "todos", false), "Nenhum tema encontrado");
  assert.equal(descreverContagem(0, 0, "pendente", false), "Nenhum tema pendente encontrado");
  assert.equal(descreverContagem(0, 0, "sobrestado", false), "Nenhum tema sobrestado encontrado");
});

test("descreverContagem: com busca aplicada, menciona 'busca' em vez do rótulo de status", () => {
  assert.equal(descreverContagem(5, 5, "todos", true), "5 de 5 temas correspondem à busca");
  assert.equal(descreverContagem(0, 0, "todos", true), "Nenhum tema corresponde à busca");
});

test("descreverContagem: nunca produz a frase quebrada '50 todos os temas exibidos' do texto antigo", () => {
  for (const s of [descreverContagem(50, 1470, "todos", false), descreverContagem(0, 0, "todos", false)]) {
    assert.ok(!s.includes("todos os temas"), `frase antiga vazou: "${s}"`);
  }
});

test("deveMostrarCarregarMais: aparece só quando há mais itens além dos já carregados", () => {
  assert.equal(deveMostrarCarregarMais({ erro: null, loading: false, carregados: 50, total: 1470 }), true);
  assert.equal(deveMostrarCarregarMais({ erro: null, loading: false, carregados: 1470, total: 1470 }), false, "carregados === total: nada mais a carregar");
  assert.equal(deveMostrarCarregarMais({ erro: null, loading: false, carregados: 12, total: 12 }), false);
});

test("deveMostrarCarregarMais: nunca aparece durante loading ou com erro, mesmo se houvesse mais itens", () => {
  assert.equal(deveMostrarCarregarMais({ erro: null, loading: true, carregados: 50, total: 1470 }), false);
  assert.equal(deveMostrarCarregarMais({ erro: "falha", loading: false, carregados: 50, total: 1470 }), false);
});
