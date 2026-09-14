// Revisão de 2026-09-13 (item 3.2/4): lógica pura da contagem acessível e do
// gate do botão "Carregar mais" de TabelaRepercussao.tsx, extraída para cá
// pelo mesmo motivo de src/hooks/consultaCancelavel.js — permite testar
// comportamento de verdade (node --test puro, sem jsdom/testing-library) em
// vez de só grepar o texto-fonte do componente. Ver
// tests/contagem-repercussao.test.mjs para os cenários cobertos e
// src/componentes/TabelaRepercussao.tsx para quem consome isto.

// O hook (useRepercussaoGeral.ts) só aplica o filtro `ilike` de busca com
// mais de 2 caracteres — combinar aqui com a mesma condição evita que o
// status/caption anunciem "busca" quando o valor digitado (1 ou 2
// caracteres) ainda não filtrou nada de verdade no Supabase.
export function buscaEstaAplicada(search) {
  return search.length > 2;
}

const STATUS_LABEL_CONTAGEM = {
  todos: "temas",
  pendente: "temas pendentes",
  julgado: "temas julgados",
  sobrestado: "temas sobrestados",
};
const STATUS_LABEL_SINGULAR = {
  pendente: "pendente",
  julgado: "julgado",
  sobrestado: "sobrestado",
};

/**
 * @param {number} carregados
 * @param {number} total
 * @param {string} filtroStatus
 * @param {boolean} buscaAplicada
 * @returns {string}
 */
export function descreverContagem(carregados, total, filtroStatus, buscaAplicada) {
  if (carregados === 0) {
    if (buscaAplicada) return "Nenhum tema corresponde à busca";
    return filtroStatus === "todos"
      ? "Nenhum tema encontrado"
      : `Nenhum tema ${STATUS_LABEL_SINGULAR[filtroStatus] ?? ""} encontrado`;
  }
  const totalFmt = total.toLocaleString("pt-BR");
  return buscaAplicada
    ? `${carregados} de ${totalFmt} temas correspondem à busca`
    : `${carregados} de ${totalFmt} ${STATUS_LABEL_CONTAGEM[filtroStatus] ?? "temas"} exibidos`;
}

/**
 * @param {{ erro: string | null, loading: boolean, carregados: number, total: number }} estado
 * @returns {boolean}
 */
export function deveMostrarCarregarMais({ erro, loading, carregados, total }) {
  if (erro || loading) return false;
  return carregados < total;
}
