import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Highlight {
  id: string
  titulo_curto: string
  resumo: string
  tribunal: string | null
  tema: string | null
  link_externo: string | null
  posicao: number
  semana_referencia: string
  processo_id: string | null
  numero_processo: string | null
  classe: string | null
  relator: string | null
  data_decisao: string | null
}

/**
 * Retorna os highlights curados mais recentes (ativo=true).
 * Limitado a 5 por padrão para encaixar numa seção destaque da home.
 */
export function useHighlights(limit = 5) {
  return useQuery({
    queryKey: ['highlights', limit],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase
        .from('highlights_publico')
        .select('*')
        .limit(limit)

      if (error) throw error
      return (data ?? []) as Highlight[]
    },
  })
}
