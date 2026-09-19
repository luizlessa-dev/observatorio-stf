import type { VercelRequest, VercelResponse } from "./_tipos.js";
import { createClient } from "@supabase/supabase-js";
import { encontrarTabelaExportavel, TABELAS_EXPORTAVEIS, LIMITE_PADRAO, LIMITE_MAXIMO } from "../src/lib/exportaveis.js";
import { paraCsv } from "../src/lib/csv.js";

// Duplicado de src/lib/slug.ts — um import de valor (não `import type`) daqui
// pra um .ts precisaria do remapeamento .js→.ts que só o bundler do
// Astro/Vercel faz; um teste local direto (node puro) não faz essa
// remapeação. Mesmo motivo/precedente de scripts/gerar-og-images.mjs.
// tests/exportaveis.test.mjs garante que as duas cópias não divergem.
function slugMinistro(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// AUD-16: export público de dados, com chave anônima — os dados aqui já são
// públicos via RLS (mesmo modelo de src/lib/supabase.ts), então não há
// elevação de privilégio nenhuma em usar a anon key aqui. O whitelist fixo
// de src/lib/exportaveis.ts (nunca um nome de tabela vindo da querystring)
// é o que impede vazar dado de outros projetos que dividem este Supabase.
const url = process.env.PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key = process.env.PUBLIC_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error("Faltam PUBLIC_SUPABASE_URL/PUBLIC_SUPABASE_ANON_KEY para /api/exportar.");
const supabase = createClient(url, key);

function parseInteiro(valor: string | string[] | undefined, padrao: number): number {
  const s = Array.isArray(valor) ? valor[0] : valor;
  if (!s) return padrao;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) && n >= 0 ? n : padrao;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") return res.status(405).json({ error: "método não suportado, use GET" });

  const tabelaParam = Array.isArray(req.query.tabela) ? req.query.tabela[0] : req.query.tabela;

  if (!tabelaParam) {
    return res.status(400).json({
      error: "parâmetro `tabela` obrigatório",
      tabelas_disponiveis: TABELAS_EXPORTAVEIS.map((t) => t.slug),
      documentacao: "https://observatoriodostf.org/dados",
    });
  }

  const config = encontrarTabelaExportavel(tabelaParam);
  if (!config) {
    return res.status(400).json({
      error: `tabela "${tabelaParam}" não é exportável`,
      tabelas_disponiveis: TABELAS_EXPORTAVEIS.map((t) => t.slug),
      documentacao: "https://observatoriodostf.org/dados",
    });
  }

  const formatoParam = Array.isArray(req.query.formato) ? req.query.formato[0] : req.query.formato;
  const formato = formatoParam === "json" ? "json" : "csv";
  const offset = parseInteiro(req.query.offset as string | undefined, 0);
  const limite = Math.min(parseInteiro(req.query.limite as string | undefined, LIMITE_PADRAO), LIMITE_MAXIMO);

  const colunas = config.colunas.map((c) => c.nome).filter((n) => n !== "slug");
  let query = supabase.from(config.tabela).select(colunas.join(", ")).range(offset, offset + limite - 1);
  for (const { coluna, ascendente } of config.ordenarPor) {
    query = query.order(coluna, { ascending: ascendente });
  }

  const { data, error } = await query;
  if (error) {
    console.error(`/api/exportar tabela=${config.slug}:`, error.message);
    return res.status(502).json({ error: "falha ao consultar os dados — tente novamente" });
  }

  let linhas = (data ?? []) as unknown as Record<string, unknown>[];
  const nomesColunas = config.colunas.map((c) => c.nome);
  if (config.slug === "ministros") {
    linhas = linhas.map((l) => ({ ...l, slug: slugMinistro(String(l.nome ?? "")) }));
  }

  res.setHeader("X-Total-Nesta-Pagina", String(linhas.length));
  res.setHeader("X-Proxima-Pagina", linhas.length === limite ? String(offset + limite) : "");

  if (formato === "json") {
    return res.status(200).json(linhas);
  }

  const csv = paraCsv(linhas, nomesColunas);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${config.tabela}.csv"`);
  return res.status(200).send(csv);
}
