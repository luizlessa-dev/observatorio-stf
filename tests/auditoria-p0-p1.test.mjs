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
// Cobertura comportamental completa (sucesso/vazio/erro/rede/corrida/retry)
// está em tests/repercussao-geral-consulta.test.mjs — aqui só checamos que a
// função continua exposta e ligada de fato pelo hook (grep de estrutura).
test("AUD-01: consultaCancelavel captura error e rejeição, sem virar vazio silencioso", () => {
  const src = ler("src/hooks/consultaCancelavel.js");
  assert.match(src, /\{\s*data,\s*count,\s*error\s*\}/, "o .then() precisa desestruturar error, não só data/count");
  assert.match(src, /deps\.setErro\(/, "precisa existir um estado de erro dedicado");
  assert.match(src, /\.then\(\s*\n?\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\},\s*\n?\s*\(motivo/, "precisa tratar rejeição da Promise (erro de rede), não só o campo error");
});

test("AUD-01: useRepercussaoGeral delega a consultaCancelavel e expõe erro/tentarNovamente", () => {
  const src = ler("src/hooks/useRepercussaoGeral.ts");
  assert.match(src, /executarConsultaCancelavel\(/, "o hook precisa usar a função extraída, não reimplementar a lógica de cancelamento");
  assert.match(src, /return\s*\{\s*temas,\s*loading,\s*total,\s*erro/, "o hook precisa devolver `erro` para quem consome");
  assert.match(src, /tentarNovamente/, "precisa expor uma forma de tentar de novo após erro");
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

// AUD-05 — contraste real da classe utilitária .text-subtle.
//
// Achado da revisão de 2026-09-13: o primeiro teste daqui só checava a
// custom property --subtle em global.css, que NUNCA é consumida via var()
// em lugar nenhum — quem gera .text-subtle de verdade é
// theme.extend.colors.subtle em tailwind.config.ts. O primeiro fix mudou só
// a custom property morta; a cor renderizada continuava a antiga (~3,28:1),
// confirmado por getComputedStyle na Vercel preview. Este teste lê a fonte
// real (tailwind.config.ts) e calcula o contraste de verdade, pra não
// repetir o erro de validar o lugar errado.
function corParaRgb(hex) {
  const h = hex.replace("#", "");
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}
function luminanciaRelativa({ r, g, b }) {
  const canal = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}
function contraste(hexA, hexB) {
  const l1 = luminanciaRelativa(corParaRgb(hexA)) + 0.05;
  const l2 = luminanciaRelativa(corParaRgb(hexB)) + 0.05;
  return l1 > l2 ? l1 / l2 : l2 / l1;
}

test("AUD-05: theme.extend.colors.subtle (a fonte real de .text-subtle) atinge 4.5:1 sobre canvas/card/surface", () => {
  const src = ler("tailwind.config.ts");
  const extrair = (nome) => {
    const m = new RegExp(`${nome}:\\s*"(#[0-9a-fA-F]{6})"`).exec(src);
    assert.ok(m, `não encontrei theme.extend.colors.${nome} em tailwind.config.ts`);
    return m[1];
  };
  const subtle = extrair("subtle");
  for (const fundo of ["canvas", "card", "surface"]) {
    const hexFundo = extrair(fundo);
    const razao = contraste(subtle, hexFundo);
    assert.ok(razao >= 4.5, `subtle (${subtle}) sobre ${fundo} (${hexFundo}) só atinge ${razao.toFixed(2)}:1, abaixo de 4.5:1`);
  }
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
  // Mesmo fuso do guard real (src/content.config.ts) — America/Sao_Paulo,
  // não UTC. Ver comentário lá para o porquê (evita falso-negativo perto da
  // meia-noite de Brasília).
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
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
