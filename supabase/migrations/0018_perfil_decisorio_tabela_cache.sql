-- ────────────────────────────────────────────────────────────────
-- 0018 — Converte as views de 0017 em tabelas pré-computadas
--
-- Achado ao testar em dev: a view ao vivo (0017) trava sob a mesma
-- rajada de concorrência que já afeta carregarDecisoes/carregarResumo
-- — getStaticPaths dispara 33 consultas simultâneas (uma por ministro)
-- e cada uma reagregaria as ~1,9M linhas do escopo via PostgREST, que
-- tem um teto de ~8s no papel `authenticator` (ver o comentário longo
-- em carregarResumo(), src/lib/dados.ts) — sobrevive à troca de papel,
-- não é configurável por role. Erro real observado: "canceling
-- statement due to statement timeout" em rajada de 33 chamadas.
--
-- Mesma correção que já existe pra stf_estatisticas (migration 0012):
-- tabela pré-computada, populada por SQL direto (fora do PostgREST,
-- sem o teto do authenticator), lida pelo build por chave primária —
-- nunca agregada ao vivo pela API pública.
--
-- ⚠️ REFRESH AINDA NÃO AUTOMATIZADO. stf_estatisticas é recalculada
-- pelo pipeline de ingestão (atualizar_estatisticas() em
-- fetch_decisoes_qlik.py) a cada execução diária. Esta tabela, por
-- enquanto, só tem a carga inicial desta migration — decisão
-- pendente sobre como/quando reexecutar (estender o pipeline Python
-- via RPC de uma function SQL, ou rodar manualmente via SQL direto
-- quando o dicionário de stf_natureza_ato_mapa crescer). Documentado
-- aqui para não passar por "está automatizado" sem estar.
-- ────────────────────────────────────────────────────────────────

drop view if exists public.stf_ministros_perfil_decisorio;
drop view if exists public.stf_ministros_mix_atuacao;

create table public.stf_ministros_perfil_decisorio (
  ministro_id           uuid primary key references public.stf_ministros(id),
  total_decisoes        bigint not null,
  total_classificadas    bigint not null,
  pct_classificadas      numeric,
  n_merito                bigint not null,
  n_admissibilidade       bigint not null,
  n_cautelar              bigint not null,
  n_processual            bigint not null,
  n_devolucao             bigint not null,
  pct_merito              numeric,
  pct_admissibilidade     numeric,
  pct_cautelar            numeric,
  pct_processual          numeric,
  pct_devolucao           numeric,
  n_merito_com_sentido    bigint not null,
  n_favoravel             bigint not null,
  n_contrario             bigint not null,
  n_parcial               bigint not null,
  pct_favoravel           numeric,
  pct_contrario           numeric,
  pct_parcial             numeric,
  tempo_medio_dias        numeric,
  calculado_em            timestamptz not null default now()
);

comment on table public.stf_ministros_perfil_decisorio is
  'Perfil decisório por ministro, PRÉ-COMPUTADO (mesmo padrão de stf_estatisticas, '
  'migration 0012) — nunca agregado ao vivo via PostgREST, que trava sob a rajada '
  'de 33 consultas concorrentes do build (getStaticPaths). Refresh ainda manual — '
  'ver o aviso na migration 0018.';

create table public.stf_ministros_mix_atuacao (
  ministro_id       uuid primary key references public.stf_ministros(id),
  total_nome         bigint not null,
  n_monocratica       bigint not null,
  n_colegiada         bigint not null,
  pct_monocratica     numeric,
  pct_colegiada       numeric,
  calculado_em        timestamptz not null default now()
);

comment on table public.stf_ministros_mix_atuacao is
  'Mix monocrática/colegiada por ministro, PRÉ-COMPUTADO. Mesmo motivo de '
  'stf_ministros_perfil_decisorio — ver migration 0018.';

-- ── Carga inicial (SQL direto, sem passar pelo PostgREST) ───────────
insert into public.stf_ministros_perfil_decisorio (
  ministro_id, total_decisoes, total_classificadas, pct_classificadas,
  n_merito, n_admissibilidade, n_cautelar, n_processual, n_devolucao,
  pct_merito, pct_admissibilidade, pct_cautelar, pct_processual, pct_devolucao,
  n_merito_com_sentido, n_favoravel, n_contrario, n_parcial,
  pct_favoravel, pct_contrario, pct_parcial, tempo_medio_dias
)
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

-- ── Leitura pública, sem escrita ─────────────────────────────────────
alter table public.stf_ministros_perfil_decisorio enable row level security;
create policy stf_ministros_perfil_decisorio_select_public
  on public.stf_ministros_perfil_decisorio for select to anon, authenticated using (true);
grant select on public.stf_ministros_perfil_decisorio to anon, authenticated;
revoke insert, update, delete on public.stf_ministros_perfil_decisorio from anon, authenticated;

alter table public.stf_ministros_mix_atuacao enable row level security;
create policy stf_ministros_mix_atuacao_select_public
  on public.stf_ministros_mix_atuacao for select to anon, authenticated using (true);
grant select on public.stf_ministros_mix_atuacao to anon, authenticated;
revoke insert, update, delete on public.stf_ministros_mix_atuacao from anon, authenticated;

-- ────────────────────────────────────────────────────────────────
-- VERIFICAÇÃO
--   select count(*) from stf_ministros_perfil_decisorio;  -- ~33 (1 por ministro com escopo)
--   select grantee, table_name, privilege_type from information_schema.role_table_grants
--    where table_name in ('stf_ministros_perfil_decisorio','stf_ministros_mix_atuacao')
--      and grantee in ('anon','authenticated');  -- só SELECT
-- ────────────────────────────────────────────────────────────────
