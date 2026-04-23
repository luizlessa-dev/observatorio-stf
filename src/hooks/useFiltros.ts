import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TribunalId } from '@/lib/tribunais'

/**
 * Lista classes mais comuns (top 50) para popular o dropdown de filtro.
 * Usa a view stats_por_classe_tribunal — sem full scan de 190k rows.
 */
export function useClassesFiltro(tribunal?: TribunalId) {
  return useQuery({
    queryKey: ['filtros-classes', tribunal],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase não configurado')

      let q = supabase
        .from('stats_por_classe_tribunal')
        .select('classe, total')
        .order('total', { ascending: false })
        .limit(50)

      if (tribunal) q = q.eq('tribunal', tribunal)

      const { data, error } = await q
      if (error) throw error

      return (data ?? []).map((r) => ({
        name: r.classe as string,
        count: r.total as number,
      }))
    },
  })
}
