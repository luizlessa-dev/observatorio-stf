/**
 * admin-highlights — CRUD de highlights curados
 *
 * Autenticação: Authorization: Bearer <ADMIN_SECRET>
 *
 * GET    /admin-highlights          → lista todos (incluindo inativos)
 * POST   /admin-highlights          → cria novo highlight
 * PUT    /admin-highlights?id=<id>  → atualiza highlight
 * DELETE /admin-highlights?id=<id>  → remove highlight
 * GET    /admin-highlights?ping=1   → valida senha (retorna {ok:true})
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ADMIN_SECRET = Deno.env.get('ADMIN_SECRET') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function unauthorized() {
  return json({ error: 'Senha incorreta' }, 401)
}

function err(msg: string, status = 500) {
  return json({ error: msg }, status)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  // Validar senha
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!ADMIN_SECRET || token !== ADMIN_SECRET) return unauthorized()

  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  const ping = url.searchParams.get('ping')

  // Ping para verificar senha
  if (ping) return json({ ok: true })

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // GET — listar todos os highlights
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('highlights')
      .select('*')
      .order('semana_referencia', { ascending: false })
      .order('posicao', { ascending: true })

    if (error) return err(error.message)
    return json(data)
  }

  // POST — criar
  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)
    if (!body) return err('Body inválido', 400)

    const { data, error } = await supabase.from('highlights').insert(body).select().single()
    if (error) return err(error.message)
    return json(data, 201)
  }

  // PUT — atualizar
  if (req.method === 'PUT') {
    if (!id) return err('Parâmetro id obrigatório', 400)
    const body = await req.json().catch(() => null)
    if (!body) return err('Body inválido', 400)

    // Remove campos imutáveis
    delete body.id
    delete body.created_at

    const { data, error } = await supabase
      .from('highlights')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) return err(error.message)
    return json(data)
  }

  // DELETE — remover
  if (req.method === 'DELETE') {
    if (!id) return err('Parâmetro id obrigatório', 400)
    const { error } = await supabase.from('highlights').delete().eq('id', id)
    if (error) return err(error.message)
    return json({ deleted: id })
  }

  return err('Método não suportado', 405)
})
