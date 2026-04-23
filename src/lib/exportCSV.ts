import type { Processo } from '@/hooks/useProcessos'
import { supabase } from '@/lib/supabase'
import type { TribunalId } from '@/lib/tribunais'

// ─── CSV formatting ───────────────────────────────────────────────────────────

const HEADERS: { key: keyof Processo; label: string }[] = [
  { key: 'tribunal', label: 'Tribunal' },
  { key: 'classe', label: 'Classe' },
  { key: 'numero_processo', label: 'Número do Processo' },
  { key: 'relator', label: 'Relator' },
  { key: 'orgao_julgador', label: 'Órgão Julgador' },
  { key: 'tipo_decisao', label: 'Tipo de Decisão' },
  { key: 'data_decisao', label: 'Data da Decisão' },
  { key: 'tema', label: 'Tema' },
  { key: 'ementa', label: 'Ementa' },
  { key: 'link_oficial', label: 'Link Oficial' },
]

function escapeCsv(value: string | null | undefined): string {
  if (value == null) return ''
  const str = String(value).replace(/\r?\n/g, ' ')
  if (str.includes(',') || str.includes('"') || str.includes(';')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function exportProcessosToCSV(processos: Processo[], filename = 'processos.csv') {
  const header = HEADERS.map((h) => h.label).join(',')
  const rows = processos.map((p) =>
    HEADERS.map((h) => escapeCsv(p[h.key] as string)).join(','),
  )
  const csv = [header, ...rows].join('\r\n')
  // BOM (byte order mark) para Excel abrir corretamente em UTF-8
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── Fetch up to 500 results for export ──────────────────────────────────────

interface ExportParams {
  tribunal?: TribunalId | string
  classe?: string
  relator?: string
  search?: string
  dataInicio?: string
  dataFim?: string
}

export async function fetchProcessosForExport(params: ExportParams): Promise<Processo[]> {
  if (!supabase) throw new Error('Supabase não configurado')

  const { tribunal, classe, relator, search, dataInicio, dataFim } = params

  if (search) {
    const { data, error } = await supabase.rpc('buscar_processos', {
      q: search,
      p_tribunal: tribunal ?? null,
      p_classe: classe ?? null,
      p_relator: relator ?? null,
      p_data_inicio: dataInicio ?? null,
      p_data_fim: dataFim ?? null,
      p_page: 0,
      p_page_size: 500,
    })
    if (error) throw error
    return (data ?? []) as Processo[]
  }

  let query = supabase
    .from('processos_publico')
    .select('id,tribunal,classe,numero_processo,relator,orgao_julgador,tipo_decisao,data_decisao,tema,ementa,link_oficial,fonte,data_coleta')

  if (tribunal) query = query.eq('tribunal', tribunal)
  if (classe) query = query.eq('classe', classe)
  if (relator) query = query.ilike('relator', `%${relator}%`)
  if (dataInicio) query = query.gte('data_decisao', dataInicio)
  if (dataFim) query = query.lte('data_decisao', dataFim)

  query = query
    .order('data_decisao', { ascending: false, nullsFirst: false })
    .limit(500)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Processo[]
}
