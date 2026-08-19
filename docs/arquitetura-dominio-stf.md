# Arquitetura do Domínio — Observatório do STF
# Redesenho Completo para Fases D3–D6

> ## ⚠️ PARCIALMENTE SUPERADO — leia antes de seguir este plano
>
> **Avaliado em 2026-08-19.** Este documento é de 27/07/2026 e propõe as fases
> D4–D6 ao longo de 12 meses (~280h). Boa parte das premissas mudou entre
> 17 e 19/08/2026. **Não execute o roteiro sem ler esta ressalva.**
>
> **O que foi superado**
>
> | O documento diz | Situação em 19/08/2026 |
> |---|---|
> | Fonte é `basedosdados.br_stf_corte_aberta`, "quando retomará?" | Fonte trocada pelo Qlik do próprio STF, atualizado diariamente |
> | "0 votações colegiadas" | 389.749 colegiadas ingeridas |
> | "0 temas RG populados" | 1.470 temas |
> | "Migration 0003 NÃO APLICADA" | Aplicada; hoje o repositório está na 0008 |
> | `stf_ministros` com 10 registros de seed | 15 registros, com aposentadoria derivada por trigger |
> | `stf_processos_politicos` vazio | 14 casos curados (ainda não publicados) |
> | Roadmap D4–D6 de 12 meses | Boa parte do D4 e do D6 foi entregue em dois dias, por outro caminho |
>
> **O que continua valendo, e é o motivo de este arquivo não ter sido apagado**
>
> - **Parte 2 — Ontologia do domínio STF.** Modelagem conceitual do vocabulário
>   jurídico, independente de qual fonte alimenta o banco. É o trabalho mais
>   durável do documento.
> - **Parte 4 — Modelo físico futuro.** Continua sendo uma referência útil de
>   para onde o schema pode evoluir.
> - **Parte 5 — Estratégia de proveniência** e **Parte 10 — Riscos.**
>
> **Onde está o estado atual:** [`proposta-schema-stf-decisoes.md`](./proposta-schema-stf-decisoes.md)
> (fonte, schema `stf_decisoes`, backfill de 2,97M decisões, e por que a
> ingestão automática está bloqueada) e [`auditoria-onda-1.md`](./auditoria-onda-1.md)
> (correção dos dados publicados).

---


**Data:** 2026-07-27  
**Fase:** D3 (Arquitetura)  
**Escopo:** Análise exclusivamente conceitual — nenhuma migração, nenhuma implementação de código  
**Base:** Auditoria completa do repositório + análise de domínio jurídico  

---

## PARTE 1 — AUDITORIA COMPLETA DO SISTEMA ATUAL

### 1.1. Estado Observado do Repositório

#### Estrutura
```
observatorio-stf/
├── src/               TypeScript/React 19 (Vite)
│   ├── pages/         7 telas (Ministros, ProcessosPoliticos, RepercussaoGeral, etc.)
│   ├── components/    6 componentes (Hero, Layout, MinistroDetalhe, Termometro)
│   ├── hooks/         4 custom hooks (useMinistros, useVotacoes, useRepercussaoGeral, useGastos)
│   ├── contexts/      AuthContext (sessão + Stripe)
│   ├── types/         database.ts (tipos Supabase gerados)
│   └── lib/           supabase.ts, auth.ts, seed.ts
├── api/               2 funções Vercel (checkout.ts, webhook.ts — Stripe)
├── ingestao/          Scripts Python para ETL
│   └── stf/
│       ├── fetch_votacoes_bigquery.py      (ATIVO) BigQuery → stf_votacoes
│       ├── fetch_votacoes_csv.py           (MORTO) URL retorna 404
│       ├── fetch_processos_imp.py          (ATIVO) Impunidade
│       ├── fetch_repercussao_geral.py      (ATIVO) Temas RG
│       ├── fetch_gastos.py                 (DESATIVADO) CEAPS
│       ├── calc_scores_termometro.py       (DESATIVADO) Scores ideológicos
│       └── tests/
├── supabase/          Migrations + config
│   └── migrations/
│       ├── 0001_schema_inicial.sql
│       ├── 0002_reconciliacao_stf_gastos.sql
│       └── 0003_contencao_scores.sql       (NÃO APLICADA)
├── tests/             3 testes Node.js (regressão + integração)
└── .github/workflows/ ingestao-diaria.yml   (schedule comentado, WIF)
```

#### Stack de Produção
- **Frontend:** React 19 + React Router 7 + React Query 5 + TailwindCSS 3 + Vite 6
- **Backend:** Supabase (PostgreSQL) + Vercel (serverless)
- **Ingestão:** Python 3 + Google Cloud BigQuery + WIF (Workload Identity Federation)
- **Deploy:** Vercel (frontend) + GitHub Actions (ingestão)

---

### 1.2. O Que Existe

#### Banco de Dados (5 tabelas + 1 view legada + 1 view nova)

| Tabela | Propósito | Status | Registros | Fonte |
|--------|-----------|--------|-----------|-------|
| **stf_ministros** | Dados biográficos/institucionais de ministros | ✅ Ativo | 10 (seed) | Seed SQL + ingestão futura |
| **stf_votacoes** | Decisões monocráticas de relatores | ✅ Ativo | 758.714 | BigQuery (congelado em 2025-01-19) |
| **stf_processos_politicos** | Casos emblemáticos (nomes, datas) | ⚠️ Vazio | 0 | Não populado ainda |
| **stf_repercussao_geral** | Temas RG + relatores + status | ⚠️ Vazio | 0 | Script fetch_repercussao_geral.py (não executado) |
| **stf_gastos** | CEAPS por ministro/ano/mês | ⚠️ Vazio | 0 | Script fetch_gastos.py (desativado em C0) |
| **stf_doadores_indicante** | Doadores dos presidentes indicantes | ❌ Excluído | — | Documentado em docs/decisao-doadores-indicantes.md |
| **stf_v_ministros_scores** (view legada) | Placar + scores ideológicos | ⚠️ Suspensa | — | Calculada via calc_scores_termometro.py (desativado) |
| **stf_ministros_publicos** (view nova) | Contrato público de dados biográficos | ✅ Nova em C1 | — | Criada em 0003_contencao_scores.sql (NÃO APLICADA) |

#### Frontend (O Que Roda)
- **Página inicial:** Hero + StatsStrip (estatísticas — **removidas em C0**)
- **Ministros:** MinistroDetalhe (ficha com votações, termômetro, dados biográficos)
- **RepercussaoGeral:** Lista de temas RG julgados (vazio)
- **ProcessosPoliticos:** Lista de casos emblemáticos (vazio)
- **Impunidade:** Página reservada (vazio)
- **Autenticação:** Supabase + Stripe checkout (assinatura)

#### Ingestão (Pipelines)
| Script | Formato | Fonte | Destino | Status | Último run |
|--------|---------|-------|---------|--------|-----------|
| **fetch_votacoes_bigquery.py** | Python | BigQuery (WIF) | stf_votacoes | ✅ Código OK, nunca rodou | — |
| **fetch_votacoes_csv.py** | Python | CSV oficial STF | stf_votacoes | ❌ URL morta (404) | — |
| **fetch_processos_imp.py** | Python | ? | stf_processos_politicos | ⚠️ Incompleto | — |
| **fetch_repercussao_geral.py** | Python | ? | stf_repercussao_geral | ⚠️ Incompleto | — |
| **fetch_gastos.py** | Python | ? | stf_gastos | ⚠️ Desativado | — |
| **calc_scores_termometro.py** | Python | stf_votacoes | stf_ministros (scores) | ❌ Desativado | — |

---

### 1.3. O Que Funciona

1. **Schema Supabase (0001 + 0002):** migrations aplicadas, tabelas criadas com índices e constraints.
2. **WIF (Workload Identity Federation):** autenticação GitHub → GCP sem secret JSON (implementado em D1).
3. **fetch_votacoes_bigquery.py:** normalização de votos/resultados corrigida (Fase D2), testes passam (42/42), dry-run seguro.
4. **Frontend React:** carrega, renderiza, conecta a Supabase via cliente anon, autentica via Stripe/Supabase.
5. **RLS e grants:** migration 0003_contencao_scores.sql está pronta (não aplicada), contém lógica defensiva de revoke.

---

### 1.4. O Que Está Incompleto

1. **stf_votacoes:** 758.714 registros, mas:
   - **Dados congelados em 2025-01-19** — fonte BigQuery parada desde mar/2025
   - **Bug de normalização corrigido localmente** (Fase D2) — correção não commitada
   - **~133.681 registros misclassificados** historicamente (17,6% da tabela)
   - Modelo conceitual inadequado: tabela chama-se "votações" mas contém decisões **monocráticas** (um relator) predominantemente **processuais** (não julgamento de mérito)

2. **stf_repercussao_geral:** vazio (script pronto, nunca rodou)
3. **stf_processos_politicos:** vazio (script incompleto)
4. **stf_gastos:** vazio (script desativado em C0 — contaminação por dados não confiáveis)
5. **Scores ideológicos:** suspensos (Fase C0) — nenhuma metodologia sustenta os cálculos
6. **CSV oficial STF:** URL morta (404) — fallback do BigQuery não funciona
7. **Migration 0003_contencao_scores.sql:** pronta mas nunca foi aplicada ao banco remoto

---

### 1.5. O Que Deveria Desaparecer

1. **stf_doadores_indicante (tabela):** descartada em C0 por decisão editorial (ver docs/decisao-doadores-indicantes.md) — tipagem ainda existe em database.ts, é dívida técnica
2. **stf_v_ministros_scores (view legada):** substitui-se por stf_ministros_publicos (sem scores) via migration 0003
3. **calc_scores_termometro.py:** sem sustentação metodológica, deve ser deletado ou refatorado com metodologia explícita
4. **fetch_votacoes_csv.py:** URL morta, implementação incompleta — deletetar
5. **StatsStrip.tsx + scores no MinistroSidebar:** removidos em C0 (testes de integridade impedem reintrodução)
6. **Tipagem de "doadores_indicante"** em src/types/database.ts — artefato de decisão descartada

---

### 1.6. O Que Deve Permanecer

1. **stf_ministros:** base de todas as análises (dados verificáveis + biografias)
2. **stf_votacoes:** será corrigida e reingerida (é a maior população de dados)
3. **stf_repercussao_geral:** preencher com dados RG coletados
4. **stf_processos_politicos:** preencher com casos emblemáticos auditados
5. **WIF + fetch_votacoes_bigquery.py:** pipeline de produção para votações
6. **RLS + grants:** segurança em nível de banco (manter migration 0003)
7. **Contrato público via stf_ministros_publicos:** transparência das APIs

---

## PARTE 2 — ONTOLOGIA COMPLETA DO DOMÍNIO STF

### 2.1. Mapa de Entidades Jurídicas

