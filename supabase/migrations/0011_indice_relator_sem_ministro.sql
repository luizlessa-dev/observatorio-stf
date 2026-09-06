-- ────────────────────────────────────────────────────────────────
-- 0011 — Índice parcial para o filtro "sem ministro nomeado" em
-- relator_bruto
--
-- A tentativa de tornar a % de /metodologia dinâmica de novo (filtro
-- `relator_bruto IN ('MINISTRO PRESIDENTE','VICE-PRESIDENTE')`) falhou
-- 5/5 vezes em teste. Medido com EXPLAIN ANALYZE em 2026-09-06: Parallel
-- Seq Scan nas 2.982.583 linhas de stf_decisoes, ~19,5s — bem acima dos
-- 8-12s de statement_timeout dos papéis anon/authenticated (config do
-- projeto, não do Postgres em si). relator_bruto não tinha nenhum índice.
--
-- Mesmo diagnóstico e mesmo remédio da migration 0010 (índice específico
-- para o filtro que estoura), agora para esta consulta. Índice PARCIAL,
-- não em toda a coluna: só os dois valores que a página realmente filtra
-- (~581 mil das 2,98 milhões de linhas), o que mantém o índice pequeno e
-- a manutenção do upsert diário barata.
--
-- Isto NÃO substitui a migration seguinte (stf_estatisticas): o índice
-- torna a consulta rápida o bastante para rodar sem timeout tanto do
-- pipeline de ingestão quanto do build, mas a arquitetura correta é o
-- build ler um valor já calculado, não agregar 2,9M linhas a cada deploy.
create index if not exists stf_decisoes_relator_sem_ministro_idx
  on public.stf_decisoes (relator_bruto)
  where relator_bruto in ('MINISTRO PRESIDENTE', 'VICE-PRESIDENTE');

analyze public.stf_decisoes;
