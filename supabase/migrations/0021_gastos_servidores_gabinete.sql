-- Detalhamento por servidor do custo de cada gabinete ministerial.
--
-- Contexto: stf_gastos (0001) já guarda o custo agregado do gabinete
-- ("custo_gabinete", uma linha por ministro/mês) — mas a fonte
-- (egesp-portal.stf.jus.br/transparencia/rendimento_folha) publica, linha a
-- linha, nome, matrícula, cargo efetivo, cargo comissionado, função,
-- situação funcional e remuneração bruta/líquida de cada servidor. O
-- script de ingestão (ingestao/stf/fetch_gastos.py) já baixa essas colunas
-- e as descarta ao somar tudo num único número por gabinete.
--
-- Diferente do eixo "doadores dos presidentes indicantes" (rejeitado em
-- docs/decisao-doadores-indicantes.md), aqui não há inferência causal
-- nenhuma sendo proposta — é republicar, de forma mais organizada, dado de
-- remuneração de servidor público que o próprio STF já torna público sob
-- nome real, na sua própria página oficial de transparência (Lei de Acesso
-- à Informação). Escopo: só servidores lotados em "GABINETE MINISTRO X"
-- (mesmo filtro que fetch_gastos.py já aplica) — não é uma cópia da folha
-- de pagamento inteira do tribunal.

create table if not exists stf_gastos_servidores (
  id                   uuid primary key default gen_random_uuid(),
  ministro_id          uuid not null references stf_ministros(id),
  ano                  smallint not null,
  mes                  smallint not null,
  matricula            text not null,
  nome                 text not null,
  cargo_efetivo        text,
  cargo_comissionado   text,
  funcao               text,
  situacao_funcional   text,
  remuneracao_bruta    numeric(14,2) not null,
  remuneracao_liquida  numeric(14,2),
  fonte                text not null default 'egesp-portal.stf.jus.br/transparencia/rendimento_folha',
  created_at           timestamptz not null default now(),
  unique (ministro_id, ano, mes, matricula)
);

create index on stf_gastos_servidores (ministro_id, ano, mes);

alter table stf_gastos_servidores enable row level security;

create policy stf_gastos_servidores_select_public
  on stf_gastos_servidores
  for select
  to anon, authenticated
  using (true);

-- Defesa em profundidade: mesmo com RLS de SELECT liberado, não conceder
-- INSERT/UPDATE/DELETE a anon/authenticated (só service_role escreve, via
-- pipeline de ingestão) — mesmo raciocínio da migration 0003 para
-- stf_ministros e stf_assinaturas.
revoke insert, update, delete on stf_gastos_servidores from anon, authenticated;
