# Auditoria Formal de Integridade Editorial e dos Dados — Observatório do STF

**Fase B.** Executada em sequência à Fase C0 (contenção emergencial de integridade).
Repositório: `luizlessa-dev/observatorio-stf` · branch `main` · commit-base `b73100c`.
Data da auditoria: 2026-07-26.

Este documento não avalia se as posições de voto dos ministros presentes no banco são
corretas — isso está fora do escopo desta fase. Avalia se o que está publicado ou pronto
para publicação tem sustentação (fonte, metodologia, automação, validação) proporcional
à afirmação que faz.

Cada item usa este formato (todos os 18 campos do escopo, quando aplicável):

```
Identificador · Local público · Origem no código · Armazenamento · Valor/formato ·
Natureza · Fonte declarada · Fonte verificada · Período · Data de coleta ·
Metodologia · Automação · Validação · Confiabilidade · Risco · Estado público ·
Ação · Dependência
```

Legenda de **Estado público**: `publicado` (visível antes da C0) · `contido`
(retirado nesta contenção) · `nunca exposto` · `stub`.

---

## 1. Home (`/` = `/ministros`)

### 1.1 Faixa de indicadores (ex-StatsStrip)
- **Local público:** `/`, componente `src/components/layout/StatsStrip.tsx`
- **Origem no código:** array `STATS` hardcoded, sem query a banco ou API
- **Armazenamento:** literal no componente (nenhum)
- **Valor/formato (antes da C0):** "2.847 processos políticos ativos ▲143",
  "89 teses de repercussão geral", "34 casos prescritos (5 anos) — taxa 18%",
  "Gasto médio CEAPS/ministro R$ 47k ▲12% vs 2025"
- **Natureza:** demonstrativo (números de exemplo/placeholder que nunca foram
  substituídos por dados reais)
- **Fonte declarada:** nenhuma (nenhum dos 4 cards tinha atribuição de fonte na UI)
- **Fonte verificada:** nenhuma. Não há tabela, view ou script no repositório que
  produza "processos políticos ativos", "teses de repercussão geral" (o valor real,
  1.470, existe e diverge de "89"), "casos prescritos" ou "gasto médio CEAPS" (CEAPS
  não existe para o Judiciário — ver item 1.2).
- **Período:** não informado
- **Data de coleta:** não informado / nunca coletado
- **Metodologia:** nenhuma
- **Automação:** nenhuma (valor fixo desde a criação do componente)
- **Validação:** nenhuma
- **Confiabilidade:** **inválida**
- **Risco:** **crítico** — números de aparência precisa e institucional, sem
  qualquer sustentação, na dobra principal do site
- **Estado público:** publicado → **contido** em 2026-07-26
- **Ação:** manter contido; só republicar item a item, cada um com fonte, período
  e metodologia verificável, quando existir pipeline real por trás
- **Dependência:** para "processos políticos ativos" e "casos prescritos", depende
  de `stf_processos_politicos` sair do estado de stub (ver seção 6). Para "teses de
  repercussão geral", o dado real já existe (`total` em `useRepercussaoGeral`,
  1.470) e pode ser reaproveitado com a devida atribuição. Para "gasto CEAPS",
  não deve ser reintroduzido sob esse nome (ver 1.2).

### 1.2 Rótulo "CEAPS"
- **Local público:** estava apenas no card acima (já contido). Ocorrência não
  pública: comentário `-- Gastos (CEAPS / diárias / passagens)` em
  `supabase/migrations/0001_schema_inicial.sql:75` (comentário SQL, não afeta
  runtime nem é servido ao cliente).
- **Origem no código:** `StatsStrip.tsx` (removido) + comentário de migration
- **Natureza:** erro conceitual, não só de dado. CEAPS (Cota para o Exercício da
  Atividade Parlamentar) é um instrumento do **Legislativo** (Câmara/Senado) para
  reembolso de despesas de parlamentares. Não existe CEAPS para ministros do STF.
  O que a ingestão (`fetch_gastos.py`) efetivamente coleta é **folha de pagamento**
  do gabinete + subsídio do ministro, via `egesp-portal.stf.jus.br` — uma fonte e
  um conceito totalmente diferentes.
- **Fonte declarada:** "CEAPS" (errada)
- **Fonte verificada:** `egesp-portal.stf.jus.br/transparencia/rendimento_folha`
  (correta, mas para outro indicador — ver 2.7)
- **Confiabilidade:** inválida (a rotulagem, não o dado subjacente)
- **Risco:** **crítico** — atribuir a ministros do STF uma cota que não existe
  para o cargo é uma afirmação factualmente falsa sobre uma instituição pública
