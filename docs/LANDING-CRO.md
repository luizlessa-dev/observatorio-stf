# Landing Page CRO — Observatório Judiciário do Brasil

**URL:** https://judiciario.transparenciafederal.org/
**Goal da página:** Dupla intenção — (1) iniciar busca no acervo de processos (ativação) e (2) capturar email via newsletter (lead). Secundário: impressões de AdSense (quando ativado).
**Data:** 2026-04-23

---

## Conversion Score: **38 / 100**

**Diagnóstico em 2 frases:**

O maior vazamento é o **hero genérico sem proposta de valor**: "Painel Geral / Visão unificada do Judiciário brasileiro" não responde *quem é você*, *para quem serve* nem *o que fazer agora* — o visitante cai numa grade de 37 cards e precisa decidir sozinho por onde começar. O maior *quick win* é **substituir o H1 por uma promessa de busca** + **colocar a barra de busca global acima da fold**, transformando a HomePage de "índice institucional" em "ferramenta que entrega valor em 5 segundos".

---

## Dimension Scores

| # | Dimensão | Score | Finding |
|---|---|---|---|
| 1 | **Hero clarity** | 2/10 | Atual: `"Painel Geral" / "Visão unificada do Judiciário brasileiro"`. Não diz o que o usuário pode FAZER. Nenhum CTA. Nenhuma dica de audiência (advogado? jornalista? concurseiro?). |
| 2 | **Value proposition** | 3/10 | Único sinal de valor são os stats cards ("186.285 processos"), mas sem contexto: isso é bom? é grande? é atualizado? A promessa "Plataforma pública e independente" aparece só no meta description — invisível para o usuário. |
| 3 | **Primary CTA** | 1/10 | **Não existe CTA primário.** Os cards de tribunal funcionam como 37 mini-CTAs competindo. A barra de busca está escondida dentro de `/busca`, exigindo 1 clique extra. |
| 4 | **Secondary paths** | 5/10 | Navegação clara (STF, STJ, TST, TCU, Busca). Tribunais agrupados por categoria — bom. Mas tudo é "secundário" porque não há primário. |
| 5 | **Social proof** | 0/10 | **Zero.** Sem logos ("citado por Jota, Folha..."), sem depoimentos, sem contagem de usuários, sem "já usado por N advogados". Nem sequer um "atualizado hoje às X" visível. |
| 6 | **Objection handling** | 1/10 | Respostas para "os dados são confiáveis?", "é pago?", "com que frequência atualiza?" estão escondidas em `/sobre` e `/metodologia`. Para um domínio sensível (Justiça), isso é crítico. |
| 7 | **Form friction** | 6/10 | NewsletterForm é enxuta (só email), validação HTML nativa, UX razoável. Mas está lá embaixo, sem hook forte. Falta seleção de tribunais de interesse (dá personalização e reduz unsubscribe). |
| 8 | **Trust architecture** | 5/10 | HTTPS ✓, manifest ✓, favicon ✓, meta tags Schema.org ✓. Mas **não há link para política de privacidade**, nem explicação de LGPD na captura de email, nem identidade ("quem mantém isso?"). |
| 9 | **Urgency / scarcity** | 3/10 | Sutil: "Decisões recentes" gera alguma sensação de tempo-real. Mas falta timestamp explícito ("última sincronização: há 2h") e nenhum alerta de conteúdo novo. |
| 10 | **Visual hierarchy** | 4/10 | Fluxo quebra no meio: stats → cards → ad → cards → tabela → newsletter. Olho não sabe onde parar. Sem separadores visuais fortes entre blocos. A seção de tribunais estaduais (27 cards) domina a página e enterra a newsletter. |

---

## Priority Grid

