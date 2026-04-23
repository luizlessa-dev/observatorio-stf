import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TribunalId } from '@/lib/tribunais'

export interface MinistroSummary {
  nome: string
  processos: number
  comDecisao: number
  classePrincipal: string | null
  ultimaDecisao: string | null
}

/** Usa view stats_por_relator — uma query, sem paginação de 190k rows */
export function useMinistros(tribunal?: TribunalId) {
  return useQuery({
    queryKey: ['ministros', tribunal],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase não configurado')

      let query = supabase
        .from('stats_por_relator')
        .select('relator, processos, com_decisao, ultima_decisao, classe_principal')
        .order('processos', { ascending: false })
        .limit(100)

      if (tribunal) query = query.eq('tribunal', tribunal)

      const { data, error } = await query
      if (error) throw error

      return (data ?? []).map((r) => ({
        nome: r.relator as string,
        processos: r.processos as number,
        comDecisao: r.com_decisao as number,
        classePrincipal: r.classe_principal as string | null,
        ultimaDecisao: r.ultima_decisao as string | null,
      })) as MinistroSummary[]
    },
  })
}
