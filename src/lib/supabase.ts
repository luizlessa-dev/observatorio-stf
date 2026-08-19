import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

// Chave anônima, tanto no build quanto no navegador. Não é segredo: o conteúdo
// do site é inteiramente público e a proteção real são as policies RLS e os
// grants por coluna (migrations 0003 e 0008), não esconder a chave.
const url = import.meta.env.PUBLIC_SUPABASE_URL as string;
const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string;

if (!url || !key) {
  throw new Error(
    "PUBLIC_SUPABASE_URL e PUBLIC_SUPABASE_ANON_KEY são obrigatórias. " +
    "Sem elas o build gera páginas vazias em silêncio, que é pior do que falhar."
  );
}

export const supabase = createClient<Database>(url, key);
