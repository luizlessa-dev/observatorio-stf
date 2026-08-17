// Testes de regressão da Onda 1 (correção de dados publicados, 2026-08-17).
// Estáticos e baseados em texto-fonte — não requerem build, runtime de React
// nem conexão com Supabase: `node --test tests/`.
//
// Objetivo: impedir que voltem ao ar os erros que a auditoria encontrou —
// datas de aposentadoria digitadas à mão, posse errada de Fachin e Dino,
// rótulo "Ausente" para decisão não classificada, derivação de nome de
// presidente por fatiamento de string, chave técnica "AM2" no avatar, e a
// venda de "acesso" a um site que é inteiramente aberto.
// Ver docs/auditoria-onda-1.md.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(path.join(ROOT, rel), "utf8");
const semComentarios = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

// ── A1: datas de aposentadoria compulsória ──────────────────────────

// nascimento + 75 anos. Nascimentos conferidos em 2026-08-17 no Wikidata
// (P569), cruzados com os levantamentos de Poder360, CNN Brasil e Migalhas.
const APOSENTADORIA_CORRETA = {
  "Gilmar Mendes":       "30 dez 2030",
  "Cármen Lúcia":        "19 abr 2029",
  "Dias Toffoli":        "15 nov 2042",
  "Luiz Fux":            "26 abr 2028",
  "Edson Fachin":        "08 fev 2033",
  "Alexandre de Moraes": "13 dez 2043",
  "Nunes Marques":       "16 mai 2047",
  "André Mendonça":      "27 dez 2047",
  "Cristiano Zanin":     "15 nov 2050",
  "Flávio Dino":         "30 abr 2043",
};

// Valores que estavam no ar e eram falsos. Se algum reaparecer no seed, o
// erro voltou — provavelmente por alguém restaurar um backup antigo.
const APOSENTADORIA_ERRADA = [
  "2039", // Fachin (correto: 2033)
  "2038", // Fux e Toffoli (corretos: 2028 e 2042)
  "2049", // Dino (correto: 2043)
  "2054", // Mendonça (correto: 2047)
  "2056", // Zanin (correto: 2050)
];

test("seed traz a aposentadoria compulsória correta de cada ministro", () => {
  const seed = read("src/lib/seed.ts");
  for (const [nome, data] of Object.entries(APOSENTADORIA_CORRETA)) {
    const bloco = seed.slice(seed.indexOf(`nome: "${nome}"`));
    assert.ok(
      seed.includes(`nome: "${nome}"`),
      `ministro ausente do seed: ${nome}`,
    );
    assert.ok(
      bloco.slice(0, 500).includes(`aposentadoria: "${data}"`),
      `${nome}: aposentadoria deveria ser "${data}" (nascimento + 75 anos)`,
    );
  }
});

test("seed não contém nenhuma das datas de aposentadoria que estavam erradas", () => {
  const seed = semComentarios(read("src/lib/seed.ts"));
  for (const ano of APOSENTADORIA_ERRADA) {
    assert.ok(
      !seed.includes(`aposentadoria: "${ano}"`) &&
        !new RegExp(`aposentadoria: "[^"]*${ano}"`).test(seed),
      `ano de aposentadoria incorreto de volta no seed: ${ano}`,
    );
  }
});

// ── A2: datas de posse ──────────────────────────────────────────────

test("posse de Fachin é 16 jun 2015 e de Dino é 22 fev 2024", () => {
  const seed = read("src/lib/seed.ts");
  const fachin = seed.slice(seed.indexOf('nome: "Edson Fachin"'), seed.indexOf('nome: "Edson Fachin"') + 500);
  const dino = seed.slice(seed.indexOf('nome: "Flávio Dino"'), seed.indexOf('nome: "Flávio Dino"') + 500);

  assert.ok(fachin.includes('data_posse: "16 jun 2015"'),
    'Fachin tomou posse em 16/06/2015 (portal do STF, Termo de Posse). "02 abr 2015" é o valor errado que estava no ar.');
  assert.ok(dino.includes('data_posse: "22 fev 2024"'),
    'Dino tomou posse em 22/02/2024. "22 dez 2023" é a data da aprovação no Senado, não da posse.');
});

