import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TribunalId } from '@/lib/tribunais'

export interface TemaCategoria {
  categoria: string   // nível raiz (antes do primeiro " | ")
  total: number
}

export interface TemaDetalhe {
  tema: string
  total: number
}

/**
 * Retorna as categorias de temas do nível raiz para um tribunal,
 * com o total de processos em cada categoria.
 * Usa split no cliente (sem coluna gerada) pois o volume é pequeno.
 */
export function useTemasCategoria(tribunal: TribunalId | string) {
  return useQuery({
    queryKey: ['temas-categoria', tribunal],
    staleTime: 15 * 60 * 1000,
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase não configurado')
      const { data, error } = await supabase
        .from('processos_publico')
        .select('tema')
        .eq('tribunal', tribunal)
        .not('tema', 'is', null)
        .neq('tema', '')
        .limit(5000)
      if (error) throw error

      // Agrupa pelo nível raiz do tema (antes do primeiro " | ")
      const map = new Map<string, number>()
      for (const row of data ?? []) {
        const cat = String(row.tema).split(' | ')[0].trim()
        if (cat) map.set(cat, (map.get(cat) ?? 0) + 1)
      }
      return Array.from(map.entries())
        .map(([categoria, total]) => ({ categoria, total }))
        .sort((a, b) => b.total - a.total) as TemaCategoria[]
    },
  })
}

/**
 * Retorna todos os sub-temas de uma categoria.
 */
export function useTemaDetalhe(tribunal: TribunalId | string, categoria: string) {
  return useQuery({
    queryKey: ['tema-detalhe', tribunal, categoria],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase não configurado')
      const { data, error } = await supabase
        .from('processos_publico')
        .select('tema')
        .eq('tribunal', tribunal)
        .ilike('tema', `${categoria}%`)
        .not('tema', 'is', null)
        .limit(3000)
      if (error) throw error

      const map = new Map<string, number>()
      for (const row of data ?? []) {
        const tema = String(row.tema).trim()
        if (tema) map.set(tema, (map.get(tema) ?? 0) + 1)
      }
      return Array.from(map.entries())
        .map(([tema, total]) => ({ tema, total }))
        .sort((a, b) => b.total - a.total) as TemaDetalhe[]
    },
  })
}

/** Retorna processos de um tema específico */
export function useProcessosPorTema(
  tribunal: TribunalId | string,
  tema: string,
  page = 0,
  pageSize = 50,
) {
  return useQuery({
    queryKey: ['processos-tema', tribunal, tema, page],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase não configurado')
      const { data, error, count } = await supabase
        .from('processos_publico')
        .select('*', { count: 'exact' })
        .eq('tribunal', tribunal)
        .eq('tema', tema)
        .order('data_decisao', { ascending: false, nullsFirst: false })
        .range(page * pageSize, (page + 1) * pageSize - 1)
      if (error) throw error
      return { data: data ?? [], count: count ?? 0 }
    },
  })
}
