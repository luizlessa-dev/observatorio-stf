-- Ações Covid-19 — painel "Corte Aberta" do STF, aba "Lista das decisões
-- selecionadas".
--
-- Fonte: transparencia.stf.jus.br/extensions/decisoes_covid — mesma
-- família Qlik Sense, export nativo (xlsx). Diferente dos outros painéis
-- Corte Aberta: este NÃO é um recorte bruto de todas as decisões da
-- pandemia (que somam 16.265 no total, segundo o próprio painel) — é uma
-- curadoria do STF, "decisões selecionadas" (232 decisões, 221
-- processos), com resumo narrativo (Relatório, Decisão) escrito pelo
-- próprio tribunal, não um metadado estruturado como os demais painéis.
-- "Limpar" não muda esse recorte — testado, sem efeito; não é filtro de
-- sessão, é o conteúdo do painel.
--
-- Unicidade por (processo, decisao): "Id Processo" e "Link Decisão" da
-- fonte não são únicos por linha (mesmo processo pode ter mais de uma
-- decisão contemplada) — só a combinação processo+texto da decisão é.

create table if not exists stf_decisoes_covid (
  id             uuid primary key default gen_random_uuid(),
  processo       text not null,
  ministro_id    uuid references stf_ministros(id),
  relator_bruto  text,
  materia        text,
  titulo         text,
  relatorio      text,
  decisao        text,
  tipo_decisao   text,
  link_decisao   text,
  id_processo_fonte integer,
  fonte          text not null default 'transparencia.stf.jus.br (painel Corte Aberta — Ações Covid-19)',
  created_at     timestamptz not null default now(),
  unique (processo, decisao)
);

create index on stf_decisoes_covid (ministro_id);

alter table stf_decisoes_covid enable row level security;

create policy stf_decisoes_covid_select_public
  on stf_decisoes_covid
  for select
  to anon, authenticated
  using (true);

revoke insert, update, delete on stf_decisoes_covid from anon, authenticated;
