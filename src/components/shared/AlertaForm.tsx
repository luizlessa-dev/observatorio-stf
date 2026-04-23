/**
 * Formulário de alerta de processo.
 *
 * Props:
 *   numeroProcesso — pré-preenche o campo (vindo do ProcessoDetalhe)
 *   termoBusca     — pré-preenche busca (vindo do BuscaPage)
 *   tribunal       — tribunal atual (opcional)
 */
import { useState } from 'react'
import { Input } from '@/components/ui/input'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string

interface Props {
  numeroProcesso?: string | null
  termoBusca?: string
  tribunal?: string
  variant?: 'card' | 'inline'
  className?: string
}

export function AlertaForm({
  numeroProcesso,
  termoBusca,
  tribunal,
  variant = 'card',
  className = '',
}: Props) {
  const tipo = numeroProcesso ? 'numero' : 'busca'
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    setMessage('')

    try {
      const body: Record<string, string> = { email, tipo }
      if (tipo === 'numero' && numeroProcesso) body.numero_processo = numeroProcesso
      if (tipo === 'busca' && termoBusca) body.termo_busca = termoBusca
      if (tribunal) body.tribunal = tribunal

      const res = await fetch(`${SUPABASE_URL}/functions/v1/alerta-subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setStatus('ok')
        setMessage(data.message || 'Verifique seu email para confirmar o alerta.')
        setEmail('')
      } else {
        setStatus('error')
        setMessage(data.error || 'Erro ao criar alerta.')
      }
    } catch (err) {
      setStatus('error')
      setMessage((err as Error).message || 'Erro de rede.')
    }
  }

  const descricao = tipo === 'numero'
    ? `Processo ${numeroProcesso}`
    : `Busca: "${termoBusca}"`

  if (variant === 'inline') {
    return (
      <form onSubmit={handleSubmit} className={`flex flex-col gap-2 sm:flex-row ${className}`}>
        <Input
          type="email"
          required
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === 'loading' || status === 'ok'}
          className="flex-1"
        />
        <button
          type="submit"
          disabled={status === 'loading' || !email.trim() || status === 'ok'}
          className="shrink-0 rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
        >
          {status === 'loading' ? 'Criando…' : status === 'ok' ? '✓ Alerta criado' : 'Criar alerta'}
        </button>
        {message && (
          <p className={`text-xs ${status === 'ok' ? 'text-green-700' : 'text-red-700'}`}>
            {message}
          </p>
        )}
      </form>
    )
  }

  return (
    <div className={`rounded-lg border bg-gradient-to-br from-amber-50 to-white p-5 ${className}`}>
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <span className="text-lg">🔔</span>
        <div>
          <p className="text-sm font-semibold">Alerta de novas decisões</p>
          <p className="text-xs text-muted-foreground line-clamp-1">{descricao}</p>
        </div>
      </div>

      <p className="mb-3 text-xs text-muted-foreground">
        Receba um email assim que uma nova decisão for publicada para este{' '}
        {tipo === 'numero' ? 'processo' : 'critério de busca'}.
      </p>

      {status === 'ok' ? (
        <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          ✓ {message}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-2">
          <Input
            type="email"
            required
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === 'loading'}
          />
          <button
            type="submit"
            disabled={status === 'loading' || !email.trim()}
            className="w-full rounded-md bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
          >
            {status === 'loading' ? 'Criando alerta…' : 'Criar alerta gratuito'}
          </button>
          {status === 'error' && message && (
            <p className="text-xs text-red-700">{message}</p>
          )}
        </form>
      )}

      <p className="mt-3 text-[11px] text-muted-foreground">
        Cancelamento em 1 clique pelo email. Sem spam.
      </p>
    </div>
  )
}
