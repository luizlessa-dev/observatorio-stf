import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

// Aceita os dois nomes de propósito.
//
// Astro só expõe ao navegador variáveis com prefixo PUBLIC_, então é esse o
// nome canônico daqui pra frente. Mas o projeto na Vercel foi configurado na
// época do Vite e tem VITE_SUPABASE_*; trocar lá e aqui na mesma mudança
// quebraria o deploy no intervalo entre as duas. Ler as duas formas remove
// essa janela — e evita que alguém que faça `git pull` num ambiente antigo
// descubra do jeito difícil.
//
// Chave anônima, tanto no build quanto no navegador. Não é segredo: o conteúdo
// do site é inteiramente público e a proteção real são as policies RLS e os
// grants por coluna (migrations 0003 e 0008).
const env = import.meta.env as Record<string, string | undefined>;
const url = env.PUBLIC_SUPABASE_URL ?? env.VITE_SUPABASE_URL;
const key = env.PUBLIC_SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error(
    "Faltam as credenciais do Supabase. Defina PUBLIC_SUPABASE_URL e " +
    "PUBLIC_SUPABASE_ANON_KEY (ou as antigas VITE_SUPABASE_*). Sem elas o build " +
    "geraria páginas vazias em silêncio, que é pior do que falhar aqui."
  );
}

export const supabase = createClient<Database>(url, key);
