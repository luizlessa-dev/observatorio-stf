// Lógica pura, sem tipos em runtime — mesmo motivo de buscaCasos.js:
// node --test importa .js direto, não transforma um .ts na resolução de
// módulo ESM (só faz strip de tipos de um arquivo já .ts, não remapeia
// especificador .js pra um arquivo .ts, que é o que o bundler do
// Astro/Vercel faz). Ver csv.d.ts pros tipos.

/**
 * Serialização CSV mínima (RFC 4180): aspas só quando necessário, CRLF entre linhas.
 * @param {Record<string, unknown>[]} linhas
 * @param {string[]} colunas
 * @returns {string}
 */
export function paraCsv(linhas, colunas) {
  const escapar = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const cabecalho = colunas.map(escapar).join(",");
  const corpo = linhas.map((linha) => colunas.map((c) => escapar(linha[c])).join(","));
  return [cabecalho, ...corpo].join("\r\n");
}