- **Estado público:** publicado → **contido**
- **Ação:** manter fora da UI. Não recriar como "gasto de gabinete" ou similar
  sem auditoria própria (ver 2.7, que já existe e é o indicador correto — mas
  também precisa de rótulo e nota metodológica antes de ganhar destaque de home).
- **Dependência:** teste `tests/integridade-c0.test.mjs` trava a reintrodução do
  termo "CEAPS" em qualquer arquivo de UI listado.

---

## 2. Ministros (`/ministros`)

### 2.1 Dados biográficos (nome, indicação, partido, cargo anterior, posse, aposentadoria)
- **Local público:** `MinistroSidebar.tsx`, `MinistroDetalhe.tsx`
- **Origem no código:** `useMinistros.ts` → Supabase `stf_ministros`, com
  **fallback para `src/lib/seed.ts`** quando a linha do banco não traz o campo
  ou quando `data.length === 0` (banco vazio/erro)
- **Armazenamento:** tabela `stf_ministros` (produção confirmada via schema
  introspection somente-leitura) + `MINISTROS_SEED` em `seed.ts`
- **Valor/formato:** texto livre + datas
- **Natureza:** oficial (dados públicos de composição do STF)
- **Fonte declarada:** nenhuma citação de fonte na UI
- **Fonte verificada:** não há script de ingestão para `stf_ministros` no
  repositório — a tabela foi populada pelo `insert` da própria migration
  `0001_schema_inicial.sql` (10 ministros) e por edição manual (a tabela de
  produção tem também ministros aposentados — Celso de Mello, Marco Aurélio
  Mello, Ricardo Lewandowski — usados como histórico pelos scripts de votação,
  confirmado via leitura somente-leitura do schema/dados)
- **Período:** dado vigente, sem data de corte declarada
- **Data de coleta:** não rastreada (sem `fonte`/`coletado_em` na tabela)
- **Metodologia:** nenhuma (dado factual de composição da Corte, mas mantido
  manualmente, sem processo de atualização documentado)
- **Automação:** **manual**
- **Validação:** humana, implícita, não documentada
- **Confiabilidade:** média — plausível e checável externamente, mas sem
  processo de atualização declarado (ex.: se um ministro se aposentar amanhã,
  nada no repositório automatiza a atualização de `ativo`/`data_saida`)
- **Risco:** baixo
- **Estado público:** publicado
- **Ação:** manter; documentar o processo manual de atualização como próximo
  passo de robustez (fora do escopo desta contenção)
- **Dependência:** nenhuma

### 2.2 Tags pessoais/religiosas/ideológicas
- **Local público (antes da C0):** badges abaixo do nome em `MinistroSidebar.tsx`
- **Origem no código:** array `tags: string[]` por ministro em `seed.ts`
- **Armazenamento:** **somente no frontend** — a tabela `stf_ministros` de
  produção **não tem coluna `tags`** (confirmado via introspecção somente-leitura
  do schema). O array vivia inteiramente em `seed.ts`, que é bundlado no
  JavaScript público do site.
- **Valor/formato:** `"Religioso"`, `"Anti-aborto"`, `"Evangélico"`,
  `"Conservador atual"`, `"Mercado"`, e também `"Garantismo"`, `"Dir. humanos"`,
  `"Democracia digital"`, `"Seg. pública"`
- **Natureza:** editorial, sem metodologia declarada
- **Fonte declarada:** nenhuma
- **Fonte verificada:** nenhuma — não há critério, corpus ou processo
  documentado que justifique classificar um ministro do STF como "Religioso"
  ou "Evangélico" (dado de foro íntimo/religioso) ou "Anti-aborto" (posição em
  matéria sub judice)
- **Metodologia:** inexistente
- **Automação:** manual (literal hardcoded)
- **Validação:** nenhuma
- **Confiabilidade:** **inválida**
- **Risco:** **crítico** — classificação de convicção religiosa e posição em
  tema sensível (aborto) atribuída nominalmente a autoridades públicas, sem
  base documentada, é o item de maior risco reputacional/jurídico do site
- **Estado público:** publicado → **contido** em 2026-07-26
- **Ação de contenção aplicada:** (a) removida a renderização em
  `MinistroSidebar.tsx`; (b) **os valores em `seed.ts` foram esvaziados**
  (`tags: []` para todos os 10 ministros), porque a suspensão de renderização
  por si só não bastava — o array é bundlado no JS público e permanece
  extraível por qualquer pessoa que inspecione o bundle, mesmo sem ser
  renderizado (verificado: antes de esvaziar os dados, `grep` no
  `dist/assets/*.js` pós-build ainda encontrava "Religioso", "Evangélico",
  "Anti-aborto", "Conservador atual", "Mercado"; depois de esvaziar, não).
  O campo `tags` permanece no tipo `Ministro` e a interface não foi alterada,
  só os valores.