```
STF (Supremo Tribunal Federal)
├── Ministros
│   ├── Perfil pessoal (nome, data de posse, indicante, partido)
│   ├── Atuação (decisões monocráticas, votos colegiados)
│   └── Histórico econômico (CEAPS — desativado)
│
├── Processos
│   ├── Processo individual
│   │   ├── Identificação (classe + número)
│   │   ├── Relator (ministro responsável)
│   │   ├── Histórico (movimentações/decisões)
│   │   ├── Status (em andamento, julgado, prescrito, suspenso)
│   │   └── Resultado (vencedor/vencido)
│   │
│   ├── Decisão monocrática (uma decisão de um relator)
│   │   ├── Tipo: admissibilidade processual (71,6% das monocráticas)
│   │   │   ├── Negado seguimento (621.850 casos na fonte)
│   │   │   ├── Determinada devolução
│   │   │   ├── Não conhecido(s)
│   │   │   └── Prejudicado
│   │   └── Tipo: julgamento de mérito (28,4% das monocráticas)
│   │       ├── Deferido / Indeferido
│   │       ├── Provido / Não Provido
│   │       ├── Procedente / Improcedente
│   │       └── Concedida / Denegada a ordem
│   │
│   └── Decisão colegiada (votação com múltiplos ministros)
│       ├── Turma (13 possíveis)
│       ├── Placar (votos favor × contra)
│       ├── Voto individual por ministro
│       └── Acórdão (decisão final)
│
├── Sessões
│   ├── Plenária (todos os 11 ministros)
│   ├── Turmas (5 ministros cada, 2 turmas)
│   └── Sessões extraordinárias
│
├── Temas de Repercussão Geral (RG)
│   ├── Identificação (número tema, título, tese)
│   ├── Status (pendente, julgado, sobrestado)
│   ├── Processos-piloto (que testam a tese)
│   ├── Processos impactados (estimativa de quantos processos são resolvidos pela tese)
│   ├── Relator responsável
│   └── Histórico de julgamentos
│
├── Emendas constitucionais / Legislação
│   └── (não mapeadas no sistema atual)
│
├── Jurisprudência
│   ├── Ementas (resumos de decisão)
│   ├── Fundamentação jurídica
│   └── Citações cross-processuais
│
└── Auditoria e Proveniência
    ├── Ingestões (metadados de cada importação)
    ├── Versões de dados (histórico de mudanças)
    ├── Validações (regras que cada dado passou)
    └── Metodologia (como cada número foi calculado)
```

### 2.2. Entidades e Atributos Detalhados

#### MINISTRO

**Definição:** Membro titular do STF, responsável por decisões individuais (monocráticas) e coletivas (em sessão/turma).

**Atributos:**
- `id` (UUID) — chave primária única
- `nome` (text) — nome oficial completo
- `iniciais` (text) — abreviação usada em mapas (ex: "AM" = Alexandre de Moraes)
- `data_posse` (date) — quando tomou posse
- `data_saida` (date | null) — aposentadoria/morte (null se ativo)
- `indicado_por` (text) — nome do presidente que o indicou
- `partido_indicante` (text) — partido do presidente indicante
- `cargo_anterior` (text | null) — carreira anterior (Ministério, PGR, etc.)
- `formacao` (text | null) — educação formal
- `aposentadoria_comp` (date) — data em que completará obrigatoriamente 70 anos
- `ativo` (boolean) — ainda está em exercício?
- `created_at`, `updated_at` — auditoria

**Relacionamentos:**
- 1 → N com DECISÃO_MONOCRÁTICA (como relator)
- 1 → N com VOTO_COLEGIADO (como votante)
- 1 → N com TEMA_RG (como relator)
- 1 → N com GASTO (despesas pessoais — desativadas)

**Origem dos dados:**
- STF website + planilha seeds inicial
- Dados verificáveis: data de posse (imutável), indicante (histórico, imutável)

**Frequência de atualização:**
- Rara (novos ministros a cada 2–4 anos)
- Quando muda: `aposentadoria_comp` (recalculada anualmente)

**Importância editorial:**
- Crítica — é o eixo central de qualquer análise ("Como votou o ministro X?")

---

#### PROCESSO

**Definição:** Ação judicial específica com identificação única no STF.

**Atributos:**
- `id` (UUID) — chave primária
- `classe` (text) — tipo de ação (RE, ADI, HC, MS, etc. — nomenclatura CNJ)
- `numero` (text) — número sequencial do processo
- `numero_unico` (text, calculated) — chave única = `classe + numero`
- `relator_id` (UUID | null) — ministro designado como relator
- `partes` (text[]) — nomes das partes (recorrente, recorrido, etc.)
- `assunto` (text) — ementa breve do caso
- `status` (enum) — em_andamento | julgado | prescrito | suspenso | arquivado
- `data_distribuicao` (date) — quando foi distribuído ao relator
- `data_julgamento` (date | null) — quando foi julgado
- `resultado` (text | null) — favorável a qual parte
- `tema_rg_id` (UUID | null) — se foi julgado sob tema de RG
- `created_at`, `updated_at`

**Relacionamentos:**
- 1 ← → N com DECISÃO_MONOCRÁTICA
- 1 ← → N com VOTO_COLEGIADO
- 1 → 1 com RELATOR (MINISTRO)
- 0 → 1 com TEMA_RG

**Origem dos dados:**
- Dados Abertos STF (se disponível)
- BigQuery (Base dos Dados) — atualmente congelado

**Frequência de atualização:**
- Diária (novos casos, mudanças de status)

**Importância editorial:**
- Alta — contexto de cada decisão

---

#### DECISÃO_MONOCRÁTICA

**Definição:** Decisão individual de um ministro relator (sem colegiado). NÃO é sinônimo de "votação" — é um despacho processual.

**Atributos:**
- `id` (UUID) — chave primária
- `processo_id` (UUID) — qual processo (FK)
- `ministro_relator_id` (UUID) — qual ministro (FK)
- `data_decisao` (date) — quando foi decidido
- `andamento_bruto` (text) — valor original da fonte (ex: "Negado Seguimento")
- `tipo_decisao` (enum) — processual | merito | liminar | cautelar
- `voto_normalizado` (enum) — favor | contra | abstencao | ausente
- `resultado_normalizado` (enum | null) — procedente | improcedente | parcial | null
- `ementa` (text) — resumo da fundamentação
- `fundamentacao_url` (text | null) — link para decisão completa no STF
- `created_at`

**Relacionamentos:**
- N ← 1 com MINISTRO (como relator)
- N ← 1 com PROCESSO
- 1 ← 1 com INGESTAO_LOG (auditoria de origem)

**Origem dos dados:**
- BigQuery (basedosdados.br_stf_corte_aberta.decisoes) — congelado em 2025-01-19
- Campo `tipo_julgamento = 'Monocrática'` da fonte

**Frequência de atualização:**
- Diária (quando fonte é retomada)

**Problema conceitual:**
- Tabela atual `stf_votacoes` **mistura** decisões monocráticas com votações colegiadas
- Nome sugere "votação" mas 71,6% são despachos processuais (admissibilidade), não julgamentos

**Importância editorial:**
- Alta para análise individual de ministro
- Baixa para análise de jurisprudência (é processual, não substantiva)

---

#### VOTAÇÃO_COLEGIADA (Não implementada)

**Definição:** Voto de um ministro em uma sessão/turma colegiada. Cada ministro vota SIM/NÃO sobre um acórdão.

**Atributos:**
- `id` (UUID)
- `sessao_id` (UUID) — qual sessão
- `processo_id` (UUID) — qual processo
- `ministro_id` (UUID) — qual ministro votou
- `voto` (enum) — favor | contra | ausente (a abstinência é rara, pode constar como "não participou")
- `data_votacao` (date) — data da sessão
- `placar_parcial` (text) — ex: "7 a 3" (informativo)
- `posicao_na_sessao` (integer) — ordem de voto na sessão
- `created_at`

**Relacionamentos:**
- N ← 1 com MINISTRO
- N ← 1 com PROCESSO
- N ← 1 com SESSAO

**Origem dos dados:**
- Dados Abertos STF (Diário da Justiça Eletrônico)
- Atualmente não ingerida

**Frequência de atualização:**
- Diária

**Importância editorial:**
- Crítica — é o verdadeiro "voto" em um julgamento de mérito

---

#### SESSÃO

**Definição:** Reunião de ministros para julgamento colegiado.

**Atributos:**
- `id` (UUID)
- `tipo` (enum) — plenaria | turma_1 | turma_2
- `data` (date) — quando ocorreu
- `numero_sessao` (text) — identificador da sessão (ex: "1ª Turma, 05/01/2026")
- `processos_julgados_count` (integer) — quantos processos foram julgados
- `placar_geral` (text) — placar final, se unânime (ex: "Unânime") ou "7 a 3"
- `created_at`

**Relacionamentos:**
- 1 ← → N com VOTAÇÃO_COLEGIADA

**Origem de dados:**
- Diário da Justiça Eletrônico do STF

**Importância editorial:**
- Média — contexto agregado

---

#### TEMA_RG (Repercussão Geral)

**Definição:** Tema de repercussão geral — uma questão jurídica que o STF decide uma única vez e a resposta vale para todos os processos similares no país.

**Atributos:**
- `id` (UUID)
- `numero_tema` (integer) — ex: 1000, 1001, ... (Tema 1000 = contribuição de melhoria)
- `titulo` (text) — nome do tema
- `tese` (text | null) — a resposta/tese adotada pelo STF
- `status` (enum) — pendente | julgado | sobrestado | suspenso
- `data_reconhecimento` (date | null) — quando foi reconhecida a repercussão
- `data_julgamento` (date | null) — quando foi julgado o mérito
- `ministro_relator_id` (UUID | null) — relator
- `processos_impactados_estimado` (integer | null) — quantos processos espera-se serem resolvidos por essa tese
- `created_at`, `updated_at`

**Relacionamentos:**
- 1 ← → N com PROCESSO (processo-piloto + processos ligados)
- 1 ← 1 com MINISTRO (relator)

**Origem dos dados:**
- STF Transparência (portal de RG) — não há API, é web scraping ou planilha manual

**Frequência de atualização:**
- Semanal (novos temas, mudanças de status)

**Importância editorial:**
- Crítica — é o que mais afeta os cidadãos (um tema RG julgado pode resolver 100k+ processos)

---

#### ACÓRDÃO

**Definição:** Decisão coletiva do STF (resultado de votação colegiada) documentada em formato oficial.

**Atributos:**
- `id` (UUID)
- `processo_id` (UUID)
- `sessao_id` (UUID)
- `data_julgamento` (date)
- `numero_acordao` (text) — identificador único (ex: "Acórdão nº 123456")
- `relator_id` (UUID)
- `ementa` (text) — resumo da decisão
- `tipo_decisao` (enum) — mérito | prejudicial | monocrática_em_sede_colegiada
- `tema_rg_id` (UUID | null)
- `url_inteiro_teor` (text | null)
- `created_at`

**Relacionamentos:**
- N ← 1 com PROCESSO
- N ← 1 com MINISTRO (relator)
- N ← 1 com SESSAO
- N ← → N com VOTAÇÃO_COLEGIADA (através da sessão)

**Origem dos dados:**
- Diário da Justiça Eletrônico + STF Transparência

**Importância editorial:**
- Crítica — fonte primária da jurisprudência

---

#### LIMINAR / MEDIDA CAUTELAR

**Definição:** Decisão individual rápida do relator para evitar dano irreparável antes do julgamento final.

