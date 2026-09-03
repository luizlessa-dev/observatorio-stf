// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";

// Achados E1/E5/F1 da auditoria de 2026-08-17.
//
// O site era um SPA Vite+React: o HTML servido tinha 686 bytes e nenhum
// conteúdo. O Googlebot renderiza JS numa segunda passada, com fila própria;
// GPTBot, ClaudeBot, PerplexityBot e CCBot não renderizam nada. Para eles o
// Observatório era uma página em branco.
//
// `output: "static"` gera HTML no build, com os dados já dentro. As consultas
// ao Supabase acontecem na máquina que builda, não no navegador de quem visita.
// O que precisa de sessão (entrar, assinar, sucesso) e o que precisa de filtro
// ao vivo (repercussão geral) continuam React, como ilha hidratada.
export default defineConfig({
  site: "https://observatoriodostf.org",
  output: "static",
  // Tailwind entra por postcss.config.js, que o Astro lê nativamente. A
  // integração @astrojs/tailwind declara peer de astro ^3||^4||^5 e quebra o
  // `npm install` limpo do Vercel com ERESOLVE — passou aqui só porque o
  // install local foi incremental.
  integrations: [
    react(),
    // Gera sitemap.xml das rotas reais no build — inclusive as 33 páginas de
    // ministro. Substitui scripts/gerar-sitemap.mjs, que era lista à mão.
    sitemap({
      filter: (page) =>
        !page.includes("/entrar") && !page.includes("/sucesso"),
      serialize: (item) => {
        if (item.url === "https://observatoriodostf.org/") item.priority = 1.0;
        else if (item.url.includes("/ministros/")) item.priority = 0.8;
        else if (item.url.includes("/casos/")) item.priority = 0.7;
        else item.priority = 0.6;
        item.changefreq = "daily";
        return item;
      },
    }),
  ],
  build: { format: "directory" },
});
