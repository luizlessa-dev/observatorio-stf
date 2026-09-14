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

// Revisão de 2026-09-13, item 3.1: o rótulo da busca precisa estar
// visualmente disponível (não apenas sr-only) — o placeholder some assim
// que o usuário digita e não é, por si só, um rótulo persistente.
test("revisão 2026-09-13/3.1: label da busca em TabelaRepercussao é visível e associado ao input por htmlFor/id", () => {
  const src = ler("src/componentes/TabelaRepercussao.tsx");
  const labelMatch = /<label\s+htmlFor="busca-repercussao"\s+className="([^"]*)">/.exec(src);
  assert.ok(labelMatch, "esperava um <label htmlFor=\"busca-repercussao\"> associado ao input de busca");
  assert.ok(!labelMatch[1].includes("sr-only"), "o label da busca não pode depender só de sr-only — precisa estar visível na tela");
  assert.match(src, /<input\s+id="busca-repercussao"/, "o <input> precisa do id correspondente para a associação label/input funcionar");
});

// Revisão de 2026-09-13, item 3.4: cor já foi corrigida (AUD-05), mas vários
// textos funcionais ainda estavam em 9-10px. Trava um piso de legibilidade
// para toda classe text-[Npx] usada na rota, sem crescer manualmente cada
// ocorrência de novo caso surja.
test("revisão 2026-09-13/3.4: nenhum texto funcional de TabelaRepercussao usa menos de 11px", () => {
  const src = ler("src/componentes/TabelaRepercussao.tsx");
  const tamanhos = [...src.matchAll(/text-\[(\d+)px\]/g)].map((m) => parseInt(m[1], 10));
  assert.ok(tamanhos.length > 0, "esperava encontrar ao menos uma classe text-[Npx] em TabelaRepercussao.tsx");
  const pequenos = tamanhos.filter((n) => n < 11);
  assert.equal(pequenos.length, 0, `encontrei texto(s) abaixo de 11px: ${pequenos.join(", ")}px — revisão AUD-05/3.4 pede piso de legibilidade`);
});

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

// AUD-08 — fontes auto-hospedadas (revisão de 2026-09-14): o fix anterior só
// trocou @import por <link> ainda apontando pra fonts.googleapis.com/gstatic.com
// (duas conexões externas a mais no caminho crítico). Agora os três arquivos
// .woff2 vêm do próprio domínio, servidos de public/fonts/.
test("AUD-08: global.css declara @font-face local para Inter/Playfair Display/JetBrains Mono, sem domínio do Google", () => {
  const src = ler("src/estilos/global.css");
  // Checa só url(...) funcional, não o comentário de contexto que cita o
  // domínio antigo de propósito (mesmo padrão de comentário histórico usado
  // no resto do arquivo).
  assert.ok(!/url\([^)]*fonts\.(googleapis|gstatic)\.com/.test(src), "global.css ainda tem um url() apontando pro Google Fonts");
  for (const familia of ["Inter", "Playfair Display", "JetBrains Mono"]) {
    assert.match(src, new RegExp(`font-family:\\s*"${familia}"`), `esperava @font-face para "${familia}"`);
  }
  assert.match(src, /url\("\/fonts\/inter-latin-variable\.woff2"\)/);
  assert.match(src, /url\("\/fonts\/playfair-display-latin-variable\.woff2"\)/);
  assert.match(src, /url\("\/fonts\/jetbrains-mono-latin-variable\.woff2"\)/);
});

test("AUD-08: os três arquivos .woff2 auto-hospedados existem de verdade em public/fonts/", () => {
  for (const arquivo of ["inter-latin-variable.woff2", "playfair-display-latin-variable.woff2", "jetbrains-mono-latin-variable.woff2"]) {
    const caminho = path.join(ROOT, "public/fonts", arquivo);
    assert.ok(existsSync(caminho), `esperava public/fonts/${arquivo}`);
    assert.ok(readFileSync(caminho).length > 1000, `${arquivo} parece vazio ou corrompido (menos de 1KB)`);
  }
});

test("AUD-08: Base.astro não referencia mais fonts.googleapis.com/gstatic.com; faz preload local de Inter e Playfair Display", () => {
  const src = ler("src/layouts/Base.astro");
  // Checa só href="..." funcional, não o comentário de contexto que cita o
  // domínio antigo de propósito.
  assert.ok(!/href="https:\/\/fonts\.(googleapis|gstatic)\.com/.test(src), "Base.astro ainda tem um <link href> apontando pro Google Fonts");
  assert.match(src, /rel="preload"\s+href="\/fonts\/inter-latin-variable\.woff2"\s+as="font"/, "Inter (corpo do texto, acima da dobra) deveria ter preload");
  assert.match(src, /rel="preload"\s+href="\/fonts\/playfair-display-latin-variable\.woff2"\s+as="font"/, "Playfair Display (títulos, acima da dobra) deveria ter preload");
});

// AUD-09 — CSP em modo Report-Only.
test("AUD-09: vercel.json declara Content-Security-Policy-Report-Only", () => {
  const vercelJson = JSON.parse(ler("vercel.json"));
  const globalHeaders = vercelJson.headers.find((h) => h.source === "/(.*)");
  const csp = globalHeaders?.headers?.find((h) => h.key === "Content-Security-Policy-Report-Only");
  assert.ok(csp, "esperava um header Content-Security-Policy-Report-Only em vercel.json");
  assert.match(csp.value, /default-src 'self'/);
});

// AUD-08 (consequência direta de auto-hospedar as fontes): a CSP não precisa
// mais autorizar fonts.googleapis.com (style-src) nem fonts.gstatic.com
// (font-src) — manter essas origens no header depois que o site parou de
// usá-las seria uma permissão morta, o oposto do princípio de menor
// privilégio que a própria CSP existe pra impor.
test("AUD-08/09: CSP não autoriza mais fonts.googleapis.com/gstatic.com (fontes agora são same-origin)", () => {
  const vercelJson = JSON.parse(ler("vercel.json"));
  const globalHeaders = vercelJson.headers.find((h) => h.source === "/(.*)");
  const csp = globalHeaders?.headers?.find((h) => h.key === "Content-Security-Policy-Report-Only");
  assert.ok(!/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(csp.value), "CSP ainda cita domínio do Google Fonts, mas o site não carrega mais nada de lá");
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
