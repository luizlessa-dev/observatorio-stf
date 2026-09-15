// Testes comportamentais para src/lib/buscaCasos.js (achado AUD-13),
// extraído de BuscaGeral.tsx justamente pra poder ser testado direto —
// node --test faz strip de tipos, não transformação de JSX, então um .tsx
// não importa aqui (confirmado: ERR_UNKNOWN_FILE_EXTENSION). O resto do
// componente depende de Supabase/DOM e é coberto por verificação manual no
// preview real (mesmo padrão do resto do projeto para componentes React).

import { test } from "node:test";
import assert from "node:assert/strict";
import { buscarCasos } from "../src/lib/buscaCasos.js";

const casos = [
  { slug: "caso-a", titulo: "Mensagens entre Moraes e Vorcaro reveladas", resumo: "Contratos e mensagens entre o ministro e o banqueiro.", status: "em_apuracao", ministros: ["Alexandre de Moraes", "André Mendonça"] },
  { slug: "caso-b", titulo: "Aposentadoria compulsória de ministro é questionada", resumo: "Processo discute limite etário.", status: "confirmado", ministros: ["Gilmar Mendes"] },
];

test("buscarCasos: encontra por título, sem diferenciar maiúsculas/acentos", () => {
  assert.deepEqual(buscarCasos(casos, "mensagens").map((c) => c.slug), ["caso-a"]);
  assert.deepEqual(buscarCasos(casos, "MENSAGENS").map((c) => c.slug), ["caso-a"]);
});

test("buscarCasos: encontra por resumo", () => {
  assert.deepEqual(buscarCasos(casos, "banqueiro").map((c) => c.slug), ["caso-a"]);
});

test("buscarCasos: encontra por nome de ministro, ignorando acento", () => {
  // "gilmar" sem acento tem que achar "Gilmar Mendes"; "aposentadoria" (com
  // acento no texto buscado) tem que achar mesmo digitando sem acento.
  assert.deepEqual(buscarCasos(casos, "gilmar").map((c) => c.slug), ["caso-b"]);
  assert.deepEqual(buscarCasos(casos, "aposentadoria").map((c) => c.slug), ["caso-b"]);
});

test("buscarCasos: sem correspondência devolve lista vazia, não todos os casos", () => {
  assert.deepEqual(buscarCasos(casos, "termo-que-nao-existe-em-lugar-nenhum"), []);
});

test("buscarCasos: lista vazia de casos nunca lança", () => {
  assert.deepEqual(buscarCasos([], "qualquer coisa"), []);
});
