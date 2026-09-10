-- ────────────────────────────────────────────────────────────────
-- 0017 — Views públicas de perfil decisório por ministro
-- Consomem stf_natureza_ato_mapa (0016). Sem gate de amostra mínima
-- como o termômetro teria: isto é contagem/percentual factual sobre
-- dado já público (stf_decisoes), não uma leitura interpretativa —
-- o mesmo padrão de "mostrar com o N ao lado" já usado em gastos e
-- decisões no site, não de esconder até atingir um limiar.
-- ────────────────────────────────────────────────────────────────

-- ── Perfil da pauta + taxa de provimento (escopo: monocráticas, ministro nomeado) ──
create or replace view public.stf_ministros_perfil_decisorio
  with (security_invoker = true) as
with escopo as (
  select
    d.ministro_id,
    d.andamento_bruto,
    d.data_decisao,
    d.data_autuacao,
    m.natureza_ato,
    m.sentido_merito
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
  ministro_id,
  total_decisoes,
  total_classificadas,
  round(100.0 * total_classificadas / total_decisoes, 1) as pct_classificadas,
  n_merito, n_admissibilidade, n_cautelar, n_processual, n_devolucao,
  round(100.0 * n_merito / nullif(total_classificadas, 0), 1) as pct_merito,
  round(100.0 * n_admissibilidade / nullif(total_classificadas, 0), 1) as pct_admissibilidade,
  round(100.0 * n_cautelar / nullif(total_classificadas, 0), 1) as pct_cautelar,
  round(100.0 * n_processual / nullif(total_classificadas, 0), 1) as pct_processual,
  round(100.0 * n_devolucao / nullif(total_classificadas, 0), 1) as pct_devolucao,
  n_merito_com_sentido, n_favoravel, n_contrario, n_parcial,
  round(100.0 * n_favoravel / nullif(n_merito_com_sentido, 0), 1) as pct_favoravel,
  round(100.0 * n_contrario / nullif(n_merito_com_sentido, 0), 1) as pct_contrario,
  round(100.0 * n_parcial / nullif(n_merito_com_sentido, 0), 1) as pct_parcial,
  tempo_medio_dias
from agregado;

comment on view public.stf_ministros_perfil_decisorio is
  'Perfil decisório por ministro: natureza do ato (mérito/admissibilidade/'
  'cautelar/processual/devolução) e, dentro de mérito, taxa de provimento '
  '(favorável/contrário/parcial). Classificação por regra sobre andamento_bruto '
  '(stf_natureza_ato_mapa), sem LLM, sem eixo ideológico. Escopo: decisões '
  'monocráticas com ministro_resolucao=nome — exclui decisões institucionais '
  'da Presidência e colegiadas (ver docs/proposta-schema-stf-decisoes.md §7, '
  'armadilha do "Fachin decide 7x mais"). Percentuais nulos quando o '
  'denominador é zero — nunca um valor fabricado.';

grant select on public.stf_ministros_perfil_decisorio to anon, authenticated;

-- ── Mix monocrática vs. colegiada (escopo mais amplo: qualquer ministro nomeado) ──
create or replace view public.stf_ministros_mix_atuacao
  with (security_invoker = true) as
select
  ministro_id,
  count(*) as total_nome,
  count(*) filter (where tipo_origem = 'MONOCRÁTICA') as n_monocratica,
  count(*) filter (where tipo_origem = 'COLEGIADA') as n_colegiada,
  round(100.0 * count(*) filter (where tipo_origem = 'MONOCRÁTICA') / count(*), 1)
    as pct_monocratica,
  round(100.0 * count(*) filter (where tipo_origem = 'COLEGIADA') / count(*), 1)
    as pct_colegiada
from public.stf_decisoes
where ministro_resolucao = 'nome' and ministro_id is not null
group by ministro_id;

comment on view public.stf_ministros_mix_atuacao is
  'Mix monocrática vs. colegiada por ministro, como relator nomeado. Universo '
  'mais amplo que stf_ministros_perfil_decisorio (inclui colegiadas) — só para '
  'mostrar a proporção de estilo de atuação, não para taxa de provimento.';

grant select on public.stf_ministros_mix_atuacao to anon, authenticated;

-- Defesa em profundidade contra o grant automático do projeto (achado de 0014):
revoke insert, update, delete on public.stf_ministros_perfil_decisorio from anon, authenticated;
revoke insert, update, delete on public.stf_ministros_mix_atuacao from anon, authenticated;

-- ────────────────────────────────────────────────────────────────
-- VERIFICAÇÃO
--   select * from stf_ministros_perfil_decisorio limit 5;
--   select * from stf_ministros_mix_atuacao limit 5;
--   -- Conferir que pct_* somam ~100 (± arredondamento) e que ministros
--   -- com poucos dados aparecem com N baixo, não com null/erro.
-- ────────────────────────────────────────────────────────────────
