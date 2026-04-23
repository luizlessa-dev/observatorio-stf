import { useLocation } from 'react-router-dom'
import { SEO } from '@/components/shared/SEO'

const CONTENT: Record<string, { title: string; body: string }> = {
  '/sobre': {
    title: 'Sobre o Observatório',
    body: 'O Observatório Judiciário do Brasil é uma infraestrutura pública e independente de dados do Judiciário brasileiro. Reunimos decisões e processos dos principais tribunais superiores — STF, STJ, TST e TCU — além de dados do DataJud/CNJ, de forma auditável e sem opinião política.',
  },
  '/metodologia': {
    title: 'Metodologia',
    body: 'Os dados são coletados automaticamente das APIs públicas dos tribunais e do DataJud (CNJ). A ingestão é feita por Edge Functions que rodam diariamente, validam e normalizam os registros em um schema unificado. Todos os dados são públicos e podem ser verificados nas fontes originais.',
  },
  '/dados-abertos': {
    title: 'Dados Abertos',
    body: 'Todos os dados do Observatório são públicos e podem ser acessados via nossa API REST. A base de dados é atualizada diariamente e está disponível para download em formato CSV e JSON.',
  },
  '/api': {
    title: 'API Pública',
    body: 'A API do Observatório permite consultar processos, decisões e estatísticas de todos os tribunais. A documentação completa está em desenvolvimento.',
  },
  '/privacidade': {
    title: 'Política de Privacidade',
    body: `Última atualização: 23 de abril de 2026.

O Observatório Judiciário do Brasil respeita a sua privacidade e opera em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).

Quais dados coletamos:
• Email (apenas se você se inscrever na newsletter).
• Tribunais de interesse (opcional, para personalizar o conteúdo).
• IP e user-agent no momento da inscrição (para prevenção de fraude/bot).

Para que usamos:
• Envio do Radar Judiciário Semanal às sextas-feiras.
• Estatísticas agregadas e anônimas de uso do site (visitas, páginas mais acessadas).

Com quem compartilhamos: Ninguém. Seu email não é vendido, alugado ou compartilhado com terceiros. Usamos Supabase (banco de dados) e Vercel (hospedagem) como subprocessadores de infraestrutura.

Seus direitos: Você pode, a qualquer momento, solicitar acesso, correção ou exclusão dos seus dados. Cada email enviado tem um link de descadastro em 1 clique.

Contato: Para exercer seus direitos ou tirar dúvidas, envie email para contato@transparenciafederal.org.

Cookies: Não usamos cookies de rastreamento publicitário. Usamos apenas cookies técnicos essenciais para o funcionamento do site.

Dados do Judiciário: Os dados de processos judiciais exibidos no site são públicos e foram obtidos de fontes oficiais (DataJud/CNJ, portais dos tribunais). Nenhum dado pessoal de partes processuais é coletado ou disponibilizado pelo Observatório — apenas metadados processuais (número, classe, relator, data, ementa pública).`,
  },
}

export default function SobrePage() {
  const { pathname } = useLocation()
  const page = CONTENT[pathname] ?? CONTENT['/sobre']

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <SEO title={page.title} description={page.body.slice(0, 160)} path={pathname} />
      <h1 className="text-2xl font-bold tracking-tight">{page.title}</h1>
      <div className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
        {page.body}
      </div>
    </div>
  )
}
