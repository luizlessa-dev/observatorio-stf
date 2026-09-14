-- Pauta do Plenário e Pauta das Turmas — painel "Corte Aberta".
--
-- Diferente de todo o resto do site: é a única fonte prospectiva —
-- processos já liberados para julgamento colegiado, não decisões já
-- tomadas. Fonte: transparencia.stf.jus.br/extensions/pauta_plenario e
-- .../pauta_turmas. Ver ingestao/stf/fetch_pauta.py.
--
-- Duas tabelas (não uma com uma coluna "órgão"), porque as colunas
-- disponíveis não são idênticas — Turmas não distingue "RG Reconhecida"
-- da mesma forma. Mantém bruto-primeiro; ministro_id resolvido tanto
-- para o relator quanto para quem pediu vista (dois ministros, dois
-- papéis diferentes no mesmo processo).

create table if not exists stf_pauta_plenario (
  id                 uuid primary key default gen_random_uuid(),
  classe             text,
  numero             integer,
  ministro_id        uuid references stf_ministros(id),
  relator_atual_bruto text,
  data_autuacao      timestamptz,
  ramo_direito       text,
  criminal           boolean,
  sessao             text,
  rg_reconhecida     boolean,
  pedido_vista       boolean,
  ministro_vista_id  uuid references stf_ministros(id),
  ministro_vista_bruto text,
  data_vista         timestamptz,
  suspenso           boolean,
  data_pauta         timestamptz,
  fonte              text not null default 'transparencia.stf.jus.br (painel Corte Aberta — Pauta do Plenário)',
  created_at         timestamptz not null default now(),
  unique (classe, numero)
);

create index on stf_pauta_plenario (ministro_id);

create table if not exists stf_pauta_turmas (
  id                 uuid primary key default gen_random_uuid(),
  classe             text,
  numero             integer,
  orgao_julgador     text,
  ministro_id        uuid references stf_ministros(id),
  relator_atual_bruto text,
  data_autuacao      timestamptz,
  ramo_direito       text,
  sessao             text,
  pedido_vista       boolean,
  ministro_vista_id  uuid references stf_ministros(id),
  ministro_vista_bruto text,
  data_vista         timestamptz,
  suspenso           boolean,
  data_pauta         timestamptz,
  fonte              text not null default 'transparencia.stf.jus.br (painel Corte Aberta — Pauta das Turmas)',
  created_at         timestamptz not null default now(),
  unique (classe, numero, orgao_julgador)
);

create index on stf_pauta_turmas (ministro_id);

alter table stf_pauta_plenario enable row level security;
create policy stf_pauta_plenario_select_public on stf_pauta_plenario for select to anon, authenticated using (true);
revoke insert, update, delete on stf_pauta_plenario from anon, authenticated;

alter table stf_pauta_turmas enable row level security;
create policy stf_pauta_turmas_select_public on stf_pauta_turmas for select to anon, authenticated using (true);
revoke insert, update, delete on stf_pauta_turmas from anon, authenticated;
