/**
 * sync-tst — Ingestão dedicada ao TST via DataJud CNJ
 *
 * Usa from/size pagination (search_after não funciona com _id no DataJud).
 * Parâmetros aceitos via POST body:
 *   monthsBack   — quantos meses atrás buscar (default 24)
 *   maxPages     — páginas por mês (default 30, ~3000 processos/mês)
 *   pageSize     — tamanho da página (default 100)
 *   startMonth   — pular para um mês específico (YYYY-MM, ex: "2023-06")
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
// Mesma key usada no sync-datajud (DataJud pública CNJ)
const DATAJUD_KEY = 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw=='

const DATAJUD_URL = 'https://api-publica.datajud.cnj.jus.br/api_publica_tst/_search'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractRelator(orgaoJulgadorNome: string | undefined): string | null {
  if (!orgaoJulgadorNome) return null
  // Padrão TST: "GABINETE DO MINISTRO X" / "GABINETE DA MINISTRA X"
  const m = orgaoJulgadorNome.match(
    /GABINETE\s+D[OA]\s+(?:MINISTRO|MINISTRA|JUIZ|JUÍZA|DESEMBARGADOR[A]?)(?:\s+CONVOCAD[OA])?\s+(.+)/i,
  )
  return m ? m[1].trim() : null
}

function fixEncoding(str: string | undefined): string {
  if (!str) return ''
  // Detecta double-UTF8 encoding (presença de Ã seguido de char latino)
  if (!/Ã/.test(str)) return str
  try {
    const bytes = new Uint8Array(str.split('').map((c) => c.charCodeAt(0)))
    return new TextDecoder('utf-8').decode(bytes)
  } catch {
    return str
  }
}

function buildDateRange(
  monthsBack: number,
  startOffset = 0,
): { gte: string; lte: string }[] {
  const ranges: { gte: string; lte: string }[] = []
  const now = new Date()
  for (let i = startOffset; i < startOffset + monthsBack; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = d.getFullYear()
    const month = d.getMonth()
    const first = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const last = new Date(year, month + 1, 0)
    const lastStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`
    ranges.push({ gte: first, lte: lastStr })
  }
  return ranges
}

async function fetchPage(
  dateRange: { gte: string; lte: string },
  from: number,
  size: number,
): Promise<{ hits: unknown[]; total: number }> {
  const body = {
    query: {
      bool: {
        must: [
          {
            range: {
              // DataJud usa dataHoraUltimaAtualizacao (não dataAjuizamento)
              dataHoraUltimaAtualizacao: { gte: dateRange.gte, lte: dateRange.lte },
            },
          },
        ],
      },
    },
    sort: [{ dataHoraUltimaAtualizacao: { order: 'desc' } }],
    _source: [
      'numeroProcesso',
      'classe',
      'assuntos',
      'orgaoJulgador',
      'dataHoraUltimaAtualizacao',
      'movimentos',
      'relator',
    ],
    from,
    size,
  }

  const res = await fetch(DATAJUD_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // DataJud usa "APIKey" (uppercase K)
      Authorization: `APIKey ${DATAJUD_KEY}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`DataJud HTTP ${res.status}: ${text.slice(0, 300)}`)
  }

  const json = await res.json()
  const hits = json?.hits?.hits ?? []
  const total = json?.hits?.total?.value ?? 0
  return { hits, total }
}

function mapHit(hit: Record<string, unknown>): Record<string, unknown> | null {
  const src = hit._source as Record<string, unknown> | undefined
  if (!src) return null

  const numeroProcesso = fixEncoding(src.numeroProcesso as string)
  if (!numeroProcesso) return null

  const classe = fixEncoding((src.classe as Record<string, string> | undefined)?.nome)

  // Movimentos: pegar o mais recente com tipo "decisão/acórdão"
  const movimentos = (src.movimentos as Record<string, unknown>[] | undefined) ?? []
  const decisao = movimentos
    .filter((m) => {
      const nome = String((m.nome as string) ?? '').toLowerCase()
      return (
        nome.includes('acordao') ||
        nome.includes('acórdão') ||
        nome.includes('decisao') ||
        nome.includes('decisão') ||
        nome.includes('julgamento')
      )
    })
    .sort(
      (a, b) =>
        new Date(b.dataHora as string).getTime() - new Date(a.dataHora as string).getTime(),
    )[0]

  const dataDecisao = decisao
    ? String(decisao.dataHora as string).slice(0, 10)
    : (src.dataHoraUltimaAtualizacao as string | undefined)?.slice(0, 10) ?? null

  const orgaoNome = fixEncoding(
    (src.orgaoJulgador as Record<string, string> | undefined)?.nome,
  )
  const relatorFromOrg = extractRelator(orgaoNome)
  const relatorDireto = fixEncoding(
    (src.relator as Record<string, string> | undefined)?.nome,
  )
  const relator = relatorDireto || relatorFromOrg

  const assuntos = src.assuntos as Record<string, string>[] | undefined
  const tema = fixEncoding(assuntos?.[0]?.nome)

  return {
    tribunal: 'TST',
    classe,
    numero_processo: numeroProcesso,
    relator,
    orgao_julgador: orgaoNome,
    data_decisao: dataDecisao,
    tema,
    fonte: 'datajud',
    identificador_externo: `tst-${String(hit._id)}`,
    metadata: {
      assuntos: assuntos?.map((a) => a.nome).filter(Boolean) ?? [],
    },
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  try {
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
    const monthsBack: number = body.monthsBack ?? 3
    const startOffset: number = body.startOffset ?? 0
    const maxPages: number = body.maxPages ?? 10
    const pageSize: number = Math.min(body.pageSize ?? 100, 200)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const ranges = buildDateRange(monthsBack, startOffset)

    let totalInserted = 0
    let totalSkipped = 0
    const errors: string[] = []

    for (const range of ranges) {
      let page = 0
      let rangeTotal = Infinity

      while (page < maxPages && page * pageSize < rangeTotal) {
        try {
          const { hits, total } = await fetchPage(range, page * pageSize, pageSize)
          rangeTotal = Math.min(total, 10000) // DataJud limita from a 10k

          if (hits.length === 0) break

          const rows = (hits as Record<string, unknown>[]).map(mapHit).filter(Boolean)

          if (rows.length > 0) {
            const { error } = await supabase.from('processos').upsert(rows, {
              onConflict: 'identificador_externo',
              ignoreDuplicates: false,
            })
            if (error) {
              errors.push(`${range.gte}~p${page}: ${error.message}`)
            } else {
              totalInserted += rows.length
            }
          }

          page++

          // Delay entre páginas para evitar rate limit
          if (hits.length === pageSize) {
            await new Promise((r) => setTimeout(r, 300))
          } else {
            break
          }
        } catch (err) {
          errors.push(`${range.gte}~p${page}: ${String(err)}`)
          break
        }
      }

      // Delay entre meses
      await new Promise((r) => setTimeout(r, 200))
    }

    return new Response(
      JSON.stringify({
        ok: true,
        tribunal: 'TST',
        monthsBack,
        inserted: totalInserted,
        skipped: totalSkipped,
        errors: errors.slice(0, 10),
      }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
