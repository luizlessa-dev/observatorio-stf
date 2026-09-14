-- Reclamações constitucionais — painel "Corte Aberta" do STF, aba
-- Reclamações > Lista de Processos.
--
-- Fonte: transparencia.stf.jus.br/extensions/reclamacoes — mesmo
-- mecanismo de export nativo (.xlsx via botão na barra superior) que
-- stf_controle_concentrado. Ver ingestao/stf/fetch_reclamacoes.py.
--
-- Reclamação é o instrumento usado para forçar cumprimento de decisão
-- do STF por tribunais inferiores ou por atos do Poder Executivo — é o
-- maior volume de processo individual do tribunal (98.589 desde a
-- criação da série, contra 8.675 de controle concentrado). Bruto-
-- primeiro, mesma resolução de ministro_id por nome do relator.

create table if not exists stf_reclamacoes (
  id                     uuid primary key default gen_random_uuid(),
  processo               text not null,
  numero_unico           text,
  num_processos_origens  text,
  data_autuacao          timestamptz,
  ministro_id            uuid references stf_ministros(id),
  relator_atual_bruto    text,
  procedencia            text,
  preferencia_criminal   boolean,
  ramo_direito           text,
  em_tramitacao          boolean,
  liminar_pendente       boolean,
  fonte                  text not null default 'transparencia.stf.jus.br (painel Corte Aberta — Reclamações)',
  created_at             timestamptz not null default now(),
  unique (processo)
);

create index on stf_reclamacoes (ministro_id);

alter table stf_reclamacoes enable row level security;

create policy stf_reclamacoes_select_public
  on stf_reclamacoes
  for select
  to anon, authenticated
  using (true);

revoke insert, update, delete on stf_reclamacoes from anon, authenticated;
