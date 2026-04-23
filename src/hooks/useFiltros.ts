import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TribunalId } from '@/lib/tribunais'

/**
 * Lista classes mais comuns (top 50) para popular o dropdown de filtro.
 * Opcionalmente filtra por tribunal.
 */
export function useClassesFiltro(tribunal?: TribunalId) {
  return useQuery({
    queryKey: ['filtros-classes', tribunal],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase não configurado')

      let q = supabase
        .from('processos_publico')
        .select('classe')
        .not('classe', 'is', null)
        .limit(5000)

      if (tribunal) q = q.eq('tribunal', tribunal)

      const { data, error } = await q
      if (error) throw error

      const counts = new Map<string, number>()
      for (const row of data ?? []) {
        const c = row.classe as string | null
        if (!c) continue
        counts.set(c, (counts.get(c) ?? 0) + 1)
      }

      return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50)
        .map(([name, count]) => ({ name, count }))
    },
  })
}