- **Dependência:** nenhuma tecnicamente; **decisão pendente** sobre se/como
  reintroduzir alguma forma de tag editorial no futuro exigiria metodologia
  documentada e, dado que é dado bundlado no cliente, uma revisão editorial
  explícita antes de qualquer novo valor entrar em `seed.ts`.

### 2.3 Termômetro / scores ideológicos (score_geral e 5 dimensões)
- **Local público (antes da C0):** barra de gradiente + grid de 5 caixas em
  `MinistroDetalhe.tsx`; mini-barra em `MinistroSidebar.tsx`
- **Origem no código:** `ingestao/stf/calc_scores_termometro.py`, escrito em
  `stf_ministros.score_geral` e 5 colunas de dimensão
- **Armazenamento:** tabela `stf_ministros` (colunas reais, confirmadas em
  produção)
- **Valor/formato:** número 0–10 por dimensão + label "Conservador / Centro /
  Progressista"
- **Natureza:** cálculo (heurística)
- **Fonte declarada:** nenhuma na UI (a barra não tinha nenhuma nota
  metodológica visível ao usuário final)
- **Fonte verificada:** decisões monocráticas do STF via BigQuery
  (`basedosdados.br_stf_corte_aberta.decisoes`), mas processadas por uma
  heurística própria, não por uma fonte que já classifique ideologia
- **Período:** decisões monocráticas do ano corrente (o script roda por
  `--ano`, default ano atual) — **não há histórico multi-ano acumulado por
  padrão de execução**
- **Data de coleta:** `updated_at` mais recente em `stf_ministros` = **2026-07-01**
  (confirmado por leitura somente-leitura), ou seja, os scores hoje expostos
  têm **25 dias de defasagem** em relação à data desta auditoria
- **Metodologia (documentada no próprio script, resumida):**
  - Usa *keyword matching* simples (substring, case-insensitive) no campo
    `ementa` de `stf_votacoes` (que na prática recebe o `assunto_processo`
    truncado a 500 caracteres vindo do BigQuery — não é a ementa jurídica
    real da decisão)
  - `MIN_VOTOS_RELEVANTES = 3`: um ministro entra no cálculo de uma dimensão
    com apenas 3 votos relevantes no período
  - Normalização por Z-score **entre os ministros do conjunto atual** — os
    valores são relativos à composição da Corte no momento do cálculo, não
    absolutos; o mesmo ministro pode ter score diferente só porque a
    composição da Corte mudou, sem que sua conduta tenha mudado
  - Ausência de dado (menos de 3 votos relevantes) e desvio-padrão zero geram
    fallback silencioso para **5.0 ("neutro")** — indistinguível, na UI, de um
    ministro genuinamente centrista
  - A dimensão econômica tem o próprio autor do script marcando incerteza no
    comentário (`"favor em tributário = pro-fisco/estado = progressista?"`)
    e reduz o peso da dimensão via flag `"neutro": True`
  - Nenhuma validação humana, nenhuma amostra de auditoria, nenhum teste de
    reprodutibilidade documentado
