-- ────────────────────────────────────────────────────────────────
-- 0014 — Classificação de decisões: natureza do ato + mérito + eixo
-- Reconstrução do "Termômetro" (contido em 0003_contencao_scores.sql,
-- ver docs/auditoria-integridade-dados.md seção 2.3), agora como
-- classificação assistida por IA com validação humana amostral,
-- sobre decisões monocráticas de autoria nomeada.
-- Plano: /Users/luizlessa/.claude/plans/giggly-churning-candle.md
--
-- POR QUE DUAS TABELAS CRUAS SEM GRANT PÚBLICO + UMA VIEW AGREGADA
-- O termômetro antigo ficou exposto via API anon mesmo depois de
-- tirado da UI (risco nº 1 não resolvido da contenção C1 — ver
-- docs/auditoria-integridade-dados.md linhas 214-226). Desta vez o
-- dado bruto por decisão (stf_decisoes_classificacao) e a amostra de
-- validação (stf_decisoes_classificacao_validacao) NUNCA têm grant
-- para anon/authenticated — só stf_ministros_tendencia_publica, que
-- já nasce com o portão de publicação embutido em SQL (amostra
-- mínima + validação humana concluída), não em lógica espalhada no
-- frontend.
--
-- POR QUE CATEGÓRICO, NÃO NUMÉRICO
-- O termômetro antigo normalizava por Z-score relativo à composição
-- atual da Corte (o mesmo ministro mudava de nota sem mudar de
-- conduta) e caía em 5.0 "neutro" quando faltava dado — indistinguível
-- de centrismo real. Aqui cada decisão recebe um rótulo categórico
-- (progressista | conservador | nao_se_aplica), e o agregado público é
-- uma porcentagem sobre decisões classificadas — comparável ao longo
-- do tempo, sem fallback numérico nenhum.
-- ────────────────────────────────────────────────────────────────

-- ── 1. Classificação bruta, uma linha por decisão ──────────────────
create table if not exists public.stf_decisoes_classificacao (
  id_fato_decisao    bigint primary key
                       references public.stf_decisoes(id_fato_decisao)
                       on delete cascade,

  -- Camada 1: natureza do ato. Vem sempre antes de qualquer leitura de
  -- mérito — ver docs/proposta-schema-stf-decisoes.md seção 5.
  natureza_ato        text not null check (natureza_ato in
                         ('merito', 'admissibilidade', 'cautelar',
                          'processual', 'devolucao')),
  natureza_metodo      text not null check (natureza_metodo in ('regra', 'llm')),

  -- Camada 2: só preenchida quando natureza_ato = 'merito'.
  sentido_merito       text check (sentido_merito in
                         ('favoravel', 'contrario', 'parcial')),

  -- Camada 3: eixo por dimensão, só quando a dimensão se aplica ao
  -- caso E natureza_ato = 'merito'. Dimensão 'economico' fica de fora
  -- de propósito (o script antigo já marcava essa dimensão como
  -- incerta — não herdar sem rubrica nova).
  eixo_direitos_civis  text check (eixo_direitos_civis in
                         ('progressista', 'conservador', 'nao_se_aplica')),
  eixo_lib_imprensa    text check (eixo_lib_imprensa in
                         ('progressista', 'conservador', 'nao_se_aplica')),
  eixo_seg_publica     text check (eixo_seg_publica in
                         ('progressista', 'conservador', 'nao_se_aplica')),
  eixo_democracia      text check (eixo_democracia in
                         ('progressista', 'conservador', 'nao_se_aplica')),

  -- Auditabilidade: por que o modelo/regra decidiu isso.
  justificativa        text,
  modelo                text not null,
  prompt_versao         int not null,
  classificado_em       timestamptz not null default now(),

  -- Trava por construção: camadas 2/3 não existem fora de mérito.
  constraint stf_decisoes_classificacao_merito_check check (
    natureza_ato = 'merito' or (
      sentido_merito is null and
      eixo_direitos_civis is null and eixo_lib_imprensa is null and
      eixo_seg_publica is null and eixo_democracia is null
    )
  ),
  constraint stf_decisoes_classificacao_eixo_sem_sentido_check check (
    sentido_merito is not null or (
      eixo_direitos_civis is null and eixo_lib_imprensa is null and
      eixo_seg_publica is null and eixo_democracia is null
    )
  )
);

