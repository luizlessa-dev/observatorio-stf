import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

export default {
  darkMode: ["class"],
  content: ["./src/**/*.{astro,ts,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Playfair Display", "Georgia", "serif"],
        serif:   ["Playfair Display", "Georgia", "serif"],
        sans:    ["Inter", "system-ui", "sans-serif"],
        mono:    ["JetBrains Mono", "monospace"],
      },
      colors: {
        /* superfícies */
        canvas:  "#141414",
        card:    "#1c1c1c",
        surface: "#222222",
        /* bordas */
        border:  "#2e2e2e",
        border2: "#3a3a3a",
        /* texto */
        ink:     "#f2f0e9",
        muted:   "#a8a49c",
        // AUD-05: este hex — não a variável --subtle em global.css — é quem
        // realmente gera a classe utilitária .text-subtle (Tailwind lê a
        // paleta daqui em build-time; a custom property em :root nunca é
        // consumida via var() em lugar nenhum do projeto). O valor antigo
        // (#6b6762) media ~3,28:1 sobre --canvas; corrigido para ~4,5-4,9:1
        // sobre canvas/card/surface, calculado pela fórmula de luminância
        // relativa do WCAG 2.2. Ver global.css para o mesmo cálculo.
        subtle:  "#8c8883",
        /* termômetro */
        conserv: "#2563c4",
        prog:    "#b91c1c",
      },
      borderRadius: { DEFAULT: "2px" },
    },
  },
  plugins: [typography],
} satisfies Config;
