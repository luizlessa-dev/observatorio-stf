-- ────────────────────────────────────────────────────────────────
-- 0012 — stf_estatisticas: cache dos números do resumo
--
-- CAUSA RAIZ do "0 decisões" publicado em produção (pelo menos duas
-- vezes) e da % fixa em /metodologia: carregarResumo() rodava
-- `count: "exact"` sem filtro em stf_decisoes (2,98 milhões de linhas)
-- NO BUILD, sob o papel `anon`. Medido em 2026-09-06 com EXPLAIN
-- ANALYZE: ~10,4s de execução real — perto o bastante do
-- statement_timeout de 12s do papel anon (config do projeto Supabase,
-- não do Postgres) para falhar sob qualquer variação de carga. Nenhum
-- índice reduz isso: mesmo o índice mais barato disponível já era usado
-- via Index Only Scan, e o custo é inerente a agregar 2,9M linhas sem
-- filtro.
--
-- O papel service_role, que a ingestão diária usa, NÃO tem
-- statement_timeout configurado. A mesma consulta ali não é arriscada —
-- só não deveria rodar no caminho crítico do build, com um humano (ou o
-- deploy) esperando. Esta tabela move o cálculo para onde ele já roda
-- sem pressa: o pipeline de ingestão, que já toca a tabela toda todo
-- dia (`ingestao/stf/fetch_decisoes_qlik.py` +
-- `.github/workflows/ingestao-decisoes.yml`).
--
-- Padrão: uma linha só (id fixo em 1), sobrescrita a cada execução do
-- pipeline. O build passa a fazer um select por chave primária —
-- da mesma família de custo que carregarMinistros(), não mais uma
-- agregação sobre a tabela inteira.
create table if not exists public.stf_estatisticas (
  id             smallint    primary key default 1 check (id = 1),
  total_decisoes bigint      not null,
  total_temas_rg bigint      not null,
  sem_ministro   bigint      not null,
  dados_ate      date,
  atualizado_em  timestamptz not null default now()
);

comment on table public.stf_estatisticas is
  'Cache dos números agregados de stf_decisoes/stf_repercussao_geral para a home '
  'e /metodologia (migration 0012). Uma linha só, recalculada pelo pipeline de '
  'ingestão (fetch_decisoes_qlik.py) ao final de cada execução — nunca pelo build '
  'do site, que lê por chave primária em vez de agregar 2,9M linhas.';

comment on column public.stf_estatisticas.sem_ministro is
  'Contagem de relator_bruto IN (''MINISTRO PRESIDENTE'', ''VICE-PRESIDENTE'') — '
  'como a FONTE registrou a decisão, não quantas ficaram ministro_resolucao='
  '''desconhecido'' depois da resolução por stf_presidencias (esse número é menor, '
  'porque parte do bloco MINISTRO PRESIDENTE já foi atribuída por data). É o texto '
  'de /metodologia que define qual das duas leituras é a certa aqui.';

comment on column public.stf_estatisticas.atualizado_em is
  'Quando o pipeline recalculou esta linha, não quando o dado de stf_decisoes '
  'mudou por último — para isso, ver dados_ate ou stf_ingestao_log.';

-- ── Leitura pública ──
alter table public.stf_estatisticas enable row level security;

drop policy if exists stf_estatisticas_select_public on public.stf_estatisticas;
create policy stf_estatisticas_select_public
  on public.stf_estatisticas
  for select
  to anon, authenticated
  using (true);

grant select on public.stf_estatisticas to anon, authenticated;

-- ── Seed inicial, para o build não quebrar antes da primeira execução
--    do pipeline com o código novo. Valores de 2026-09-06 (ver comentário
--    da migration 0011 para a query de origem); o pipeline sobrescreve na
--    próxima execução.
insert into public.stf_estatisticas (id, total_decisoes, total_temas_rg, sem_ministro, dados_ate)
values (1, 2982583, 1470, 581645, (select max(data_decisao) from public.stf_decisoes))
on conflict (id) do nothing;
