-- Registro e Distribuição — painel "Corte Aberta" do STF, aba "Lista de
-- processos".
--
-- Fonte: transparencia.stf.jus.br/extensions/distribuidos — mesma família
-- Qlik Sense de stf_recebimento_baixa. Escopo: ANO CORRENTE
-- (ano_periodo=2026 na captura), pelo mesmo motivo documentado na
-- migration 0030 — "Limpar" removeria o filtro de ano fixado e explodiria
-- o volume para histórico completo. Ver ingestao/stf/fetch_distribuicao.py
-- e baixar_ano_atual() em fetch_recebimento_baixa.py (reaproveitado).
--
-- Diferente de stf_recebimento_baixa: aqui QUASE TODA linha tem
-- ministro_id (é o próprio evento de distribuição) — a exceção é o lado
-- "Registrado à Presidência", majoritariamente atribuído a
-- "MINISTRO PRESIDENTE" (rótulo de cargo, não de pessoa).
--
-- Traz também partes e advogados (Polo ativo/passivo) — dado público (o
-- próprio STF publica quem são as partes e procuradores de cada processo
-- no andamento processual), não sigiloso.

create table if not exists stf_distribuicao (
  id                    uuid primary key default gen_random_uuid(),
  tipo_andamento        text not null,
  classe                text,
  numero                integer,
  processo              text generated always as (coalesce(classe, '') || ' ' || coalesce(numero::text, '')) stored,
  ministro_id           uuid references stf_ministros(id),
  ministro_bruto        text,
  link_processo         text,
  ultima_localizacao    text,
  data_autuacao         date,
  data_baixa            date,
  em_tramitacao         boolean,
  grupo_origem          text,
  meio_processo         text,
  data_andamento        date,
  andamento             text,
  subgrupo_andamento    text,
  substituicao_redistribuicao boolean,
  orgao_origem          text,
  procedencia           text,
  ramo_direito          text,
  assunto_completo      text,
  polo_ativo            text,
  advogado_polo_ativo   text,
  polo_passivo          text,
  advogado_polo_passivo text,
  fonte                 text not null default 'transparencia.stf.jus.br (painel Corte Aberta — Registro e Distribuição)',
  created_at            timestamptz not null default now(),
  unique (classe, numero, tipo_andamento)
);

create index on stf_distribuicao (ministro_id);

alter table stf_distribuicao enable row level security;

create policy stf_distribuicao_select_public
  on stf_distribuicao
  for select
  to anon, authenticated
  using (true);

revoke insert, update, delete on stf_distribuicao from anon, authenticated;
