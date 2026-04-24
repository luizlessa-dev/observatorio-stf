# Auditoria de SEO — Observatório Judiciário do Brasil
**URL principal:** https://judiciario.transparenciafederal.org  |  **Domínio legado:** observatoriodostf.org  |  **Data:** 2026-04-23

---

## Nota de SEO: 58/100

**Diagnóstico em duas linhas:** O site tem estrutura técnica decente e schema bem intencionado, mas dois bugs críticos estão destruindo o rastreamento e a indexação — canonical duplicado em todas as páginas internas (index.html estático + Helmet) e o Google Analytics com ID inválido (variável de ambiente mal configurada no Vercel). Corrigir esses dois itens esta semana recupera ranking, dados de analytics e provavelmente 30–40 pontos na nota.

---

## Dimension Scores

| # | Dimensão | Nota | Problema |
|---|---|---|---|
| 1 | **Title tags** | 7/10 | Títulos únicos e descritivos por página ✓, mas fallback no index.html desatualizado (180k/36) |
| 2 | **Meta description** | 2/10 | **DUPLICADA em toda página** — index.html injeta a genérica + Helmet injeta a específica. Google vê as duas |
| 3 | **Canonical** | 1/10 | **BUG CRÍTICO** — index.html tem canonical estático `/` que aparece ANTES do canonical do Helmet em todas as páginas internas |
| 4 | **Hierarquia H1/H2** | 7/10 | H1 único por página ✓, H2s descritivos ✓, falta H2 na página STF dashboard |
| 5 | **Schema / JSON-LD** | 6/10 | Organization + WebSite + SearchAction ✓, LegalCase nos processos ✓, mas números desatualizados e faltam Breadcrumb + FAQ |
| 6 | **Robots / Sitemap** | 5/10 | Robots.txt presente ✓, sitemap com 156 URLs ✓, mas faltam /temas e /ministro/:slug, e bots de IA não explicitados |
| 7 | **E-E-A-T** | 3/10 | Sem autor nomeado, sem CNPJ, sem bio institucional, sem citações na imprensa, sem redes sociais |
| 8 | **Google Analytics** | 0/10 | **QUEBRADO** — ID configurado como `VITE_GA_MEASUREMENT_ID = G-LDFHW70DFH` em vez de só `G-LDFHW70DFH` |
| 9 | **Core Web Vitals** | N/A | React SPA com lazy loading ✓. Verificar PageSpeed Insights mobile — TTFB comum em Vercel BR é ≤200ms, LCP depende de hero image |
| 10 | **Prontidão GEO** | 2/10 | Sem llms.txt, sem bots IA no robots.txt, conteúdo factual denso ✓ mas sem estrutura de passagem respondível |

---

## Bugs Críticos (corrigir hoje)

### 🔴 BUG 1 — Canonical duplicado em todas as páginas internas

**O que está acontecendo:**
```html
<!-- index.html (estático, sempre carrega primeiro) -->
<link rel="canonical" href="https://judiciario.transparenciafederal.org/" />

<!-- SEO.tsx via react-helmet-async (adiciona um segundo, não remove o primeiro) -->
<link rel="canonical" href="https://judiciario.transparenciafederal.org/stf/processos" />
```

**Impacto:** Google vê dois canonicals, respeita o primeiro (homepage). Resultado: todas as páginas internas sinalizam para o Google que sua versão "oficial" é a homepage. Todo link equity e ranking de página interna drena para `/`.

**Verificação no browser:** `/stf/processos` retorna dois canonicals:
1. `https://judiciario.transparenciafederal.org/` ← homepage (errado)
2. `https://judiciario.transparenciafederal.org/stf/processos` ← correto, mas vem depois

**Fix imediato — remover de `index.html`:**
```diff
-   <link rel="canonical" href="https://judiciario.transparenciafederal.org/" />
```
Deixar o `SEO.tsx` (Helmet) controlar o canonical por página. A homepage já passa `path="/"` para o componente.

