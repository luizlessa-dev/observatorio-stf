-- ────────────────────────────────────────────────────────────────
-- 0003 — Contenção de acesso público aos scores ideológicos
-- Fase C1, 2026-07-26. NÃO APLICADA REMOTAMENTE — ver
-- docs/plano-aplicacao-c1-supabase.md (pré-condições, verificações e
-- janela de aplicação) antes de rodar em produção.
--
-- Problema: as 6 colunas de score ideológico de stf_ministros
-- (score_geral, score_direitos_civis, score_lib_imprensa,
-- score_seg_publica, score_economico, score_democracia) são legíveis
-- pela chave pública anon via PostgREST, porque:
--   * anon/authenticated têm GRANT SELECT de TABELA INTEIRA em
--     stf_ministros;
--   * a policy RLS "stf_ministros_select_public" autoriza todas as
--     linhas (using true) — RLS filtra LINHAS, não COLUNAS, então
--     nenhuma policy resolve isso sozinha;
--   * a view stf_v_ministros_scores (security_invoker=true) também tem
--     GRANT SELECT para anon/authenticated e devolve os scores com
--     COALESCE(_, 5.0) — um valor neutro fabricado.
--
-- Estratégia (duas peças que se reforçam):
--   1. GRANTS POR COLUNA em stf_ministros: revoga o SELECT de tabela
--      inteira e concede SELECT apenas nas colunas públicas aprovadas.
--      É a barreira efetiva no PostgREST: select=score_geral (ou
--      select=*) passa a falhar com "permission denied" para anon e
--      authenticated. Colunas novas criadas no futuro nascem SEM grant
--      público (seguro por padrão).
--   2. VIEW PÚBLICA stf_ministros_publicos (security_invoker=true):
--      contrato público explícito e auditável — a lista de colunas da
--      view é exatamente a lista de colunas com grant. O frontend pode
--      consultar a view ou a tabela com lista explícita; ambos ficam
--      restritos ao mesmo conjunto.
--
-- Por que NÃO security definer: a view com security_invoker=true é
-- avaliada com os privilégios de quem consulta — ela nunca vira um
-- túnel que contorna grants/RLS da tabela-base, e o linter do Supabase
-- não a sinaliza. Não há necessidade técnica de definer aqui, já que o
-- conteúdo público é autorizado por grant de coluna + policy existente.
--
-- Preservação: NENHUM dado é apagado. As colunas de score e a view
-- stf_v_ministros_scores continuam existindo, legíveis por service_role
-- (pesquisa interna futura). Idempotente: GRANT/REVOKE repetidos são
-- no-ops; create or replace view é idempotente.
-- ────────────────────────────────────────────────────────────────

-- ── 1. View pública explícita (sem scores, sem COALESCE fabricado) ──
create or replace view public.stf_ministros_publicos
  with (security_invoker = true) as
select
  id,
  nome,
  iniciais,
  data_posse,
  data_saida,
  indicado_por,
  partido_indicante,
  cargo_anterior,
  formacao,
  aposentadoria_comp,
  ativo
from public.stf_ministros;

comment on view public.stf_ministros_publicos is
  'Contrato público de leitura de stf_ministros (Fase C1, 2026-07-26). '
  'Apenas dados biográficos/institucionais verificáveis. Scores ideológicos '
  'são internos e suspensos — não adicionar colunas aqui sem decisão editorial.';

-- ── 2. Grants por coluna em stf_ministros ──
-- Revoga o SELECT de tabela inteira (que expõe os scores) e concede
-- SELECT apenas nas colunas públicas. A policy RLS existente
-- ("stf_ministros_select_public", using true) permanece — ela continua
-- autorizando as LINHAS; os grants passam a limitar as COLUNAS.
revoke select on table public.stf_ministros from anon, authenticated;

grant select (
  id,
  nome,
  iniciais,
  data_posse,
  data_saida,
  indicado_por,
  partido_indicante,
  cargo_anterior,
  formacao,
  aposentadoria_comp,
  ativo,
  created_at,
  updated_at
) on public.stf_ministros to anon, authenticated;

-- ── 3. Acesso público à view pública ──
grant select on public.stf_ministros_publicos to anon, authenticated;

-- ── 4. Retira o acesso público à view legada de scores ──
-- A view stf_v_ministros_scores NÃO é apagada (dados/objeto preservados
-- para uso interno via service_role). Apenas o acesso público sai.
-- Obs.: com security_invoker=true, mesmo sem este revoke a view passaria
-- a falhar para anon após o passo 2; o revoke torna a intenção explícita
-- e independente de futuros rearranjos de grants na tabela-base.
revoke all on table public.stf_v_ministros_scores from anon, authenticated;

-- ── 5. Higiene de grants observada durante a auditoria (defensivo) ──
-- stf_assinaturas e stf_ingestao_log nasceram com grants totais para
-- anon/authenticated (INSERT/UPDATE/DELETE/TRUNCATE). O RLS bloqueia as
-- escritas por linha hoje, mas TRUNCATE não é governado por RLS e nenhum
-- desses privilégios deveria existir para papéis públicos. Isto REDUZ
-- acesso (nunca amplia): mantém-se apenas SELECT em stf_assinaturas para
-- authenticated (a policy "usuario ve propria assinatura" continua
-- restringindo às linhas do próprio usuário) e o front consulta a
-- própria assinatura via getAssinatura(). service_role intocado.
-- Guardas de existência: essas duas tabelas existem em produção mas não
-- estão versionadas na 0001 — em ambiente local recém-criado elas podem
-- não existir, e a migration precisa ser aplicável nos dois cenários.
do $$
begin
  if to_regclass('public.stf_assinaturas') is not null then
    revoke all on table public.stf_assinaturas from anon;
    revoke insert, update, delete, truncate, references, trigger
      on table public.stf_assinaturas from authenticated;
  end if;
  if to_regclass('public.stf_ingestao_log') is not null then
    revoke all on table public.stf_ingestao_log from anon, authenticated;
  end if;
end $$;

-- ────────────────────────────────────────────────────────────────
-- ROLLBACK MANUAL SEGURO (não destrutivo; reverte apenas ACESSO):
--   -- restaura o comportamento anterior à 0003
--   grant select on table public.stf_ministros to anon, authenticated;
--   grant select on table public.stf_v_ministros_scores to anon, authenticated;
--   revoke select on table public.stf_ministros_publicos from anon, authenticated;
--   -- (opcional) remover o contrato público criado por esta migration:
--   -- drop view public.stf_ministros_publicos;  -- view sem dados próprios
--   -- Os revokes do passo 5 NÃO devem ser revertidos: os grants antigos
--   -- eram excessivos e sua restauração ampliaria acesso indevidamente.
-- ────────────────────────────────────────────────────────────────
