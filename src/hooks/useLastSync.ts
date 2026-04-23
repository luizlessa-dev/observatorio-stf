import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/**
 * Retorna o timestamp da última coleta de dados (max data_coleta).
 * Usado para mostrar "Atualizado há X horas" na home.
 */
export function useLastSync() {
  return useQuery({
    queryKey: ['last-sync'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!supabase) return null
      const { data, error } = await supabase
        .from('processos_publico')
        .select('data_coleta')
        .order('data_coleta', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle()

      if (error || !data?.data_coleta) return null
      return new Date(data.data_coleta as string)
    },
  })
}

export function formatRelativeTime(date: Date | null | undefined): string {
  if (!date) return 'carregando…'
  const diffMs = Date.now() - date.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'agora mesmo'
  if (mins < 60) return `há ${mins} minuto${mins === 1 ? '' : 's'}`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `há ${hours} hora${hours === 1 ? '' : 's'}`
  const days = Math.floor(hours / 24)
  if (days < 30) return `há ${days} dia${days === 1 ? '' : 's'}`
  return date.toLocaleDateString('pt-BR')
}
