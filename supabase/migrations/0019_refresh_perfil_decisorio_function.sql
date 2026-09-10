-- ────────────────────────────────────────────────────────────────
-- 0019 — Function de refresh do perfil decisório, chamável por RPC
--
-- Resolve o aviso deixado na migration 0018 ("REFRESH AINDA NÃO
-- AUTOMATIZADO"). Mesmo padrão de atualizar_estatisticas() em
-- fetch_decisoes_qlik.py: recalculado UMA VEZ pelo pipeline de
-- ingestão via RPC, nunca ao vivo pela API pública (que é onde a rajada
-- de 33 consultas concorrentes do build já travou uma vez — ver 0018).
--
-- Por que não precisa de SECURITY DEFINER: o pipeline chama isto com a
-- service_role key, que já tem BYPASSRLS por convenção do Supabase —
-- não precisa elevar privilégio dentro da function. security invoker
-- (padrão) é suficiente e mais simples de auditar, mesmo raciocínio já
-- registrado em 0003_contencao_scores.sql pra view pública.
--
-- Por que só service_role pode executar: mesmo grant automático do
-- projeto encontrado em 0014 se aplica a functions — revogo
-- explicitamente de anon/authenticated por defesa em profundidade,
-- mesmo a function não fazendo nada sensível (ela só recalcula dado já
-- público) — não deveria ser invocável por qualquer visitante via RPC.
-- ────────────────────────────────────────────────────────────────

create or replace function public.refresh_perfil_decisorio_ministros()
returns void
language sql
as $$
  -- `where true` é proposital: este projeto Supabase tem uma proteção
  -- (pgsql-safeupdate) que recusa DELETE/UPDATE sem WHERE — só aparece ao
  -- chamar via PostgREST/service_role, não via SQL direto. Não é um filtro
  -- de verdade, é o jeito de satisfazer a proteção limpando a tabela toda.
  delete from public.stf_ministros_perfil_decisorio where true;

  insert into public.stf_ministros_perfil_decisorio (
    ministro_id, total_decisoes, total_classificadas, pct_classificadas,
    n_merito, n_admissibilidade, n_cautelar, n_processual, n_devolucao,
    pct_merito, pct_admissibilidade, pct_cautelar, pct_processual, pct_devolucao,
    n_merito_com_sentido, n_favoravel, n_contrario, n_parcial,
    pct_favoravel, pct_contrario, pct_parcial, tempo_medio_dias
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
      round(avg(data_decisao - data_autuacao)) as tempo_medio_dias
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
    tempo_medio_dias
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
  'Recalcula stf_ministros_perfil_decisorio e stf_ministros_mix_atuacao do zero. '
  'Chamada por fetch_decisoes_qlik.py::atualizar_perfil_decisorio() a cada '
  'execução diária, via sb.rpc(), com a service_role key. Não chamar via API '
  'pública/anon — ver revoke abaixo.';

revoke all on function public.refresh_perfil_decisorio_ministros() from public, anon, authenticated;
grant execute on function public.refresh_perfil_decisorio_ministros() to service_role;

-- ────────────────────────────────────────────────────────────────
-- VERIFICAÇÃO
--   select public.refresh_perfil_decisorio_ministros();  -- via service_role
--   select count(*) from stf_ministros_perfil_decisorio;  -- ~33, calculado_em recente
--
--   -- Confirma que anon/authenticated não podem chamar:
--   select grantee, privilege_type from information_schema.role_routine_grants
--    where routine_name = 'refresh_perfil_decisorio_ministros';
--   -- deve mostrar só service_role com EXECUTE.
-- ────────────────────────────────────────────────────────────────