```
High impact │ QUICK WINS                    │ MAJOR PROJECTS
            │ #1 Rewrite hero               │ #A Dashboard inicial com
            │ #2 Busca global acima fold    │    highlights automáticos
            │ #3 CTA dominante              │ #B Relatórios semanais
            │ #4 Social proof leve          │    automatizados (base
            │    ("atualizado há 2h")       │    para converter newsletter)
            ├───────────────────────────────┼───────────────────────────────
Low impact  │ FILL-INS                      │ SKIP
            │ • Política de privacidade     │ • Countdown timers
            │ • Timestamp de sync visível   │ • Chatbots
            │ • Link "Como citar"           │
            └───────────────────────────────┴───────────────────────────────
              Low effort                     High effort
```

### Quick Wins (high impact, low effort) — fazer esta semana

1. **Reescrever o hero** (ver seção "Hero Rewrite" abaixo).
   Atual: `"Painel Geral"` → Proposto: `"Pesquise 186 mil decisões do Judiciário brasileiro"`.
   **Lift esperado:** +40% de bounce rate reduzido (usuário entende em 3s o que o site faz).

2. **Mover a busca global para o hero** — campo de texto grande, foco automático, atalhos visíveis.
   Hoje exige 1 clique (ir para `/busca`). Coloque `<input>` no topo com placeholder do tipo *"Busque por ementa, relator ou número do processo…"*.
   **Lift esperado:** +60% de searches iniciadas. É a ação mais valiosa da home.

3. **Timestamp de última atualização visível** — "Última sincronização: há X horas" perto dos stats.
   Cria trust e urgência. Dado já existe na tabela (max(`data_coleta`)).
   **Lift esperado:** redução de 15-25% em "é atualizado?" (eliminável com 1 frase).

4. **Contexto nos stats** — em vez de só "186.285 Processos", escrever:
   `"186.285 decisões · 36 tribunais · 465 relatores · atualizado diariamente"`
   Vira sentença legível, gera credibilidade imediata.
   **Lift esperado:** +20% de scroll depth.

5. **Seletor de tribunais na newsletter** — checkboxes para escolher (STF, STJ…). Já há suporte no backend (`tribunais_preferidos`).
   Aumenta intent e reduz unsubscribe futuro.
   **Lift esperado:** +30% de conversão newsletter.

6. **Link "Política de Privacidade" abaixo da newsletter** — LGPD exige. Também destrava confiança.
   **Lift esperado:** +10% newsletter (confiança).

7. **Reduzir a primeira dobra de tribunais estaduais** — colapsar os 27 TJs em um `<details>` "Ver todos os 27 TJs" ou em accordion. Atualmente eles empurram todo o conteúdo importante para baixo.
   **Lift esperado:** +25% scroll até newsletter.

### Major Projects (high impact, high effort) — planejar para este mês

1. **Editor de highlights na home** — em vez de "Decisões recentes" genérico, curar manualmente (ou semi-auto via IA) as 3-5 decisões mais relevantes da semana com resumo em 1 linha.
   É o que Jota e Migalhas fazem. Transforma a home de "diretório" em "edição diária".

2. **Relatórios semanais automatizados por email** — base técnica do newsletter. Resumo de N decisões por categoria (consumidor, tributário, penal) com link de volta ao site. Cria ciclo de retenção e justifica a newsletter.

3. **Seção "Para quem é"** — 3 cards segmentados: Advogado, Jornalista/Pesquisador, Concurseiro/Estudante. Cada um com o caso de uso e um CTA específico.

### Fill-ins (low impact, low effort)

1. Rodapé com link "Como citar este observatório" (academia).
2. Badge "Projeto independente" no header (diferencia de sites governamentais).
3. Meta tag `og:image` (hoje ausente — compartilhamento social fica genérico).

---

## Hero Rewrite

**Atual:**

```
[Painel Geral]
Visão unificada do Judiciário brasileiro

┌──────────┬──────────┬──────────┬──────────┐
│Processos │Com decis.│Tribunais │ Classes  │
│ 186.285  │  10.936  │    36    │   X      │
└──────────┴──────────┴──────────┴──────────┘
```

Sem CTA. Sem busca. Sem proposta de valor direta.

**Proposto:**

```
O maior acervo aberto de decisões judiciais do Brasil
186.285 decisões · 36 tribunais · 465 relatores · atualizado diariamente

┌─────────────────────────────────────────────────┐
│ 🔍 Busque por ementa, relator, número...    [▶] │
└─────────────────────────────────────────────────┘

Populares: STF · STJ · TST · TRF3 · TJSP
```

