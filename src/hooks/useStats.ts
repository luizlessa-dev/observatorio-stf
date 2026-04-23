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
    staleTime: 10 * 60 * 1000,
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

/** Usa view SQL stats_por_classe_tribunal — sem full scan client-side */
export function useStatsPorClasse(tribunal?: TribunalId) {
  return useQuery({
    queryKey: ['stats-classe', tribunal],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase não configurado')

      let query = supabase
        .from('stats_por_classe_tribunal')
        .select('classe, total')
        .order('total', { ascending: false })
        .limit(15)

      if (tribunal) query = query.eq('tribunal', tribunal)

      const { data, error } = await query
      if (error) throw error

      return (data ?? []).map((r) => ({ name: r.classe as string, value: r.total as number }))
    },
  })
}

/** Usa view SQL stats_por_ano_tribunal — sem full scan client-side */
export function useStatsPorAno(tribunal?: TribunalId) {
  return useQuery({
    queryKey: ['stats-ano', tribunal],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase não configurado')

      let query = supabase
        .from('stats_por_ano_tribunal')
        .select('ano, total')
        .order('ano', { ascending: false })
        .limit(12)

      if (tribunal) query = query.eq('tribunal', tribunal)

      const { data, error } = await query
      if (error) throw error

      return (data ?? []).map((r) => ({ name: r.ano as string, value: r.total as number }))
    },
  })
}
