-- ────────────────────────────────────────────────────────────────
-- 0029 — AUD-15: período coberto no perfil decisório
--
-- O comparativo entre ministros (/ministros/comparativo) e a ficha
-- individual mostram taxa de favorável/contrário sem dizer QUANDO essas
-- decisões aconteceram.
--
-- Correção sobre a primeira versão desta migration: stf_ministros_perfil_
-- decisorio deixou de ser uma VIEW na migration 0018 — virou TABELA
-- pré-computada (a view ao vivo travava sob a rajada de 33 consultas
-- concorrentes do build, ver 0018). `create or replace view` falha nela
-- com "is not a view". O ajuste certo é ALTER TABLE + atualizar a
-- function de refresh (0019) pra também calcular min/max — e rodar um
-- refresh imediato aqui, senão as colunas novas ficam NULL até a próxima
-- execução diária do pipeline de ingestão.
-- ────────────────────────────────────────────────────────────────

alter table public.stf_ministros_perfil_decisorio
  add column if not exists data_decisao_min date,
  add column if not exists data_decisao_max date;

comment on column public.stf_ministros_perfil_decisorio.data_decisao_min is
  'Data da decisão mais antiga no agregado da linha (mesmo escopo de total_decisoes: monocráticas, ministro_resolucao=nome). AUD-15.';
comment on column public.stf_ministros_perfil_decisorio.data_decisao_max is
  'Data da decisão mais recente no agregado da linha. AUD-15.';

create or replace function public.refresh_perfil_decisorio_ministros()
returns void
language sql
as $$
  delete from public.stf_ministros_perfil_decisorio where true;

  insert into public.stf_ministros_perfil_decisorio (
    ministro_id, total_decisoes, total_classificadas, pct_classificadas,
    n_merito, n_admissibilidade, n_cautelar, n_processual, n_devolucao,
    pct_merito, pct_admissibilidade, pct_cautelar, pct_processual, pct_devolucao,
    n_merito_com_sentido, n_favoravel, n_contrario, n_parcial,
    pct_favoravel, pct_contrario, pct_parcial, tempo_medio_dias,
    data_decisao_min, data_decisao_max
  )
  with escopo as (
    select
      d.ministro_id, d.andamento_bruto, d.data_decisao, d.data_autuacao,
      m.natureza_ato, m.sentido_merito
    from public.stf_decisoes d
    left join public.stf_natureza_ato_mapa m using (andamento_bruto)
    where d.tipo_origem = 'MONOCRÁTICA'
      and d.ministro_resolucao = 'nome'
      and d.ministro_id is not null
  ),
  agregado as (
    select
      ministro_id,
      count(*) as total_decisoes,
      count(natureza_ato) as total_classificadas,
      count(*) filter (where natureza_ato = 'merito') as n_merito,
      count(*) filter (where natureza_ato = 'admissibilidade') as n_admissibilidade,
      count(*) filter (where natureza_ato = 'cautelar') as n_cautelar,
      count(*) filter (where natureza_ato = 'processual') as n_processual,
      count(*) filter (where natureza_ato = 'devolucao') as n_devolucao,
      count(sentido_merito) as n_merito_com_sentido,
      count(*) filter (where sentido_merito = 'favoravel') as n_favoravel,
      count(*) filter (where sentido_merito = 'contrario') as n_contrario,
      count(*) filter (where sentido_merito = 'parcial') as n_parcial,
      round(avg(data_decisao - data_autuacao)) as tempo_medio_dias,
      min(data_decisao) as data_decisao_min,
      max(data_decisao) as data_decisao_max
    from escopo
    group by ministro_id
  )
  select
    ministro_id, total_decisoes, total_classificadas,
    round(100.0 * total_classificadas / total_decisoes, 1),
    n_merito, n_admissibilidade, n_cautelar, n_processual, n_devolucao,
    round(100.0 * n_merito / nullif(total_classificadas, 0), 1),
    round(100.0 * n_admissibilidade / nullif(total_classificadas, 0), 1),
    round(100.0 * n_cautelar / nullif(total_classificadas, 0), 1),
    round(100.0 * n_processual / nullif(total_classificadas, 0), 1),
    round(100.0 * n_devolucao / nullif(total_classificadas, 0), 1),
    n_merito_com_sentido, n_favoravel, n_contrario, n_parcial,
    round(100.0 * n_favoravel / nullif(n_merito_com_sentido, 0), 1),
    round(100.0 * n_contrario / nullif(n_merito_com_sentido, 0), 1),
    round(100.0 * n_parcial / nullif(n_merito_com_sentido, 0), 1),
    tempo_medio_dias, data_decisao_min, data_decisao_max
  from agregado;

  delete from public.stf_ministros_mix_atuacao where true;

  insert into public.stf_ministros_mix_atuacao (
    ministro_id, total_nome, n_monocratica, n_colegiada, pct_monocratica, pct_colegiada
  )
  select
    ministro_id,
    count(*) as total_nome,
    count(*) filter (where tipo_origem = 'MONOCRÁTICA') as n_monocratica,
    count(*) filter (where tipo_origem = 'COLEGIADA') as n_colegiada,
    round(100.0 * count(*) filter (where tipo_origem = 'MONOCRÁTICA') / count(*), 1),
    round(100.0 * count(*) filter (where tipo_origem = 'COLEGIADA') / count(*), 1)
  from public.stf_decisoes
  where ministro_resolucao = 'nome' and ministro_id is not null
  group by ministro_id;
$$;

comment on function public.refresh_perfil_decisorio_ministros() is
  'Recalcula stf_ministros_perfil_decisorio (incl. data_decisao_min/max, AUD-15) '
  'e stf_ministros_mix_atuacao do zero. Chamada por fetch_decisoes_qlik.py::'
  'atualizar_perfil_decisorio() a cada execução diária, via sb.rpc(), com a '
  'service_role key. Não chamar via API pública/anon — grants inalterados desde 0019.';

-- Popula as colunas novas agora — sem isto, ficam NULL até o próximo
-- refresh diário do pipeline de ingestão. Executa como o papel da sessão
-- do SQL editor (não passa pelo PostgREST/anon), então os grants
-- restritos a service_role da 0019 não bloqueiam esta chamada.
select public.refresh_perfil_decisorio_ministros();

-- ────────────────────────────────────────────────────────────────
-- VERIFICAÇÃO
--   select ministro_id, data_decisao_min, data_decisao_max, calculado_em
--     from stf_ministros_perfil_decisorio order by calculado_em desc limit 5;
--   -- Conferir que data_decisao_min <= data_decisao_max, calculado_em é de
--   -- agora, e a contagem de linhas continua ~33.
-- ────────────────────────────────────────────────────────────────
