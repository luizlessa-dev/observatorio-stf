// AUD-13: lógica pura de busca em casos, extraída de BuscaGeral.tsx pelo
// mesmo motivo de src/lib/contagemRepercussao.js — node --test importa .js
// diretamente, mas não sabe transformar JSX de um .tsx (só faz strip de
// tipos, não de JSX). Ver tests/busca-geral.test.mjs.

// Mesmo tratamento de acento que slugMinistro (src/lib/slug.ts) — "gilmar"
// tem que achar "Gilmar", "aposentadoria" tem que achar mesmo com acento em
// outro lugar do texto.
export function normalizar(s) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * @param {{slug: string, titulo: string, resumo: string, status: string, ministros: string[]}[]} casos
 * @param {string} termo
 */
export function buscarCasos(casos, termo) {
  const alvo = normalizar(termo);
  return casos.filter((c) =>
    normalizar(c.titulo).includes(alvo) ||
    normalizar(c.resumo).includes(alvo) ||
    c.ministros.some((m) => normalizar(m).includes(alvo))
  );
}