**Por que muda melhor:**

- **H1 com número concreto** ("186 mil") + **superlativo verificável** ("maior acervo aberto") responde "o que é" em <2 segundos
- **Subhead vira uma linha com quatro provas sociais densas** (quantidade × diversidade × autoridade × frescor)
- **Barra de busca é o CTA primário** — a ação mais valiosa do produto está disponível sem clique
- **Tags populares funcionam como CTAs secundários** e revelam profundidade (não é só "superiores")
- Remove os 4 stat cards separados (fragmentam atenção) — consolidam numa única linha

---

## CTA Audit

| CTA | Localização | Texto atual | Texto proposto | Razão |
|-----|-------------|-------------|----------------|-------|
| **Primário (faltando)** | Hero | — | `[Campo de busca com botão "Buscar"]` | Transforma a home numa ferramenta, não num diretório |
| Cards de tribunal | Grade principal | `"STF / Supremo Tribunal Federal / 6.993 processos"` | `"STF — 6.993 decisões · 142 relatores"` | Adiciona métrica secundária que revela profundidade |
| Newsletter | Seção "Receba atualizações" | `"Inscrever"` | `"Receber resumo semanal"` | Promete frequência concreta (reduz ansiedade de "spam") |
| Header nav | Top | `"Busca"` | `"Buscar processos"` | Ação explícita em vez de substantivo |
| Stat cards | Abaixo do hero | (não clicáveis) | Transformar em links: "Processos" → `/busca`, "Tribunais" → `#tribunais` | Torna cada número uma porta de entrada |

---

## Social Proof Gap

**Presente hoje:** número de processos (186.285) e tribunais (36). É quantitativo e respeitável — **não desperdice esse ativo enterrando-o**.

**Ausente:**

1. **Menção na imprensa** — se o site for citado por Jota, Conjur, Migalhas, Folha, adicionar strip de logos: *"Citado por:"*
2. **Endosso acadêmico/institucional** — FGV Direito, IBCCRIM, seccionais OAB... mesmo um único depoimento muda o percebido.
3. **Contagem de uso** — "Usado por +5.000 profissionais" (quando houver). Até lá, trocar por "X buscas realizadas nas últimas 24h" (métrica técnica = prova).
4. **Frescor explícito** — "Última decisão sincronizada: 17/04/2026 às 14:32". É *trust* barato e automatizado.
5. **Identidade do mantenedor** — quem está por trás? Foto + bio curta do fundador no `/sobre` com link no footer. Para um produto de transparência, isso *é* prova social.

**Prioridade:** implementar #4 e #5 agora (custo zero), #3 quando tiver GA/analytics rodando, #1 e #2 com pitch ativo pra jornalistas.

---

## Form Friction (Newsletter)

| Campo | Tipo | Avaliação | Ação |
|-------|------|-----------|------|
| Email | obrigatório | ✅ OK | Manter |
| (Nome) | — | ✅ não pediu | Manter ausência |
| (Telefone) | — | ✅ não pediu | Manter ausência |
| Tribunais preferidos | **faltando** | ❌ | **Adicionar** checkboxes opcionais (STF, STJ, TST, "Tribunais federais", "TJ do meu estado"). Backend já suporta. |

**Outros atritos:**

- **Sem preview de benefício** — dizer *"Enviamos 1 email/semana, toda sexta às 10h"* reduz ansiedade.
- **Sem link para amostra** — adicionar *"Ver edição anterior"* quando tiver histórico.
- **Sem menção LGPD/unsubscribe** — adicionar: *"Descadastro em 1 clique. Não compartilhamos seu email."*
- **Copy do título "Receba atualizações" é fraco** — trocar por *"Radar Judiciário Semanal"* (produto nomeado > descrição genérica).

---

## A/B Test Recommendations

Assumindo baseline de **conversão para busca ≈ 15%** (visitante → ao menos 1 busca) e **newsletter ≈ 1,5%** (visitante → email capturado).