comment on table public.stf_decisoes_classificacao is
  'Classificação assistida por IA de decisões monocráticas (natureza do ato, e '
  'dentro de mérito, sentido + eixo por dimensão). Sem grant público — ver '
  'stf_ministros_tendencia_publica para o agregado exposto. Plano completo em '
  '.claude/plans/giggly-churning-candle.md desta máquina.';

comment on column public.stf_decisoes_classificacao.natureza_ato is
  'merito = tribunal decidiu o pedido; admissibilidade = recusa de processar '
  '("negado seguimento", 34% do acervo, NÃO é julgamento de mérito); '
  'cautelar / processual / devolucao = estados que não julgam o pedido.';

comment on column public.stf_decisoes_classificacao.eixo_direitos_civis is
  'Categórico, não numérico. nao_se_aplica é uma resposta válida e comum — a '
  'maioria das decisões de mérito não toca em nenhuma das 4 dimensões.';

create index if not exists stf_decisoes_classificacao_natureza_idx
  on public.stf_decisoes_classificacao (natureza_ato);

alter table public.stf_decisoes_classificacao enable row level security;
-- Sem policy de select para anon/authenticated — só service_role
-- (padrão: nenhuma policy = nenhum acesso via PostgREST).

-- ── 2. Amostra de validação humana ──────────────────────────────────
create table if not exists public.stf_decisoes_classificacao_validacao (
  id                   uuid primary key default gen_random_uuid(),
  id_fato_decisao      bigint not null
                         references public.stf_decisoes(id_fato_decisao)
                         on delete cascade,
  campo_validado        text not null check (campo_validado in
                          ('natureza_ato', 'sentido_merito', 'eixo_direitos_civis',
                           'eixo_lib_imprensa', 'eixo_seg_publica', 'eixo_democracia')),
  leitura_humana         text not null,
  concorda_com_modelo    boolean not null,
  validado_por           text not null,
  validado_em            timestamptz not null default now()
);

comment on table public.stf_decisoes_classificacao_validacao is
  'Amostra de validação humana (Luiz revisa manualmente uma amostra estratificada '
  'e registra se concorda com a leitura do modelo). A taxa de concordância vai '
  'publicada em /metodologia, seja qual for. Sem grant público.';

alter table public.stf_decisoes_classificacao_validacao enable row level security;
-- Sem policy de select para anon/authenticated — só service_role.

-- ── 3. View agregada pública — o único portão de publicação ────────
-- O limiar (>= 30 decisões classificadas) e a exigência de validação
-- concluída moram aqui, em SQL, não espalhados no frontend. Enquanto
-- amostra_validada não virar true à mão (ver seção de validação do
-- plano), esta view não devolve NENHUMA linha — carregarTendencia()
-- no frontend recebe lista vazia, nunca um número fabricado.
create or replace view public.stf_ministros_tendencia_publica
  with (security_invoker = true) as
