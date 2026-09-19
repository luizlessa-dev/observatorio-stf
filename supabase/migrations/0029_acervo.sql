-- Acervo processual — painel "Corte Aberta" do STF, aba Acervo > Lista de
-- processos.
--
-- Fonte: transparencia.stf.jus.br/extensions/acervo — mesma família de
-- painéis Qlik Sense do Corte Aberta, exportado como xlsx via botão
-- "Processos" (ícone de download na barra superior). Ver
-- ingestao/stf/fetch_acervo.py.
--
-- Bruto-primeiro, como stf_controle_concentrado: os campos vêm como a
-- fonte publica, sem reinterpretação — só a resolução de ministro_id por
-- nome é decisão nossa, e mesmo essa fica auditável (ministro_id pode
-- ficar nulo se o nome do relator não bater com nenhum ministro
-- cadastrado, ex. "MINISTRO PRESIDENTE" sem nome próprio).
--
-- "processo_criminal" não é booleano apesar do nome sugerir — a fonte usa
-- o campo para a categoria "Cível"/"Criminal" do processo, não um
-- sim/não; mantido como texto para não inventar uma leitura binária que a
-- fonte não oferece.
--
-- Acervo inteiro (22.390 processos em tramitação na captura de
-- 2026-09-18) — sem filtro de ministro ativo, já que o painel também
-- atribui processos a "MINISTRO PRESIDENTE" e a situações de vacância.

create table if not exists stf_acervo (
  id                          uuid primary key default gen_random_uuid(),
  processo                    text not null,
  ministro_id                 uuid references stf_ministros(id),
  relator_bruto                text,
  numero_unico                text,
  grupo_origem                text,
  tipo_classe                 text,
  classe                      text,
  numero                      integer,
  link_processo                text,
  data_autuacao                timestamptz,
  data_autuacao_agregada        text,
  data_primeira_distribuicao    date,
  data_ultima_distribuicao      date,
  data_primeira_decisao        date,
  data_ultima_decisao          date,
  data_ultimo_andamento        timestamptz,
  grupo_ultimo_andamento        text,
  subgrupo_ultimo_andamento     text,
  descricao_ultimo_andamento    text,
  observacao_ultimo_andamento   text,
  orgao_origem                text,
  ramo_direito                text,
  assuntos                    text,
  legislacao                  text,
  meio_processo                text,
  tipo_localizacao_atual       text,
  localizacao_atual_agrupada    text,
  localizacao_atual            text,
  preferencia_criminal          boolean,
  processo_criminal            text,
  acordao_pendente_publicacao   boolean,
  processo_em_instrucao        boolean,
  situacao_decisao_final       text,
  processo_sobrestado          boolean,
  recurso_interno_pendente      boolean,
  liminar_pendente             boolean,
  pedido_vista                boolean,
  representativo_controversia   boolean,
  fonte                        text not null default 'transparencia.stf.jus.br (painel Corte Aberta — Acervo)',
  created_at                   timestamptz not null default now(),
  unique (processo)
);

create index on stf_acervo (ministro_id);

alter table stf_acervo enable row level security;

create policy stf_acervo_select_public
  on stf_acervo
  for select
  to anon, authenticated
  using (true);

revoke insert, update, delete on stf_acervo from anon, authenticated;
