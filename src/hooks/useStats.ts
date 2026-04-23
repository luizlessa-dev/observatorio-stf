import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TribunalId } from '@/lib/tribunais'

export interface TribunalStats {
  tribunal: string
  total: number
  com_decisao: number
  relatores: number
  classes: number
}

export function useStats(tribunal?: TribunalId) {
  return useQuery({
    queryKey: ['stats', tribunal],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase não configurado')

      let query = supabase.from('stats_por_tribunal').select('*')
      if (tribunal) query = query.eq('tribunal', tribunal)

      const { data, error } = await query
      if (error) throw error
      return data as TribunalStats[]
    },
  })
}

export function useStatsPorClasse(tribunal?: TribunalId) {
  return useQuery({
    queryKey: ['stats-classe', tribunal],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase não configurado')

      let query = supabase
        .from('processos_publico')
        .select('classe')

      if (tribunal) query = query.eq('tribunal', tribunal)

      const { data, error } = await query
      if (error) throw error

      const counts: Record<string, number> = {}
      for (const row of data ?? []) {
        const c = row.classe || 'Outro'
        counts[c] = (counts[c] || 0) + 1
      }

      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([name, value]) => ({ name, value }))
    },
  })
}

export function useStatsPorAno(tribunal?: TribunalId) {
  return useQuery({
    queryKey: ['stats-ano', tribunal],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase não configurado')

      let query = supabase
        .from('processos_publico')
        .select('data_decisao')
        .not('data_decisao', 'is', null)

      if (tribunal) query = query.eq('tribunal', tribunal)

      const { data, error } = await query
      if (error) throw error

      const counts: Record<string, number> = {}
      for (const row of data ?? []) {
        const year = String(row.data_decisao).slice(0, 4)
        counts[year] = (counts[year] || 0) + 1
      }

      return Object.entries(counts)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, 12)
        .map(([name, value]) => ({ name, value }))
    },
  })
}
