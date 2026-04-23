import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface TimelineEntry {
  id: string
  tipo_decisao: string | null
  data_decisao: string | null
  orgao_julgador: string | null
  relator: string | null
  classe: string | null
}

/**
 * Retorna todas as decisões do mesmo numero_processo (exceto a atual).
 * Ordena da mais antiga para a mais recente para formar a linha do tempo.
 */
export function useProcessoTimeline(
  numeroProcesso: string | null | undefined,
  currentId: string,
) {
  return useQuery({
    queryKey: ['timeline', numeroProcesso, currentId],
    enabled: !!numeroProcesso,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!supabase || !numeroProcesso) return []
      const { data, error } = await supabase
        .from('processos_publico')
        .select('id, tipo_decisao, data_decisao, orgao_julgador, relator, classe')
        .eq('numero_processo', numeroProcesso)
        .neq('id', currentId)
        .order('data_decisao', { ascending: true, nullsFirst: false })
        .limit(30)
      if (error) throw error
      return (data ?? []) as TimelineEntry[]
    },
  })
}
