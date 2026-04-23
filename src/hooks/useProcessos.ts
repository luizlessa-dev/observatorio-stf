import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TribunalId } from '@/lib/tribunais'

export interface Processo {
  id: string
  tribunal: string
  classe: string | null
  classe_processual: string | null
  numero_processo: string | null
  relator: string | null
  orgao_julgador: string | null
  tipo_decisao: string | null
  data_decisao: string | null
  tema: string | null
  ementa: string | null
  link_oficial: string | null
  fonte: string | null
  data_coleta: string | null
}

interface UseProcessosParams {
  tribunal?: TribunalId
  classe?: string
  relator?: string
  search?: string
  dataInicio?: string
  dataFim?: string
  page?: number
  pageSize?: number
}

const PAGE_SIZE = 50

export function useProcessos({
  tribunal,
  classe,
  relator,
  search,
  dataInicio,
  dataFim,
  page = 0,
  pageSize = PAGE_SIZE,
}: UseProcessosParams = {}) {
  return useQuery({
    queryKey: ['processos', { tribunal, classe, relator, search, dataInicio, dataFim, page, pageSize }],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase não configurado')

      // Busca textual → RPC com FTS real (GIN index + ts_rank)
      if (search) {
        const { data, error } = await supabase.rpc('buscar_processos', {
          q: search,
          p_tribunal: tribunal ?? null,
          p_classe: classe ?? null,
          p_relator: relator ?? null,
          p_data_inicio: dataInicio ?? null,
          p_data_fim: dataFim ?? null,
          p_page: page,
          p_page_size: pageSize,
        })
        if (error) throw error
        const rows = (data ?? []) as (Processo & { total_count: number })[]
        const total = rows[0]?.total_count ?? 0
        return { data: rows as Processo[], count: total }
      }

      // Sem busca textual → query direta com índices B-tree (rápido)
      let query = supabase
        .from('processos_publico')
        .select('*', { count: 'exact' })

      if (tribunal) query = query.eq('tribunal', tribunal)
      if (classe) query = query.eq('classe', classe)
      if (relator) query = query.ilike('relator', `%${relator}%`)
      if (dataInicio) query = query.gte('data_decisao', dataInicio)
      if (dataFim) query = query.lte('data_decisao', dataFim)

      query = query
        .order('data_decisao', { ascending: false, nullsFirst: false })
        .range(page * pageSize, (page + 1) * pageSize - 1)

      const { data, error, count } = await query
      if (error) throw error

      return { data: data as Processo[], count: count ?? 0 }
    },
    placeholderData: (prev) => prev,
  })
}

export function useProcesso(id: string) {
  return useQuery({
    queryKey: ['processo', id],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase não configurado')

      const { data, error } = await supabase
        .from('processos_publico')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Processo
    },
    enabled: !!id,
  })
}
