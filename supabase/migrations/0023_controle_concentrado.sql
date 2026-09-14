-- Ações de controle concentrado (ADI/ADC/ADPF/ADO) — painel "Corte Aberta"
-- do STF, aba Controle Concentrado > Processos.
--
-- Fonte: transparencia.stf.jus.br/extensions/controle_concentrado —
-- mesma família de painéis Qlik Sense do Corte Aberta, exportado como
-- xlsx via botão "Processos" (ícone de download na barra superior, não o
-- botão "Exportar (CSV)" usado em Passagens/Diárias — mecanismo de export
-- muda entre painéis). Ver ingestao/stf/fetch_controle_concentrado.py.
--
-- Bruto-primeiro, como stf_decisoes: os campos vêm como a fonte publica,
-- sem reinterpretação — só a resolução de ministro_id por nome é decisão
-- nossa, e mesmo essa fica auditável (ministro_id pode ficar nulo se o
-- nome do relator não bater com nenhum ministro cadastrado).
--
-- Sem filtro de "gabinete" aqui — controle concentrado é sempre atribuído
-- a um relator individual, ministro em exercício ou não, então a tabela
-- inteira (8.675 processos na captura de 2026-09, ADI/ADC/ADPF/ADO desde
-- 1997) é o recorte relevante.

create table if not exists stf_controle_concentrado (
  id                                            uuid primary key default gen_random_uuid(),
  processo                                      text not null,
  link_processo                                 text,
  ministro_id                                   uuid references stf_ministros(id),
  relator_atual_bruto                           text,
  ramo_direito                                  text,
  assunto                                        text,
  meio_processo                                 text,
  data_autuacao                                 timestamptz,
  data_transito_julgado                         timestamptz,
  data_baixa                                    date,
  em_tramitacao                                 boolean,
  situacao_processual                           text,
  tem_decisao_liminar                           boolean,
  tem_decisao_final                             boolean,
  tem_rito_art12                                boolean,
  legislacao                                    text,
  preferencia_ods                               text,
  data_publicacao_pauta                         timestamptz,
  data_publicacao_pauta_primeira                timestamptz,
  data_publicacao_pauta_ultima                  timestamptz,
  conta_publicacao_pauta                        integer,
  data_publicacao_decisao_colegiada             timestamptz,
  data_publicacao_decisao_colegiada_primeira    timestamptz,
  data_publicacao_decisao_colegiada_ultima      timestamptz,
  conta_publicacao_decisao_colegiada            integer,
  data_decisao_final                            timestamptz,
  data_decisao_final_primeira                   timestamptz,
  data_decisao_final_ultima                     timestamptz,
  conta_decisao_final                           integer,
  data_publicacao_decisao_monocratica           timestamptz,
  data_publicacao_decisao_monocratica_primeira  timestamptz,
  data_publicacao_decisao_monocratica_ultima    timestamptz,
  conta_publicacao_decisao_monocratica          integer,
  fonte                                         text not null default 'transparencia.stf.jus.br (painel Corte Aberta — Controle Concentrado)',
  created_at                                    timestamptz not null default now(),
  unique (processo)
);

create index on stf_controle_concentrado (ministro_id);

alter table stf_controle_concentrado enable row level security;

create policy stf_controle_concentrado_select_public
  on stf_controle_concentrado
  for select
  to anon, authenticated
  using (true);

revoke insert, update, delete on stf_controle_concentrado from anon, authenticated;
