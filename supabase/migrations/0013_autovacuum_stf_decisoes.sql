-- ────────────────────────────────────────────────────────────────
-- 0013 — Autovacuum mais frequente em stf_decisoes
--
-- Achado ao validar a migration 0012: mesmo com o índice certo, a
-- contagem exata filtrada por ano_decisao=2026 (o ano corrente, escrito
-- todo dia pela ingestão) media 6,8s — quase todo esse tempo em "Heap
-- Fetches" (121.408 para 80.525 linhas), sinal de visibility map velho.
-- Um VACUUM manual derrubou para 32ms na hora.
--
-- Causa: o limiar padrão do autovacuum (20% da tabela) equivale a quase
-- 600 mil linhas nesta tabela de 2,98 milhões. A ingestão diária mexe em
-- dezenas de milhares de linhas do ano corrente — dá pra passar dias sem
-- cruzar o limiar, e o ano ativo (a única "partição" quente) fica com
-- heap fetch alto até o autovacuum decidir rodar sozinho.
--
-- Sem isso, a soma por ano em atualizar_estatisticas() (Python, ver
-- ingestao/stf/fetch_decisoes_qlik.py) arrisca reencontrar o teto de ~8s
-- do papel `authenticator` (ver comentário da migration 0012) bem no ano
-- corrente, que é justamente o único que muda todo dia.
-- VACUUM não roda dentro de bloco de transação — não incluído aqui de
-- propósito. Rodado manualmente uma vez fora da migration (2026-09-06); o
-- ajuste de limiar acima é o que garante que o autovacuum sozinho mantenha
-- o resultado depois.
alter table public.stf_decisoes set (
  autovacuum_vacuum_scale_factor  = 0.02,
  autovacuum_vacuum_threshold     = 2000,
  autovacuum_analyze_scale_factor = 0.02,
  autovacuum_analyze_threshold    = 2000
);

analyze public.stf_decisoes;