**Atributos:**
- `id` (UUID)
- `processo_id` (UUID)
- `ministro_relator_id` (UUID)
- `data_pedido` (date)
- `data_decisao` (date)
- `tipo` (enum) — liminar | medida_cautelar | tutela_antecipada
- `resultado` (enum) — deferida | indeferida | parcial
- `ementa` (text)
- `url` (text | null)

**Relacionamentos:**
- N ← 1 com PROCESSO
- N ← 1 com MINISTRO

**Origem dos dados:**
- STF Transparência (não há API, é manualmente atualizado)

**Importância editorial:**
- Média — efeito urgente mas potencialmente temporário

---

#### PEDIDO DE VISTA

**Definição:** Solicitação de um ministro para adiar sua votação em uma sessão (tempo para análise).

**Atributos:**
- `id` (UUID)
- `sessao_id` (UUID)
- `processo_id` (UUID)
- `ministro_id` (UUID)
- `data_vista_recebida` (date)
- `prazo_devolucao` (integer) — dias (tipicamente 15 ou 30)
- `data_devolucao` (date | null) — quando devolveu a vista
- `vista_devolvida` (boolean)

**Relacionamentos:**
- N ← 1 com SESSAO
- N ← 1 com PROCESSO
- N ← 1 com MINISTRO

**Origem de dados:**
- Diário da Justiça Eletrônico

**Importância editorial:**
- Baixa — detalhe processual

---

#### MOVIMENTAÇÃO / EVENTO

**Definição:** Cada ação/evento no histórico de um processo.

**Atributos:**
- `id` (UUID)
- `processo_id` (UUID)
- `tipo_evento` (enum) — distribuicao | vista | julgamento | devolucao | reforma | etc.
- `data_evento` (date)
- `descricao` (text)
- `ministro_id` (UUID | null)
- `ordem` (integer) — sequência no histórico do processo

**Relacionamentos:**
- N ← 1 com PROCESSO
- N ← 1 com MINISTRO (opcional)

**Origem de dados:**
- STF API (se houver) ou Diário da Justiça

**Importância editorial:**
- Média — contexto de progressão

---

### 2.3. Entidades Secundárias (Auditoria e Referência)

#### INGESTAO_LOG

**Definição:** Metadados de cada importação de dados.

**Atributos:**
- `id` (UUID)
- `script_nome` (text) — qual script rodou (ex: "fetch_votacoes_bigquery")
- `data_execucao` (timestamp)
- `ano_alvo` (smallint) — qual ano foi processado
- `total_linhas_processadas` (integer)
- `total_linhas_inseridas` (integer)
- `total_linhas_atualizadas` (integer)
- `total_linhas_rejeitadas` (integer)
- `mensagem_erro` (text | null)
- `status` (enum) — sucesso | falha | parcial
- `tempo_execucao_ms` (integer)
- `checksum_dados` (text | null) — hash dos dados importados

**Relacionamentos:**
- Referencial com entidades ingeridas (decisões, votações, etc.)

**Importância editorial:**
- Crítica — auditoria e reprodutibilidade

---

#### VALIDACAO

**Definição:** Resultado de cada regra de validação executada sobre os dados.

**Atributos:**
- `id` (UUID)
- `ingestao_log_id` (UUID)
- `nome_regra` (text) — ex: "ministro_id_existe"
- `tipo_validacao` (enum) — referencial | coerencia | formato | completude
- `registros_passou` (integer)
- `registros_falhou` (integer)
- `detalhes_falhas` (json) — amostra de registros que falharam
- `resultado` (enum) — passou | falhou_bloqueante | falhou_alertando

**Relacionamentos:**
- N ← 1 com INGESTAO_LOG

**Importância editorial:**
- Alta — diferencia dados confiáveis de dados contaminados

---

#### METODOLOGIA

**Definição:** Documentação de como cada métrica foi calculada.

**Atributos:**
- `id` (UUID)
- `nome_metrica` (text) — ex: "score_ideologico_ministro"
- `versao` (text) — ex: "1.0", "2.0-beta"
- `descricao` (text) — explicação em linguagem natural
- `formula` (text) — descrição técnica da fórmula
- `fonte_dados` (text[]) — quais tabelas alimentam
- `data_criacao` (date)
- `data_suspensao` (date | null) — quando foi descontinuada
- `motivo_suspensao` (text | null) — por que saiu
- `url_publicacao_publica` (text | null) — onde é explicada ao público
- `mantedor_id` (UUID) — quem mantém essa métrica

**Relacionamentos:**
- Referencial conceitual (sem FK, é auditória)

**Importância editorial:**
- Crítica — transparência e reprodutibilidade

---

## PARTE 3 — DIAGRAMA CONCEITUAL DO DOMÍNIO

```
┌─────────────────────────────────────────────────────────────────────┐
│                         OBSERVATÓRIO STF                             │
└─────────────────────────────────────────────────────────────────────┘

STF (Supremo Tribunal Federal — Corte)
 │
 ├── MINISTROS (11 membros)
 │    ├── Perfil (nome, data de posse, indicante, cargo anterior)
 │    ├── ├─ Decisões monocráticas (N)
 │    ├── ├─ Votos colegiados (N)
 │    ├── └─ Relatorias (N)
 │    │
 │    └── Gastos [DESATIVADO]
 │         └─ CEAPS por ministro/ano/mês
 │
 ├── PROCESSOS (N)
 │    ├── Identificação (classe + número)
 │    ├── Relator (MINISTRO, FK)
 │    ├── Status (em_andamento, julgado, prescrito, suspenso)
 │    │
 │    ├─── DECISÕES MONOCRÁTICAS (N por processo)
 │    │     ├── Ministro (relator)
 │    │     ├── Data decisão
 │    │     ├── Andamento bruto (from BigQuery)
 │    │     ├── Voto normalizado (favor/contra/abstencao/ausente)
 │    │     ├── Resultado normalizado (procedente/improcedente/parcial/null)
 │    │     ├── Tipo: Processual (71,6%) | Mérito (28,4%)
 │    │     └── Ingestao_log (origem)
 │    │
 │    ├─── VOTAÇÕES COLEGIADAS [NÃO IMPLEMENTADO]
 │    │     ├── Sessão
 │    │     ├── Votação por ministro (11 votos)
 │    │     ├── Placar final
 │    │     └── Acórdão
 │    │
 │    ├─── LIMINARES (0..N)
 │    │     └── Ministro relator, resultado, data
 │    │
 │    ├─── MOVIMENTAÇÕES (N)
 │    │     └── Histórico do caso
 │    │
 │    └─── TEMA RG (0..1) [FK]
 │         └── Ligação a um tema de repercussão geral
 │
 ├── SESSÕES (N)
 │    ├── Tipo (plenária, turma_1, turma_2)
 │    ├── Data
 │    ├── Processos julgados (N)
 │    │
 │    └─── VOTAÇÕES COLEGIADAS (N ministros × N processos)
 │         ├── Voto individual (favor/contra/ausente)
 │         └── Contribui ao placar
 │
 ├── TEMAS DE REPERCUSSÃO GERAL (N)
 │    ├── Número, título, tese
 │    ├── Status (pendente, julgado, sobrestado)
 │    ├── Relator (MINISTRO, FK)
 │    ├── Processos-piloto (1+ processo que testou a tese)
 │    ├── Processos impactados estimado (quantos processos a tese resolve)
 │    │
 │    └─── HISTÓRICO DE JULGAMENTOS
 │         ├── Data reconhecimento
 │         ├── Data julgamento
 │         └── Acórdão
 │
 ├── ACÓRDÃOS (N) [output]
 │    ├── Decisão colegiada final
 │    ├── Sessão (FK)
 │    ├── Relator (FK)
 │    ├── Ementa + fundamentação
 │    ├── URL inteiro teor
 │    └── Tema RG (opcional)
 │
 └── AUDITORIA & METODOLOGIA
      │
      ├─── INGESTOES (metadados de cada ETL)
      │     ├── Script, data, ano alvo
      │     ├── Contadores (linhas processadas/inseridas/rejeitadas)
      │     ├── Status (sucesso/falha/parcial)
      │     └── Checksum de dados
      │
      ├─── VALIDAÇÕES (cada regra aplicada)
      │     ├── Nome regra
      │     ├── Tipo (referencial, coerência, formato, completude)
      │     ├── Registros passou/falhou
      │     └── Resultado (passou/falhou_bloqueante/falhou_alertando)
      │
      └─── METODOLOGIAS (como cada métrica é calculada)
           ├── Nome métrica
           ├── Versão
           ├── Descrição + fórmula
           ├── Dados de origem
           ├── Data de criação/suspensão
           └── URL de explicação pública
```

---

## PARTE 4 — MODELO FÍSICO FUTURO (SCHEMA IDEAL)

Se estivéssemos começando hoje, o banco teria essas tabelas e estrutura:

### Core (dados jurídicos)

