import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TribunalId } from '@/lib/tribunais'

export interface MinistroSummary {
  nome: string
  processos: number
  comDecisao: number
  classes: Record<string, number>
  ultimaDecisao: string | null
}

export function useMinistros(tribunal?: TribunalId) {
  return useQuery({
    queryKey: ['ministros', tribunal],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase não configurado')

      let query = supabase
        .from('processos_publico')
        .select('relator, classe, data_decisao')

      if (tribunal) query = query.eq('tribunal', tribunal)
      query = query.not('relator', 'is', null)

      // Paginate to get all
      const all: { relator: string; classe: string | null; data_decisao: string | null }[] = []
      let offset = 0
      const pageSize = 1000
      while (true) {
        const { data, error } = await query.range(offset, offset + pageSize - 1)
        if (error) throw error
        if (!data || data.length === 0) break
        all.push(...data)
        if (data.length < pageSize) break
        offset += pageSize
      }

      const map: Record<string, MinistroSummary> = {}
      for (const row of all) {
        if (!row.relator) continue
        if (!map[row.relator]) {
          map[row.relator] = { nome: row.relator, processos: 0, comDecisao: 0, classes: {}, ultimaDecisao: null }
        }
        const m = map[row.relator]
        m.processos++
        const c = row.classe || 'Outro'
        m.classes[c] = (m.classes[c] || 0) + 1
        if (row.data_decisao) {
          m.comDecisao++
          if (!m.ultimaDecisao || row.data_decisao > m.ultimaDecisao) {
            m.ultimaDecisao = row.data_decisao
          }
        }
      }

      return Object.values(map).sort((a, b) => b.processos - a.processos)
    },
  })
}