- **Automação:** GitHub Actions, cron diário `0 8 * * *` — **mas nunca
  executou com sucesso no período observável**: as 25 execuções mais recentes
  do workflow (`gh run list`, de 2026-07-02 a 2026-07-26) **falharam todas**,
  no step "Autenticar no Google Cloud", porque o secret `GCP_SA_KEY` não está
  configurado corretamente ("must specify exactly one of
  `workload_identity_provider` or `credentials_json`"). Como
  `calc_scores_termometro.py` roda no mesmo job, depois do fetch de votações,
  ele nunca chega a executar via automação nessas 25 tentativas — o dado de
  2026-07-01 veio de uma execução manual/local, fora do GitHub Actions.
- **Validação:** nenhuma
- **Confiabilidade:** **baixa/inválida** para uso editorial direto — é uma
  heurística exploratória, com amostra mínima pequena, normalização relativa
  e fallback que mascara ausência de dado como neutralidade
- **Risco:** **crítico**
- **Estado público:** publicado → **contido na UI** em 2026-07-26 (ver ressalva
  abaixo)
- **⚠️ Ressalva importante — exposição residual via API:** a contenção desta
  fase suspendeu a **renderização** do termômetro. Verificação somente-leitura
  feita durante esta auditoria mostra que a chave pública `anon` (a mesma já
  embutida no bundle do site) consegue ler `score_geral` e as 5 colunas de
  dimensão diretamente via API REST do Supabase
  (`GET /rest/v1/stf_ministros?select=nome,score_geral,...`), **independente
  da UI**. Ou seja: qualquer pessoa que inspecione a aba de rede do navegador,
  ou monte a URL manualmente, ainda acessa os mesmos scores que acabaram de
  ser retirados da tela. **Esta contenção não elimina a exposição pública do
  dado — reduz a exposição passiva (a maioria dos visitantes), mas não a
  exposição a quem procurar.** Corrigir isso exigiria mudança de RLS/grants
  em produção, que está fora do escopo autorizado desta fase (ver relatório
  final, seção de riscos remanescentes — é o risco nº 1 da lista).
- **Ação:** manter fora da UI; não há correção metodológica proposta nesta
  fase (fora de escopo). Antes de qualquer republicação, decidir se a
  heurística serve como (a) ferramenta exploratória interna, nunca pública;
  (b) base para um sistema supervisionado com validação humana amostral; ou
  (c) descontinuada. Dado o fallback de 5.0 mascarando ausência de dado e a
  normalização relativa (não comparável entre cortes de composições
  diferentes), a opção (a) é a mais defensável no estado atual.
- **Dependência:** correção do secret `GCP_SA_KEY` (ou re-arquitetura de
  auth) antes de qualquer recálculo automatizado voltar a rodar; decisão
  explícita sobre exposição via API (RLS/grants), fora do escopo C0.

---

## 3. Repercussão Geral (`/repercussao-geral`)

- **Local público:** `src/pages/RepercussaoGeral.tsx` via `useRepercussaoGeral.ts`
- **Origem no código:** `ingestao/stf/fetch_repercussao_geral.py`
  (temas/título/tese/status/leading case/destaque) + `fetch_processos_imp.py`
  (contagem de processos sobrestados, depende de `incidente_id`)
- **Armazenamento:** `stf_repercussao_geral`, 1.470 registros (confirmado)
- **Valor/formato:** tabela paginada, filtros por status, busca por título
- **Natureza:** oficial (fonte primária: portal STF) + 1 campo curatorial
  (`destaque`)
- **Fonte declarada:** nenhuma citação explícita na UI (a página não linka a
  fonte STF)
- **Fonte verificada:** `portal.stf.jus.br/jurisprudenciaRepercussao/` — confere
- **Período:** histórico completo (1.470 temas)
- **Data de coleta:** não exibida ao usuário; não há campo "atualizado em" na
  UI
- **Metodologia:**
  - `status` inferido por regex sobre texto livre do portal
    (`"trânsito"/"transitado"/"julgado"/"mérito"` → `julgado`;
    `"sobrestado"` → `sobrestado`; senão `pendente`) — heurística textual,
    sem validação cruzada
  - `destaque` (a estrela ★ que prioriza a ordenação): lista fixa de 71
    números de tema no código-fonte (`TEMAS_DESTAQUE`), **sem nenhum critério
    documentado** de por que esses 71 e não outros — é curadoria editorial
    não documentada, embutida como se fosse dado
  - **Achado de integridade de pipeline:** o `upsert` de
    `fetch_repercussao_geral.py` **não inclui o campo `incidente_id`** no
    payload. Porém, a verificação somente-leitura em produção mostra que
    **100% dos 1.470 registros têm `incidente_id` e `processos_imp`
    preenchidos**. Isso significa que **o script hoje versionado no
    repositório não é suficiente para reproduzir o estado atual do banco** —
    o preenchimento de `incidente_id` veio de um processo que não está (ou
    não está mais) no repositório. `processos_imp` está, portanto,
    funcionalmente preenchido para todos os temas, mas por um caminho que a
    Fase B não conseguiu localizar no código versionado.
- **Automação:** nenhuma — **não está no workflow do GitHub Actions**
  (`.github/workflows/ingestao-diaria.yml` só roda `fetch_votacoes_bigquery.py`
  e `calc_scores_termometro.py`). `fetch_repercussao_geral.py` e
  `fetch_processos_imp.py` são scripts de execução manual.
- **Validação:** nenhuma documentada
- **Confiabilidade:** média-alta para os campos oficiais (título, tese, status,
  leading case); baixa para `destaque` (curadoria não documentada); indeterminada
  para `processos_imp`/`incidente_id` (dado presente mas com origem não
  rastreável no repositório)
- **Risco:** médio (não é dado fabricado, mas tem lacuna de reprodutibilidade
  e falta de transparência de fonte/atualização na própria UI)
- **Estado público:** publicado (mantido — não fazia parte do escopo de
  contenção da C0, não há number fabricado nem classificação pessoal aqui)
- **Ação:** manter publicado; adicionar nota de fonte/data de atualização na
  UI e documentar o processo que preenche `incidente_id` (ou recriá-lo dentro
  do repositório) — recomendação para Fase E/D, não executada agora
- **Dependência:** nenhuma para manter no ar; localizar/recriar o processo de
  `incidente_id` antes de confiar no campo `processos_imp` para qualquer uso
  editorial novo

---

## 4. Votações

### 4.1 Pipeline BigQuery (`fetch_votacoes_bigquery.py`)
- **Fonte:** `basedosdados.br_stf_corte_aberta.decisoes` (Base dos Dados),
  projeto de billing `brinsider-dou`
- **Cobertura:** decisões monocráticas (`tipo_julgamento = 'Monocrática'`),
  filtráveis por ano
- **Identificadores:** chave de upsert `ministro_id, processo, data`
- **Campos:** classe, número, relator, andamento→voto/resultado normalizado,
  assunto_processo (truncado 500 char, salvo na coluna `ementa`)
- **Frequência:** desenhado para cron diário; **na prática, nunca completou
  com sucesso nas últimas 25 execuções agendadas** (falha de auth GCP — ver
  2.3). Volume atual em produção: **758.714 registros**, `created_at` mais
  recente = **2026-07-01** (última carga bem-sucedida, fora do GHA).
- **Qualidade:** mapeamento de `andamento` (texto livre do BigQuery) para
  voto/resultado via dicionário de 12 termos — cobre os casos mais comuns;
  qualquer andamento fora do dicionário cai em `"ausente"` silenciosamente
  (sem contagem de quantos casos isso afeta)
- **Custo:** consulta BigQuery (billing por volume lido), custo não
  monitorado no pipeline
- **Dependências:** `GCP_SA_KEY` (quebrado), `stf_ministros` populada,
  Workload Identity ou credenciais válidas
- **Riscos:** pipeline principal e único funcionalmente ativo (quando
  autentica) para votações; ponto único de falha do "termômetro" também
  depende dele
- **Duplicidade/conflito:** upsert com `on_conflict=ministro_id,processo,data`
  evita duplicação de linha, mas duas decisões no mesmo processo/dia para o
  mesmo ministro (raro, mas possível) se sobrescrevem
- **Recomendação de fonte principal:** **sim** — é a única fonte com dado real
  em produção hoje

### 4.2 Pipeline CSV (`fetch_votacoes_csv.py`)
- **Fonte:** `transparencia.stf.jus.br/extensions/decisoes/decisoes.csv`
- **Estado:** **incompleto/inerte**. O script baixa e normaliza o CSV, mas:
  (a) a linha de `upsert` está **comentada** (`# sb.table(...).upsert(...)`);
  (b) há um `TODO` explícito não resolvido: `"resolver ministro_id via nome
  do ministro no CSV"` — sem esse mapeamento, o script não teria como montar
  a foreign key mesmo se o upsert fosse reativado
- **Qualidade:** funções de normalização (`normalizar_voto`,
  `normalizar_resultado`) existem e parecem corretas, mas nunca são
  exercitadas em produção porque o `run()` não persiste nada
- **Frequência:** não roda em nenhum lugar (não está no workflow)
- **Recomendação de fallback:** **não**, no estado atual — precisa de
  desenvolvimento (resolver ministro_id, reativar upsert, decidir estratégia
  de conflito com a base do BigQuery) antes de ser considerado um fallback
  funcional. Documentar como "pipeline não implementado", não como "pipeline
  secundário existente".

---

## 5. Gastos (`/ministros` → bloco "Custo ao erário" no perfil)

- **Local público:** bloco "Custo ao erário" em `MinistroDetalhe.tsx`
  (Subsídio, Custo do gabinete, Total mensal)
- **Origem no código:** `ingestao/stf/fetch_gastos.py`
- **Armazenamento:** `stf_gastos`
- **Endpoint oficial:** `egesp-portal.stf.jus.br/transparencia/rendimento_folha`
  (folha de pagamento, paginada, ~96 páginas) + valor fixo de subsídio
  (`R$ 46.366,19`, hardcoded no script, não raspado)
- **Scraping:** sim, via `requests` + `BeautifulSoup`, sem tratamento de rate
  limit além de `time.sleep(0.3)` entre páginas
- **Subsídio fixo:** hardcoded no script (`SUBSIDIO_MINISTRO = 46366.19`) —
  qualquer reajuste de subsídio exige alteração manual do script
- **Despesas de gabinete:** soma da remuneração bruta de todos os servidores
  lotados em "GABINETE MINISTRO X" (é folha de pagamento agregada, **não**
  despesa de viagem/diária/CEAPS)
- **Periodicidade:** mensal (a página de origem publica por mês de referência)
- **Unidade/competência:** R$ mensal, mês/ano extraídos do texto da própria
  página ("Referência: Maio/2026")
- **Campo `fonte`:** enviado por `fetch_gastos.py` no payload de upsert.
  **Divergência checada nesta auditoria:**
  - `supabase/migrations/0001_schema_inicial.sql` (versionado no repo) **não
    tem** a coluna `fonte` em `stf_gastos`
  - `src/types/database.ts` (versionado no repo) **também não tem** `fonte`
    em `stf_gastos.Row`
  - A introspecção somente-leitura do schema **em produção** mostra que a
    tabela real **tem, sim, a coluna `fonte`** — e também `data_inicio`,
    `data_fim`, `destino`, `num_diarias`, nenhuma dessas presente na migration
    local
  - **Classificação: comportamento tolerado / migration e types desatualizados
    em relação à produção**, não falha de ingestão. O upsert do script
    funciona porque a coluna existe de fato; o que está errado é que o
    schema versionado no repositório não reflete o schema real — alguém
    alterou a tabela em produção (provavelmente via SQL direto ou dashboard)
    sem registrar uma nova migration. Confirmado visualmente: o bloco "Custo
    ao erário" carrega e exibe valores reais no perfil de Gilmar Mendes
    (Subsídio R$ 46.366, Gabinete R$ 863.860/36 servidores, Total R$ 910.227,
    ref. jun/2026) durante a inspeção visual desta fase — o pipeline
    funciona na prática.
- **Divergência script × migration:** confirmada (ver acima) — risco de
  governança, não de exposição pública
- **Estado real da ingestão:** funcional, dado carregando corretamente na UI;
  última referência observada: **jun/2026**
- **Último registro disponível:** jun/2026 (mês de referência mais recente
  observado na amostra)
- **Automação:** **manual** — não está no workflow do GitHub Actions
- **Confiabilidade:** média-alta para o valor numérico em si (fonte oficial,
  script coerente); baixa para a governança do schema (migration não reflete
  produção)
- **Risco:** médio (rótulo já corrigido ao sair "CEAPS" da home; divergência
  de schema é risco operacional, não editorial)
- **Estado público:** publicado (mantido — não fazia parte do escopo de
  remoção da C0; o problema era o rótulo "CEAPS" na home, já contido)
- **Ação:** manter publicado; escrever uma migration nova que capture o
  schema real de `stf_gastos` (incluindo `fonte`, `data_inicio`, `data_fim`,
  `destino`, `num_diarias`) e regenerar `types/database.ts` — recomendação
  para Fase D/E, não executada agora (proibido rodar migration nesta fase)
- **Dependência:** nenhuma para manter no ar hoje

---

## 6. Processos (`/processos`)

- **Stub público:** sim — página mostra apenas mensagem de "ainda não
  publicado" (atualizada nesta fase, sem números, sem promessa de data)
- **Scripts existentes:** nenhum script de ingestão para
  `stf_processos_politicos` no repositório
- **Tabelas existentes:** `stf_processos_politicos` existe na migration
  local; **não foi verificada em produção nesta auditoria** (fora do escopo
  crítico da C0 e sem uso no frontend hoje — verificação de leitura poderia
  ser feita em fase futura sem risco, mas não foi priorizada aqui)
- **Hacks de sessão/cookie:** nenhum nesta página (o hack de sessão existe em
  `fetch_processos_imp.py`, que é sobre repercussão geral, não sobre esta
  rota — nome parecido, tabelas diferentes; vale desambiguar em Fase E)
- **Estabilidade:** página estática, sem risco de quebra
- **Quantidade de registros:** não verificado (sem consumidor no frontend)
- **Uso real no frontend:** nenhum — rota é 100% stub
- **Risco:** baixo hoje (não expõe nada); médio se o nav continuar prometendo
  algo que não existe por muito tempo (dano de credibilidade, não de dado)
- **Estado público:** `stub`
- **Ação:** manter como stub sinalizado; não implementar agora (fora de
  escopo). Recomendação de nomenclatura para Fase E: dividir em rotas mais
  específicas e verificáveis (`/foro-por-prerrogativa`, `/processos`,
  `/prescricoes`) em vez de uma única categoria genérica "Processos
  Políticos", que já embute um enquadramento editorial não documentado.
- **Dependência:** decisão editorial sobre escopo antes de qualquer ingestão

---

## 7. Impunidade (`/impunidade`)

- **Stub público:** sim (mensagem neutra atualizada nesta fase)
- **Carga editorial do termo:** o nome da rota e do item de navegação
  ("Impunidade") é, em si, uma conclusão, não uma categoria neutra de dado —
  pressupõe que os processos ali listados terminaram em impunidade antes de
  qualquer critério estar documentado
- **Scripts/tabelas:** nenhum específico — não há `stf_impunidade` nem
  equivalente na migration
- **Risco:** médio — mesmo vazio, o item de menu carrega uma afirmação
  editorial forte sem lastro
- **Estado público:** `stub`
- **Ação:** manter como stub sinalizado agora. **Recomendação para Fase E**
  (não implementada nesta fase, por estar fora do escopo de restruturação de
  rotas): renomear para algo que descreva o critério de dado, não a
  conclusão — por exemplo `/prescricoes` (prescrição é um evento processual
  verificável) — e só popular depois de metodologia documentada de "o que
  conta como impunidade" (prescrição? arquivamento? absolvição? cada um tem
  significado jurídico distinto e não são intercambiáveis).