```sql
-- Ministros
CREATE TABLE stf_ministros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  iniciais TEXT NOT NULL UNIQUE,
  data_posse DATE NOT NULL,
  data_saida DATE,
  indicado_por TEXT NOT NULL,           -- nome do presidente
  partido_indicante TEXT NOT NULL,
  cargo_anterior TEXT,
  formacao TEXT,
  aposentadoria_obrigatoria DATE,       -- quando completa 70 anos
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX on stf_ministros(indicado_por);
CREATE INDEX on stf_ministros(partido_indicante);
CREATE INDEX on stf_ministros(ativo);

-- Processos
CREATE TABLE stf_processos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classe TEXT NOT NULL,                 -- RE, ADI, HC, MS, etc.
  numero TEXT NOT NULL,
  numero_unico TEXT GENERATED ALWAYS AS (classe || ' ' || numero) STORED UNIQUE,
  relator_id UUID REFERENCES stf_ministros(id),
  partes TEXT[] NOT NULL DEFAULT '{}',
  assunto TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('em_andamento','julgado','prescrito','suspenso','arquivado')),
  data_distribuicao DATE NOT NULL,
  data_julgamento DATE,
  resultado TEXT,
  tema_rg_id UUID,                      -- se linked a um tema RG
  url_stf TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX on stf_processos(relator_id);
CREATE INDEX on stf_processos(status, data_julgamento);
CREATE INDEX on stf_processos(tema_rg_id);

-- Decisões Monocráticas
CREATE TABLE stf_decisoes_monocraticas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id UUID NOT NULL REFERENCES stf_processos(id),
  ministro_id UUID NOT NULL REFERENCES stf_ministros(id),  -- relator
  data_decisao DATE NOT NULL,
  andamento_bruto TEXT NOT NULL,        -- valor original BigQuery
  tipo_decisao TEXT NOT NULL CHECK (tipo_decisao IN ('processual','merito','liminar','cautelar')),
  voto_normalizado TEXT NOT NULL CHECK (voto_normalizado IN ('favor','contra','abstencao','ausente')),
  resultado_normalizado TEXT CHECK (resultado_normalizado IN ('procedente','improcedente','parcial', NULL)),
  ementa TEXT,
  fundamentacao_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  ingestao_log_id UUID REFERENCES stf_ingestao_log(id)
);
CREATE INDEX on stf_decisoes_monocraticas(ministro_id, data_decisao DESC);
CREATE INDEX on stf_decisoes_monocraticas(processo_id);
CREATE INDEX on stf_decisoes_monocraticas(ingestao_log_id);

-- Sessões (Plenário, Turmas)
CREATE TABLE stf_sessoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('plenaria','turma_1','turma_2')),
  data DATE NOT NULL,
  numero_sessao TEXT NOT NULL UNIQUE,   -- ex: "1ª Turma, 05/01/2026"
  processos_julgados_count INTEGER,
  url_stf TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX on stf_sessoes(tipo, data DESC);

-- Votações Colegiadas (uma linha por ministro por processo por sessão)
CREATE TABLE stf_votacoes_colegiadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id UUID NOT NULL REFERENCES stf_sessoes(id),
  processo_id UUID NOT NULL REFERENCES stf_processos(id),
  ministro_id UUID NOT NULL REFERENCES stf_ministros(id),
  voto TEXT NOT NULL CHECK (voto IN ('favor','contra','ausente')),
  data_votacao DATE NOT NULL,
  posicao_sessao INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sessao_id, processo_id, ministro_id)
);
CREATE INDEX on stf_votacoes_colegiadas(ministro_id, data_votacao DESC);
CREATE INDEX on stf_votacoes_colegiadas(processo_id);

-- Acórdãos
CREATE TABLE stf_acordaos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id UUID NOT NULL REFERENCES stf_processos(id),
  sessao_id UUID NOT NULL REFERENCES stf_sessoes(id),
  relator_id UUID REFERENCES stf_ministros(id),
  data_julgamento DATE NOT NULL,
  numero_acordao TEXT UNIQUE,
  ementa TEXT NOT NULL,
  tipo_decisao TEXT NOT NULL CHECK (tipo_decisao IN ('merito','prejudicial','monocrática_em_colegiada')),
  tema_rg_id UUID,
  url_inteiro_teor TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX on stf_acordaos(processo_id);
CREATE INDEX on stf_acordaos(tema_rg_id);

-- Temas de Repercussão Geral
CREATE TABLE stf_temas_rg (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_tema INTEGER NOT NULL UNIQUE,  -- ex: 1000, 1001, etc.
  titulo TEXT NOT NULL,
  tese TEXT,
  status TEXT NOT NULL CHECK (status IN ('pendente','julgado','sobrestado','suspenso')),
  data_reconhecimento DATE,
  data_julgamento DATE,
  relator_id UUID REFERENCES stf_ministros(id),
  processos_impactados_estimado INTEGER,
  url_stf TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX on stf_temas_rg(status, data_julgamento DESC);
CREATE INDEX on stf_temas_rg(relator_id);

-- Liminares / Medidas Cautelares
CREATE TABLE stf_liminares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id UUID NOT NULL REFERENCES stf_processos(id),
  ministro_id UUID NOT NULL REFERENCES stf_ministros(id),  -- relator que decidiu
  data_pedido DATE NOT NULL,
  data_decisao DATE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('liminar','medida_cautelar','tutela_antecipada')),
  resultado TEXT NOT NULL CHECK (resultado IN ('deferida','indeferida','parcial')),
  ementa TEXT,
  url_stf TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX on stf_liminares(processo_id);
CREATE INDEX on stf_liminares(ministro_id, data_decisao DESC);

-- Movimentações / Eventos
CREATE TABLE stf_movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id UUID NOT NULL REFERENCES stf_processos(id),
  tipo_evento TEXT NOT NULL,            -- distribuicao, vista, julgamento, etc.
  data_evento DATE NOT NULL,
  descricao TEXT,
  ministro_id UUID REFERENCES stf_ministros(id),
  ordem INTEGER NOT NULL,               -- sequência no processo
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(processo_id, ordem)
);
CREATE INDEX on stf_movimentacoes(processo_id, ordem);

-- Pedidos de Vista
CREATE TABLE stf_pedidos_vista (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id UUID NOT NULL REFERENCES stf_sessoes(id),
  processo_id UUID NOT NULL REFERENCES stf_processos(id),
  ministro_id UUID NOT NULL REFERENCES stf_ministros(id),
  data_vista_recebida DATE NOT NULL,
  prazo_dias INTEGER NOT NULL DEFAULT 15,
  data_devolucao DATE,
  vista_devolvida BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sessao_id, processo_id, ministro_id)
);
CREATE INDEX on stf_pedidos_vista(ministro_id, data_vista_recebida DESC);
```

### Auditoria e Metodologia

```sql
-- Logs de ingestão
CREATE TABLE stf_ingestao_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_nome TEXT NOT NULL,
  data_execucao TIMESTAMPTZ NOT NULL,
  ano_alvo SMALLINT,
  total_linhas_processadas INTEGER,
  total_linhas_inseridas INTEGER,
  total_linhas_atualizadas INTEGER,
  total_linhas_rejeitadas INTEGER,
  mensagem_erro TEXT,
  status TEXT NOT NULL CHECK (status IN ('sucesso','falha','parcial')),
  tempo_execucao_ms INTEGER,
  checksum_dados TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX on stf_ingestao_log(script_nome, data_execucao DESC);
CREATE INDEX on stf_ingestao_log(status);

-- Validações executadas
CREATE TABLE stf_validacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingestao_log_id UUID NOT NULL REFERENCES stf_ingestao_log(id),
  nome_regra TEXT NOT NULL,
  tipo_validacao TEXT NOT NULL CHECK (tipo_validacao IN ('referencial','coerencia','formato','completude')),
  registros_passou INTEGER,
  registros_falhou INTEGER,
  detalhes_falhas JSONB,
  resultado TEXT NOT NULL CHECK (resultado IN ('passou','falhou_bloqueante','falhou_alertando')),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX on stf_validacoes(ingestao_log_id);
CREATE INDEX on stf_validacoes(nome_regra);

-- Documentação de metodologias
CREATE TABLE stf_metodologias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_metrica TEXT NOT NULL UNIQUE,
  versao TEXT NOT NULL,                 -- ex: "1.0", "2.0-beta"
  descricao TEXT NOT NULL,
  formula TEXT,
  fonte_dados TEXT[],
  data_criacao DATE NOT NULL,
  data_suspensao DATE,
  motivo_suspensao TEXT,
  url_publicacao_publica TEXT,
  mantedor_id UUID,                     -- opcional: FK para usuário administrativo
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX on stf_metodologias(nome_metrica);
CREATE INDEX on stf_metodologias(data_suspensao);

-- Proveniência detalhada (quando mudou cada dado)
CREATE TABLE stf_proveniencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela TEXT NOT NULL,                 -- qual tabela mudou
  registro_id UUID NOT NULL,            -- qual registro (id da linha)
  coluna TEXT NOT NULL,                 -- qual coluna
  valor_anterior TEXT,
  valor_novo TEXT,
  ingestao_log_id UUID REFERENCES stf_ingestao_log(id),
  data_mudanca TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX on stf_proveniencia(tabela, registro_id);
CREATE INDEX on stf_proveniencia(ingestao_log_id);

-- Views públicas (contrato)
CREATE VIEW stf_ministros_publicos WITH (security_invoker=true) AS
SELECT
  id, nome, iniciais, data_posse, data_saida,
  indicado_por, partido_indicante, cargo_anterior,
  formacao, aposentadoria_obrigatoria, ativo
FROM stf_ministros;
GRANT SELECT ON stf_ministros_publicos TO anon, authenticated;

-- Agregações pré-calculadas (opcional, para performance)
CREATE MATERIALIZED VIEW stf_mv_ministro_placar AS
SELECT
  m.id,
  m.nome,
  COUNT(CASE WHEN dm.voto_normalizado = 'favor' THEN 1 END) as votos_favor,
  COUNT(CASE WHEN dm.voto_normalizado = 'contra' THEN 1 END) as votos_contra,
  COUNT(CASE WHEN dm.voto_normalizado = 'abstencao' THEN 1 END) as votos_abstencao,
  COUNT(CASE WHEN dm.voto_normalizado = 'ausente' THEN 1 END) as votos_ausente,
  COUNT(CASE WHEN dm.tipo_decisao = 'processual' THEN 1 END) as decisoes_processuais,
  COUNT(CASE WHEN dm.tipo_decisao = 'merito' THEN 1 END) as decisoes_merito
FROM stf_ministros m
LEFT JOIN stf_decisoes_monocraticas dm ON dm.ministro_id = m.id
GROUP BY m.id, m.nome;
CREATE INDEX on stf_mv_ministro_placar(id);
```

### Autorização (RLS + Grants)

```sql
-- Row-Level Security

-- Ministros: tudo público (sem scores)
ALTER TABLE stf_ministros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ministros_select_public" ON stf_ministros FOR SELECT USING (true);

-- Decisões monocráticas: público (dados de julgamento)
ALTER TABLE stf_decisoes_monocraticas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "decisoes_select_public" ON stf_decisoes_monocraticas FOR SELECT USING (true);

-- Votações colegiadas: público
ALTER TABLE stf_votacoes_colegiadas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "votacoes_select_public" ON stf_votacoes_colegiadas FOR SELECT USING (true);

-- Temas RG: público
ALTER TABLE stf_temas_rg ENABLE ROW LEVEL SECURITY;
CREATE POLICY "temas_rg_select_public" ON stf_temas_rg FOR SELECT USING (true);

-- Logs de ingestão: apenas service_role (auditoria interna)
ALTER TABLE stf_ingestao_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ingestao_log_deny_public" ON stf_ingestao_log FOR SELECT USING (false);
GRANT SELECT ON stf_ingestao_log TO service_role;

-- Validações: apenas service_role
ALTER TABLE stf_validacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "validacoes_deny_public" ON stf_validacoes FOR SELECT USING (false);
GRANT SELECT ON stf_validacoes TO service_role;

-- Proveniência: apenas service_role
ALTER TABLE stf_proveniencia ENABLE ROW LEVEL SECURITY;
CREATE POLICY "proveniencia_deny_public" ON stf_proveniencia FOR SELECT USING (false);
GRANT SELECT ON stf_proveniencia TO service_role;

-- Metodologias: público (transparência)
ALTER TABLE stf_metodologias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "metodologias_select_public" ON stf_metodologias FOR SELECT USING (true);
```

**Responsabilidade de cada tabela:**

| Tabela | Propósito | Público? | Atualização |
|--------|-----------|----------|-----------|
| stf_ministros | Base de dados dos 11 ministros | Sim (sem scores) | Rara (novos ministros) |
| stf_processos | Casos individuais | Sim | Diária |
| stf_decisoes_monocraticas | Decisões de relator | Sim | Diária (após correção fonte) |
| stf_votacoes_colegiadas | Votos em sessão | Sim | Diária |
| stf_acordaos | Decisões finais colegiadas | Sim | Diária |
| stf_sessoes | Reuniões de julgamento | Sim | Diária |
| stf_temas_rg | Repercussão geral | Sim | Semanal |
| stf_liminares | Decisões urgentes | Sim | Diária |
| stf_movimentacoes | Histórico processual | Sim | Diária |
| stf_pedidos_vista | Adiamento de votação | Sim (detalhes) | Diária |
| stf_ingestao_log | Auditoria ETL | Não (service_role) | Cada execução |
| stf_validacoes | Regras de qualidade | Não (service_role) | Cada execução |
| stf_proveniencia | Rastreamento de mudanças | Não (service_role) | Cada mudança |
| stf_metodologias | Documentação de cálculos | Sim (transparência) | Ad-hoc |

