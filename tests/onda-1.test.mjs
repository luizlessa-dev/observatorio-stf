// Testes de regressão da auditoria de 2026-08-17, portados para o Astro.
//
// Estáticos e baseados em texto-fonte — não requerem build, runtime nem
// conexão com Supabase: `node --test tests/`.
//
// Cada teste guarda um erro que já esteve no ar. A migração para Astro
// (2026-08-19) mudou os arquivos, não as garantias: onde o alvo mudou, o
// comentário registra de onde veio.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ler = (rel) => readFileSync(path.join(ROOT, rel), "utf8");
const semComentarios = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

const FICHA = "src/pages/ministros/[slug].astro";
const HOME  = "src/pages/index.astro";
const DADOS = "src/lib/dados.ts";

// ── A1/A2: dados de ministro não voltam a ser digitados no código ────

test("nenhum dado de ministro está escrito à mão no frontend", () => {
  // Antes existia src/lib/seed.ts com posse e aposentadoria digitadas — sete
  // das dez datas estavam erradas, e o arquivo era bundlado para o cliente.
  // Com SSG os dados vêm do banco no build; o seed deixou de existir e não
  // deve voltar.
  assert.ok(
    !existsSync(path.join(ROOT, "src/lib/seed.ts")),
    "src/lib/seed.ts voltou. Era a cópia à mão que continha as datas erradas.",
  );
  const arquivos = ["src/lib/dados.ts", HOME, FICHA];
  for (const arq of arquivos) {
    const src = semComentarios(ler(arq));
    assert.ok(
      !/data_posse:\s*["']\d/.test(src) && !/aposentadoria:\s*["']\d/.test(src),
      `${arq}: data de ministro literal no código. Deve vir de stf_ministros.`,
    );
  }
});

// ── A3: o site não traduz o andamento do STF ────────────────────────

test("a ficha não inventa rótulo de voto para decisão do STF", () => {
  const src = semComentarios(ler(FICHA));
  for (const rotulo of ['"Ausente"', '"Deferido"', '"Indeferido"', '"Prejudicado"']) {
    assert.ok(
      !src.includes(rotulo),
      `${rotulo} é tradução nossa. "Negado seguimento" é recusa de admissibilidade, não mérito — e traduzir isso produziu 64% de "Ausente" em stf_votacoes.`,
    );
  }
  assert.ok(src.includes("andamento_bruto"), "a tela precisa mostrar o texto original do STF");
});

// ── B2/B3: rótulos derivados de string ──────────────────────────────

test("nenhuma página deriva nome de presidente por fatiamento de string", () => {
  for (const arq of [FICHA, HOME]) {
    const src = semComentarios(ler(arq));
    assert.ok(
      !/indicado_por\s*\.\s*split\(/.test(src),
      `${arq}: split(" ")[0] produzia "Ind. Fernando" e "Governo Fernando". Use indicado_por_curto.`,
    );
  }
});

test("o avatar usa iniciais_exibicao, nunca a chave única `iniciais`", () => {
  for (const arq of [FICHA, HOME]) {
    const src = semComentarios(ler(arq));
    assert.ok(
      !/\bm\.iniciais\b(?!_)/.test(src),
      `${arq}: \`iniciais\` é UNIQUE e carrega sufixo de desambiguação (AM2, MA2, EG2).`,
    );
  }
});

// ── A5/F2: carimbo de até quando o dado vai ─────────────────────────

test("os blocos datados dizem até quando o dado vai", () => {
  const src = ler(FICHA);
  const carimbos = src.match(/dados até/g) ?? [];
  assert.ok(carimbos.length >= 2, `esperado carimbo em gastos e decisões; encontrados ${carimbos.length}`);
});

// ── A6/D1: a armadilha do ministro_id ───────────────────────────────

test("a pauta como relator nunca é somada aos atos como presidente", () => {
  // Fachin tem 63.313 decisões como relator e 38.903 assinadas como presidente
  // do STF. Somar infla a produção de quem preside e esconde que presidir
  // redistribui a pauta.
  const src = ler(DADOS);
  assert.ok(/ministro_resolucao["'],\s*["']nome["']/.test(src), "a lista precisa filtrar ministro_resolucao='nome'");
  assert.ok(/ministro_resolucao["'],\s*["']presidencia["']/.test(src), "os atos como presidente precisam ser contados à parte");
  const ficha = ler(FICHA);
  assert.ok(ficha.includes("comoPresidente"), "a ficha precisa exibir a contagem separada");
  assert.ok(/condição de presidente do STF/.test(ficha), "sem o rótulo o leitor não sabe por que estão fora da lista");
});

test("o custo do gabinete do presidente vem com a ressalva", () => {
  const src = ler(FICHA);
  assert.ok(src.includes("presidiaNoMesDoGasto"), "a nota precisa ser condicionada ao mês de competência");
  assert.ok(/Não comparável ao dos demais gabinetes/.test(src), "a ressalva sumiu do bloco de custo");
});

// ── C1: apoio, não acesso ───────────────────────────────────────────

// TRAVA TEMPORAL. Uma camada paga está no roteiro. Quando a funcionalidade
// restrita existir E estiver no ar, estes testes são afrouxados NA MESMA
// MUDANÇA que a publica — nunca antes. Protege a ordem, não a gratuidade.
const PROMESSAS_DE_ACESSO = [
  "Acesso completo", "acesso completo", "todos os recursos",
  "acesso exclusivo", "conteúdo exclusivo", "área do assinante",
];

test("as páginas de contribuição não prometem acesso que ainda não existe", () => {
  for (const arq of ["src/componentes/FormApoio.tsx", "src/pages/sucesso.astro"]) {
    const src = semComentarios(ler(arq));
    for (const frase of PROMESSAS_DE_ACESSO) {
      assert.ok(
        !src.includes(frase),
        `${arq}: "${frase}" promete acesso diferenciado. Todas as policies RLS são \`using (true)\` para anon.`,
      );
    }
  }
});

test("a página de contribuição declara que hoje não há área restrita", () => {
  assert.ok(/hoje não há área restrita/i.test(ler("src/componentes/FormApoio.tsx")));
});

// ── C2: vínculo da assinatura com o usuário ─────────────────────────

test("o webhook resolve e grava user_id", () => {
  const src = ler("api/webhook.ts");
  assert.ok(src.includes("stf_resolver_user_id"), "sem isso a policy auth.uid()=user_id nunca casa");
  assert.ok(/user_id:\s*await resolverUserId\(/.test(src));
});

test("o webhook não lê current_period_end direto da Subscription", () => {
  const src = semComentarios(ler("api/webhook.ts"));
  assert.ok(!/new Date\(\s*\(?sub\.current_period_end/.test(src));
  assert.ok(src.includes("function fimDoPeriodo"));
});

// ── E1/E4/E5: o que a migração para Astro passou a garantir ─────────

test("existe uma página por ministro, gerada no build", () => {
  // Achado E5: no SPA toda a navegação acontecia em estado do React dentro de
  // uma rota só. Não havia URL para citar, para o STF responder ou para o
  // buscador indexar.
  assert.ok(existsSync(path.join(ROOT, FICHA)), "a rota dinâmica de ministro sumiu");
  const src = ler(FICHA);
  assert.ok(src.includes("getStaticPaths"), "sem getStaticPaths não há geração estática por ministro");
});

test("toda página declara título, descrição e canonical próprios", () => {
  // Achado E4: o SPA tinha um <title> e uma <meta description> para as oito
  // rotas, sem canonical.
  const base = ler("src/layouts/Base.astro");
  for (const tag of ["<title>", 'name="description"', 'rel="canonical"', 'property="og:title"']) {
    assert.ok(base.includes(tag), `Base.astro perdeu ${tag}`);
  }
  const paginas = readdirSync(path.join(ROOT, "src/pages"))
    .filter((f) => f.endsWith(".astro"));
  for (const p of paginas) {
    const src = ler(`src/pages/${p}`);
    if (src.includes("Astro.redirect")) continue;   // alias não precisa de meta
    assert.ok(/titulo=/.test(src) && /descricao=/.test(src), `src/pages/${p} não declara titulo/descricao`);
  }
});

test("o site não volta a ser SPA", () => {
  // Achado E1/F1: o HTML servido tinha 686 bytes e nenhum conteúdo. GPTBot,
  // ClaudeBot e PerplexityBot não executam JS — para eles o site não existia.
  const config = ler("astro.config.mjs");
  assert.ok(/output:\s*["']static["']/.test(config), "output deixou de ser static — o HTML volta a sair vazio");
  assert.ok(
    !existsSync(path.join(ROOT, "src/App.tsx")) && !existsSync(path.join(ROOT, "src/main.tsx")) && !existsSync(path.join(ROOT, "index.html")),
    "restos do SPA voltaram ao repositório",
  );
  const vercel = JSON.parse(ler("vercel.json"));
  assert.ok(!vercel.rewrites, "rewrite de SPA voltou — com ele, toda URL inventada responde 200");
});

test("robots, llms e favicon existem como arquivo de verdade", () => {
  for (const f of ["public/robots.txt", "public/llms.txt", "public/favicon.svg"]) {
    assert.ok(existsSync(path.join(ROOT, f)), `${f} sumiu — voltaria a responder 200 com HTML`);
  }
  assert.ok(/Sitemap: https:\/\/observatoriodostf\.org\/sitemap/.test(ler("public/robots.txt")));
});

test("o llms.txt explica como não ler os dados errado", () => {
  // É o que distingue um índice de um manual de leitura. Os quatro pontos são
  // os mesmos que a auditoria encontrou sendo lidos errado na interface.
  const src = ler("public/llms.txt");
  for (const ponto of ["andamento não é um voto", "presidente", "gabinete", "atribuído"]) {
    assert.ok(src.toLowerCase().includes(ponto.toLowerCase()), `llms.txt não cobre: ${ponto}`);
  }
});