- **Dependência:** decisão editorial explícita sobre metodologia antes de
  qualquer implementação

---

## 8. Doadores e indicantes

- **Tabela:** `stf_doadores_indicante`, presente na migration local
  (`0001_schema_inicial.sql`) e em `src/types/database.ts`
- **Verificação em produção (somente-leitura, nesta auditoria):** a tabela
  **não aparece no schema exposto pela API**, mesmo consultando com a chave
  `service_role` (que enxerga todas as 531 tabelas do projeto às quais tem
  grant) — ou seja, **`stf_doadores_indicante` não existe hoje em produção**,
  apesar de estar declarada na migration versionada.
- **Script:** `ingestao/tse/fetch_doadores_indicante.py` — **este é o arquivo
  que já aparecia deletado no working tree antes desta fase; não foi tocado,
  restaurado nem alterado nesta auditoria**, apenas inspecionado
  somente-leitura via `git show HEAD:...` para fins de documentação. Seu
  conteúdo no último commit confirma que era um **stub não funcional**: os
  CPFs dos presidentes indicantes estão como placeholder (`"cpf": "---"`) e
  a consulta real está comentada como `TODO` — o script nunca chegou a
  buscar ou gravar um doador real.
- **Tipos:** declarados em `database.ts`, também não refletem a produção real
  (tabela inexistente)
