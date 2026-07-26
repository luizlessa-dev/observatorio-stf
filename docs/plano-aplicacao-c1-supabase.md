# Plano de aplicação remota — Fase C1 (Supabase)

**Status: NENHUMA etapa deste plano foi executada em produção.**
Este documento descreve como aplicar, no futuro e de forma controlada, as
migrations locais `0002_reconciliacao_stf_gastos.sql` e
`0003_contencao_scores.sql`. Elaborado em 2026-07-26 (Fase C1 — contenção
residual). Diagnóstico completo em `docs/auditoria-integridade-dados.md`.

---

## 1. Contexto e alvo

- **Projeto Supabase:** `redggdtakzmsabwvjzhb` (o mesmo projeto hospeda
  tabelas do Observatório Judiciário — atenção redobrada: qualquer comando
  fora do prefixo `stf_` está fora de escopo e não deve ser executado).
- **Branch git:** `main` (commit-base `b73100c` + alterações locais C0/B/C1
  ainda não commitadas).
- **Objetos afetados:** `stf_ministros`, `stf_v_ministros_scores`,
  `stf_ministros_publicos` (nova view), `stf_gastos`,
  `stf_repercussao_geral`, e higiene de grants em `stf_assinaturas` /
  `stf_ingestao_log`. Nada além disso.

## 2. Pré-condições (obrigatórias, na ordem)

1. **Backup:** confirmar backup/PITR recente do projeto no painel Supabase
   (Database → Backups). Como a 0003 só altera grants e cria uma view, o
   risco de perda de dados é nulo, mas o backup é pré-condição de qualquer
   janela de mudança.
2. **Confirmação do schema:** re-executar a inspeção read-only e conferir
   que nada mudou desde 2026-07-26:
   - colunas de `stf_gastos` e `stf_repercussao_geral`
     (`information_schema.columns`);
   - policies (`pg_policy`) e grants (`role_table_grants`) de
     `stf_ministros`, `stf_v_ministros_scores`, `stf_assinaturas`,
     `stf_ingestao_log`.
3. **Confirmação do consumo pelo frontend:** o deploy vigente do site deve
   já conter o `useMinistros` com lista explícita de colunas (Fase C1).
   **Ordem importa:** deployar o frontend ANTES de aplicar a 0003 — o
   frontend antigo usa `select('*')`, que passa a falhar com grants por
   coluna, derrubando a lista de ministros para o seed local.
4. **Janela:** horário de baixo tráfego; ingestão diária roda 08h UTC —
   evitar a janela 07h30–09h UTC para não misturar efeitos.

## 3. Etapas de aplicação (descritas, NÃO executadas)

Aplicar via SQL Editor do painel (como `postgres`) ou `supabase db push`
se o histórico de migrations do CLI estiver reconciliado. Ordem:

1. Aplicar `supabase/migrations/0002_reconciliacao_stf_gastos.sql`.
   Em produção é essencialmente no-op (colunas já existem; só registra
   comentários) — serve para versionar o schema real.
2. Aplicar `supabase/migrations/0003_contencao_scores.sql`.
3. Registrar as duas migrations no histórico do CLI, se aplicável
   (`supabase migration repair` / inserção em
   `supabase_migrations.schema_migrations`), para que ambientes futuros
   reproduzam o mesmo estado.

## 4. Verificações ANTES de aplicar

Com cada chave/papel, executar
`GET {SUPABASE_URL}/rest/v1/stf_ministros?select=nome,score_geral&limit=1`:

| Papel | Resultado esperado ANTES |
|---|---|
| `anon` | **200 com score_geral** (é a exposição a conter) |
| `authenticated` | 200 com score_geral |
| `service_role` | 200 com score_geral |

Registrar também a lista de campos retornados por
`select=*` (anon) e as dependências conhecidas do frontend:
`stf_ministros` (colunas públicas), `stf_votacoes`, `stf_gastos`,
`stf_repercussao_geral`, `stf_assinaturas` (SELECT via authenticated).

## 5. Verificações DEPOIS de aplicar

1. **Scores não retornam ao público:**
   - `anon` + `select=nome,score_geral` → **erro de permissão** (42501);
   - `anon` + `select=*` em `stf_ministros` → erro de permissão;
   - `anon` em `stf_v_ministros_scores` → erro de permissão;
   - idem com `authenticated`.
2. **Site continua funcionando:**
   - `anon` + `select=id,nome,iniciais,data_posse,indicado_por,partido_indicante,cargo_anterior,aposentadoria_comp,ativo` → 200 com 10 linhas;
   - `anon` em `stf_ministros_publicos?select=*` → 200 (view é o contrato);
   - /ministros e o perfil de cada ministro carregam com dados reais
     (não o seed) — conferir no navegador;
   - lista de repercussão geral e gastos continuam carregando.
3. **Ingestão interna continua capaz de escrever:** `service_role` mantém
   ALL em `stf_ministros` (o passo 2 da 0003 não toca service_role);
   disparar `workflow_dispatch` da ingestão (etapa de scores permanece
   desabilitada) e conferir upsert de votações.
4. **Scripts administrativos:** qualquer script Python com
   `SUPABASE_SERVICE_ROLE_KEY` segue lendo scores
   (`select=score_geral` com service_role → 200).
5. **Nenhum dado removido:** `service_role` +
   `select=count` em `stf_ministros`, `stf_gastos`, `stf_votacoes`,
   `stf_repercussao_geral` — mesmas contagens de antes; scores continuam
   preenchidos onde estavam.
6. Rodar `get_advisors` (security) do Supabase e confirmar que nenhum
   alerta novo foi introduzido.

## 6. Rollback (explícito e não destrutivo)

Reverte apenas ACESSO; nenhum objeto ou dado é destruído:

```sql
grant select on table public.stf_ministros to anon, authenticated;
grant select on table public.stf_v_ministros_scores to anon, authenticated;
revoke select on table public.stf_ministros_publicos from anon, authenticated;
```

- A view `stf_ministros_publicos` pode permanecer criada (inócua sem grant).
- Não reverter o passo 5 da 0003 (higiene de `stf_assinaturas` /
  `stf_ingestao_log`): os grants antigos eram excessivos.
- Rollback da 0002 em produção: **não aplicável** (colunas já existiam;
  removê-las destruiria dados).

## 7. Pendência estratégica registrada (fora do escopo C1)

A oferta comercial de `/assinar` foi neutralizada na Fase C1 porque os
benefícios anteriores (scores G5, alertas, exportação CSV, relatório PDF)
não existem ou estão suspensos. **A proposta de valor da assinatura precisa
de revisão estratégica**: hoje não há funcionalidade premium gateada real —
a assinatura é, na prática, apoio ao projeto. Decidir em fase própria:
construir recursos premium reais ou reposicionar como membership de apoio.

Também registrado: separar em workflows distintos a ingestão oficial de
votações e o cálculo experimental de scores, de modo que falha na etapa
experimental jamais invalide a ingestão oficial (recomendação da Fase C1;
a etapa de scores está hoje desabilitada por flag no workflow local).
