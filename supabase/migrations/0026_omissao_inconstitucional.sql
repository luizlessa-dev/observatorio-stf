-- Casos de omissão inconstitucional — painel "Corte Aberta" do STF.
--
-- Diferente dos outros painéis Corte Aberta: não é um recorte de milhares
-- de processos, é uma lista curada (172 casos) de julgados em que o STF
-- reconheceu omissão do poder público — falta de lei, política pública
-- ou ato administrativo exigido pela Constituição. Traz até a ementa
-- completa. Mesmo espírito de stf_processos_politicos: dado pequeno e de
-- alta qualidade editorial, candidato natural a uma página própria (tipo
-- "Marcos Históricos"), não só a um número na ficha do ministro.
--
-- Fonte: transparencia.stf.jus.br/extensions/omissao_inconstitucional.
-- Ver ingestao/stf/fetch_omissao_inconstitucional.py.

create table if not exists stf_omissao_inconstitucional (
  id                      uuid primary key default gen_random_uuid(),
  materia                 text,
  processo                text not null,
  ministro_id             uuid references stf_ministros(id),
  relator_bruto           text,
  redator_acordao_bruto   text,
  tipo_classe             text,
  classe_processo         text,
  incidente               text,
  numero_processo         integer,
  data_julgamento         timestamptz,
  ementa                  text,
  orgao_julgador          text,
  tipo_omissao            text,
  ramo_direito            text,
  link_processo           text,
  link_inteiro_teor       text,
  link_jurisprudencia     text,
  fonte                   text not null default 'transparencia.stf.jus.br (painel Corte Aberta — Omissão Inconstitucional)',
  created_at              timestamptz not null default now(),
  unique (processo)
);

create index on stf_omissao_inconstitucional (ministro_id);

alter table stf_omissao_inconstitucional enable row level security;

create policy stf_omissao_inconstitucional_select_public
  on stf_omissao_inconstitucional
  for select
  to anon, authenticated
  using (true);

revoke insert, update, delete on stf_omissao_inconstitucional from anon, authenticated;
