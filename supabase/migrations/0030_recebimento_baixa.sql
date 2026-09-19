-- Recebimento e Baixa — painel "Corte Aberta" do STF, abas "Lista de
-- recebidos" e "Lista de baixados".
--
-- Fonte: transparencia.stf.jus.br/extensions/recebidos_baixados — mesma
-- família Qlik Sense, mas o export nativo aqui sai como .csv (não
-- .xlsx, diferente de Acervo/Controle Concentrado/etc.) e ignora o
-- filtro de ano fixado na UI ("ano_andamento") — a exportação real trouxe
-- histórico completo desde 2006, não só o ano corrente. Mantido assim
-- (histórico completo), no mesmo espírito de stf_reclamacoes.
--
-- Tabela de EVENTOS de movimentação, não de processos únicos: o mesmo
-- processo pode aparecer uma vez como "recebido" (com sua data de
-- autuação) e uma vez como "baixado" (com sua data de baixa) — por isso
-- a unicidade é (classe, numero, tipo_andamento), não por processo
-- isolado.
--
-- "Processo" não vem como coluna própria na fonte (diferente de
-- stf_acervo) — construído aqui como "classe || ' ' || numero" só para
-- exibição, marcado como derivado no comentário da coluna.

create table if not exists stf_recebimento_baixa (
  id                  uuid primary key default gen_random_uuid(),
  tipo_andamento      text not null,
  classe              text,
  numero              integer,
  processo            text generated always as (coalesce(classe, '') || ' ' || coalesce(numero::text, '')) stored,
  ministro_id         uuid references stf_ministros(id),
  relator_bruto       text,
  link_processo       text,
  meio_processo       text,
  grupo_origem        text,
  data_autuacao       date,
  em_tramitacao       boolean,
  data_baixa          date,
  ultima_localizacao  text,
  orgao_origem        text,
  procedencia         text,
  ramo_direito        text,
  assunto_completo    text,
  qtd_processos       integer,
  fonte               text not null default 'transparencia.stf.jus.br (painel Corte Aberta — Recebimento e Baixa)',
  created_at          timestamptz not null default now(),
  unique (classe, numero, tipo_andamento)
);

create index on stf_recebimento_baixa (ministro_id);

alter table stf_recebimento_baixa enable row level security;

create policy stf_recebimento_baixa_select_public
  on stf_recebimento_baixa
  for select
  to anon, authenticated
  using (true);

revoke insert, update, delete on stf_recebimento_baixa from anon, authenticated;
