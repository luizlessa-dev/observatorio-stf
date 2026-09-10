-- ────────────────────────────────────────────────────────────────
-- 0015 — Reverte 0014 (classificação de decisões por LLM)
--
-- 0014 criou infraestrutura para reconstruir o "Termômetro" via
-- classificação assistida por IA (categórica: progressista/
-- conservador/não se aplica, com validação humana amostral).
-- Estimativa de custo apresentada ao usuário (2026-09-10): ~US$100–400
-- pra classificar o histórico completo via API da Anthropic. Decisão:
-- esse gasto ficou fora de cogitação.
--
-- Substituído por uma métrica comportamental (taxa de provimento,
-- perfil da pauta por natureza do ato, mix monocrática/colegiada,
-- tempo médio de decisão) — 100% derivável de stf_decisoes já
-- ingerida, classificada por REGRA sobre o texto literal de
-- andamento_bruto, sem custo de API e sem julgamento ideológico. Ver
-- migration 0016_natureza_ato_regra.sql.
--
-- Reversão segura: as tabelas de 0014 nunca tiveram grant público e
-- estavam vazias (nenhuma classificação real foi gerada antes da
-- decisão de não seguir por esse caminho).
-- ────────────────────────────────────────────────────────────────

drop view if exists public.stf_ministros_tendencia_publica;
drop table if exists public.stf_decisoes_classificacao_validacao;
drop table if exists public.stf_decisoes_classificacao;