**Mesmo problema com `<meta name="description">`** — index.html injeta a genérica, Helmet injeta a específica. Remover a do index.html também.

---

### 🔴 BUG 2 — Google Analytics com ID inválido

**O que está acontecendo:**
```
Script src: https://www.googletagmanager.com/gtag/js?id=VITE_GA_MEASUREMENT_ID%20=%20G-LDFHW70DFH
```
O valor da variável de ambiente no Vercel foi configurado como:
```
VITE_GA_MEASUREMENT_ID = G-LDFHW70DFH   ← ERRADO (incluiu o nome da var + espaços)
```
Em vez de:
```
G-LDFHW70DFH   ← CORRETO
```

**Impacto:** GA não registra nenhum evento. Dados de analytics perdidos desde o deploy.

**Fix:** Acessar o Vercel Dashboard → Settings → Environment Variables → editar `VITE_GA_MEASUREMENT_ID` e colocar apenas o valor `G-LDFHW70DFH`. Fazer redeploy.

---

## On-page

### Title tags

| Página | Title atual | Chars | Avaliação |
|---|---|---|---|
| Homepage | `Pesquise decisões do Judiciário brasileiro — Observatório Judiciário do Brasil` | 78 | ⚠️ Longo (>60 chars) — Google vai truncar |
| /stf | `Supremo Tribunal Federal — Observatório Judiciário do Brasil` | 60 | ✅ OK |
| /stf/processos | `Processos — STF — Observatório Judiciário do Brasil` | 51 | ✅ OK |
| /busca | `Busca de Processos — Observatório Judiciário do Brasil` | 54 | ✅ OK |
| /sobre | `Sobre o Observatório Judiciário — Observatório Judiciário do Brasil` | 66 | ⚠️ Longo |
| Fallback (index.html) | `Observatório Judiciário do Brasil — 180.000+ decisões de 36 tribunais` | 69 | ❌ Desatualizado (180k/36) |

**Recomendação homepage:**
```
Antes: "Pesquise decisões do Judiciário brasileiro — Observatório Judiciário do Brasil"
Depois: "200 mil decisões judiciais — Observatório do Judiciário Brasil"
         ↑ 52 chars, palavra-chave à esquerda, número concreto
```

### Meta Description

**Situação atual:** Meta description genérica em TODAS as páginas (porque o bug do duplicado faz o Google ler a do index.html). A do /busca, /sobre e /tribunal são específicas no Helmet, mas a do index.html vem antes e é a que o Google considera.

Após corrigir o bug do canonical (remover meta desc do index.html), cada página terá a sua própria:

| Página | Meta atual (Helmet) | Avaliação |
|---|---|---|
| /stf/processos | "Lista completa de processos do Supremo Tribunal Federal. Pesquise por ementa, tema ou número." | ✅ Boa |
| /busca | (usa fallback genérico) | ⚠️ Sem meta específica no SEO component |
| /sobre | (usa fallback genérico) | ❌ Sem meta específica |

### Hierarquia de Headings

**Homepage:**
- H1: "O maior acervo aberto de decisões judiciais do Brasil" ✅
- H2: "Destaques da semana", "Tribunais Superiores", "Para quem é o Observatório", "Justiça Federal", "Justiça Estadual", "Decisões recentes" ✅

**STF Dashboard:**
- H1: "Supremo Tribunal Federal" ✅
- H2: apenas "Decisões recentes" ⚠️ — faltam H2s para as seções de gráficos

**/sobre:**
- H1: "Sobre o Observatório" ✅
- H2: "Missão", "Fontes de dados", "Contato" ✅

### Linking interno

A estrutura de navegação é boa, mas faltam:
- Links cruzados entre tribunais relacionados (ex: "Ver também: STJ" no dashboard do STF)
- Links da /busca para páginas de tribunal popular
- Links internos nas ementas dos processos para relatores (/stf/ministro/slug)

---

## SEO Técnico

