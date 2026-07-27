# Ingestão de Votações do STF — Arquitetura, WIF e Dry-Run (Fase D1)

Este documento descreve a recuperação governada da ingestão oficial de votações
do Observatório do STF (`.github/workflows/ingestao-diaria.yml` →
`ingestao/stf/fetch_votacoes_bigquery.py` → `public.stf_votacoes`), feita na
Fase D1 (2026-07-27). Não contém nenhum valor de secret.

> **Atualização — Fase D2 (2026-07-27):** a fonte BigQuery
> (`basedosdados.br_stf_corte_aberta.decisoes`) está estática desde
> março/2025 e não tem nenhum dado além de 19/01/2025 — por isso `ano=2026`
> retorna zero (não é um bug de query). O bug de normalização descrito na
> seção 13 abaixo **foi corrigido localmente** nesta fase, mas a correção
> ainda não foi commitada nem reingerida. Auditoria completa, com números e
> plano de correção do histórico, em
> [`docs/auditoria-fonte-e-normalizacao-votacoes.md`](./auditoria-fonte-e-normalizacao-votacoes.md).

## 1. Causa-raiz da falha original

O workflow autenticava no Google Cloud com uma chave JSON de service account
via `credentials_json: ${{ secrets.GCP_SA_KEY }}`. O secret `GCP_SA_KEY` nunca
foi configurado no repositório GitHub (chegava como string vazia), então o
step "Autenticar no Google Cloud" falhava sempre, e a ingestão diária nunca
rodava. Os secrets `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` também não
existiam no GitHub — só no `.env` local, corretamente ignorado pelo Git.
Diagnóstico completo em `docs/auditoria-integridade-dados.md`.

## 2. Por que não existe (e não deve existir) chave JSON

Em vez de recriar uma chave JSON permanente — que precisaria ser armazenada
como secret, rotacionada manualmente e representa uma credencial de longa
duração — a autenticação foi migrada para **Workload Identity Federation
(WIF)**. O GitHub Actions troca um token OIDC de curta duração por uma
impersonação temporária da service account, sem nenhuma chave de longo prazo
em nenhum lugar. Nenhuma chave JSON foi criada, salva em arquivo ou passada
como secret nesta fase.

## 3. Arquitetura WIF

- **Projeto GCP:** `brinsider-dou` (project number `916232285460`)
- **Service account:** `stf-votacoes-ingest@brinsider-dou.iam.gserviceaccount.com`
  ("STF Votacoes - Ingestao GitHub Actions (read-only BigQuery)")
- **Papel concedido:** `roles/bigquery.jobUser` apenas — nenhum papel Owner,
  Editor ou administrativo.
- **Workload Identity Pool:** `github-actions-pool`
- **Provider OIDC:** `github-observatorio-stf`
- **Resource name:**
  `projects/916232285460/locations/global/workloadIdentityPools/github-actions-pool/providers/github-observatorio-stf`
- **Issuer:** `https://token.actions.githubusercontent.com`

### Claims imutáveis e condition

A troca de token só é aceita quando **todos** os critérios abaixo são
verdadeiros:

```
assertion.repository_owner_id == '261022569'
assertion.repository_id == '1170322350'
assertion.ref == 'refs/heads/main'
assertion.job_workflow_ref == 'luizlessa-dev/observatorio-stf/.github/workflows/ingestao-diaria.yml@refs/heads/main'
```

Isso restringe a impersonação a este workflow específico, rodando no branch
`main` deste repositório — nenhum outro workflow, branch ou repositório pode
assumir a identidade da service account.

### Binding de impersonation

`roles/iam.workloadIdentityUser` concedido somente ao principal set limitado
por `attribute.repository_id/1170322350`. Não existe acesso pessoal residual:
o acesso temporário usado para validar a impersonação por um usuário humano
foi revogado imediatamente após o teste.

## 4. Secrets necessários

Apenas dois secrets do Supabase são configurados no GitHub Actions
(`gh secret list` neste repositório):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Não existe (e não deve existir) `GCP_SA_KEY` — a autenticação GCP usa WIF, sem
secret de credencial. Os dois secrets do Supabase só são expostos como
variável de ambiente no step "Fetch votações (BigQuery — Corte Aberta)",
nunca no step de autenticação GCP, checkout, setup do Python ou qualquer
action de terceiros.

