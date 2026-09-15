-- AUD-13 (2026-09-15): busca por palavra-chave em stf_decisoes (~3 milhões
-- de linhas). Antes só existia busca exata por `processo` — ver o
-- comentário longo em src/hooks/useBuscaDecisoes.ts sobre por que ilike em
-- assunto/andamento_bruto sem índice estourava o statement_timeout do
-- PostgREST.
--
-- Índice funcional (GIN sobre uma expressão), não coluna gerada STORED: uma
-- coluna STORED reescreveria a tabela inteira (ACCESS EXCLUSIVE lock por
-- toda a duração, bloqueando leitura e escrita) — inaceitável numa tabela
-- de produção com esse volume. Um índice funcional só precisa escanear a
-- tabela pra construir o índice (SHARE lock, bloqueia escrita mas não
-- leitura) e não toca no heap da tabela.
--
-- PostgREST só filtra em colunas/views nomeadas, não em expressões
-- arbitrárias — por isso a view stf_decisoes_busca, que expõe a mesma
-- expressão como a coluna `busca_texto`. O Postgres expande a view e casa o
-- filtro com o índice funcional da tabela base normalmente (confirmado via
-- EXPLAIN: Bitmap Index Scan on stf_decisoes_busca_texto_idx, não Seq Scan).
--
-- Aplicada diretamente via SQL Editor em 2026-09-15 (mesma nota do arquivo
-- anterior); este arquivo documenta a migração no repositório.

create index stf_decisoes_busca_texto_idx on public.stf_decisoes
  using gin (to_tsvector('portuguese',
    coalesce(assunto, '') || ' ' || coalesce(andamento_bruto, '') || ' ' || coalesce(processo, '')
  ));

create view public.stf_decisoes_busca as
select
  id, processo, assunto, andamento_bruto, relator_bruto, tipo_origem,
  data_decisao, ano_decisao, orgao_julgador, ministro_id, sentido,
  to_tsvector('portuguese',
    coalesce(assunto, '') || ' ' || coalesce(andamento_bruto, '') || ' ' || coalesce(processo, '')
  ) as busca_texto
from public.stf_decisoes;

grant select on public.stf_decisoes_busca to anon, authenticated;