| Checagem | Status | Nota |
|---|---|---|
| HTTPS | ✅ Certificado válido em ambos os domínios | OK |
| robots.txt | ✅ Presente, referencia sitemap, não bloqueia CSS/JS | OK |
| Sitemap | ⚠️ 156 URLs, mas faltam /temas e /ministro/:slug | Parcial |
| Canonical | ❌ Duplicado em todas as páginas internas | Falha crítica |
| Meta viewport | ✅ Presente | OK |
| Google Search Console | ✅ Verification meta tag no head | OK |
| lang="pt-BR" | ✅ no `<html>` | OK |
| Organization schema | ✅ Presente mas com números desatualizados | Parcial |
| WebSite + SearchAction | ✅ Presente, urlTemplate correto | OK |
| LegalCase (processo detalhe) | ✅ Implementado | OK |
| Breadcrumb schema | ❌ Ausente em todas as páginas internas | Falha |
| Redirect observatoriodostf.org | ⚠️ 308 para /stf (link equity preservado, mas /robots.txt e /sitemap.xml também redirecionam para /stf — crawlers não chegam ao sitemap pelo domínio antigo) | Parcial |
| Google Analytics | ❌ ID inválido no Vercel | Falha crítica |
| AI bot crawlers | ❌ robots.txt não menciona GPTBot, ClaudeBot, PerplexityBot | Ausente |
| llms.txt | ❌ Ausente | Ausente |
| favicon | ✅ SVG com fallback | OK |
| og:image | ✅ 1200×630 com alt text | OK |

---

## E-E-A-T: 3/10

| Dimensão | Nota | Evidência |
|---|---|---|
| **Experiência** | 2/10 | Plataforma tem dados reais e atualizados diariamente — mas não há nenhuma demonstração de "quem usa e como". Sem casos de uso, prints de pesquisa real, depoimentos |
| **Expertise** | 4/10 | A tabela de fontes de dados (STF → portal scraping, STJ/TST/TRFs → DataJud, TCU → API) demonstra conhecimento técnico. Mas está escondida em /sobre que ninguém acha |
| **Autoritatividade** | 1/10 | Sem menção na imprensa, sem citações externas, sem parceiros institucionais listados, sem perfil no Wikipedia |
| **Confiabilidade** | 4/10 | HTTPS ✓, Política de Privacidade linkada ✓, email de contato ✓. Falta: CNPJ, autor nomeado, endereço físico (ou declaração de ser online), data de fundação |

**O problema central de E-E-A-T:** A página /sobre não tem NENHUM sinal de autor. Google trata sites jurídicos como YMYL (Your Money or Your Life) — quem diz isso tem impacto direto no ranking. Um parágrafo "Criado por [Nome], advogado/jornalista/developer com X anos de..." com link para LinkedIn muda radicalmente a percepção do Google.

---

## Prontidão GEO (Busca Generativa): 2/10

**O que está funcionando:**
- Conteúdo factual denso (números, datas, nomes de relatores, classes processuais)
- Schema Organization + WebSite com SearchAction

**O que está faltando:**

1. **llms.txt ausente** — Perplexity, ChatGPT e outros LLMs com browse procuram `/llms.txt` para entender o que o site oferece. Criar em `/public/llms.txt`:
```
# Observatório Judiciário do Brasil
> Plataforma pública com 200.000+ decisões de 37 tribunais brasileiros (STF, STJ, TST, TCU, TRFs, TJs).

## O que temos
- Decisões do STF, STJ, TST, TCU e 33 tribunais estaduais e federais
- Busca full-text em português com filtros por relator, classe e data
- Dados atualizados diariamente via DataJud/CNJ e APIs públicas
- Exportação CSV gratuita

## Onde buscar
- Busca geral: https://judiciario.transparenciafederal.org/busca
- Por tribunal: https://judiciario.transparenciafederal.org/stf
- Sobre os dados: https://judiciario.transparenciafederal.org/sobre
```

2. **robots.txt não permite crawlers de IA** — adicionar explicitamente:
```
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: CCBot
Allow: /
```