## 5. Tabela de destino (trava explícita)

`ingestao/stf/fetch_votacoes_bigquery.py` define:

```python
DESTINATION_SCHEMA = "public"
DESTINATION_TABLE = "stf_votacoes"
```

e a função `resolver_destino()`, chamada no início de `run()`, que falha com
`RuntimeError` se o destino resolvido não for exatamente `public.stf_votacoes`
— schema diferente de `public`, tabela vazia, sem prefixo `stf_`, ou qualquer
nome diferente de `stf_votacoes`. O nome não vem de argumento de linha de
comando nem de variável de ambiente, propositalmente: só muda se alguém editar
a constante conscientemente. Testes em
`ingestao/stf/tests/test_fetch_votacoes_bigquery.py` cobrem os quatro modos de
falha.

## 6. Dry-run manual

`workflow_dispatch` expõe o input booleano `dry_run` (obrigatório, padrão
`true`). O step de execução calcula a flag de forma **fail-closed**: qualquer
valor diferente da string `"false"` resulta em `--dry-run` — inclusive
ausência do input, caso o schedule volte a ser usado sem essa entrada. Só
roda com escrita real quando `dry_run` for explicitamente `false`.

Em `--dry-run`, o script:
- autentica normalmente via WIF e consulta o BigQuery de verdade;
- resolve e imprime a tabela de destino autorizada (`public.stf_votacoes`)
  antes de qualquer outra operação;
- monta os lotes e os deduplica normalmente;
- **nunca chama `.upsert()`** — todas as chamadas de escrita estão atrás de
  `if not dry_run:` (verificado estaticamente em
  `ingestao/stf/tests/test_fetch_votacoes_bigquery.py::TestGuardaDeEscritaNoCodigoFonte`);
- não toca em `stf_ingestao_log` (essa tabela não é referenciada em nenhum
  lugar deste script).

Para executar manualmente: aba Actions → "Ingestão Diária — STF" → *Run
workflow* → `dry_run: true` (padrão) → *Run workflow*.

O script não possui flag de limite de amostra (`--limit`); só aceita `--ano`
e `--dry-run`. Não foi adicionada uma flag que o script não reconhece — o
dry-run já é seguro porque nunca escreve, independentemente do volume
consultado no BigQuery.

## 7. Ingestão real futura

1. Rodar `workflow_dispatch` com `dry_run: false` (ou aguardar o cron, uma vez
   reativado).
2. Confirmar no log que a tabela de destino impressa é `public.stf_votacoes`.
3. Rodar novamente (mesma janela/ano) e confirmar idempotência: `upsert` com
   `on_conflict="ministro_id,processo,data"` deve produzir exatamente o mesmo
   total de linhas, sem duplicatas.
4. Só então reativar o `schedule` (ver seção 9).

## 8. Concorrência e timeout

```yaml
concurrency:
  group: ingestao-stf-votacoes
  cancel-in-progress: false
timeout-minutes: 30
```

Impede duas ingestões simultâneas; uma execução em andamento nunca é
cancelada para dar lugar a outra. O job falha explicitamente após 30 minutos
em vez de ficar pendurado indefinidamente.

## 9. Cron (schedule)

O `schedule: cron: "0 8 * * *"` está temporariamente comentado em
`.github/workflows/ingestao-diaria.yml`, com um comentário explicando por
quê. Reative descomentando as duas linhas somente depois que:

1. o dry-run manual validar o caminho completo GitHub OIDC → WIF → BigQuery;
2. a primeira ingestão real controlada for validada;
3. o teste de idempotência (segunda execução) confirmar zero duplicatas novas.

## 10. Scores termômetro — permanecem desativados

O step "Calcular scores termômetro (suspenso — Fase C1)" continua com
`if: ${{ false }}`. Nenhuma mudança desta fase reativa esse cálculo. Ver
`docs/auditoria-integridade-dados.md` para o motivo da suspensão (falta de
sustentação metodológica). Reativar exige decisão editorial consciente com
metodologia publicada — não é uma mudança técnica.

## 11. Diagnóstico

