-- ────────────────────────────────────────────────────────────────
-- 0006 — Presidência do STF (achado A6 da auditoria de 2026-08-17)
--
-- PROBLEMA
-- O bloco "Custo ao erário" mostra o gabinete de Edson Fachin com
-- 9 servidores e R$ 176.814, contra 31 a 38 servidores e R$ 757 mil a
-- R$ 932 mil dos demais ministros. O número é real e a fonte é oficial
-- (egesp-portal.stf.jus.br, jun/2026), mas fora de contexto ele convida
-- a uma leitura falsa — "o gabinete de Fachin custa um quinto dos
-- outros".
--
-- A razão é institucional: Fachin preside o STF desde 29/09/2025, e a
-- estrutura de apoio da Presidência não integra o gabinete do ministro.
-- Um comparativo de gasto público lido errado é exatamente o tipo de
-- erro que derruba a credibilidade de um veículo de fiscalização — e é
-- pré-requisito para a tabela comparativa dos dez gabinetes prevista
-- para a onda 3.
--
-- POR QUE UMA TABELA, E NÃO UMA COLUNA BOOLEANA EM stf_ministros
-- A pergunta que a interface precisa responder não é "quem preside
-- hoje", é "quem presidia no MÊS DE REFERÊNCIA deste gasto". A
-- presidência é rotativa em biênios; com uma flag booleana, todo gasto
-- histórico passaria a ser anotado com a presidência atual — trocando
-- um erro de leitura por outro. Períodos com início e fim respondem
-- certo para qualquer mês.
--
-- FONTES (conferidas em 2026-08-17)
--   * Fachin presidente e Moraes vice desde 29/09/2025 — Agência Brasil,
--     TRE-SP e comunicado do STF sobre a sessão solene de posse.
--   * Barroso presidente e Fachin vice de 28/09/2023 a 29/09/2025 —
--     CNJ, ConJur e JOTA sobre a posse de 28/09/2023.
--   * Presidências anteriores a 28/09/2023 NÃO foram seedadas: a data
--     de início da gestão de Rosa Weber não foi conferida nesta fase.
--     Preencher exige a mesma checagem — não estime.
-- ────────────────────────────────────────────────────────────────

create table if not exists public.stf_presidencias (
  id          uuid primary key default gen_random_uuid(),
  ministro_id uuid not null references public.stf_ministros(id) on delete cascade,
  cargo       text not null check (cargo in ('presidente', 'vice_presidente')),
  inicio      date not null,
  fim         date,          -- null = em exercício
  fonte       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint stf_presidencias_periodo_valido check (fim is null or fim > inicio),
  constraint stf_presidencias_unica unique (ministro_id, cargo, inicio)
);

comment on table public.stf_presidencias is
  'Períodos de presidência e vice-presidência do STF. Usada para contextualizar '
  'o custo de gabinete do ministro presidente, cuja estrutura de apoio corre pela '
  'Presidência e não pelo gabinete. Migration 0006 (achado A6).';

comment on column public.stf_presidencias.fim is
  'null = mandato em exercício. Ao empossar um novo presidente, PREENCHA o fim do '
  'anterior na mesma transação — o índice stf_presidencias_um_atual impede dois '
  'ocupantes simultâneos do mesmo cargo.';

-- Só pode existir um presidente e um vice em exercício por vez.
create unique index if not exists stf_presidencias_um_atual
  on public.stf_presidencias (cargo) where fim is null;

create index if not exists stf_presidencias_ministro_idx
  on public.stf_presidencias (ministro_id, inicio desc);

-- ── Leitura pública ──
alter table public.stf_presidencias enable row level security;

drop policy if exists stf_presidencias_select_public on public.stf_presidencias;
create policy stf_presidencias_select_public
  on public.stf_presidencias
  for select
  to anon, authenticated
  using (true);

grant select on public.stf_presidencias to anon, authenticated;

-- ── Seed ──
insert into public.stf_presidencias (ministro_id, cargo, inicio, fim, fonte)
select m.id, v.cargo, v.inicio, v.fim, v.fonte
from (values
  ('Luís Roberto Barroso', 'presidente',      date '2023-09-28', date '2025-09-29',
   'Posse em 28/09/2023 (CNJ, ConJur, JOTA); sucedido por Fachin em 29/09/2025'),
  ('Edson Fachin',         'vice_presidente', date '2023-09-28', date '2025-09-29',
   'Vice na gestão Barroso, biênio 2023-2025'),
  ('Edson Fachin',         'presidente',      date '2025-09-29', null,
   'Posse em 29/09/2025, biênio 2025-2027 (Agência Brasil, STF)'),
  ('Alexandre de Moraes',  'vice_presidente', date '2025-09-29', null,
   'Eleito vice junto com Fachin em 13/08/2025, posse em 29/09/2025')
) as v(nome, cargo, inicio, fim, fonte)
join public.stf_ministros m on m.nome = v.nome
on conflict (ministro_id, cargo, inicio) do nothing;

-- ────────────────────────────────────────────────────────────────
-- VERIFICAÇÃO
--   select m.nome, p.cargo, p.inicio, p.fim
--     from public.stf_presidencias p
--     join public.stf_ministros m on m.id = p.ministro_id
--    order by p.inicio desc, p.cargo;
--   -- esperado: 4 linhas, com Fachin/presidente e Moraes/vice sem fim.
--
-- QUANDO A PRESIDÊNCIA MUDAR (set/2027)
--   update public.stf_presidencias set fim = '<data da posse>' where fim is null;
--   insert ... (novo presidente e novo vice, inicio = data da posse);
--   -- nesta ordem: o índice parcial recusa dois ocupantes em exercício.
-- ────────────────────────────────────────────────────────────────