with base as (
  select
    d.ministro_id,
    c.eixo_direitos_civis as direitos_civis,
    c.eixo_lib_imprensa   as lib_imprensa,
    c.eixo_seg_publica    as seg_publica,
    c.eixo_democracia     as democracia
  from public.stf_decisoes_classificacao c
  join public.stf_decisoes d using (id_fato_decisao)
  where d.ministro_id is not null
    and d.ministro_resolucao = 'nome'
    and c.natureza_ato = 'merito'
),
por_dimensao as (
  select ministro_id, 'direitos_civis' as dimensao, direitos_civis as leitura
    from base where direitos_civis is not null and direitos_civis != 'nao_se_aplica'
  union all
  select ministro_id, 'lib_imprensa', lib_imprensa
    from base where lib_imprensa is not null and lib_imprensa != 'nao_se_aplica'
  union all
  select ministro_id, 'seg_publica', seg_publica
    from base where seg_publica is not null and seg_publica != 'nao_se_aplica'
  union all
  select ministro_id, 'democracia', democracia
    from base where democracia is not null and democracia != 'nao_se_aplica'
),
agregado as (
  select
    ministro_id,
    dimensao,
    count(*) as total_classificadas,
    round(100.0 * count(*) filter (where leitura = 'progressista') / count(*), 1)
      as pct_progressista,
    round(100.0 * count(*) filter (where leitura = 'conservador') / count(*), 1)
      as pct_conservador
  from por_dimensao
  group by ministro_id, dimensao
),
-- Validação humana concluída: pelo menos uma linha validada para a
-- dimensão em questão. Amarra o gate de publicação à validação real,
-- não a uma flag manual solta que alguém esqueceria de desligar.
validado as (
  select distinct
    d.ministro_id,
    case v.campo_validado
      when 'eixo_direitos_civis' then 'direitos_civis'
      when 'eixo_lib_imprensa' then 'lib_imprensa'
      when 'eixo_seg_publica' then 'seg_publica'
      when 'eixo_democracia' then 'democracia'
    end as dimensao
  from public.stf_decisoes_classificacao_validacao v
  join public.stf_decisoes d using (id_fato_decisao)
  where v.campo_validado in
    ('eixo_direitos_civis', 'eixo_lib_imprensa', 'eixo_seg_publica', 'eixo_democracia')
)
select
  a.ministro_id,
  a.dimensao,
  a.total_classificadas,
  a.pct_progressista,
  a.pct_conservador,
  true as amostra_validada
from agregado a
join validado v on v.ministro_id = a.ministro_id and v.dimensao = a.dimensao
where a.total_classificadas >= 30;

comment on view public.stf_ministros_tendencia_publica is
  'Único ponto de leitura pública da tendência de voto por ministro. Só devolve '
  'linha com >= 30 decisões de mérito classificadas NA MESMA dimensão E pelo '
  'menos uma validação humana registrada para aquele ministro+dimensão. Ausência '
  'de linha = "sem dado suficiente", nunca um valor neutro fabricado.';

grant select on public.stf_ministros_tendencia_publica to anon, authenticated;

-- ── 4. Achado na aplicação (2026-09-10): grant automático do projeto ──
-- Este projeto Supabase (compartilhado por vários produtos, não só o
-- Observatório) concede INSERT/SELECT/UPDATE/DELETE/REFERENCES/TRIGGER
-- automaticamente a anon/authenticated em toda tabela NOVA — provável
-- ALTER DEFAULT PRIVILEGES no schema public, anterior a este projeto.
-- A RLS habilitada sem policy (seções 1 e 2 acima) já bloqueia o acesso
-- de fato via PostgREST, mas os grants revogados abaixo removem a
-- superfície por completo em vez de depender só da RLS. Isto é sobre
-- ESTA tabela; não mexe em nenhuma outra tabela do projeto compartilhado.
revoke all on public.stf_decisoes_classificacao from anon, authenticated;
revoke all on public.stf_decisoes_classificacao_validacao from anon, authenticated;

-- ────────────────────────────────────────────────────────────────
-- VERIFICAÇÃO
--   -- Confirma que as tabelas cruas NÃO têm grant público:
--   select grantee, table_name from information_schema.role_table_grants
--    where table_name in ('stf_decisoes_classificacao',
--                          'stf_decisoes_classificacao_validacao')
--      and grantee in ('anon', 'authenticated');
--   -- deve devolver ZERO linhas.
--
--   -- Confirma que a view tem o grant certo:
--   select grantee, table_name from information_schema.role_table_grants
--    where table_name = 'stf_ministros_tendencia_publica';
--
--   -- Antes de qualquer classificação real existir, a view deve estar vazia:
--   select count(*) from public.stf_ministros_tendencia_publica; -- 0
-- ────────────────────────────────────────────────────────────────