- **Ver se a última execução rodou:** aba Actions do repositório, workflow
  "Ingestão Diária — STF".
- **Ver se WIF está autenticando:** step "Autenticar no Google Cloud" no log
  do run — sucesso indica troca de token OIDC e impersonação corretas.
- **Ver se os secrets do Supabase existem:** `gh secret list` (mostra nome e
  data de atualização, nunca o valor).
- **Ver se o schedule está ativo:** procurar por uma linha `schedule:` não
  comentada em `.github/workflows/ingestao-diaria.yml`.
- **Conferir baseline do banco:** contagem, min/max de `data`, duplicatas por
  `(ministro_id, processo, data)` e nulos em `stf_votacoes` — ver seção 12 do
  briefing original da Fase D1 para as queries usadas.

## 12. Rotação e revogação

- **Revogar a service account:** remover o binding
  `roles/iam.workloadIdentityUser` do principal set do provider, ou desativar
  a service account no console GCP (IAM → Service Accounts).
- **Girar os secrets do Supabase:** gerar nova `service_role key` no painel do
  Supabase (Settings → API) e rodar novamente
  `gh secret set SUPABASE_SERVICE_ROLE_KEY --body "<novo valor>"` — o valor
  nunca deve ser digitado em texto solto num terminal compartilhado nem
  commitado.
- **Não existe chave JSON para rotacionar** — essa é justamente a vantagem do
  WIF sobre `GCP_SA_KEY`.

## 13. Limitações conhecidas da fonte / riscos em aberto

- **Bug em `normalizar_voto`/`normalizar_resultado` (achado na Fase D1,
  corrigido localmente na Fase D2 — ainda não commitado nem reingerido):**
  as duas funções faziam correspondência por substring (`if k in a`) sobre
  `MAPA_VOTO`/`MAPA_RESULTADO`, cuja ordem de inserção testava
  `"deferido"`, `"provido"` e `"procedente"` antes de `"indeferido"`,
  `"não provido"` e `"improcedente"` — que os contêm como substring.
  Resultado: andamentos que deveriam cair em `"contra"`/`"improcedente"`
  (indeferido, não provido, improcedente, "X em parte") eram classificados
  como `"favor"`/`"procedente"`. A correção (Fase D2) ordena as chaves por
  comprimento decrescente antes de comparar, o que corrige a família inteira
  do bug por construção, e normaliza caixa/acentuação antes da comparação.
  Testes atualizados em `ingestao/stf/tests/test_fetch_votacoes_bigquery.py`
  (`TestNormalizacaoVoto`, `TestNormalizacaoResultado`) agora exigem o
  comportamento correto. Estimativa de impacto histórico (~133.681
  registros, ~17,6% de `stf_votacoes`) e plano de correção do histórico já
  ingerido em
  [`docs/auditoria-fonte-e-normalizacao-votacoes.md`](./auditoria-fonte-e-normalizacao-votacoes.md#10-impacto-histórico).
  **A reingestão retroativa não foi executada — depende de decisão editorial
  separada.**
- `tipo_julgamento = 'Monocrática'` só cobre decisões monocráticas — decisões
  colegiadas (voto coletivo, 355.996 registros na fonte) não são
  desagregadas por este script. A própria adequação do nome `stf_votacoes`
  para decisões monocráticas (majoritariamente processuais, não julgamentos
  de mérito) é questionada na auditoria da Fase D2, seção 12.
- `MAPA_MINISTRO` é uma lista fechada; relatores fora dela (grafias novas,
  ministros não mapeados) são contados em `sem_ministro` e descartados, sem
  falhar a execução.
- A fonte BigQuery (`basedosdados.br_stf_corte_aberta.decisoes`) está estática
  desde março/2025, sem nenhum dado além de 19/01/2025 — é por isso que
  `ano=2026` (e mesmo boa parte de 2025) retorna zero, não por bug de query.
  O CSV oficial (`fetch_votacoes_csv.py`) está com a URL morta (404) e a
  implementação incompleta (sem resolução de `ministro_id`, sem upsert). Hoje
  não há caminho funcional para dados mais recentes que 19/01/2025. Ver
  auditoria da Fase D2, seções 2–4 e 7.