### Teste 1 — Hero com busca global (maior impacto esperado)

- **Hipótese:** colocar a barra de busca no hero vai aumentar ativação (busca iniciada) de 15% → 30%.
- **Variante:** hero com `<input>` grande + placeholder específico + tags de tribunais populares abaixo.
- **Métrica primária:** % de sessões com ≥1 busca executada.
- **Sample size mínimo:** ~900 visitantes por variante para detectar lift de 100% com 95% de confiança (calculado com `statsig` ou similar — gratuito).
- **Duração estimada:** 1-2 semanas com tráfego médio de orgânico.

### Teste 2 — Copy do título da newsletter

- **Hipótese:** nomear a newsletter como produto (*"Radar Judiciário Semanal"*) converte mais que copy descritivo (*"Receba atualizações"*).
- **Variante:** título + subtítulo + menção de frequência explícita + amostra linkável.
- **Métrica primária:** taxa de submit do form.
- **Sample size:** ~3.000 por variante para lift de 30% sobre baseline 1,5%.
- **Duração estimada:** 3-4 semanas.

### Teste 3 — Estrutura de cards por tribunal

- **Hipótese:** colapsar os 27 TJs (ex: "Ver todos os 27 TJs") empurra scroll até newsletter, aumentando conversão.
- **Variante:** seção "Justiça Estadual" mostra só 8 (populares) + link "Ver todos" / accordion.
- **Métrica primária:** scroll depth até newsletter + taxa de submit.
- **Sample size:** ~2.000 por variante.
- **Duração estimada:** 2-3 semanas.

---

## Erros/bugs a corrigir agora

1. **Meta `og:image` ausente** — compartilhamento em WhatsApp/LinkedIn/X aparece sem thumbnail. Gerar imagem 1200×630 com logo + headline + stat principal. Adicionar em `index.html`.

2. **`og:description` contradiz `meta description`**
   - `<meta name="description">`: "mais de 55 mil decisões..."
   - `<meta property="og:description">`: "Dados abertos de 36 tribunais..."
   - Base já cresceu para 186k. **Automatizar esse número no build** (script lê do Supabase, escreve no `index.html`).

3. **Twitter Card type `summary_large_image` sem imagem** — inválido. Ou adicionar imagem, ou trocar para `summary`.

4. **Schema.org Organization com `sameAs: []`** — array vazio sinaliza negativamente. Remover o campo ou preencher com perfis sociais.

5. **Título `<title>` ainda fala "55 mil decisões"** — desatualizado. Mesmo problema do #2.

6. **Newsletter validação server-side** — aceita `teste+sanity@observatorio-test.com` sem double opt-in. Implementar envio de email de confirmação antes de marcar `ativo=true` (hoje `confirmado` é sempre `false` mas email já é enviado). *Prioridade: média — evita spam na base antes de ter volume.*

7. **Tabela `newsletter_subscribers` RLS sem política de `SELECT` pública** — correto por segurança, mas **se um dia alguém usar `supabase-js` client-side para consultar, vai retornar vazio silenciosamente**. Documentar isso no código.

8. **Seção "Justiça Estadual" com 27 cards** renderiza `O(n)` React components mesmo quando fora da viewport. Considerar `react-virtuoso` ou `IntersectionObserver` pra carregar só o visível. (Relevante para performance mobile.)

---

## Resumo executivo

- **Score atual: 38/100** — a página funciona como um diretório institucional, mas não como uma landing page de conversão.
- **Maior vazamento:** hero que não prova valor nem pede ação.
- **Maior quick win:** mover a busca para o hero + reescrever H1 com número concreto + adicionar timestamp.
- **3 coisas pra fazer essa semana:** #1, #2 e #3 dos Quick Wins acima.
- **3 coisas pra fazer esse mês:** highlights editoriais na home, newsletter automatizada semanal, seção "Para quem é".

Com esses ajustes, é realista mirar **60/100 em 30 dias** — principalmente atacando hero, social proof leve e captura qualificada de newsletter.