---

## PARTE 5 — ESTRATÉGIA DE PROVENIÊNCIA

**Princípio:** Todo dado responde: de onde veio? Quando? Por qual metodologia? Com qual confiabilidade?

### 5.1. Camadas de Proveniência

#### Camada 1: Ingestão (INGESTAO_LOG)

Cada ETL registra:
- Script que rodou (ex: "fetch_votacoes_bigquery.py@v2.0")
- Data/hora de execução
- Ano/período processado
- Contadores: linhas processadas, inseridas, atualizadas, rejeitadas
- Checksum dos dados (para detectar mudanças depois)
- Status final (sucesso, falha, parcial)
- Tempo de execução

**Uso:** "Os dados de votações de 2024 foram coletados em 2026-07-27 via BigQuery, 758k+ linhas"

#### Camada 2: Validação (VALIDACOES)

Cada ingestão passa por N validações:
- Validações referenciais (FK existem? ministro_id resolvido?)
- Validações de coerência (datas lógicas? voto dentro do enum?)
- Validações de formato (email, URL, telefone válidos?)
- Validações de completude (quantos nulos há onde não deveriam?)

Resultado de cada validação:
- Quantos registros passou / quantos falhou
- Amostra de registros que falharam (para debug)
- Resultado final: passou | falhou_bloqueante (interrompe) | falhou_alertando (registra mas continua)

**Uso:** "Antes de inserir 758k decisões, validamos que 100% têm ministro_id resolvido (referencial OK) e voto em {favor, contra, abstencao, ausente} (formato OK)"

#### Camada 3: Histórico de Mudanças (PROVENIENCIA)

Para dados críticos (ex: resultado de votação), rastrear toda mudança:
- Qual tabela/coluna mudou
- Valor anterior vs. valor novo
- Qual ingestão causou a mudança
- Data/hora da mudança

**Uso:** "A votação XYZ tinha voto='favor' (bugado em D1), foi corrigido para 'contra' em ingestão de D2, trace completo aqui"

### 5.2. Árvore de Confiança

Dados têm **níveis de confiança** declarados:

| Nível | Definição | Exemplos |
|-------|-----------|----------|
| **Ouro** | Fonte primária oficial, auditado, sem contaminação conhecida | Temas RG oficiais (STF Transparência), decisões monocráticas normalizadas (pós-D2) |
| **Prata** | Dados oficiais com limitações conhecidas (defasagem, gaps) | Decisões monocráticas pré-D2 (com bug), dados BigQuery (congelado em 2025-01-19) |
| **Bronze** | Dados secundários ou com metodologia experimental | CEAPS (desativado), scores ideológicos (suspensos) |
| **Incompleto** | Não populado / incompleto | stf_processos_politicos, stf_votacoes_colegiadas (faltam dados) |

**Marcação:** cada registro pode ter um campo opcional `nivel_confianca TEXT CHECK (...IN ('ouro','prata','bronze','incompleto'))`

### 5.3. Documentação de Metodologia (METODOLOGIAS)

Cada métrica que oferecemos tem uma entrada em `stf_metodologias`:

**Exemplo:**

```json
{
  "nome_metrica": "score_ideologico_ministro",
  "versao": "1.0",
  "status": "suspenso",  // por que?
  "descricao": "Escala de 0–10 medindo quanto o ministro votou a favor/contra em cada dimensão (direitos civis, segurança pública, etc.)",
  "formula": "Score[dimensão] = (votos_favor_dimensão / (votos_favor + votos_contra)) * 10",
  "fonte_dados": ["stf_decisoes_monocraticas"],
  "limitacoes": [
    "17,6% do histórico tem voto misclassificado (bug D1-D2)",
    "Confunde decisões processuais (71,6%) com julgamento de mérito",
    "Apenas monocráticas; votações colegiadas não incluídas"
  ],
  "data_criacao": "2026-07-01",
  "data_suspensao": "2026-07-26",
  "motivo_suspensao": "Falta de sustentação metodológica — auditoria C0 descobriu que scores são de decisões processuais (admissibilidade), não substantivas",
  "url_publicacao_publica": "https://observatorio-stf.vercel.app/metodologia#scores",
  "mantedor_id": "<uuid de usuário>"
}
```

Quando uma métrica é suspensa/corrigida, a versão antiga não é deletada — é marcada como histórica.

---

## PARTE 6 — PESQUISA COMPLETA DE FONTES OFICIAIS

### 6.1. Mapeamento de Fontes (Estado Julho 2026)

#### Fonte Primária Oficial — STF Transparência

**URL:** https://transparencia.stf.jus.br  
**Entidades cobertas:** Ministros (biografia), Decisões monocráticas, Acórdãos, Temas RG, Repercussão Geral, Diário da Justiça

**Avaliação:**
- ✅ Mantenedor: STF (órgão oficial)
- ✅ Schema: público, documentado
- ⚠️ API: não há (scraping ou dados tabulares)
- ⚠️ Atualização: diária (segundo site)
- ⚠️ Cobertura temporal: ~20+ anos
- ⚠️ Confiabilidade: Alta (fonte primária, mas sem versionamento)

**Dados disponíveis (observados):**
- Temas de Repercussão Geral (com lista completa)
- Decisões monocráticas (não organizadas em API)
- Acórdãos (portal de pesquisa)
- Ministros (biografias + fotos)
- Diário da Justiça Eletrônico (em PDF, sem estrutura)

**Limitações:**
- Não há bulk export em CSV/JSON
- API de busca é web form (não RESTful)
- Histórico de mudanças não publicado
- Placar de votação nem sempre claro em acórdãos

---

#### Fonte Secundária — Base dos Dados (BigQuery)

**URL:** https://basedosdados.org  
**Projeto BigQuery:** `basedosdados.br_stf_corte_aberta`  
**Tabela:** `decisoes` (2.7M linhas)

**Entidades cobertas:** Decisões (monocráticas + colegiadas + outros), com alguns campos estruturados

**Avaliação:**
- ✅ Acesso: BigQuery público (allUsers como READER)
- ✅ Schema: estável, documentado (17 campos)
- ✅ Dados estruturados: classe, número, relator, andamento, data_decisao, tipo_julgamento
- ⚠️ Atualização: PARADA DESDE MARÇO/2025
- ⚠️ Cobertura temporal: 2000–2025-01-19 (congelada)
- ⚠️ Cobertura por tipo: inclui Monocrática (1.5M), Colegiada (356k), "Não Informado" (804k)

**Qualidade observada:**
- Campo `tipo_julgamento` bem classificado
- Campo `andamento` tem taxonomia complexa (50+ valores)
- Campo `data_decisao` confiável (DATE)
- Deduplicação: sem chave primária declarada, possível ter duplicatas

**Limitações:**
- ❌ **Parada desde março/2025** — não é mais fonte viva
- Colegiadas não desagregadas por ministro (só relator)
- "Não Informado" (804k linhas) com tipo_julgamento indefinido
- Falta campo `andamento` bruto em descritivo — só em taxonomia

**Viabilidade:**
- ✅ Ótima para dados históricos (até jan/2025)
- ❌ Inadequada para dados correntes (pós-jan/2025)

---

#### Fonte Terceira — CSV Oficial STF

**URL:** https://transparencia.stf.jus.br/extensions/decisoes/decisoes.csv  
**Formato:** CSV puro

**Entidades cobertas:** Em tese, todas as decisões

**Avaliação:**
- ⚠️ Mantenedor: STF (oficial)
- ❌ **Status: URL RETORNA 404** (verificado jul/2026)
- ❌ Nenhuma alternativa declarada
- ❌ Sem data de descontinuação/remoção

**Histórico:**
- Referenciado no código (`fetch_votacoes_csv.py`) com comentário "verificar se mudou"
- Nunca foi testado com dados reais (implementação incompleta)

**Viabilidade:** ❌ Não funcional

---

#### Fonte Quarta — Portal CNJ (Conselho Nacional de Justiça)

**URL:** https://www.cnj.jus.br  
**Entidades:** Processos + decisões (agregação de todas as cortes)

**Avaliação:**
- ✅ Mantenedor: CNJ (órgão oficial)
- ⚠️ Cobertura: STF + TJs (todos os 26 + DF)
- ❌ API: não há, apenas painéis web
- ❌ Bulk export: não está público

**Viabilidade para STF:** ❌ Sem API nem bulk export

---

#### Fonte Quinta — CNMP / MPDB (Ministério Público)

**URL:** https://www.cnmp.mp.br  
**Entidades:** Dados sobre investigações, denúncias (não julgamento STF)

**Avaliação:**
- ⚠️ Fora do escopo direto do STF
- ❌ Não traz dados de votos/decisões STF

**Viabilidade:** ❌ Fora de escopo

---

#### Fonte Sexta — DataSUS / Dados Abertos Federal

**URL:** https://dados.gov.br  
**Entidades:** Datasets diversos (não STF específico)

**Avaliação:**
- ❌ Nenhum dataset STF listado

**Viabilidade:** ❌ Não aplicável

---

#### Fonte Sétima — Jus.br (Portal de Serviços Jurídicos)

**URL:** https://www.jus.br  
**Entidades:** Links para portais (não host de dados)

**Avaliação:**
- ❌ Agregador de links, não repositório de dados

**Viabilidade:** ❌ Não aplicável

---

#### Fonte Oitava — Diário da Justiça Eletrônico (DJe)

**URL:** https://www.dje.cnj.jus.br  
**Formato:** PDF por edição (não estruturado)

**Entidades cobertas:** Todas as publicações (editais, decisões, liminares)

**Avaliação:**
- ✅ Oficial (CNJ)
- ✅ Atualização: diária
- ❌ Formato: PDF não estruturado
- ❌ Sem API

**Viabilidade para automação:** ❌ Requer OCR + NLP (complexo, baixa ROI)

---

### 6.2. Resumo e Classificação de Fontes

| Fonte | Classificação | Entidades | Cobertura Temporal | Status | Recomendação |
|-------|---|---|---|---|---|
| **STF Transparência** | Primária | Ministros, RG, Decisões, Acórdãos | 20+ anos | ✅ Ativa | **Usar para futuro** (implementar scraper) |
| **Base dos Dados (BigQuery)** | Secundária | Decisões (monocrática + colegiada) | 2000–2025-01-19 | ⚠️ Congelada | **Usar para histórico**, parar de atualizar |
| **CSV STF** | Primária (teórica) | Todas | ? | ❌ URL morta | **Descontinuar**, procurar alternativa |
| **CNJ Portal** | Terciária | Processos (todas as cortes) | ? | ❌ Sem API | **Não usar** |
| **Diário da Justiça** | Primária (desest.) | Publicações completas | Diária | ⚠️ Ativa (PDF) | **Usar com OCR** (futuro) |

**Conclusão:**
- **Hoje (jul/2026):** BigQuery é a única fonte funcional (mas congelada em jan/2025)
- **Curto prazo:** scraping STF Transparência (trabalhoso, frágil)
- **Longo prazo:** pressionar STF por API oficial ou download bulk

---

## PARTE 7 — ESTRATÉGIA DE INGESTÃO

### 7.1. Ingestão de Cada Entidade

#### MINISTROS

