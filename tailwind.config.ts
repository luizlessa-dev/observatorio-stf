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
        subtle:  "#6b6762",
        /* termômetro */
        conserv: "#2563c4",
        prog:    "#b91c1c",
      },
      borderRadius: { DEFAULT: "2px" },
    },
  },
  plugins: [typography],
} satisfies Config;
