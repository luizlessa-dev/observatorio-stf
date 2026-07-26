-- ────────────────────────────────────────────────────────────────
-- 0002 — Reconciliação de schema: stf_gastos (+ stf_repercussao_geral)
-- Fase C1, 2026-07-26. NÃO APLICADA REMOTAMENTE — ver
-- docs/plano-aplicacao-c1-supabase.md antes de aplicar.
--
-- Contexto: a migration 0001 não representa o schema real de produção
-- (projeto redggdtakzmsabwvjzhb). As colunas abaixo foram OBSERVADAS em
-- produção via inspeção read-only de information_schema.columns em
-- 2026-07-26 e nunca estiveram versionadas. Esta migration torna o schema
-- local reproduzível SEM alterar nada do que já existe em produção:
-- ADD COLUMN IF NOT EXISTS é no-op onde a coluna já está presente.
--
-- Regras seguidas:
--   * nenhum DROP / DELETE / TRUNCATE / alteração de coluna existente;
--   * tipos copiados exatamente do que a produção reporta;
--   * sem DEFAULT inventado e sem backfill retroativo de dados;
--   * colunas ficam nullable (como em produção).
-- ────────────────────────────────────────────────────────────────

-- ── stf_gastos: 5 colunas presentes em produção, ausentes na 0001 ──
-- Tipos confirmados em produção: fonte text, data_inicio date,
-- data_fim date, destino text, num_diarias numeric (sem precisão
-- declarada — manter "numeric" puro, não "estreitar" para numeric(x,y)).
alter table stf_gastos add column if not exists fonte       text;
alter table stf_gastos add column if not exists data_inicio date;
alter table stf_gastos add column if not exists data_fim    date;
alter table stf_gastos add column if not exists destino     text;
alter table stf_gastos add column if not exists num_diarias numeric;

comment on column stf_gastos.fonte       is 'Origem do dado (ex.: portal de transparência do STF). Observada em produção em 2026-07-26; sem histórico versionado.';
comment on column stf_gastos.data_inicio is 'Início do período do gasto (diárias/viagens). Observada em produção em 2026-07-26.';
comment on column stf_gastos.data_fim    is 'Fim do período do gasto (diárias/viagens). Observada em produção em 2026-07-26.';
comment on column stf_gastos.destino     is 'Destino da viagem, quando aplicável. Observada em produção em 2026-07-26.';
comment on column stf_gastos.num_diarias is 'Quantidade de diárias (numeric sem precisão em produção — não estreitar o tipo).';

-- ── stf_repercussao_geral: 3 colunas presentes em produção, ausentes
--    na 0001 e JÁ CONSUMIDAS pelo frontend (useRepercussaoGeral.ts) ──
-- Tipos confirmados: leading_case text, destaque boolean default false,
-- incidente_id text. O default de `destaque` replica o default real de
-- produção (false) — não é um default inventado.
alter table stf_repercussao_geral add column if not exists leading_case text;
alter table stf_repercussao_geral add column if not exists destaque     boolean default false;
alter table stf_repercussao_geral add column if not exists incidente_id text;

comment on column stf_repercussao_geral.leading_case is 'Processo paradigma do tema de RG. Observada em produção em 2026-07-26.';
comment on column stf_repercussao_geral.destaque     is 'Flag editorial de destaque na listagem. Default false replica produção.';
comment on column stf_repercussao_geral.incidente_id is 'Identificador do incidente na fonte STF. Observada em produção em 2026-07-26.';

-- ── Divergências CONHECIDAS e deliberadamente NÃO tratadas aqui ──
-- (documentação; nenhuma ação em SQL nesta migration)
--   1. Tabelas stf_assinaturas e stf_ingestao_log existem em produção e não
--      têm migration versionada. Recriá-las exige decisão própria (schema de
--      billing/observabilidade), fora do escopo da reconciliação de gastos.
--   2. stf_doadores_indicante existe na 0001 e NÃO existe em produção.
--      Decisão formal pendente — ver docs/decisao-doadores-indicantes.md.
--      Nenhum DROP é executado.
--   3. Índices/uniques adicionais observados em produção e ausentes na 0001
--      (ex.: stf_gastos unique (ministro, ano, mes, categoria, descricao);
--      stf_ministros unique (iniciais); stf_votacoes unique
--      (ministro, processo, data); stf_processos_politicos unique
--      (numero, classe)). Documentados; criação local fica para uma fase de
--      reconciliação estrutural completa, para não mascarar dados locais
--      divergentes com erros de unicidade.
--
-- ── Rollback manual seguro ──
-- As colunas adicionadas são nullable e sem consumidores obrigatórios.
-- Em ambiente LOCAL, o rollback é: alter table ... drop column <col>.
-- EM PRODUÇÃO NÃO HÁ ROLLBACK A FAZER: as colunas já existem lá com dados
-- reais — removê-las destruiria dados (proibido nesta fase).