- **Histórico do frontend:** nenhuma tela, componente ou hook no repositório
  jamais consumiu `stf_doadores_indicante` (confirmado por busca no código-fonte)
- **Ausência atual na interface:** total — nunca esteve na UI
- **Risco reputacional:** **baixo hoje** (nada publicado, nada implementado
  de fato, tabela nem existe), mas **o tema é sensível** (cruzar doadores de
  campanha dos presidentes com os ministros que eles indicaram) e merece
  decisão explícita antes de qualquer retomada
- **Recomendação:** **arquivar formalmente.** Como a tabela não existe em
  produção e o script nunca funcionou, a opção mais limpa é: (a) remover a
  declaração de `stf_doadores_indicante` de `types/database.ts` e da migration
  local na próxima migration nova (não nesta fase — seria alteração de
  schema), documentando que o recurso foi descontinuado antes de nascer; ou
  (b) tratar como backlog real e reconstruir do zero, com fonte de dado TSE
  definida (hoje o comentário do script aponta para depender de outro
  repositório, `brasilia-insider`, que não está disponível neste projeto) e
  metodologia de cruzamento auditável. Não fazer nada é a pior opção, porque
  deixa o repositório afirmando (via migration/types) que um recurso existe
  quando ele não existe nem no banco nem no produto.
