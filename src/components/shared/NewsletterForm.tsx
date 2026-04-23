import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { TRIBUNAIS_SUPERIORES } from '@/lib/tribunais'

interface Props {
  variant?: 'card' | 'inline'
  className?: string
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string

const GROUP_OPTIONS = [
  { id: '__superiores', label: 'Tribunais superiores (STF, STJ, TST, TCU)', tribunais: TRIBUNAIS_SUPERIORES.map((t) => t.id) },
  { id: '__federais', label: 'Justiça Federal (TRF1 a TRF6)', tribunais: ['TRF1', 'TRF2', 'TRF3', 'TRF4', 'TRF5', 'TRF6'] },
  { id: '__estaduais', label: 'Justiça Estadual (todos os TJs)', tribunais: ['__all_tjs'] },
]

export function NewsletterForm({ variant = 'card', className = '' }: Props) {
  const [email, setEmail] = useState('')
  const [selecteds, setSelecteds] = useState<Record<string, boolean>>({})
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [message, setMessage] = useState('')

  function toggleGroup(id: string) {
    setSelecteds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setStatus('loading')
    setMessage('')

    // Expand selected groups into tribunal IDs
    const tribunaisSelecionados: string[] = []
    for (const g of GROUP_OPTIONS) {
      if (selecteds[g.id]) tribunaisSelecionados.push(...g.tribunais)
    }

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/newsletter-subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON,
        },
        body: JSON.stringify({ email, tribunais: tribunaisSelecionados }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setStatus('ok')
        setMessage(data.message || 'Inscrição realizada!')
        setEmail('')
        setSelecteds({})
      } else {
        setStatus('error')
        setMessage(data.error || 'Erro ao inscrever. Tente novamente.')
      }
    } catch (err) {
      setStatus('error')
      setMessage((err as Error).message || 'Erro de rede.')
    }
  }

  if (variant === 'inline') {
    return (
      <form onSubmit={handleSubmit} className={`flex flex-col gap-2 sm:flex-row ${className}`}>
        <Input
          type="email"
          required
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === 'loading'}
          className="flex-1"
        />
        <button
          type="submit"
          disabled={status === 'loading' || !email.trim()}
          className="rounded-md bg-navy-800 px-4 py-2 text-sm font-medium text-white hover:bg-navy-700 disabled:opacity-50"
        >
          {status === 'loading' ? 'Inscrevendo…' : 'Receber resumo semanal'}
        </button>
        {message && (
          <p className={`text-xs ${status === 'ok' ? 'text-green-700' : 'text-red-700'}`}>{message}</p>
        )}
      </form>
    )
  }

  return (
    <div className={`rounded-lg border bg-gradient-to-br from-navy-50 to-white p-6 ${className}`}>
      <div className="mb-4 flex items-center gap-2">
        <span
          className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
          style={{ backgroundColor: '#d4af37', color: '#1e3a5f' }}
        >
          Novidade
        </span>
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Radar Judiciário Semanal
        </span>
      </div>

      <h3 className="text-lg font-bold tracking-tight">
        As decisões mais relevantes da semana, no seu email
      </h3>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Um resumo semanal (toda sexta, 10h) com decisões novas do STF, STJ e dos tribunais que você
        escolher. Sem spam, descadastro em 1 clique.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <Input
          type="email"
          required
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === 'loading'}
        />

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            Quero receber decisões de (opcional):
          </p>
          {GROUP_OPTIONS.map((g) => (
            <label key={g.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!selecteds[g.id]}
                onChange={() => toggleGroup(g.id)}
                className="h-4 w-4 rounded border-input accent-navy-800"
              />
              <span>{g.label}</span>
            </label>
          ))}
        </div>

        <button
          type="submit"
          disabled={status === 'loading' || !email.trim()}
          className="w-full rounded-md bg-navy-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-700 disabled:opacity-50 sm:w-auto"
        >
          {status === 'loading' ? 'Inscrevendo…' : 'Receber resumo semanal'}
        </button>
      </form>

      {message && (
        <p className={`mt-3 text-sm ${status === 'ok' ? 'text-green-700' : 'text-red-700'}`}>
          {message}
        </p>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
        Seu email é usado apenas para envio da newsletter. Não compartilhamos com terceiros.{' '}
        <Link to="/privacidade" className="underline hover:text-foreground">
          Política de Privacidade
        </Link>
        .
      </p>
    </div>
  )
}