// ── A3: rótulo de decisão não classificada ──────────────────────────

test('VotoChip não rotula decisão não classificada como "Ausente"', () => {
  const src = semComentarios(read("src/components/ministros/MinistroDetalhe.tsx"));
  assert.ok(
    !/label:\s*"Ausente"/.test(src),
    'numa decisão monocrática quem decide é o próprio ministro — "Ausente" afirma algo impossível. 64% das linhas de stf_votacoes caem nesse valor por falha de normalização.',
  );
  assert.ok(
    src.includes("VOTO_NAO_CLASSIFICADO"),
    "o tratamento explícito do valor não classificado sumiu de MinistroDetalhe",
  );
});

// ── B2 / B3: rótulos derivados de string ────────────────────────────

const COMPONENTES = [
  "src/components/ministros/MinistroDetalhe.tsx",
  "src/components/ministros/MinistroSidebar.tsx",
];

test("nenhum componente deriva o nome do presidente por fatiamento de string", () => {
  for (const arq of COMPONENTES) {
    const src = semComentarios(read(arq));
    assert.ok(
      !/indicado_por\s*\.\s*split\(/.test(src),
      `${arq}: split(" ")[0] em indicado_por produzia "Ind. Fernando", "Ind. Jair" e "Governo Fernando". Use indicado_por_curto.`,
    );
  }
});

test("o avatar usa iniciais_exibicao, nunca a chave única `iniciais`", () => {
  for (const arq of COMPONENTES) {
    const src = semComentarios(read(arq));
    assert.ok(
      !/\{\s*m\.iniciais\s*\}/.test(src),
      `${arq}: \`iniciais\` é UNIQUE no banco e carrega sufixo de desambiguação (AM2, de André Mendonça). Renderize iniciais_exibicao.`,
    );
  }
});

// ── B1: formatação da data de aposentadoria ─────────────────────────

test("useMinistros formata aposentadoria_comp em vez de passar ISO cru", () => {
  const src = read("src/hooks/useMinistros.ts");
  assert.ok(
    /aposentadoria:\s*formatarDataISO\(/.test(semComentarios(src)),
    'aposentadoria_comp vinha do banco como "2030-07-28" e ia direto para a tela, em dois lugares da ficha',
  );
});

// ── A5 / F2: carimbo de atualização ─────────────────────────────────

test("os blocos de gastos e decisões carregam carimbo de até quando o dado vai", () => {
  const src = read("src/components/ministros/MinistroDetalhe.tsx");
  assert.ok(src.includes("function Carimbo"), "componente Carimbo removido");
  const usos = src.match(/<Carimbo\s/g) ?? [];
  assert.ok(
    usos.length >= 2,
    `o carimbo precisa estar nos dois blocos datados (gastos e decisões); encontrados ${usos.length}`,
  );
});

// ── C1: apoio, não acesso ───────────────────────────────────────────

// Enquanto todas as policies RLS forem `using (true)` para anon, não existe
// nada restrito para vender. Prometer acesso é publicidade enganosa (CDC 37).
//
// ESTA TRAVA É TEMPORAL. Uma camada paga está no roteiro do projeto. Quando a
// funcionalidade restrita existir E estiver no ar, estes dois testes devem ser
// afrouxados NA MESMA MUDANÇA que a publica — não antes. O que se protege aqui
// é a ordem (entrega primeiro, promessa depois), não a gratuidade perpétua.
const PROMESSAS_DE_ACESSO = [
  "Acesso completo",
  "acesso completo",
  "todos os recursos",
  "acesso exclusivo",
  "conteúdo exclusivo",
  "área do assinante",
];

test("as páginas de contribuição não prometem acesso que ainda não existe", () => {
  for (const arq of ["src/pages/Assinar.tsx", "src/pages/Sucesso.tsx"]) {
    const src = semComentarios(read(arq));
    for (const frase of PROMESSAS_DE_ACESSO) {
      assert.ok(
        !src.includes(frase),
        `${arq}: "${frase}" promete acesso diferenciado, que hoje não existe — todas as policies RLS são \`using (true)\` para anon. Publique a funcionalidade restrita e afrouxe este teste na mesma mudança.`,
      );
    }
  }
});

test("a página de contribuição declara que hoje não há área restrita", () => {
  const src = read("src/pages/Assinar.tsx");
  assert.ok(
    /hoje não há área restrita/i.test(src),
    "a ressalva de que contribuir não desbloqueia nada precisa continuar visível na tela enquanto não houver camada paga no ar",
  );
});

// ── C2: vínculo da assinatura com o usuário ─────────────────────────

test("o webhook resolve e grava user_id ao registrar a contribuição", () => {
  const src = read("api/webhook.ts");
  assert.ok(
    src.includes("stf_resolver_user_id"),
    "sem resolver user_id, a policy `auth.uid() = user_id` nunca casa e quem paga jamais é reconhecido",
  );
  assert.ok(
    /user_id:\s*await resolverUserId\(/.test(src),
    "o upsert de stf_assinaturas precisa gravar user_id",
  );
});

test("o webhook não lê current_period_end direto da Subscription", () => {
  const src = semComentarios(read("api/webhook.ts"));
  assert.ok(
    !/new Date\(\s*\(?sub\.current_period_end/.test(src),
    "o campo migrou para os itens da assinatura nas versões recentes da API; undefined ali fazia toISOString() lançar e o webhook responder 500",
  );
  assert.ok(src.includes("function fimDoPeriodo"), "o acessor tolerante a versão de API sumiu");
});

// ── A6: contexto da presidência do STF ──────────────────────────────

// O gabinete do ministro presidente aparece com uma fração dos servidores dos
// demais (Fachin: 9, contra 31–38) porque a estrutura de apoio da Presidência
// não corre pelo gabinete dele. Sem nota, o número lê-se como "custa menos".

test("a presidência é modelada como período, não como flag booleana", () => {
  const src = read("src/hooks/usePresidencias.ts");
  assert.ok(
    /inicio/.test(src) && /fim/.test(src),
    "com flag booleana, todo gasto histórico seria anotado com a presidência atual — a pergunta é quem presidia no mês do gasto",
  );
  assert.ok(
    src.includes("export function presidiaNoMes"),
    "o helper que responde pelo mês de competência do gasto sumiu",
  );
});

test("o bloco de gastos avisa quando o custo não é comparável", () => {
  const src = read("src/components/ministros/MinistroDetalhe.tsx");
  assert.ok(
    src.includes("presidiaNoMesDoGasto"),
    "a nota precisa ser condicionada ao mês de referência, não à presidência atual",
  );
  assert.ok(
    /Não comparável ao dos demais gabinetes/.test(src),
    "a ressalva visível no bloco de custo ao erário sumiu",
  );
});

test("a ficha exibe o cargo de presidente ou vice quando houver", () => {
  const src = read("src/components/ministros/MinistroDetalhe.tsx");
  assert.ok(
    src.includes("ROTULO_CARGO[cargo]"),
    "o site não informava em lugar nenhum quem preside a Corte",
  );
});

test("a nota da presidência não trata o ministro pelo primeiro nome", () => {
  const src = semComentarios(read("src/components/ministros/MinistroDetalhe.tsx"));
  assert.ok(
    !/m\.nome\s*\.\s*split\(/.test(src),
    "mesmo problema de B2: fatiar o nome produz tratamento informal de autoridade",
  );
});