- **Impacto da deleção não commitada já existente:** a exclusão de
  `ingestao/tse/fetch_doadores_indicante.py` já presente no working tree antes
  desta fase é **consistente com a recomendação acima** (o script nunca
  funcionou e a tabela não existe) — mas essa decisão não foi tomada por mim
  nesta execução e a alteração **permanece não commitada e não analisada
  como decisão formal**, exatamente como estava. Só será tratada como
  decisão real quando alguém revisar e commitar conscientemente.

---

## 9. Pipelines — GitHub Actions (`.github/workflows/ingestao-diaria.yml`)

- **Scripts executados:** apenas 2 dos 6 scripts de `ingestao/stf/` estão no
  workflow: `fetch_votacoes_bigquery.py` e `calc_scores_termometro.py`.
  `fetch_gastos.py`, `fetch_repercussao_geral.py`, `fetch_processos_imp.py` e
  `fetch_votacoes_csv.py` **não são executados por nenhuma automação** —
  dependem de alguém rodar manualmente.
- **Ordem:** sequencial, no mesmo job (`votacoes`): checkout → setup Python →
  install deps → auth GCP → fetch votações → calc scores
- **Cron:** `0 8 * * *` (08h UTC / 05h BRT), diário
- **Secrets referenciados:** `GCP_SA_KEY`, `SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY` (nomes apenas — não expostos aqui)
- **Tratamento de falha:** nenhum explícito (`continue-on-error` não é usado).
  Isso é, na prática, **positivo**: como os dois steps de dado estão no mesmo
  job sem `continue-on-error`, se o fetch de votações falhar, o cálculo de
  scores é **pulado automaticamente** pelo comportamento padrão do GitHub
  Actions — não há risco de publicar scores recalculados sobre uma ingestão
  que falhou. **Confirmado na prática**: nas 25 execuções mais recentes
  observadas, a falha de auth interrompeu o job antes do fetch e o step de
  scores nunca rodou.
