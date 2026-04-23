import { Link } from 'react-router-dom'
import { SEO } from '@/components/shared/SEO'
import { TRIBUNAIS_SUPERIORES } from '@/lib/tribunais'

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 py-12 text-center">
      <SEO
        title="Página não encontrada"
        description="A página que você procura não existe. Navegue pelos tribunais superiores ou faça uma busca."
        path="/404"
      />

      <div className="space-y-3">
        <div className="text-8xl font-bold tracking-tighter text-muted-foreground/40">
          404
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Página não encontrada</h1>
        <p className="text-sm text-muted-foreground">
          O endereço que você acessou não existe ou foi removido.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap justify-center gap-2">
          <Link
            to="/"
            className="rounded-md bg-navy-800 px-4 py-2 text-sm font-medium text-white no-underline hover:bg-navy-700"
          >
            ← Voltar ao início
          </Link>
          <Link
            to="/busca"
            className="rounded-md border px-4 py-2 text-sm font-medium no-underline hover:bg-muted"
          >
            Buscar processos
          </Link>
        </div>

        <div className="pt-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Ou acesse um tribunal superior
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {TRIBUNAIS_SUPERIORES.map((t) => (
              <Link
                key={t.id}
                to={t.path}
                className="rounded-md border px-3 py-1.5 text-xs font-semibold no-underline hover:bg-muted"
                style={{ color: t.cor }}
              >
                {t.nome}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
