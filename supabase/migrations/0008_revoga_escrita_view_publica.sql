-- ────────────────────────────────────────────────────────────────
-- 0008 — Revoga escrita indevida em stf_ministros_publicos
-- Achado D2 da auditoria de 2026-08-17. Aplicada em 2026-08-19.
--
-- PROBLEMA
-- anon e authenticated tinham INSERT, UPDATE e REFERENCES em todas as
-- colunas da view. A migration 0003 concede apenas SELECT — esses
-- privilégios são anteriores a ela e sobreviveram ao
-- `create or replace view`, que preserva os grants existentes.
--
-- POR QUE NÃO ERA URGENTE, E MESMO ASSIM PRECISAVA SAIR
-- A escrita já estava bloqueada por duas camadas independentes: a view
-- usa security_invoker=true (roda com os privilégios de quem consulta),
-- e nem stf_ministros tem policy RLS de escrita, nem anon tem grant de
-- escrita na tabela-base. Não era buraco aberto. Era privilégio a uma
-- camada de distância de virar vandalismo dos dados dos ministros num
-- site de transparência — e ninguém deveria depender de duas camadas
-- quando a correção é uma linha.
--
-- Isto só REDUZ acesso. Não reverter.
-- ────────────────────────────────────────────────────────────────

revoke all on table public.stf_ministros_publicos from anon, authenticated;
grant select on table public.stf_ministros_publicos to anon, authenticated;

-- VERIFICAÇÃO
--   select grantee, privilege_type from information_schema.table_privileges
--    where table_name='stf_ministros_publicos' and grantee in ('anon','authenticated');
--   -- esperado: só SELECT para os dois.