- **Logs:** disponíveis via `gh run view --log-failed` (usado nesta auditoria,
  somente leitura)
- **Concorrência:** sem `concurrency:` declarado — `workflow_dispatch` manual
  rodando ao mesmo tempo que o cron agendado poderia, em teoria, correr em
  paralelo; risco baixo (upserts são idempotentes por chave)
- **Timeout:** não declarado (usa o default do runner, 6h) — não é um risco
  prático dado o volume atual
- **Retries:** nenhum
- **Execução parcial:** sim é possível dentro do laço de `fetch_votacoes_bigquery.py`
  (grava em lotes de 500, então uma falha no meio insere os lotes já
  processados) — não é um bug, é o comportamento esperado de um upsert em lote
- **Publicar scores mesmo com ingestão anterior falha:** **verificado que
  NÃO acontece**, pelo desenho do job único sequencial (ver acima)
- **Última execução (verificado nesta auditoria, somente leitura, `gh run
  list`/`gh run view`):** **falha**, 2026-07-26, step "Autenticar no Google
  Cloud", erro `google-github-actions/auth failed: the GitHub Action workflow
  must specify exactly one of "workload_identity_provider" or
  "credentials_json"` — ou seja, o secret `GCP_SA_KEY` está ausente ou vazio
  no repositório.
- **Estado:** **as últimas 25 execuções agendadas (2026-07-02 a 2026-07-26,
  toda a janela visível) falharam, 25 de 25**, todas no mesmo step, pelo
  mesmo motivo. **Nenhuma execução com sucesso está no histórico
  disponível.** Isso é a causa direta da defasagem de 25 dias nos dados de
  votação/scores mencionada nos itens 2.3 e 4.1.
- **Classificação:** **falha confirmada**, causa raiz identificada (secret
  ausente/inválido), correção fora do escopo desta fase (não é permitido
  alterar secrets/produção agora) — **recomendação de máxima prioridade**
  para a próxima fase técnica, independentemente de qualquer decisão
  editorial.

---

## 10. Resumo de risco (visão executiva)

| Item | Risco | Estado após C0 |
|---|---|---|
| 4 métricas fabricadas da home | Crítico | Contido |
| Rótulo "CEAPS" para ministro do STF | Crítico | Contido |
| Tags pessoais/religiosas/ideológicas | Crítico | Contido (UI + dado no bundle) |
| Termômetro/scores ideológicos — **exposição via UI** | Crítico | Contido |
| Termômetro/scores ideológicos — **exposição via API pública** | **Crítico, não resolvido** | Residual — fora do escopo C0 |
| Página de assinatura vende "Painel de scores G5" (feature suspensa) | **Crítico, comercial** | **Não tratado — fora do escopo desta fase por proibição explícita de mexer no paywall** |
| Pipeline de ingestão diária (GHA) | Alto | Diagnosticado, não corrigido |
| `stf_doadores_indicante` declarada mas inexistente em produção | Médio | Diagnosticado, não corrigido |
| Migration/types desatualizados vs. schema real de produção | Médio | Diagnosticado, não corrigido |
| Rótulo `destaque` em Repercussão Geral sem critério documentado | Médio | Diagnosticado, não corrigido |
| Rotas `/processos` e `/impunidade` com nomenclatura editorializada | Médio | Sinalizadas como não publicadas; renomeação recomendada para Fase E |
