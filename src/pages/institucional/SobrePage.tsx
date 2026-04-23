import { useLocation } from 'react-router-dom'
import { SEO } from '@/components/shared/SEO'

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  )
}

function InfoCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-4 text-sm leading-relaxed text-muted-foreground">
      {children}
    </div>
  )
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs leading-relaxed">
      <code>{children}</code>
    </pre>
  )
}

const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvcmtscXd0cmJsZXJ2aXh4dGFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzOTExMDIsImV4cCI6MjA4Nzk2NzEwMn0.qjrWT8fNMrspgzd6OP0GViAwY1Q5OPXjz7JoW-iPwyI'
const BASE = 'https://corklqwtrblervixxtan.supabase.co/rest/v1'

/* ─── Páginas ──────────────────────────────────────────────────────────────── */

function PageSobre() {
  const stats = [
    { label: 'Decisões indexadas', value: '190.000+' },
    { label: 'Tribunais cobertos', value: '37' },
    { label: 'Atualização', value: 'Diária' },
    { label: 'Acesso', value: 'Gratuito' },
  ]

  const fontes = [
    { tribunal: 'STF', descricao: 'Portal do STF + Scraping HTML das classes processuais' },
    { tribunal: 'STJ', descricao: 'DataJud CNJ — API pública Elasticsearch' },
    { tribunal: 'TST', descricao: 'DataJud CNJ — endpoint dedicado TST' },
    { tribunal: 'TCU', descricao: 'API de Pesquisa Integrada (pesquisa.apps.tcu.gov.br)' },
    { tribunal: 'TRFs 1–6', descricao: 'DataJud CNJ — batches por tribunal' },
    { tribunal: '26 TJs', descricao: 'DataJud CNJ — justiça estadual' },
  ]

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sobre o Observatório</h1>
        <p className="mt-3 text-base text-muted-foreground leading-relaxed max-w-2xl">
          O <strong className="text-foreground">Observatório Judiciário do Brasil</strong> é uma
          infraestrutura independente de dados públicos do Judiciário brasileiro. Reunimos, normalizamos
          e disponibilizamos decisões de 37 tribunais num único lugar — de forma auditável, sem
          opinião política e com acesso gratuito.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border bg-card p-4 text-center">
            <div className="text-2xl font-bold tracking-tight">{s.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <Section title="Missão">
        <InfoCard>
          <p>
            Tornar as decisões do Judiciário brasileiro pesquisáveis, compreensíveis e comparáveis por
            qualquer cidadão — sem precisar navegar por portais institucionais complexos ou pagar por
            serviços de informação jurídica.
          </p>
          <p className="mt-2">
            Não emitimos opiniões sobre decisões judiciais. Somos uma ferramenta de infraestrutura
            de dados, não um veículo editorial.
          </p>
        </InfoCard>
      </Section>

      <Section title="Fontes de dados">
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground">Tribunal</th>
                <th className="px-4 py-2.5 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground">Fonte</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {fontes.map((f) => (
                <tr key={f.tribunal} className="hover:bg-muted/20">
                  <td className="px-4 py-2.5 font-semibold">{f.tribunal}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{f.descricao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Contato">
        <InfoCard>
          Para parcerias, sugestões ou reportar erros nos dados:{' '}
          <a href="mailto:contato@transparenciafederal.org" className="font-medium underline underline-offset-2">
            contato@transparenciafederal.org
          </a>
        </InfoCard>
      </Section>
    </div>
  )
}

function PageMetodologia() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Metodologia</h1>
        <p className="mt-3 text-base text-muted-foreground leading-relaxed max-w-2xl">
          Como os dados são coletados, normalizados e publicados.
        </p>
      </div>

      <Section title="Pipeline de ingestão">
        <InfoCard>
          <ol className="list-decimal list-inside space-y-2">
            <li><strong className="text-foreground">Coleta</strong> — Edge Functions Supabase buscam dados nas APIs públicas (DataJud, TCU, portais) diariamente a partir das 03:00 UTC.</li>
            <li><strong className="text-foreground">Normalização</strong> — Os dados são mapeados para um schema unificado: tribunal, classe, número do processo, relator, órgão julgador, tipo de decisão, data da decisão, tema e ementa.</li>
            <li><strong className="text-foreground">Deduplicação</strong> — Cada registro tem um <code className="rounded bg-muted px-1 text-xs">identificador_externo</code> único por fonte (ex: <code className="rounded bg-muted px-1 text-xs">tst-abc123</code>). Upserts garantem que re-execuções não criam duplicatas.</li>
            <li><strong className="text-foreground">Indexação</strong> — Após a ingestão, a view materializada <code className="rounded bg-muted px-1 text-xs">stats_por_tribunal</code> é atualizada às 05:00 UTC. O índice de busca full-text (tsvector GIN) é gerado automaticamente.</li>
          </ol>
        </InfoCard>
      </Section>

      <Section title="Frequência de atualização">
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground">Fonte</th>
                <th className="px-4 py-2.5 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground">Frequência</th>
                <th className="px-4 py-2.5 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground">Janela</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[
                ['DataJud (34 tribunais)', 'Diária', 'Último mês'],
                ['TCU', 'Mensal', 'Ano corrente'],
                ['STF (classes históricas)', 'Manual', 'Todo o acervo'],
              ].map(([f, freq, janela]) => (
                <tr key={f} className="hover:bg-muted/20">
                  <td className="px-4 py-2.5 font-medium">{f}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{freq}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{janela}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Schema dos dados">
        <InfoCard>
          <p className="mb-3 font-medium text-foreground">Tabela <code className="rounded bg-muted px-1 text-xs font-mono">processos</code></p>
          <div className="grid gap-1 text-xs font-mono">
            {[
              ['id', 'uuid', 'Identificador interno'],
              ['tribunal', 'text', 'Sigla: STF, STJ, TST, TCU, TRF1…'],
              ['classe', 'text', 'Classe processual (HC, RE, RO…)'],
              ['numero_processo', 'text', 'Número no formato do tribunal'],
              ['relator', 'text', 'Nome do relator/ministro'],
              ['orgao_julgador', 'text', 'Câmara, Turma ou Plenário'],
              ['data_decisao', 'date', 'Data da sessão/decisão'],
              ['tema', 'text', 'Assunto ou tema constitucional'],
              ['ementa', 'text', 'Texto completo da ementa'],
              ['link_oficial', 'text', 'URL no portal do tribunal'],
              ['fonte', 'text', 'datajud | pesquisa_tcu | portal_stf'],
            ].map(([col, type, desc]) => (
              <div key={col} className="grid grid-cols-[120px_80px_1fr] gap-2 py-0.5">
                <span className="text-foreground">{col}</span>
                <span className="text-blue-500">{type}</span>
                <span className="text-muted-foreground">{desc}</span>
              </div>
            ))}
          </div>
        </InfoCard>
      </Section>

      <Section title="Limitações conhecidas">
        <InfoCard>
          <ul className="list-disc list-inside space-y-1.5">
            <li>O DataJud disponibiliza decisões com até 30 dias de defasagem em alguns tribunais.</li>
            <li>Ementas longas (acima de 10 KB) são truncadas na ingestão.</li>
            <li>O TCU não está no DataJud — os acórdãos são coletados via API própria, sem ementa completa.</li>
            <li>Processos em segredo de justiça não são disponibilizados nas fontes públicas e, portanto, não estão no Observatório.</li>
          </ul>
        </InfoCard>
      </Section>
    </div>
  )
}

function PageDadosAbertos() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dados Abertos</h1>
        <p className="mt-3 text-base text-muted-foreground leading-relaxed max-w-2xl">
          Todos os dados do Observatório são públicos e acessíveis via API REST sem autenticação.
        </p>
      </div>

      <Section title="Acesso direto via API REST">
        <InfoCard>
          <p className="mb-3">Base URL:</p>
          <CodeBlock>{BASE}</CodeBlock>
          <p className="mt-3">Header obrigatório:</p>
          <CodeBlock>{`apikey: ${ANON_KEY.slice(0, 40)}…`}</CodeBlock>
        </InfoCard>
      </Section>

      <Section title="Endpoints disponíveis">
        <div className="space-y-4">
          {[
            {
              label: 'Listar processos (paginado)',
              url: `${BASE}/processos_publico?tribunal=eq.TCU&order=data_decisao.desc&limit=50`,
            },
            {
              label: 'Estatísticas por tribunal',
              url: `${BASE}/stats_por_tribunal?select=tribunal,total,relatores`,
            },
            {
              label: 'Classes mais frequentes',
              url: `${BASE}/stats_por_classe_tribunal?tribunal=eq.STF&order=total.desc&limit=10`,
            },
            {
              label: 'Relatores de um tribunal',
              url: `${BASE}/stats_por_relator?tribunal=eq.STJ&order=processos.desc&limit=20`,
            },
          ].map((ep) => (
            <div key={ep.label}>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">{ep.label}</p>
              <CodeBlock>{`curl "${ep.url}" \\\n  -H "apikey: ${ANON_KEY.slice(0, 40)}…"`}</CodeBlock>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Termos de uso">
        <InfoCard>
          Os dados são provenientes de fontes públicas oficiais (DataJud/CNJ, portais dos tribunais).
          Você pode usar, redistribuir e criar derivados com a única obrigação de citar a fonte
          original e o Observatório Judiciário do Brasil. Uso para fins comerciais é permitido.
          Proibido violar a privacidade de partes processuais identificáveis.
        </InfoCard>
      </Section>
    </div>
  )
}

function PageApi() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">API Pública</h1>
        <p className="mt-3 text-base text-muted-foreground leading-relaxed max-w-2xl">
          REST API baseada no Supabase PostgREST. Acesso público, sem autenticação, sem rate limit abusivo.
        </p>
      </div>

      <Section title="Autenticação">
        <InfoCard>
          <p className="mb-2">Inclua o header em todas as requisições:</p>
          <CodeBlock>{`apikey: ${ANON_KEY}`}</CodeBlock>
        </InfoCard>
      </Section>

      <Section title="Busca full-text (RPC)">
        <InfoCard>
          <p className="mb-2 text-foreground font-medium">POST /rpc/buscar_processos</p>
          <p className="mb-3 text-xs">Usa índice GIN tsvector. Aceita operadores: <code className="rounded bg-muted px-1">AND</code>, <code className="rounded bg-muted px-1">OR</code>, <code className="rounded bg-muted px-1">-</code> (NOT), <code className="rounded bg-muted px-1">"frase exata"</code></p>
          <CodeBlock>{`curl -X POST "${BASE}/rpc/buscar_processos" \\
  -H "apikey: ${ANON_KEY.slice(0,40)}…" \\
  -H "Content-Type: application/json" \\
  -d '{
    "q": "habeas corpus preventiva",
    "p_tribunal": "STF",
    "p_page": 0,
    "p_page_size": 20
  }'`}</CodeBlock>
          <p className="mt-3 mb-2 text-foreground font-medium text-xs">Parâmetros:</p>
          <div className="grid gap-1 text-xs font-mono">
            {[
              ['q', 'Texto para busca full-text'],
              ['p_tribunal', 'Filtrar por tribunal (ex: STF)'],
              ['p_classe', 'Filtrar por classe (ex: HC)'],
              ['p_relator', 'Filtrar por nome do relator'],
              ['p_data_inicio', 'Data mínima YYYY-MM-DD'],
              ['p_data_fim', 'Data máxima YYYY-MM-DD'],
              ['p_page', 'Página (0-based, default 0)'],
              ['p_page_size', 'Resultados por página (max 200)'],
            ].map(([p, d]) => (
              <div key={p} className="grid grid-cols-[140px_1fr] gap-2 py-0.5">
                <span className="text-foreground">{p}</span>
                <span className="text-muted-foreground">{d}</span>
              </div>
            ))}
          </div>
        </InfoCard>
      </Section>

      <Section title="Filtros REST (PostgREST)">
        <InfoCard>
          <p className="mb-3 text-xs">Use qualquer combinação de filtros na query string:</p>
          <CodeBlock>{`# Processos STF com decisão em 2025
GET /processos_publico?tribunal=eq.STF
  &data_decisao=gte.2025-01-01
  &data_decisao=lte.2025-12-31
  &order=data_decisao.desc
  &limit=100&offset=0

# Relator específico
GET /processos_publico?relator=ilike.*Alexandre*
  &tribunal=eq.STF&limit=50

# Contar total por tribunal
GET /stats_por_tribunal?select=tribunal,total
  &order=total.desc`}</CodeBlock>
        </InfoCard>
      </Section>

      <Section title="Limites">
        <InfoCard>
          <ul className="list-disc list-inside space-y-1.5">
            <li>Máximo de 1.000 registros por requisição (use <code className="rounded bg-muted px-1 text-xs">limit</code> e <code className="rounded bg-muted px-1 text-xs">offset</code> para paginar).</li>
            <li>Sem autenticação não há acesso a dados sensíveis (a view <code className="rounded bg-muted px-1 text-xs">processos_publico</code> omite campos internos).</li>
            <li>Rate limit: padrão Supabase Free Tier (500 req/s por projeto).</li>
          </ul>
        </InfoCard>
      </Section>
    </div>
  )
}

function PagePrivacidade() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Política de Privacidade</h1>
        <p className="mt-2 text-xs text-muted-foreground">Última atualização: 23 de abril de 2026</p>
      </div>

      {[
        {
          title: 'Quais dados coletamos',
          body: 'Email (apenas se você se inscrever na newsletter). Tribunais de interesse (opcional, para personalizar o conteúdo). IP e user-agent no momento da inscrição (prevenção de bot/spam).',
        },
        {
          title: 'Para que usamos',
          body: 'Envio do Radar Judiciário Semanal às sextas-feiras. Estatísticas agregadas e anônimas de uso do site via Google Analytics (sem identificação individual).',
        },
        {
          title: 'Com quem compartilhamos',
          body: 'Ninguém. Seu email não é vendido, alugado ou compartilhado com terceiros. Supabase (banco de dados) e Vercel (hospedagem) atuam como subprocessadores de infraestrutura.',
        },
        {
          title: 'Seus direitos (LGPD)',
          body: 'Você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento. Cada email enviado contém um link de descadastro em 1 clique. Contato: contato@transparenciafederal.org',
        },
        {
          title: 'Cookies',
          body: 'Não usamos cookies de rastreamento publicitário. Usamos Google Analytics com anonimização de IP para entender uso agregado do site.',
        },
        {
          title: 'Dados do Judiciário',
          body: 'Os dados de processos exibidos no site são públicos e foram obtidos de fontes oficiais (DataJud/CNJ, portais dos tribunais). Nenhum dado pessoal de partes processuais é coletado pelo Observatório — apenas metadados processuais públicos (número, classe, relator, data, ementa pública).',
        },
      ].map((s) => (
        <Section key={s.title} title={s.title}>
          <InfoCard>{s.body}</InfoCard>
        </Section>
      ))}
    </div>
  )
}

/* ─── Router ───────────────────────────────────────────────────────────────── */

const PAGES: Record<string, { component: React.FC; title: string; description: string }> = {
  '/sobre': {
    component: PageSobre,
    title: 'Sobre o Observatório Judiciário',
    description: 'O Observatório Judiciário do Brasil reúne 190 mil+ decisões de 37 tribunais numa infraestrutura pública, auditável e gratuita.',
  },
  '/metodologia': {
    component: PageMetodologia,
    title: 'Metodologia — Observatório Judiciário',
    description: 'Como os dados são coletados, normalizados e publicados: pipeline de ingestão, frequência de atualização e schema.',
  },
  '/dados-abertos': {
    component: PageDadosAbertos,
    title: 'Dados Abertos — Observatório Judiciário',
    description: 'Acesse gratuitamente 190 mil+ decisões judiciais via API REST pública sem autenticação.',
  },
  '/api': {
    component: PageApi,
    title: 'API Pública — Observatório Judiciário',
    description: 'Documentação da API REST pública do Observatório: busca full-text, filtros, paginação e exemplos de uso.',
  },
  '/privacidade': {
    component: PagePrivacidade,
    title: 'Política de Privacidade — Observatório Judiciário',
    description: 'Política de privacidade e proteção de dados do Observatório Judiciário do Brasil (LGPD).',
  },
}

export default function SobrePage() {
  const { pathname } = useLocation()
  const page = PAGES[pathname] ?? PAGES['/sobre']
  const Content = page.component

  return (
    <div className="mx-auto max-w-3xl">
      <SEO title={page.title} description={page.description} path={pathname} />
      <Content />
    </div>
  )
}