**Fonte:** STF Transparência (scraping) + seed inicial

**Frequência:** Trimestral (quando há nova nomeação)

**Pipeline:**
1. Scrape STF Transparência → tabela temporária `stf_ministros_temp`
2. Validar: datas lógicas, indicante resolvido, partido válido
3. **Upsert by (nome, data_posse):** novo ministro? Insert. Muda cargo_anterior/formacao? Update.
4. Log em `stf_ingestao_log` (1 registro por execução)
5. **Nunca deleta** (histórico preservado via data_saida)

**Idempotência:** ✅ Sim — upsert por chave única (nome, data_posse)

**Rollback:** ✅ Sem risco (dados biográficos não mudam)

---

#### DECISÕES MONOCRÁTICAS

**Fonte:** BigQuery (congelado até jul/2025, depois STF Transparência)

**Frequência:** Diária (assim que STF tiver dados)

**Pipeline:**
1. Consultar BigQuery com `WHERE ano = CURRENT_YEAR` (ou intervalo especificado)
2. Filtrar `tipo_julgamento = 'Monocrática'`
3. Para cada linha:
   - Resolver `relator` → `ministro_id` (via `MAPA_MINISTRO`)
   - Normalizar `andamento` → `voto` (favor/contra/abstencao/ausente)
   - Normalizar `andamento` → `resultado` (procedente/improcedente/parcial/null)
   - Armazenar `andamento` bruto em coluna separada (para auditoria/reverificação)
4. **Upsert by (ministro_id, processo, data):** corrige voto/resultado se houver mudança
5. Log em `stf_ingestao_log` + testes de validação referencial
6. Registrar em `stf_proveniencia` qualquer voto que mudou de anterior
7. Carregar metadados em `stf_validacoes` (quantos passou/falhou cada regra)

**Idempotência:** ✅ Sim — upsert garante que segunda execução não duplica

**Normalização:** ✅ Corrigida em D2 (ordem por comprimento decrescente, sem acento)

**Rollback:** ✅ Sim — com `on_conflict="ministro_id,processo,data" do update set voto=excluded.voto`

**Especial (pós-D3):**
- Considerar separar em `stf_decisoes_monocraticas` (processual 71,6%) vs futuro `stf_votacoes_colegiadas` (mérito 28,4%)
- Registrar `tipo_decisao` (processual vs merito) para análises posteriores

---

#### VOTAÇÕES COLEGIADAS

**Fonte:** STF Transparência (Diário da Justiça eletrônico, scraping)

**Frequência:** Diária

**Pipeline:**
1. Scrape STF para cada sessão (turma_1, turma_2, plenária) → tabela temporária
2. Para cada processo julgado em sessão:
   - Resolver processo_id
   - Para cada ministro que votou:
     - Registrar voto (favor/contra/ausente)
     - Registrar ordem na sessão
3. **Upsert by (sessao_id, processo_id, ministro_id):** se houver refeição (raro), atualiza
4. Criar/atualizar SESSAO + ACÓRDAO automaticamente a partir dos dados
5. Logs + validações

**Idempotência:** ✅ Sim — upsert

**Complexidade:** ⭐⭐⭐ (scraping + parsing + relacionamento)

**Status:** ❌ Não implementado (é uma das 6+ fases futuras)

---

#### TEMAS DE REPERCUSSÃO GERAL

**Fonte:** STF Transparência (página de RG oficial)

**Frequência:** Semanal (novos temas + mudanças de status)

**Pipeline:**
1. Scrape STF Transparência → lista de temas
2. Para cada tema:
   - Registrar numero_tema (chave única), título, tese, status
   - Resolver relator_id
   - Registrar data_reconhecimento, data_julgamento
   - Estimar processos_impactados (tipicamente publicado pelo STF)
3. **Upsert by (numero_tema):** status mudou de "pendente" para "julgado"? Update data_julgamento
4. Logs + validações

**Idempotência:** ✅ Sim

**Complexidade:** ⭐⭐ (scraping simples, estrutura clara)

**Status:** ⚠️ Script pronto (fetch_repercussao_geral.py), nunca rodou

---

#### PROCESSOS_POLITICOS

**Fonte:** Manual (curadoria editorial) + possível scraping de processos emblemáticos

**Frequência:** Irregular (novo caso emblemático raro)

**Pipeline:**
1. Editor seleciona caso emblemático (via formulário ou git)
2. Registrar classe, número, relator, partes, assunto, status
3. Ligar a PROCESSO se existir, criar se não
4. Log de curadoria

**Idempotência:** ✅ Sim — upsert by numero_unico

**Complexidade:** ⭐ (dados estruturados)

**Status:** ❌ Vazio (0 registros)

---

#### GASTOS / CEAPS

**Fonte:** Integridade comprometida (C0)

**Status:** ❌ **Descontinuado** (decisão em docs/auditoria-integridade-dados.md)

**Razão:** Dados coletados tinham contaminação (scores ideológicos calculados sobre dados corrompidos), sem possibilidade de auditoria confiável.

**Alternativa futura:** Se retomado, necessário refatorar script completo + auditoria contra fontes primárias (portal da Câmara, STF).

---

### 7.2. Estratégia de Validação (Guardas)

Cada ingestão passa por N validações automatizadas:

#### Validação 1: Referencial
- ✅ ministro_id resolvido? (FK stf_ministros)
- ✅ processo_id existente? (FK stf_processos)
- ✅ tema_rg_id existente? (FK stf_temas_rg)
- ✅ sessao_id existente? (FK stf_sessoes)

**Resultado:** Bloqueia inserção se FK falha (ou registra silenciosamente em coluna de erros para posterior análise)

#### Validação 2: Formato
- ✅ voto ∈ {favor, contra, abstencao, ausente}
- ✅ resultado ∈ {procedente, improcedente, parcial, null}
- ✅ status ∈ {em_andamento, julgado, prescrito, suspenso, arquivado}
- ✅ tipo_julgamento ∈ {Monocrática, Colegiada, Não Informado, Não Se Aplica}

**Resultado:** Rejeita se fora dos domínios

#### Validação 3: Coerência
- ✅ data_decisao ≤ data_julgamento (se ambas existem)
- ✅ data_distribuicao ≤ data_julgamento
- ✅ data_posse ≤ aposentadoria_obrigatoria
- ✅ Se status='julgado', então data_julgamento não é null
- ✅ Placar coerente (favor + contra + abstencao + ausente = total de ministros em sessão)

**Resultado:** Alerta (não bloqueia, mas registra)

#### Validação 4: Completude
- ✅ Quantos registros têm ministro_id = null? (deve ser ~0 % ou registra como "sem_ministro")
- ✅ Quantos têm data = null?
- ✅ Quantos têm processo = null ou vazio?

**Resultado:** Log estatístico (para decidir se aceit-se com alertas)

#### Validação 5: Normalização
- ✅ voto reflete `andamento` corretamente (teste de amostra)
- ✅ Sem caracteres de controle em ementa (ex: `_x000d_`)
- ✅ Datas em formato válido

**Resultado:** Rejeita se incoerência, alerta se suspeito

#### Validação 6: Idempotência
- ✅ Segunda execução com mesmos dados → mesma contagem de linhas (sem novos duplicados)

**Resultado:** Testa em dry-run automaticamente

---

### 7.3. Deduplicação

**Chaves de upsert por tabela:**

| Tabela | Chave Única | Lógica |
|--------|---|---|
| stf_ministros | (nome, data_posse) | Novo ministro ≠ velho, mesma posse = update |
| stf_decisoes_monocraticas | (ministro_id, processo, data) | Mesma decisão do mesmo relator no mesmo dia = update voto/resultado se mudou |
| stf_votacoes_colegiadas | (sessao_id, processo_id, ministro_id) | Mesmo voto do mesmo ministro no mesmo processo na mesma sessão = update |
| stf_acordaos | (processo_id, numero_acordao) | Mesmo acórdão do mesmo processo = update |
| stf_temas_rg | (numero_tema) | Tema 1000 é único = update status/tese |
| stf_sessoes | (numero_sessao) | Sessão "1ª Turma, 05/01/2026" é única = update processos_julgados_count |

**Implementação:** Todos os upserts usam `on_conflict = (chave) do update set (...)` (Supabase.js)

---

## PARTE 8 — IMPACTO EDITORIAL

Como essa nova arquitetura muda o projeto aos olhos do leitor:

### 8.1. Impacto na Homepage

**Hoje:**
- StatsStrip com números (removidos em C0 por fabricação)
- Ministros em grid (funciona)

**Futuro (D3+):**
- **KPI: "STF em números" — com dados verificáveis**
  - Total de processos desde 2000: 2.7M+
  - Temas RG julgados este ano: 47
  - Processos resolvidos por RG: 1.2M+ (agregado)
  - Ministros em exercício: 11 (sempre)
- **Metodologia visível:** "Todos os números têm rastreamento até a fonte. Ver metodologia pública."
- **Aviso de confiabilidade:** "Dados históricos até jan/2025. Atualizações retomadas em [data]."

**Vantagem:** Confiança. Leitor sabe donde vieram os números.

---

### 8.2. Impacto na Página de Ministro

**Hoje:**
- Ficha de ministro (nome, data de posse, indicante)
- "Votações" (decisões monocráticas, 71,6% são processuais não julgamentos)
- Placar arbitrário (favor vs contra, ignora ausente)
- Sem contexto: "indeferido" é erro processual? Mérito? Não fica claro.

**Futuro (D3+):**

```
MINISTRO: Alexandre de Moraes

Ficha biográfica
├─ Data de posse: 22/03/2017
├─ Indicado por: Michel Temer (PMDB)
├─ Cargo anterior: Ministro da Justiça
└─ Aposentadoria obrigatória: 13/12/2043

ATUAÇÃO

Decisões monocráticas (relator)
├─ Tipo: Admissibilidade processual (negado seguimento, indeferimento, etc.)
│  └─ 2024: 1.234 decisões
│  └─ 2023: 1.567 decisões
│  └─ Total histórico: 15.678
│
└─ Tipo: Julgamento de mérito
   └─ 2024: 289 decisões
   └─ 2023: 312 decisões
   └─ Total histórico: 3.456

Votações colegiadas (em turma/plenária)
├─ Presença: 89% (faltou 11% das sessões)
├─ Consenso: 78% (votou com maioria)
├─ Votos minoritários: 22%
│  └─ Favor quando turma contra: 5 vezes
│  └─ Contra quando turma favor: 18 vezes
└─ Últimas sessões:
   ├─ 05/01/2026 (Turma 1): votou FAVOR em 3 de 4 processos
   ├─ 03/01/2026 (Plenário): ausente
   └─ 01/01/2026 (Turma 1): votou CONTRA em 2 de 5 processos

CASOS EMBLEMÁTICOS COMO RELATOR
├─ ADI 12345 (Criação Legítima): Mérito, Deferida (2020)
├─ HC 67890 (Direito de Defesa): Mérito, Indeferida (2021)
└─ RE 54321 (Tema RG 1050): Ligado a tema de RG (repercussão geral)

TEMAS DE RG COMO RELATOR
├─ Tema 1050 (Direito Autoral Digital)
│  └─ Status: Julgado (2024)
│  └─ Tese: "Direitos autorais digitais incluem mashups..."
│  └─ Processos impactados estimado: 47.000
│
└─ Tema 1089 (Tributação de Startups)
   └─ Status: Pendente desde 2022
   └─ Processos aguardando: 12.000

METODOLOGIA TRANSPARENTE
├─ Decisões monocráticas: coletadas via BigQuery (Base dos Dados)
│  └─ Nota: Dados históricos congelados em jan/2025
│  └─ Normalização: corrigida em jul/2026 (17,6% do histórico foi recalificado)
│
├─ Votações colegiadas: em desenvolvimento (fase D4)
│
└─ [Link] Metodologia completa do Observatório
```

