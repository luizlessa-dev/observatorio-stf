// Guardrails para os achados P0/P1 da auditoria de 2026-09-13 (ver
// /Users/luizlessa/Desktop/prompt-claude-observatorio-stf.md, AUD-01 a
// AUD-12). Estáticos e baseados em texto-fonte, no mesmo padrão dos demais
// arquivos em tests/ — não requerem build nem conexão com Supabase.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { load as parseYaml } from "js-yaml";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ler = (rel) => readFileSync(path.join(ROOT, rel), "utf8");

// AUD-01 — erro de consulta não pode virar "vazio" silencioso.
test("AUD-01: useRepercussaoGeral captura e expõe o campo error do Supabase", () => {
  const src = ler("src/hooks/useRepercussaoGeral.ts");
  assert.match(src, /\{\s*data,\s*count,\s*error\s*\}/, "o .then() precisa desestruturar error, não só data/count");
  assert.match(src, /setErro\(/, "precisa existir um estado de erro dedicado");
  assert.match(src, /return\s*\{\s*temas,\s*loading,\s*total,\s*erro/, "o hook precisa devolver `erro` para quem consome");
});

test("AUD-01: TabelaRepercussao distingue erro de lista vazia de verdade", () => {
  const src = ler("src/componentes/TabelaRepercussao.tsx");
  assert.match(src, /erro\s*&&/, "precisa haver um ramo de renderização específico para `erro`");
  assert.match(src, /Tentar novamente/, "estado de erro precisa oferecer nova tentativa");
});

// AUD-03 — semântica de tabela.
test("AUD-03: repercussão geral usa <table> semântica, não apenas grid de <div>", () => {
  const src = ler("src/componentes/TabelaRepercussao.tsx");
  for (const tag of ["<table", "<thead", "<tbody", "<tr", "scope=\"col\""]) {
    assert.ok(src.includes(tag), `esperava encontrar "${tag}" em TabelaRepercussao.tsx`);
  }
});

// AUD-04 — labels visíveis e foco visível.
for (const arquivo of ["src/componentes/FormLogin.tsx", "src/componentes/FormApoio.tsx", "src/componentes/TabelaRepercussao.tsx"]) {
  test(`AUD-04: ${arquivo} tem <label> associado a cada <input>`, () => {
    const src = ler(arquivo);
    const inputs = (src.match(/<input/g) ?? []).length;
    const labels = (src.match(/<label/g) ?? []).length;
    assert.ok(inputs === 0 || labels >= inputs, `${arquivo}: ${inputs} <input> mas só ${labels} <label>`);
  });

  test(`AUD-04: ${arquivo} não usa outline-none sem um substituto de foco visível`, () => {
    const src = ler(arquivo);
    if (!src.includes("outline-none")) return;
    assert.match(src, /focus-visible:(ring|outline|border)/, `${arquivo}: outline-none precisa vir acompanhado de focus-visible:*`);
  });
}

// AUD-05 — contraste do token --subtle.
test("AUD-05: token --subtle não é mais o valor de baixo contraste (~3,28:1)", () => {
  const src = ler("src/estilos/global.css");
  assert.ok(!src.includes("--subtle:  #6b6762;"), "o valor antigo de baixo contraste ainda está em global.css");
});

// AUD-06 — estados anunciados e navegação por teclado.
test("AUD-06: TabelaRepercussao anuncia loading/erro/contagem via aria-live", () => {
  const src = ler("src/componentes/TabelaRepercussao.tsx");
  assert.match(src, /aria-live=["']polite["']/, "precisa de uma região aria-live=\"polite\"");
  assert.match(src, /aria-pressed=/, "os botões de filtro de status precisam expor aria-pressed");
});

test("AUD-06: Base.astro tem skip link para o conteúdo principal", () => {
  const src = ler("src/layouts/Base.astro");
  assert.match(src, /href="#conteudo"/, "precisa haver um link \"Pular para o conteúdo\" apontando para #conteudo");
  assert.match(src, /id="conteudo"/, "o <main> precisa do id=\"conteudo\" como alvo do skip link");
  assert.match(src, /aria-current=/, "os itens de navegação ativos precisam de aria-current");
});

// AUD-07 — 404 com marca e navegação, mantendo o status HTTP correto.
test("AUD-07: existe src/pages/404.astro com navegação de recuperação", () => {
  assert.ok(existsSync(path.join(ROOT, "src/pages/404.astro")), "src/pages/404.astro deveria existir");
  const src = ler("src/pages/404.astro");
  assert.match(src, /href="\/"/, "a 404 precisa linkar de volta para a home");
});

// AUD-08 — fonte não deveria mais entrar via @import bloqueante.
test("AUD-08: global.css não usa @import para carregar fontes do Google Fonts", () => {
  const src = ler("src/estilos/global.css");
  assert.ok(!/@import\s+url\(['"]?https:\/\/fonts\.googleapis\.com/.test(src), "fonte deveria entrar via <link> no <head>, não @import no CSS");
});

test("AUD-08: Base.astro carrega a fonte via <link rel=preconnect/stylesheet>", () => {
  const src = ler("src/layouts/Base.astro");
  assert.match(src, /rel="preconnect"\s+href="https:\/\/fonts\.googleapis\.com"/);
  assert.match(src, /rel="stylesheet"\s+href="https:\/\/fonts\.googleapis\.com/);
});

// AUD-09 — CSP em modo Report-Only.
test("AUD-09: vercel.json declara Content-Security-Policy-Report-Only", () => {
  const vercelJson = JSON.parse(ler("vercel.json"));
  const globalHeaders = vercelJson.headers.find((h) => h.source === "/(.*)");
  const csp = globalHeaders?.headers?.find((h) => h.key === "Content-Security-Policy-Report-Only");
  assert.ok(csp, "esperava um header Content-Security-Policy-Report-Only em vercel.json");
  assert.match(csp.value, /default-src 'self'/);
});

// AUD-12 — nenhuma data de caso pode estar no futuro.
test("AUD-12: content.config.ts recusa data_publicacao/data_atualizacao no futuro", () => {
  const src = ler("src/content.config.ts");
  assert.match(src, /naoEhFutura/, "o schema de casos precisa validar que as datas não são futuras");
});

test("AUD-12: nenhum caso publicado tem data_publicacao/data_atualizacao no futuro", () => {
  const dir = path.join(ROOT, "src/content/casos");
  if (!existsSync(dir)) return;
  const hoje = new Date().toISOString().slice(0, 10);
  for (const arquivo of readdirSync(dir).filter((f) => f.endsWith(".md"))) {
    const src = readFileSync(path.join(dir, arquivo), "utf8");
    const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(src);
    assert.ok(match, `${arquivo}: frontmatter mal formado`);
    const data = parseYaml(match[1]) ?? {};
    assert.ok(data.data_publicacao <= hoje, `${arquivo}: data_publicacao (${data.data_publicacao}) está no futuro`);
    if (data.data_atualizacao) {
      assert.ok(data.data_atualizacao <= hoje, `${arquivo}: data_atualizacao (${data.data_atualizacao}) está no futuro`);
    }
  }
});
