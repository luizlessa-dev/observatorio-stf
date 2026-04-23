/**
 * /admin/highlights — painel de curadoria de destaques.
 * Acesso por senha (validada na Edge Function admin-highlights).
 * Não está linkado no menu — acesso direto por URL.
 */
import { useState, useEffect } from 'react'
import { TRIBUNAIS } from '@/lib/tribunais'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const ADMIN_FN = `${SUPABASE_URL}/functions/v1/admin-highlights`
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface Highlight {
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
  ativo: boolean
}

type HighlightDraft = Omit<Highlight, 'id'>

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function currentMondayISO() {
  const d = new Date()
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1) - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

function blankDraft(): HighlightDraft {
  return {
    titulo_curto: '',
    resumo: '',
    tribunal: '',
    tema: '',
    link_externo: '',
    posicao: 1,
    semana_referencia: currentMondayISO(),
    processo_id: '',
    numero_processo: '',
    classe: '',
    relator: '',
    data_decisao: '',
    ativo: true,
  }
}

function authHeaders(senha: string) {
  return {
    Authorization: `Bearer ${senha}`,
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON,
  }
}

// ---------------------------------------------------------------------------
// API factory (não é hook — pode ser chamada em qualquer lugar)
// ---------------------------------------------------------------------------

function makeApi(senha: string) {
  function cleanEmpty(obj: Record<string, unknown>) {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, v === '' ? null : v]))
  }

  return {
    async list(): Promise<Highlight[]> {
      const res = await fetch(ADMIN_FN, { headers: authHeaders(senha) })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    async create(draft: HighlightDraft): Promise<Highlight> {
      const res = await fetch(ADMIN_FN, {
        method: 'POST',
        headers: authHeaders(senha),
        body: JSON.stringify(cleanEmpty(draft as unknown as Record<string, unknown>)),
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    async update(id: string, patch: Partial<HighlightDraft>): Promise<Highlight> {
      const res = await fetch(`${ADMIN_FN}?id=${id}`, {
        method: 'PUT',
        headers: authHeaders(senha),
        body: JSON.stringify(cleanEmpty(patch as unknown as Record<string, unknown>)),
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    async remove(id: string): Promise<void> {
      const res = await fetch(`${ADMIN_FN}?id=${id}`, {
        method: 'DELETE',
        headers: authHeaders(senha),
      })
      if (!res.ok) throw new Error(await res.text())
    },
  }
}

// ---------------------------------------------------------------------------
// Formulário de highlight
// ---------------------------------------------------------------------------

function HighlightForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: HighlightDraft | Highlight
  onSave: (data: HighlightDraft) => void
  onCancel: () => void
  saving: boolean
}) {
  const [form, setForm] = useState<HighlightDraft>({ ...initial } as HighlightDraft)

  function set(field: keyof HighlightDraft, value: unknown) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  const inputCls =
    'w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-navy-500 focus:outline-none'
  const labelCls = 'block text-xs font-medium text-slate-600 mb-1'

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave(form)
      }}
      className="space-y-4"
    >
      {/* Título + semana */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Título curto *</label>
          <input
            required
            className={inputCls}
            value={form.titulo_curto}
            onChange={(e) => set('titulo_curto', e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Semana de referência *</label>
          <input
            required
            type="date"
            className={inputCls}
            value={form.semana_referencia}
            onChange={(e) => set('semana_referencia', e.target.value)}
          />
        </div>
      </div>

      {/* Resumo */}
      <div>
        <label className={labelCls}>Resumo *</label>
        <textarea
          required
          rows={4}
          className={inputCls}
          value={form.resumo}
          onChange={(e) => set('resumo', e.target.value)}
        />
      </div>

      {/* Tribunal + Posição + Ativo */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={labelCls}>Tribunal</label>
          <select
            className={inputCls}
            value={form.tribunal ?? ''}
            onChange={(e) => set('tribunal', e.target.value)}
          >
            <option value="">— nenhum —</option>
            {Object.values(TRIBUNAIS).map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Posição (1 = destaque principal)</label>
          <input
            type="number"
            min={1}
            max={10}
            className={inputCls}
            value={form.posicao}
            onChange={(e) => set('posicao', Number(e.target.value))}
          />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={(e) => set('ativo', e.target.checked)}
              className="h-4 w-4 accent-teal-600"
            />
            <span className="font-medium">Ativo (visível no site)</span>
          </label>
        </div>
      </div>

      {/* Processo */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={labelCls}>Número do processo</label>
          <input
            className={inputCls}
            value={form.numero_processo ?? ''}
            onChange={(e) => set('numero_processo', e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>processo_id (UUID no BD)</label>
          <input
            className={inputCls}
            value={form.processo_id ?? ''}
            onChange={(e) => set('processo_id', e.target.value)}
            placeholder="cole o id do processo se vinculado"
          />
        </div>
        <div>
          <label className={labelCls}>Classe</label>
          <input
            className={inputCls}
            value={form.classe ?? ''}
            onChange={(e) => set('classe', e.target.value)}
          />
        </div>
      </div>

      {/* Metadados */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={labelCls}>Relator</label>
          <input
            className={inputCls}
            value={form.relator ?? ''}
            onChange={(e) => set('relator', e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Data da decisão</label>
          <input
            type="date"
            className={inputCls}
            value={form.data_decisao ?? ''}
            onChange={(e) => set('data_decisao', e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Tema</label>
          <input
            className={inputCls}
            value={form.tema ?? ''}
            onChange={(e) => set('tema', e.target.value)}
          />
        </div>
      </div>

      {/* Link externo */}
      <div>
        <label className={labelCls}>Link externo (se não vinculado a processo interno)</label>
        <input
          type="url"
          className={inputCls}
          value={form.link_externo ?? ''}
          onChange={(e) => set('link_externo', e.target.value)}
          placeholder="https://..."
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {saving ? 'Salvando…' : 'Salvar highlight'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded border px-4 py-2 text-sm hover:bg-slate-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------

export default function HighlightsAdminPage() {
  const [senha, setSenha] = useState<string>(() => sessionStorage.getItem('admin_key') ?? '')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')
  const [checkingAuth, setCheckingAuth] = useState(false)

  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [mode, setMode] = useState<'list' | 'new' | 'edit'>('list')
  const [editTarget, setEditTarget] = useState<Highlight | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Tentar auto-login se tem senha no sessionStorage
  useEffect(() => {
    if (senha && !authed) {
      void tryLogin(senha)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function tryLogin(s: string) {
    setCheckingAuth(true)
    setAuthError('')
    try {
      const res = await fetch(`${ADMIN_FN}?ping=1`, { headers: authHeaders(s) })
      if (res.ok) {
        sessionStorage.setItem('admin_key', s)
        setSenha(s)
        setAuthed(true)
        void loadHighlights(s)
      } else {
        sessionStorage.removeItem('admin_key')
        setAuthError('Senha incorreta')
      }
    } catch {
      setAuthError('Erro de conexão')
    } finally {
      setCheckingAuth(false)
    }
  }

  async function loadHighlights(s = senha) {
    setLoading(true)
    setError('')
    try {
      const data = await makeApi(s).list()
      setHighlights(data)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(draft: HighlightDraft) {
    setSaving(true)
    setSaveError('')
    try {
      const api = makeApi(senha)
      if (mode === 'edit' && editTarget) {
        const updated = await api.update(editTarget.id, draft)
        setHighlights((h) => h.map((x) => (x.id === updated.id ? updated : x)))
      } else {
        const created = await api.create(draft)
        setHighlights((h) => [created, ...h])
      }
      setMode('list')
      setEditTarget(null)
    } catch (e) {
      setSaveError(String(e))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(h: Highlight) {
    if (!confirm(`Remover "${h.titulo_curto}"?`)) return
    try {
      await makeApi(senha).remove(h.id)
      setHighlights((list) => list.filter((x) => x.id !== h.id))
    } catch (e) {
      alert(String(e))
    }
  }

  async function toggleAtivo(h: Highlight) {
    try {
      const updated = await makeApi(senha).update(h.id, { ativo: !h.ativo })
      setHighlights((list) => list.map((x) => (x.id === updated.id ? updated : x)))
    } catch (e) {
      alert(String(e))
    }
  }

  // ---------------------------------------------------------------------------
  // Tela de login
  // ---------------------------------------------------------------------------

  if (!authed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-sm rounded-xl border bg-white p-8 shadow-sm">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-navy-800 text-lg font-bold text-gold-400">
              OJ
            </div>
            <h1 className="text-lg font-bold">Admin — Highlights</h1>
            <p className="mt-1 text-xs text-slate-500">Curadoria editorial dos destaques</p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void tryLogin(senha)
            }}
          >
            <label className="block text-xs font-medium text-slate-600">Senha de acesso</label>
            <input
              type="password"
              required
              autoFocus
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-navy-500 focus:outline-none"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
            />
            {authError && <p className="mt-2 text-xs text-red-600">{authError}</p>}
            <button
              type="submit"
              disabled={checkingAuth}
              className="mt-4 w-full rounded bg-navy-800 py-2 text-sm font-semibold text-white hover:bg-navy-700 disabled:opacity-50"
            >
              {checkingAuth ? 'Verificando…' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Painel principal
  // ---------------------------------------------------------------------------

  const semanas = [...new Set(highlights.map((h) => h.semana_referencia))].sort().reverse()

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b bg-navy-800 px-6 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-navy-700 text-xs font-bold text-gold-400">
              OJ
            </div>
            <span className="text-sm font-semibold text-white">Admin · Highlights</span>
          </div>
          <button
            onClick={() => {
              sessionStorage.removeItem('admin_key')
              setAuthed(false)
            }}
            className="text-xs text-slate-400 hover:text-white"
          >
            Sair
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl p-6 space-y-6">

        {/* Ações */}
        {mode === 'list' && (
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Destaques da semana</h1>
              <p className="text-sm text-slate-500">{highlights.length} highlights · máx 5 ativos por semana</p>
            </div>
            <button
              onClick={() => { setMode('new'); setEditTarget(null) }}
              className="rounded bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
            >
              + Novo highlight
            </button>
          </div>
        )}

        {/* Formulário de criação/edição */}
        {(mode === 'new' || mode === 'edit') && (
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-semibold">
              {mode === 'new' ? 'Novo highlight' : `Editando: ${editTarget?.titulo_curto}`}
            </h2>
            {saveError && (
              <p className="mb-3 rounded bg-red-50 px-3 py-2 text-xs text-red-700">{saveError}</p>
            )}
            <HighlightForm
              initial={editTarget ?? blankDraft()}
              onSave={handleSave}
              onCancel={() => { setMode('list'); setEditTarget(null) }}
              saving={saving}
            />
          </div>
        )}

        {/* Erros de carregamento */}
        {error && (
          <div className="rounded bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
            <button onClick={() => loadHighlights()} className="ml-3 underline">Tentar novamente</button>
          </div>
        )}

        {/* Lista agrupada por semana */}
        {mode === 'list' && (
          loading ? (
            <div className="py-12 text-center text-sm text-slate-400">Carregando…</div>
          ) : (
            <div className="space-y-8">
              {semanas.length === 0 && (
                <div className="rounded-xl border bg-white px-6 py-12 text-center text-sm text-slate-400">
                  Nenhum highlight cadastrado ainda.
                </div>
              )}
              {semanas.map((semana) => (
                <div key={semana}>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Semana de {semana}
                  </h3>
                  <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-xs text-slate-500">
                        <tr>
                          <th className="px-4 py-2 text-left">Pos</th>
                          <th className="px-4 py-2 text-left">Título</th>
                          <th className="px-4 py-2 text-left">Tribunal</th>
                          <th className="px-4 py-2 text-left">Data</th>
                          <th className="px-4 py-2 text-center">Ativo</th>
                          <th className="px-4 py-2 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {highlights
                          .filter((h) => h.semana_referencia === semana)
                          .sort((a, b) => a.posicao - b.posicao)
                          .map((h) => (
                            <tr key={h.id} className={h.ativo ? '' : 'opacity-40'}>
                              <td className="px-4 py-3 font-mono text-slate-400">{h.posicao}</td>
                              <td className="px-4 py-3">
                                <div className="font-medium">{h.titulo_curto}</div>
                                <div className="line-clamp-1 text-xs text-slate-400">{h.resumo}</div>
                              </td>
                              <td className="px-4 py-3">
                                {h.tribunal ? (
                                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold">
                                    {h.tribunal}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-400">
                                {h.data_decisao ?? '—'}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => toggleAtivo(h)}
                                  className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                                    h.ativo
                                      ? 'bg-teal-100 text-teal-700 hover:bg-teal-200'
                                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                  }`}
                                >
                                  {h.ativo ? 'ativo' : 'inativo'}
                                </button>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => {
                                    setEditTarget(h)
                                    setMode('edit')
                                  }}
                                  className="mr-2 text-xs text-blue-600 hover:underline"
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() => handleDelete(h)}
                                  className="text-xs text-red-500 hover:underline"
                                >
                                  Remover
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}