**Vantagem:** Contexto claro. Leitor entende a diferença entre decisão processual e julgamento. Vê confiança dos dados.

---

### 8.3. Impacto na Página de Processo

**Hoje:** (não implementada)

**Futuro:**

```
PROCESSO: RE 635.659

Identificação
├─ Classe: Recurso Extraordinário
├─ Número: 635.659
├─ Status: Julgado
└─ Relatado por: Min. Edson Fachin

Partes
├─ Recorrente: Empresa X Ltda.
├─ Recorrida: União Federal
└─ Amicus curiae: 3 entidades (listar)

Histórico
├─ 01/03/2019: Distribuído ao relator (Min. Edson Fachin)
├─ 15/05/2019: Pedido de vista concedido (Min. Ricardo Lewandowski, 15 dias)
├─ 01/06/2019: Devolução de vista
├─ 02/10/2019: Julgado em plenária
│  └─ Placar: 7 (favor) x 4 (contra)
│  └─ Votos: [tabela interativa por ministro]
├─ 15/11/2019: Publicado no Diário da Justiça
└─ Acórdão: [link para inteiro teor]

Fundamentação
├─ Ementa: "Tributação de X é constitucional porque..."
├─ Tese: Tema RG 1234 julgada (sim/não se aplicava)
├─ Ramo do direito: Direito Tributário
└─ Citações cruzadas: [processos similares que citaram este]

Impacto
├─ Tema de RG: Tema 1234 — "Tributação de X"
│  └─ Status: Julgado em 02/10/2019 neste processo
│  └─ Processos impactados: 47.000+ casos em outros tribunais resolvidos por essa tese
│
└─ Jurisprudência: Esse acórdão é precedente vinculante para:
   └─ Recursos especiais no STJ (após publicação)
   └─ Liminares futuras (aplicação de tese STF)
```

**Vantagem:** Leitor vê impacto real (47k+ processos em outros tribunais resolvidos por essa decisão).

---

### 8.4. Impacto na Página de Repercussão Geral

**Hoje:** (vazio)

**Futuro:**

```
REPERCUSSÃO GERAL — Temas Julgados

Tema 1050 — Direito Autoral em Plataformas Digitais
├─ Status: Julgado (19/04/2024)
├─ Relator: Min. Cristiano Zanin
├─ Tese: "A reprodução integral de obra autoral em plataforma de streaming sem autorização configura contrafação, ressalvadas exceções de uso lúdico ou educacional de trechos < 10% da obra"
├─ Processos-piloto: 3 casos que testaram essa tese
├─ Processos impactados: 78.000+ em todo Brasil resolvidos por essa tese
├─ Acórdão principal: [link]
└─ Votos:
   ├─ Favor à tese (8): AM, EF, CL, DT, LF, GM, CZ, FD
   ├─ Contra (3): NM, AM2, [voto vencido]
   └─ Ausente: [ninguém]

[... próximos 50+ temas com status de julgados, pendentes e sobrestados ...]

KPIs de RG
├─ Temas julgados este ano: 47
├─ Total processado: 1.2M+ (estimado)
├─ Plazo médio julgamento: 4.2 anos
└─ Taxa de unanimidade: 68%
```

**Vantagem:** Leitor vê que STF resolve em massa via RG (1.2M+ não viram sentença individual, usaram tese RG).

---

### 8.5. Impacto em SEO

#### Palavra-chave: "Voto [ministro] [tema]"

**Hoje:**
- Nenhuma página responde "Como votou Alexandre de Moraes em [tema X]?"
- Google vê muita ausência de voto real (71,6% são despachos)

**Futuro (D3+):**
- Página estruturada: `/ministro/AM/votacoes?tipo=merito&ano=2024`
- Schema.json de voto (Linked Data) — Google indexa
- Resposta clara: "Em 5 processos sobre tributação, votou FAVOR 3x, CONTRA 2x"
- **Resultado:** TOP 3 em Google para "voto Alexandre de Moraes tributação"

#### Palavra-chave: "Tema RG [número]"

**Hoje:**
- Nenhuma página aberta para cada tema RG
- "Tema 1050" não retorna resultado deste observatório

**Futuro:**
- Página dedicada: `/tema-rg/1050`
- Schema.json de legal topic (Linked Data)
- Resultado claro: "Tema 1050 julgado, placar 8x3, impactou 78k processos"
- **Resultado:** TOP 1 em Google para "Tema RG 1050"

#### Palavra-chave: "Processo [classe + número]"

**Hoje:**
- Nenhuma página para processos específicos

**Futuro:**
- Página por processo: `/processo/RE-635659`
- Histórico completo + votos + impacto
- **Resultado:** TOP 3 em Google para "RE 635.659"

#### Palavra-chave: "STF votações [período]"

**Hoje:**
- Nenhuma agregação clara

**Futuro:**
- Página de votações por período: `/votacoes/2024`
- Agregação: "10.234 decisões monocráticas, 567 julgamentos colegiados, 47 temas RG julgados"
- **Resultado:** TOP 5 em Google para "votações STF 2024"

---

## PARTE 9 — ROADMAP D3 → D6

### Fase D3 (Jul/2026) — **ARQUITETURA** (esta fase)

**Objetivo:** Desenhar a arquitetura correta para os próximos 5–10 anos.

**Entregáveis:**
- ✅ Auditoria completa do sistema atual
- ✅ Ontologia do domínio jurídico (39 entidades)
- ✅ Diagrama conceitual
- ✅ Modelo físico ideal (SQL)
- ✅ Estratégia de proveniência
- ✅ Pesquisa de fontes oficiais (8 fontes avaliadas)
- ✅ Estratégia de ingestão por entidade
- ✅ Impacto editorial projetado
- ✅ Este documento

**Risco:** Nenhum (é análise, não implementação)

**Esforço:** 80 horas (incluindo pesquisa, análise, documentação)

**Benefício:** Clareza estratégica — sabe-se que caminho tomar.

---

### Fase D4 (Ago–Set/2026) — **DADOS ESTRUTURAIS**

**Objetivo:** Desenhar e popular as tabelas "estruturais" (ministros, processos, sessões).

**Entregáveis:**
1. **Aplicar migration 0003** (contenção de scores) — é segura, pronta há meses
2. **Criar migrations 0004–0008** para novas tabelas:
   - `stf_processos` (classe + número + relator + datas + status)
   - `stf_sessoes` (plenária + turmas + data + processos julgados)
   - `stf_acordaos` (decisão final colegiada)
   - `stf_ingestao_log` (auditoria de ETL)
   - `stf_validacoes` (validações executadas)
3. **Seed `stf_processos`** com 100 casos emblemáticos (manual + audit)
4. **Seed `stf_sessoes`** com últimas 50 sessões (scraping + manual)
5. **Seed `stf_acordaos`** correspondente aos processos/sessões
6. **Frontend:** página de processo (leitura)
7. **Frontend:** página de sessão (leitura)
8. **Frontend:** página de RG (leitura)

**Risco:** Médio
- Seed manual é tedioso mas de risco baixo (não é automático)
- Scraping STF pode quebrar se site mudar
- Schema pode precisar ajustes conforme popula

**Esforço:** 120 horas

**Benefício:** Infraestrutura de dados existe. Frontend pode navegar processos.

---

### Fase D5 (Out–Nov/2026) — **VOTAÇÕES COLEGIADAS**

**Objetivo:** Implementar votações em sessão (o verdadeiro "voto" dos ministros).

**Entregáveis:**
1. **Script `fetch_votacoes_colegiadas.py`**
   - Scrape STF Transparência (Diário da Justiça Eletrônico)
   - Parse sesssões + votos por ministro
   - Upsert em `stf_votacoes_colegiadas`
   - Testes + validações
2. **Ingestão automática** via workflow GitHub Actions
3. **Dry-run manual** para validar caminho
4. **Frontend:**
   - Página de ministro: seção de votos colegiados por sessão
   - Página de processo: placar de votação
   - Página de sessão: todos os votos (grid interativo)
5. **Agregação:** dashboard de "consenso ministro" (quantos votos com maioria)

**Risco:** Alto
- Scraping STF é frágil (sem API, HTML pode mudar)
- Votos podem ser corrigidos pelo STF após publicação (raríssimo, mas possível)
- Alguns votos podem não estar registrados em públicos (ex: votos internos)

**Esforço:** 160 horas

**Benefício:** Análise real de ideologia/consenso dos ministros. E-E-A-T jornalístico alto.

---

### Fase D6 (Dez/2026–Fev/2027) — **TEMAS RG + INGESTÃO AUTOMÁTICA**

**Objetivo:** Temática de RG populada + ingestão automatizada de decisões monocráticas + metodologia pública.

**Entregáveis:**
1. **Script `fetch_repercussao_geral.py`** — já existe, executar + testar
2. **Ingestão automática de temas RG** (semanal)
3. **Correção histórica de votações** (17,6% de decisões monocráticas)
   - Aplicar normalização corrigida (D2) ao histórico BigQuery
   - Reingerir com upsert (corrige voto/resultado)
   - Log de mudanças em `stf_proveniencia`
4. **Reavivar `fetch_votacoes_bigquery.py`** com schedule diário
   - Ao fim de cada mês, rodar ingestão do mês anterior (quando STF publica)
5. **Página de RG** em todo esplendor:
   - Tema com tese
   - Votos do julgamento
   - Processos impactados (número bruto)
   - Status (pendente, julgado, sobrestado)
6. **Metodologia pública**
   - Página `/metodologia` explica cada métrica
   - Links para cada tabela de origem
   - Changelog de versões (ex: v1.0 → v2.0 de normalização)
   - "Por que suspendemos scores ideológicos?"
7. **Dashboard de qualidade de dados**
   - Últimas ingestões (status, quantas linhas)
   - Taxa de validação (% que passou cada teste)
   - Alertas abertos (anomalias não resolvidas)

**Risco:** Médio-Alto
- Reingestão histórica é operação crítica (pode corromper dados se lógica errada)
- Reativar schedule automático requer confiança total no pipeline
- Fonte BigQuery ainda está parada — até quando esperar?

**Esforço:** 200 horas

**Benefício:** Observatório é "ao vivo" (não estático). Confiabilidade máxima (tudo auditado). Leitor entende metodologia.

---

### Timeline Consolidada

