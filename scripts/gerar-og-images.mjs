#!/usr/bin/env node
/**
 * Gera as imagens og:image/twitter:image (1200x630) em build time, antes do
 * `astro build` (ver package.json). Escreve em public/og/, que o Astro copia
 * pra dist/ como qualquer outro asset estático.
 *
 * Por que satori + sharp, e não sharp sozinho com um SVG feito à mão: o
 * repo irmão (observatorio-judiciario) tenta isso e tem um bug real — a
 * fonte (Geist) nunca é embutida de verdade, e o rasterizador cai
 * silenciosamente pra uma fonte genérica. Testamos aqui (SVG com @font-face
 * em base64, depois fontconfig com FONTCONFIG_FILE custom) e os dois
 * caminhos falharam do mesmo jeito silencioso. satori converte o texto em
 * paths vetoriais usando o buffer da fonte diretamente — o SVG que sai dele
 * já não depende de fonte nenhuma no passo seguinte, então sharp só
 * rasteriza, sem risco de fallback silencioso.
 *
 * Erros de configuração (fonte ausente, credenciais do Supabase ausentes)
 * derrubam o build — é o mesmo critério de src/lib/dados.ts: um ambiente
 * quebrado não deve publicar nada em silêncio. Erros ao gerar UM item
 * específico (frontmatter de um caso, um ministro) só pulam aquele item —
 * uma imagem faltando é uma página com preview pior, não um site quebrado,
 * e travar o deploy inteiro por causa de um título problemático custa mais
 * caro do que vale, principalmente com um caso no ar durante um ciclo de
 * notícia corrente.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import satori from "satori";
import sharp from "sharp";
import { load as parseYaml } from "js-yaml";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR_FONTS = path.join(ROOT, "scripts/assets/fonts");
const DIR_CASOS = path.join(ROOT, "src/content/casos");
const DIR_OUT = path.join(ROOT, "public/og");

const FONTS = [
  {
    name: "Playfair Display",
    data: readFileSync(path.join(DIR_FONTS, "PlayfairDisplay-Bold.ttf")),
    weight: 700,
    style: "normal",
  },
  {
    name: "Inter",
    data: readFileSync(path.join(DIR_FONTS, "Inter-Medium.ttf")),
    weight: 500,
    style: "normal",
  },
];

const ROTULO_STATUS = {
  em_apuracao: "EM APURAÇÃO",
  confirmado: "CONFIRMADO",
  arquivado: "ARQUIVADO",
};

// Duplicado de src/lib/slug.ts — um script Node puro não importa .ts sem
// ferramenta extra. tests/gerar-og-images.test.mjs garante que as duas
// cópias não divergem.
function slugMinistro(nome) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function lerFrontmatter(caminho) {
  const src = readFileSync(caminho, "utf8");
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(src);
  if (!match) throw new Error(`${caminho}: frontmatter mal formado`);
  return parseYaml(match[1]) ?? {};
}

function cartao({ kicker, titulo }) {
  return {
    type: "div",
    props: {
      style: {
        width: 1200,
        height: 630,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "80px 100px",
        backgroundColor: "#141414",
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              color: "#a8a49c",
              fontFamily: "Inter",
              fontWeight: 500,
              fontSize: 26,
              letterSpacing: 2,
              marginBottom: 32,
              display: "flex",
            },
            children: kicker,
          },
        },
        {
          type: "div",
          props: {
            style: {
              color: "#f2f0e9",
              fontFamily: "Playfair Display",
              fontWeight: 700,
              fontSize: 62,
              lineHeight: 1.25,
              display: "flex",
            },
            children: titulo,
          },
        },
      ],
    },
  };
}

async function gerarPng(destino, props) {
  const svg = await satori(cartao(props), { width: 1200, height: 630, fonts: FONTS });
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  mkdirSync(path.dirname(destino), { recursive: true });
  writeFileSync(destino, png);
}

async function main() {
  mkdirSync(DIR_OUT, { recursive: true });

  await gerarPng(path.join(DIR_OUT, "padrao.png"), {
    kicker: "OBSERVATÓRIO DO STF",
    titulo: "Dados públicos do Supremo Tribunal Federal",
  });

  let totalCasos = 0;
  for (const arquivo of readdirSync(DIR_CASOS).filter((f) => f.endsWith(".md"))) {
    const slug = arquivo.replace(/\.md$/, "");
    try {
      const data = lerFrontmatter(path.join(DIR_CASOS, arquivo));
      await gerarPng(path.join(DIR_OUT, "casos", `${slug}.png`), {
        kicker: `OBSERVATÓRIO DO STF · ${ROTULO_STATUS[data.status] ?? "CASO"}`,
        titulo: data.titulo ?? slug,
      });
      totalCasos++;
    } catch (e) {
      console.warn(`gerar-og-images: pulei o caso "${slug}" — ${e.message}`);
    }
  }
  console.log(`gerar-og-images: ${totalCasos} caso(s)`);

  const url = process.env.PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.PUBLIC_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "gerar-og-images: faltam PUBLIC_SUPABASE_URL/PUBLIC_SUPABASE_ANON_KEY (ou VITE_SUPABASE_*)"
    );
  }
  const supabase = createClient(url, key);
  const { data: ministros, error } = await supabase.from("stf_ministros").select("nome");
  if (error) throw new Error(`gerar-og-images: stf_ministros: ${error.message}`);

  let totalMinistros = 0;
  for (const m of ministros ?? []) {
    try {
      await gerarPng(path.join(DIR_OUT, "ministros", `${slugMinistro(m.nome)}.png`), {
        kicker: "OBSERVATÓRIO DO STF · MINISTRO DO STF",
        titulo: m.nome,
      });
      totalMinistros++;
    } catch (e) {
      console.warn(`gerar-og-images: pulei o ministro "${m.nome}" — ${e.message}`);
    }
  }
  console.log(`gerar-og-images: ${totalMinistros} ministro(s)`);
}

main().catch((e) => {
  console.error("gerar-og-images: erro de configuração, build abortado —", e.message);
  process.exit(1);
});