3. **FAQ schema ausente** — a seção "Para quem é o Observatório" da homepage tem perguntas implícitas ("Jurisprudência em segundos", "Dados abertos e auditáveis", "Entenda o Judiciário"). Transformar em FAQPage JSON-LD dá elegibilidade para AI Overviews:
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "O que é o Observatório Judiciário do Brasil?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Plataforma pública e gratuita com mais de 200.000 decisões judiciais de 37 tribunais brasileiros, incluindo STF, STJ, TST, TCU e todos os TRFs e TJs. Os dados são atualizados diariamente via DataJud/CNJ e APIs públicas."
      }
    },
    {
      "@type": "Question",
      "name": "Como pesquisar jurisprudência nos tribunais brasileiros?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Acesse a busca em judiciario.transparenciafederal.org/busca e filtre por ementa, relator, classe processual ou tribunal. É gratuito e sem cadastro."
      }
    },
    {
      "@type": "Question",
      "name": "Quais tribunais estão cobertos?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "STF, STJ, TST, TCU, TRF1, TRF2, TRF3, TRF4, TRF5, TRF6 e 27 Tribunais de Justiça estaduais — 37 tribunais no total."
      }
    }
  ]
}
```

4. **Passagens respondíveis** — o Google AI Overviews extrai parágrafos de 40–80 palavras que respondem perguntas diretamente. A /sobre tem o parágrafo certo mas enterrado. Criar uma seção na homepage ou /sobre com H2 em formato de pergunta + resposta imediata abaixo.

---

## Análise de Palavras-chave

**Palavras-chave primárias presumidas:**
- "jurisprudência STF" (alta concorrência, alta intenção informacional)
- "decisões STF" 
- "pesquisa jurisprudência"
- "processos STF" / "processos STJ"

**Auditoria de colocação (homepage):**
| Elemento | Contém KW? |
|---|---|
| Title | ✅ "Judiciário brasileiro", "decisões" |
| H1 | ✅ "decisões judiciais do Brasil" |
| Primeiras 100 palavras | ✅ "204.986 decisões · 37 tribunais" |
| URL | ✅ judiciario.transparenciafederal.org |
| Meta description | ✅ "decisões judiciais", "processos" |

**Gap de oportunidade:**
- `"jurisprudência grátis"` — intenção transacional, site oferece mas não menciona "grátis" na homepage
- `"STF decisões recentes"` — página /stf tem isso mas sem SEO title específico
- `"pesquisar processos judiciais"` — /busca tem H1 fraco ("Busca")

---

## Correções Priorizadas

### 🔴 Crítico (esta semana)

1. **Remover canonical e meta description estáticos de `index.html`**
   - Fix: deletar as duas linhas de `index.html`
   - Esperado: cada página interna terá canonical único correto, Google reindexará em 1–4 semanas
   - Impacto: pode recuperar ranking de dezenas de páginas internas

2. **Corrigir `VITE_GA_MEASUREMENT_ID` no Vercel**
   - Fix: Vercel Dashboard → Environment Variables → valor `G-LDFHW70DFH` (só o ID)
   - Esperado: analytics começa a registrar imediatamente após redeploy
   - Impacto: dados de tráfego voltam, funil de conversão mensurável

3. **Atualizar números estáticos no `index.html` e schemas**
   - `index.html` title fallback: "180.000+ de 36 tribunais" → "200.000+ de 37 tribunais"
   - Organization schema `description`: "186 mil decisões judiciais de 36 tribunais" → "200 mil decisões de 37 tribunais"
   - Impacto: consistência de dados, eliminação de sinal de conteúdo desatualizado

### 🟠 Alto (este mês)

4. **Criar `public/llms.txt`**
   - Fix: arquivo estático no formato acima
   - Esperado: elegibilidade para citação em Perplexity, ChatGPT, Gemini

5. **Atualizar `robots.txt` para permitir bots de IA**
   - Fix: adicionar User-agent blocks para GPTBot, ClaudeBot, PerplexityBot, Google-Extended
   - Esperado: crawlers de IA incluem o site em suas bases de indexação

6. **Adicionar FAQPage JSON-LD na homepage**
   - Fix: JSON-LD com 3–5 perguntas + respostas densas sobre o que o site faz
   - Esperado: elegível para AI Overviews + rich results de FAQ

7. **Adicionar BreadcrumbList schema nas páginas internas**
   - Fix: em TribunalDashboard, TribunalProcessos, ProcessoDetalhe, adicionar `BreadcrumbList` ao JSON-LD via Helmet
   - Esperado: rich snippets com breadcrumb no SERP

8. **Melhorar H1 de /busca**
   - Atual: "Busca" (2 chars de KW sem contexto)
   - Proposto: "Pesquisa de Jurisprudência — 37 Tribunais"
   - Impacto: melhor ranking para "pesquisar jurisprudência"

9. **Adicionar /temas e /ministro/:slug ao sitemap**
   - Fix: expandir `api/sitemap.ts` para incluir as rotas /temas por tribunal e páginas de ministro por slug
   - Esperado: Googlebot descobre e indexa centenas de páginas novas

### 🟡 Médio (este trimestre)

10. **Adicionar E-E-A-T à página /sobre**
    - Incluir: nome do criador com link para LinkedIn/GitHub/Twitter
    - Incluir: data de criação ("em operação desde [mês/ano]")
    - Incluir: email de contato explícito e, se aplicável, CNPJ
    - Incluir: metodologia de coleta em formato de artigo com `datePublished` em JSON-LD
    - Impacto: sinal de confiabilidade para Google (site YMYL-adjacente)

11. **Corrigir title da homepage para <60 chars**
    - Atual: "Pesquise decisões do Judiciário brasileiro — Observatório Judiciário do Brasil" (78 chars)
    - Proposto: "200 mil decisões judiciais — Observatório Judiciário Brasil" (59 chars)

12. **Adicionar `twitter:site` e `twitter:creator` às meta tags**
    - Fix: em SEO.tsx adicionar `<meta name="twitter:site" content="@handle" />`

13. **Links cruzados entre tribunais relacionados**
    - Ex: no dashboard do STF, adicionar "Veja também → STJ | TST | TCU"
    - Impacto: distribui PageRank internamente, reduz páginas órfãs

14. **Criar seção editorial com passagens GEO-ready**
    - Uma seção na homepage (ou blog) com H2 em formato de pergunta + resposta de 60 palavras
    - Ex: "Como funciona o DataJud?" → resposta factual de 60 palavras
    - Impacto: visibilidade em AI Overviews no Google Brasil

---

## Hero Rewrite (Homepage H1 + Subhead)

**Atual:**
> **O maior acervo aberto de decisões judiciais do Brasil**
> 204.986 decisões · 37 tribunais · 487 relatores · atualizado diariamente

**Proposto:**
> **Pesquise 200 mil decisões judiciais de 37 tribunais**
> STF, STJ, TST, TCU, TRFs e todos os TJs — gratuito, atualizado diariamente, sem cadastro.

**Por que:** A versão proposta coloca a KW primária ("decisões judiciais") + número concreto + quantidade de tribunais no H1. O subhead lista os tribunais explicitamente (KWs secundárias de alta busca) e adiciona "gratuito" + "sem cadastro" como diferencial que aumenta CTR.

---

## Resumo do Plano de Ação

```
Semana 1:  Corrigir canonical + meta description duplicados em index.html  [BUG 1]
           Corrigir GA no Vercel                                            [BUG 2]
           Atualizar números em index.html e schemas

Semana 2:  Criar llms.txt
           Atualizar robots.txt para bots de IA
           Adicionar FAQPage JSON-LD na homepage

Mês 1:     Adicionar BreadcrumbList nas páginas internas
           Expandir sitemap com /temas e /ministro/:slug
           Melhorar H1 de /busca

Trimestre: Refazer /sobre com E-E-A-T completo
           Rewrite do hero da homepage
           Links cruzados entre tribunais
```
