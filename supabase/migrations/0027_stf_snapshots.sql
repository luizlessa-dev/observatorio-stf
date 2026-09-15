-- AUD-11 (2026-09-15): histórico público e verificável de quando cada fonte
-- foi ingerida pela última vez — linhas, hash do conteúdo, timestamp. Não é
-- o catálogo completo que o achado original pede (snapshot versionado de
-- TODA métrica, com dicionário e relatório de validação — isso pede
-- mudança maior de modelo de dados/pipeline), mas é infraestrutura real,
-- extensível: um conector novo só precisa chamar
-- ingestao/stf/_snapshot.py::registrar_snapshot() depois do upsert.
--
-- Escrita só via service_role (chave usada pelos scripts de ingestão, que
-- ignora RLS por padrão no Supabase) — sem policy de insert/update/delete
-- pra anon/authenticated, então essa tabela é efetivamente append-only pro
-- público. Leitura pública, exibida em /metodologia#historico-de-dados.
--
-- Aplicada diretamente via SQL Editor em 2026-09-15 (projeto Supabase
-- compartilhado entre vários produtos — ver nota na revisão desta rodada);
-- este arquivo documenta a migração no repositório.

create table public.stf_snapshots (
  id bigint generated always as identity primary key,
  tabela text not null,
  linhas bigint not null,
  hash text not null,
  fonte text,
  criado_em timestamptz not null default now(),
  metadata jsonb
);

create index stf_snapshots_tabela_criado_idx
  on public.stf_snapshots (tabela, criado_em desc);

alter table public.stf_snapshots enable row level security;

create policy stf_snapshots_select_public
  on public.stf_snapshots
  for select
  to anon, authenticated
  using (true);
