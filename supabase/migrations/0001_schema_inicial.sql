-- ────────────────────────────────────────────────────────────
-- Observatório do STF — schema inicial
-- ────────────────────────────────────────────────────────────

-- Ministros
create table if not exists stf_ministros (
  id                   uuid primary key default gen_random_uuid(),
  nome                 text not null,
  iniciais             text not null,
  data_posse           date not null,
  data_saida           date,
  indicado_por         text not null,
  partido_indicante    text not null,
  cargo_anterior       text,
  formacao             text,
  aposentadoria_comp   date,
  ativo                boolean not null default true,
  -- scores do termômetro (0–10, calculados via cron)
  score_geral          numeric(4,2),
  score_direitos_civis numeric(4,2),
  score_lib_imprensa   numeric(4,2),
  score_seg_publica    numeric(4,2),
  score_economico      numeric(4,2),
  score_democracia     numeric(4,2),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- Votações por ministro
create table if not exists stf_votacoes (
  id           uuid primary key default gen_random_uuid(),
  ministro_id  uuid not null references stf_ministros(id),
  processo     text not null,
  classe       text not null,
  data         date not null,
  ementa       text not null,
  voto         text not null check (voto in ('favor','contra','abstencao','ausente')),
  resultado    text check (resultado in ('procedente','improcedente','parcial')),
  tema_id      uuid,
  created_at   timestamptz not null default now()
);
create index on stf_votacoes (ministro_id, data desc);

-- Processos com conotação política
create table if not exists stf_processos_politicos (
  id           uuid primary key default gen_random_uuid(),
  numero       text not null unique,
  classe       text not null,
  relator_id   uuid references stf_ministros(id),
  partes       text[] not null default '{}',
  assunto      text not null,
  status       text not null check (status in ('em_andamento','julgado','prescrito','suspenso')),
  data_dist    date not null,
  data_julg    date,
  resultado    text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Repercussão Geral
create table if not exists stf_repercussao_geral (
  id             uuid primary key default gen_random_uuid(),
  tema           integer not null unique,
  titulo         text not null,
  tese           text,
  status         text not null check (status in ('pendente','julgado','sobrestado')),
  data_reconh    date,
  data_julg      date,
  processos_imp  integer,
  relator_id     uuid references stf_ministros(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Gastos (CEAPS / diárias / passagens)
create table if not exists stf_gastos (
  id           uuid primary key default gen_random_uuid(),
  ministro_id  uuid not null references stf_ministros(id),
  ano          smallint not null,
  mes          smallint not null,
  categoria    text not null,
  descricao    text,
  valor        numeric(14,2) not null,
  created_at   timestamptz not null default now()
);
create index on stf_gastos (ministro_id, ano, mes);

-- Doadores dos presidentes indicantes (via TSE)
create table if not exists stf_doadores_indicante (
  id               uuid primary key default gen_random_uuid(),
  ministro_id      uuid not null references stf_ministros(id),
  presidente_cpf   text not null,
  doador_cnpj      text,
  doador_cpf       text,
  doador_nome      text not null,
  valor            numeric(14,2) not null,
  ano_eleicao      smallint not null,
  fonte            text not null default 'tse',
  created_at       timestamptz not null default now(),
  unique (ministro_id, doador_cnpj, ano_eleicao)
);
create index on stf_doadores_indicante (ministro_id);
create index on stf_doadores_indicante (doador_cnpj);

-- ── View consolidada para o painel de ministros ──────────────
create or replace view stf_v_ministros_scores as
select
  m.id,
  m.nome,
  m.iniciais,
  m.data_posse,
  m.indicado_por,
  m.partido_indicante,
  m.ativo,
  coalesce(m.score_geral, 5.0)          as score_geral,
  coalesce(m.score_direitos_civis, 5.0) as score_direitos_civis,
  coalesce(m.score_lib_imprensa, 5.0)   as score_lib_imprensa,
  coalesce(m.score_seg_publica, 5.0)    as score_seg_publica,
  coalesce(m.score_economico, 5.0)      as score_economico,
  coalesce(m.score_democracia, 5.0)     as score_democracia,
  count(v.id)                            as total_votos,
  count(v.id) filter (where v.voto = 'favor')  as votos_favor,
  count(v.id) filter (where v.voto = 'contra') as votos_contra
from stf_ministros m
left join stf_votacoes v on v.ministro_id = m.id
group by m.id;

-- ── Seed inicial: 10 ministros em exercício ──────────────────
insert into stf_ministros (nome, iniciais, data_posse, indicado_por, partido_indicante, cargo_anterior, aposentadoria_comp, ativo) values
  ('Alexandre de Moraes',    'AM', '2017-03-22', 'Michel Temer',    'PMDB', 'Ministro da Justiça',         '2043-12-13', true),
  ('Edson Fachin',           'EF', '2015-04-02', 'Dilma Rousseff',  'PT',   'Advogado/Professor USP',      '2039-02-16', true),
  ('Cármen Lúcia',           'CL', '2006-06-21', 'Lula (1º mandato)','PT',  'Procuradora MG',              '2030-04-04', true),
  ('Dias Toffoli',           'DT', '2009-10-23', 'Lula (1º mandato)','PT',  'Advogado-Geral da União',     '2038-05-15', true),
  ('Luiz Fux',               'LF', '2011-03-03', 'Dilma Rousseff',  'PT',   'Ministro STJ',                '2038-02-22', true),
  ('Gilmar Mendes',          'GM', '2002-06-20', 'Fernando H. Cardoso','PSDB','PGR / TCU',                 '2030-07-28', true),
  ('Cristiano Zanin',        'CZ', '2023-08-03', 'Lula (3º mandato)','PT',  'Advogado de defesa',          '2056-07-10', true),
  ('Flávio Dino',            'FD', '2023-12-22', 'Lula (3º mandato)','PT',  'Ministro da Justiça',         '2049-06-08', true),
  ('Nunes Marques',          'NM', '2020-11-05', 'Jair Bolsonaro',  'PL',   'Procurador Federal',          '2047-05-12', true),
  ('André Mendonça',         'AM2','2021-12-16', 'Jair Bolsonaro',  'PL',   'Ministro da Justiça / AGU',   '2054-12-27', true)
on conflict do nothing;