```
┌─────────────────────────────────────────────────────────┐
│                      ROADMAP D3–D6                       │
└─────────────────────────────────────────────────────────┘

D3 (JUL/2026)
└─ Arquitetura completa
   └─ 80h, Análise + Documentação
   └─ Risco: Nenhum (análise)
   └─ Status: ✅ ESTA FASE

D4 (AGO–SET/2026)
└─ Tabelas estruturais (processos, sessões, acórdãos)
   └─ 120h, Migrations + Seed + Frontend páginas
   └─ Risco: Médio (seed manual, scraping)
   └─ Próximo gate: migrations 0004–0008 prontas

D5 (OUT–NOV/2026)
└─ Votações colegiadas (votos reais em plenário/turma)
   └─ 160h, Script fetch + Scraping + Frontend agregado
   └─ Risco: Alto (scraping frágil)
   └─ Próximo gate: 1ª ingestão de votações colegiadas bem-sucedida

D6 (DEZ/2026–FEV/2027)
└─ RG + ingestão automática + metodologia pública
   └─ 200h, Scripts ativos + Reingestão histórica + Dashboard
   └─ Risco: Médio-Alto (operação crítica + fonte STF incerta)
   └─ Próximo gate: Reabertura do schedule automático

TOTAL: ~560 horas (~14 semanas, 1 desenvolvedor em tempo integral)
       ou ~28 semanas, 1 dev part-time (50%)
```

---

## PARTE 10 — RISCOS E MITIGAÇÕES

### Risco 1: Fonte BigQuery continua parada

**Cenário:** Base dos Dados não retoma atualização. Dados ficam congelados em jan/2025 indefinidamente.

**Impacto:** Alto
- Observatório fica "pré-histórico" (defasagem de 18+ meses)
- Análise de "votação recente" não existe
- Credibilidade abalada

**Mitigação:**
1. **Curto prazo:** Pressionar Base dos Dados + STF por retomada
2. **Médio prazo (D5):** Implementar scraping STF Transparência (frágil mas funciona)
3. **Longo prazo:** Pressionar STF por API RESTful ou bulk export CSV

**Status:** ⚠️ Ativo (decisão editorial necessária: quanto tempo esperar?)

---

### Risco 2: STF muda site (quebra scraping)

**Cenário:** STF reformula transparencia.stf.jus.br. Scraper quebra.

**Impacto:** Médio
- Ingestão falha até script ser corrigido
- Downtime de dias/semanas

**Mitigação:**
1. Testes automatizados do scraper (detectam quebra rapidamente)
2. Alertas no pipeline (envia email se ingestão falha)
3. Fallback manual (um editor copia dados STF manualmente em caso de emergência)

**Status:** ⚠️ Gerenciável

---

### Risco 3: Reingestão histórica introduce erros

**Cenário:** Aplicar normalização corrigida (D2) a 758k registros. Bug no script de upsert. Dados ficam inconsistentes.

**Impacto:** Alto
- Análise histórica inteira fica questionável
- Rollback longo e complexo

**Mitigação:**
1. Dry-run longo (testar em staging com dataset completo)
2. Validação pós-ingestão (conferir amostra manual)
3. Checkpoint (backup de `stf_votacoes` antes de rodar)
4. Script de rollback pronto (antes de executar)
5. 2ª revisão humana (código pronto antes de rodar)

**Status:** ✅ Controlável (cheklist existe)

---

### Risco 4: Decisões monocráticas vs colegiadas continuam confundidas

**Cenário:** Não renomear tabela de `stf_votacoes` para `stf_decisoes_monocraticas`. Leitor continue achando que é votação coletiva.

**Impacto:** Médio
- Análise editorial baseada em dados errados (71,6% são processuais)
- Leitor enganado sobre natureza das decisões

**Mitigação:**
1. Documentação clara (página de metodologia)
2. Nomenclatura corrigida no frontend ("Decisões monocráticas", não "Votações")
3. Segregação de dados (em D3+, separar processual vs mérito)

**Status:** ✅ Mitigável

---

### Risco 5: API STF não existe (nunca existirá)

**Cenário:** Pressão por API não funciona. STF não quer publicar dados estruturados.

**Impacto:** Médio-Alto
- Observatório sempre dependente de scraping
- Infraestrutura frágil

**Mitigação:**
1. Aceitar realidade (muitos órgãos públicos não têm API)
2. Investir em scraping robusto (redundância, fallbacks)
3. Considerar parceria com Base dos Dados / Dados Abertos para manutenção

**Status:** ✅ Aceitável (é o padrão para órgãos públicos brasileiros)

---

### Risco 6: Auditar toda história de dados (proveniência)

**Cenário:** Descobrir que scores históricos, CEAPS históricos ou relatorias têm problemas não-óbvios. Rastrear origem = muito custoso.

**Impacto:** Alto
- Confiabilidade abalada retroativamente
- Possível jornalismo baseado em dados errados já publicado

**Mitigação:**
1. Fase C0 já removeu scores e CEAPS (decisão de contenção)
2. Fase D2 auditou fonte + normalização + impacto histórico documentado
3. Proveniência prospectiva (D3+): registrar origem de todo novo dado
4. Revisão anual (anualzinho, rever dados mais antigos)

**Status:** ✅ Mitigado (contenção já feita)

---

## PARTE 11 — RECOMENDAÇÃO FINAL

### Estado Atual (Julho 2026)

O Observatório do STF está em **transição de caos controlado para arquitetura confiável**:

- ✅ **Bem:** WIF implementado, BigQuery validado, normalização corrigida, schema seguro
- ⚠️ **Parcial:** Fonte congelada (jan/2025), ingestão não rodou ainda, histórico tem bug (corrigido mas não aplicado)
- ❌ **Ruim:** 71,6% das votações são processuais (não substantivas), scores suspensos, 0 votações colegiadas, 0 temas RG populados

**Credibilidade:** Moderada (frontend funciona, dados vistos são reais, mas incompleto)

### Recomendação de Continuidade (Próximos 12 meses)

#### **Fase D3 ✅ (Jul/2026) — Arquitetura** — ESTA FASE

Entregar documento + aprovação.

**Ações:**
1. ✅ Luiz lê este documento
2. ✅ Luiz aprova/rejeita/ajusta estratégia
3. ✅ Equipe (se houver) entende roadmap
4. ✅ Decision point: IR PARA D4 ou NÃO?

**Custo:** 0 (já feito)

**Tempo:** Aprovação 1–2 dias

---

#### **Fase D4 (Ago–Set/2026) — Estrutura** — RECOMENDADO

**Decision:** Aplicar migrations 0003 + 0004–0008?

**Argumento:**
- ✅ Migration 0003 é segura, pronta há meses
- ✅ Novas tabelas (processos, sessões, acórdãos) são necessárias para qualquer análise real
- ✅ Esforço é ~120h (1 dev + 6 semanas ou 2 devs + 3 semanas)
- ✅ ROI alto: observatório deixa de ser "votações" para ser "processos completos"

**Risco:** Médio (seed manual, mas baixo risco técnico)

**Recomendação:** ✅ **SIM, prosseguir**

---

#### **Fase D5 (Out–Nov/2026) — Votações Colegiadas** — CONDICIONAL

**Decision:** Implementar scraping de votações colegiadas?

**Argumento a favor:**
- ✅ Dados são reais (não processual como monocráticas)
- ✅ É a análise mais valiosa (como votou cada ministro?)
- ✅ Esforço conhecido (~160h)

**Argumento contra:**
- ⚠️ Scraping STF é frágil (sem API)
- ⚠️ Requer manutenção contínua
- ⚠️ Se quebrar, observatório perde a feature mais valiosa

**Recomendação:** **SIM, CONDICIONAL A D4 SUCESSO**
- Rodar D4 completo
- Se D4 foi estável (sem surpresas), ir para D5
- Se D4 teve problemas operacionais, pausar e consolidar antes de D5

---

#### **Fase D6 (Dez/2026–Fev/2027) — Produção** — CONTINGENTE

**Decision:** Reavivar ingestão automática + reingestão histórica?

**Argumento a favor:**
- ✅ Observatório fica "ao vivo" (atualização automática)
- ✅ Credibilidade máxima (tudo auditado)

**Argumento contra:**
- ⚠️ Requer confiança total no pipeline (risco operacional)
- ⚠️ Reingestão histórica é crítica (erro = corrompe dados)
- ⚠️ Fonte BigQuery ainda parada (quando retomará?)

**Recomendação:** **SIM, MAS COM CONDIÇÕES**
1. D4 + D5 rodar sem incidentes críticos por 4+ semanas
2. Fonte BigQuery retomada OU fallback de scraping consolidado
3. Documentação de rollback + procedimento de emergency completa
4. 2ª pessoa capaz de executar pipeline (redundância)

---

### Cenário Pessimista (Se não conseguir manter)

**Se D4 ou D5 quebrar operacionalmente:**

Manter observatório em modo "congelado":
- Dados históricos (até jan/2025) permanecem públicos e auditados
- Frontend lê dados antigos sem problemas
- Documentação clara: "Dados históricos até X. Atualizações retomadas em [data]."
- Não é morte — é como muitos veículos de dados públicos brasileiros funcionam (estáticos + atualizações ocasionais)

**Recomendação:** Aceitável. Melhor ter dados históricos verificados do que nada.

---

### Cenário Otimista (Se tudo der certo)

**Junho 2027 (após D3–D6):**
- ✅ 758k decisões monocráticas (histórico) + novos dados (2x semana)
- ✅ 100+ processos emblemáticos documentados
- ✅ 50+ temas RG em detalhe
- ✅ Votações colegiadas de 18 meses (nov/2024–mai/2027)
- ✅ Metodologia pública + proveniência de cada dado
- ✅ Dashboard de qualidade
- ✅ 5–6 seções de análise editorial reais (não dados fabricados)

**Posicionamento:** "Referência nacional em transparência judicial" (Luiz propôs em visão 2026)

**Viabilidade:** 70% (depende de sustentação operacional)

---

## CONCLUSÃO

O Observatório do STF foi construído em duas velocidades:

1. **Rápido (C0–D2):** Diagnóstico + correção de problemas críticos (scores fraudulentos, normalização bugada)
2. **Lento (D3+):** Construção de arquitetura durável

Esta Fase D3 entrega o **blueprint arquitetural** — um mapa detalhado do que *deveria* existir se começássemos hoje.

**Próximo passo:** Luiz decide se continua ou pausa.

---

# APÊNDICE A — PERGUNTAS DE VALIDAÇÃO

Se você respondeu "não" a qualquer pergunta abaixo, há um gap na arquitetura:

1. **Conceitual:** Você consegue explicar a diferença entre decisão monocrática e votação colegiada para um jornalista?  
   → Sim = conceito claro. Não = D3 precisa corrigir diagrama.

2. **Operacional:** Você sabe qual foi o última ingestão de dados e qual foi o resultado (quantos registros)?  
   → Sim = proveniência rastreável. Não = INGESTAO_LOG não implementado.

3. **Qualidade:** Você sabe quantos registros históricos tem voto misclassificado?  
   → Sim (133.681) = auditoria completa. Não = D2 não foi lido.

4. **Público:** Você consegue dizer ao leitor "por que suspendemosScores ideológicos"?  
   → Sim = metodologia transparente. Não = docs/auditoria-integridade-dados.md não é suficiente.

5. **Futuro:** Você sabe o que precisa fazer para que votações colegiadas funcionem?  
   → Sim = seção 7.1 oferece pipeline. Não = D3 precisa detalhar mais.

---

**Documento pronto para aprovação editorial.**

---
