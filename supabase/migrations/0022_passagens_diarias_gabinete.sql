-- Passagens aéreas e diárias do gabinete de cada ministro.
--
-- Fonte: transparencia.stf.jus.br, painéis Qlik Sense "Transparência -
-- Passagens Aéreas" (17.036 registros na captura de 2026-09) e
-- "Transparência - Diárias" (9.991 registros), histórico desde 2016. Ao
-- contrário de rendimento_folha (HTML simples), esses painéis só expõem
-- dado via app Qlik renderizado em JS — não há URL estática de export; a
-- ingestão precisa de navegador headless (Playwright) pra disparar o
-- export e capturar a URL de download gerada por sessão. Ver
-- ingestao/stf/fetch_passagens_diarias.py.
--
-- Mesmo escopo que stf_gastos_servidores: só linhas cuja lotação bate com
-- "GABINETE MINISTRO/MINISTRA X" — não é uma cópia de toda a folha de
-- viagens do tribunal, só o que envolve o gabinete de cada ministro
-- (que inclui juízes convocados e assessores lotados ali, não só o
-- próprio ministro).

create table if not exists stf_passagens (
  id                   uuid primary key default gen_random_uuid(),
  ministro_id          uuid not null references stf_ministros(id),
  passagem_id          text not null,
  nome                 text,
  cargo                text,
  lotacao              text,
  motivo               text,
  ano                  smallint not null,
  mes                  smallint,
  data_ida             date,
  data_volta           date,
  tipo_passagem        text,
  trecho               text,
  valor_bilhete        numeric(12,2),
  valor_reembolso      numeric(12,2),
  custo_efetivo        numeric(12,2),
  fonte                text not null default 'transparencia.stf.jus.br (painel Passagens Aéreas)',
  created_at           timestamptz not null default now(),
  unique (passagem_id)
);

create index on stf_passagens (ministro_id, ano, mes);

create table if not exists stf_diarias (
  id                   uuid primary key default gen_random_uuid(),
  ministro_id          uuid not null references stf_ministros(id),
  diaria_id            text not null,
  nome                 text,
  cargo                text,
  lotacao              text,
  tipo_diaria          text,
  motivo               text,
  moeda                text,
  quantidade           numeric(6,2),
  valor_total          numeric(12,2),
  ano                  smallint not null,
  mes                  smallint,
  fonte                text not null default 'transparencia.stf.jus.br (painel Diárias)',
  created_at           timestamptz not null default now(),
  unique (diaria_id)
);

create index on stf_diarias (ministro_id, ano, mes);

alter table stf_passagens enable row level security;

create policy stf_passagens_select_public
  on stf_passagens
  for select
  to anon, authenticated
  using (true);

revoke insert, update, delete on stf_passagens from anon, authenticated;

alter table stf_diarias enable row level security;

create policy stf_diarias_select_public
  on stf_diarias
  for select
  to anon, authenticated
  using (true);

revoke insert, update, delete on stf_diarias from anon, authenticated;
