-- ────────────────────────────────────────────────────────────────
-- 0010 — Índice para a consulta da ficha do ministro
-- Aplicada em 2026-08-19, durante a migração para Astro.
--
-- A geração estática passou a rodar a consulta da ficha no build, com
-- contagem EXATA sobre 2,97 milhões de linhas — e ela estourou o
-- statement timeout. Os índices existentes cobriam
-- (ministro_id, data_decisao) e (tipo_origem, data_decisao), mas nenhum
-- incluía ministro_resolucao, que é justamente o filtro que separa a
-- pauta do relator dos atos assinados como presidente.
--
-- No SPA o problema não existia porque a consulta trazia 20 linhas sem
-- count exato. Ao virar página estática, a contagem passou a ser parte
-- do conteúdo — e o que era detalhe de performance virou requisito.
--
-- Efeito medido: de timeout para ~200ms.
create index if not exists stf_decisoes_ficha_idx
  on public.stf_decisoes (ministro_id, ministro_resolucao, tipo_origem, data_decisao desc);

analyze public.stf_decisoes;
