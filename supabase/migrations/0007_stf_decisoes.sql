-- ────────────────────────────────────────────────────────────────
-- 0007 — stf_decisoes: modelo bruto-primeiro para decisões do STF
-- Achado D1 da auditoria de 2026-08-17.
-- Proposta aprovada: docs/proposta-schema-stf-decisoes.md
--
-- POR QUE UMA TABELA NOVA E NÃO UMA MIGRAÇÃO DE stf_votacoes
-- stf_votacoes não guarda o `andamento` bruto — só o valor já
-- normalizado. Foi por isso que o bug do "Ausente" não pôde ser
-- corrigido com um UPDATE: a informação de origem foi destruída na
-- ingestão. A auditoria D2 estimou 133.681 registros (17,6%)
-- classificados errado pelo bug de substring, irrecuperáveis sem
-- reingerir. Manter aquele schema é herdar essa propriedade.
--
-- Aqui todo campo da fonte é persistido COMO VEIO, e o que é
-- interpretação fica em colunas derivadas, recomputáveis por UPDATE.
--
-- FONTE
-- Qlik Sense do STF (fonte primária, não espelho):
--   app  corte_aberta_decisoes  023307ab-d927-4144-aabb-831b360515bb
--   obj  UbMrYBg                21 colunas, 2.973.557 linhas
--   reload diário ~09h15 UTC; decisão mais recente em 14/08/2026
-- Substitui basedosdados.br_stf_corte_aberta.decisoes, estático desde
-- março/2025 e sem nada além de 19/01/2025.
--
-- stf_votacoes NÃO é tocada por esta migration. Fica congelada até o
-- front migrar; só então é descartada.
-- ────────────────────────────────────────────────────────────────

create table if not exists public.stf_decisoes (
  id                  uuid primary key default gen_random_uuid(),

  -- ── Chave natural da fonte ──
  -- Torna a ingestão idempotente sem heurística. stf_votacoes usava
  -- (ministro_id, processo, data), que colide quando o mesmo relator
  -- profere duas decisões no mesmo processo no mesmo dia — e descartava
  -- silenciosamente a segunda.
  id_fato_decisao     bigint      not null unique,

  -- ── Campos da fonte, sem interpretação ──
  processo            text        not null,
  relator_bruto       text        not null,
  relator_atual_bruto text,
  tipo_origem         text        not null,
  tipo_decisao        text,
  andamento_bruto     text        not null,
  observacao          text,
  data_decisao        date        not null,
  ano_decisao         smallint    not null,
  orgao_julgador      text,
  origem_decisao      text,
  ambiente_julgamento text,
  meio_processo       text,
  assunto             text,
  data_autuacao       date,
  data_baixa          date,
  em_tramitacao       boolean,
  orgao_origem        text,
  procedencia         text,

  -- ── Derivadas: recomputáveis sem reingerir ──
  ministro_id         uuid references public.stf_ministros(id) on delete set null,
  ministro_resolucao  text check (ministro_resolucao in
                        ('nome', 'presidencia', 'nao_aplicavel', 'desconhecido')),
  sentido             text,

  ingerido_em         timestamptz not null default now(),
  fonte               text        not null
                        default 'transparencia.stf.jus.br/app/023307ab-d927-4144-aabb-831b360515bb/UbMrYBg'
);

comment on table public.stf_decisoes is
  'Decisões do STF, modelo bruto-primeiro (migration 0007, achado D1). Todo campo '
  'da fonte é persistido como veio; interpretação fica nas colunas derivadas. '
  'Substitui stf_votacoes, que normalizava na escrita e perdia o original.';

comment on column public.stf_decisoes.id_fato_decisao is
  'Chave natural da fonte (idFatoDecisao). Base do upsert — não invente chave composta.';

comment on column public.stf_decisoes.andamento_bruto is
  'Andamento COMO VEIO da fonte. 293 valores distintos, em três gramáticas: '
  '"Negado seguimento", "DECISÃO DO(A) RELATOR(A) - NEGADO SEGUIMENTO" e '
  '"JULG. POR DESPACHO - NEGADO SEGUIMENTO" são o mesmo ato e somam 34% do acervo. '
  'NUNCA normalize na escrita — foi o que inutilizou stf_votacoes.';

comment on column public.stf_decisoes.tipo_origem is
  'MONOCRÁTICA (86,4%) ou COLEGIADA (13,6%). A separação que faltava a stf_votacoes: '
  'decisão individual de relator não é votação colegiada.';

comment on column public.stf_decisoes.ministro_resolucao is
  'Como ministro_id foi resolvido, para a atribuição ser auditável: '
  'nome = relator_bruto nomeia o ministro; '
  'presidencia = relator_bruto era MINISTRO PRESIDENTE e foi resolvido pela data '
  'via stf_presidencias (19,4% do acervo); '
  'nao_aplicavel = fonte diz NÃO SE APLICA (7,0%); '
  'desconhecido = não foi possível resolver — a LINHA ENTRA MESMO ASSIM. '
  'O MAPA_MINISTRO antigo descartava em silêncio o que não reconhecia.';

comment on column public.stf_decisoes.sentido is
  'NULO DE PROPÓSITO até existir taxonomia publicada. Foi a pressa em preencher o '
  'equivalente disto que produziu os 64% de "Ausente" em stf_votacoes. '
  '"Negado seguimento" é recusa de admissibilidade, não julgamento de mérito. '
  'Com andamento_bruto guardado, preencher depois é UPDATE, não reingestão. '
  'Ver docs/proposta-schema-stf-decisoes.md, seção 5.';

comment on column public.stf_decisoes.ingerido_em is
  'PRIMEIRA ingestão da linha, não a última. O upsert não inclui esta coluna no '
  'payload, então o on_conflict a preserva. Para saber quando a ingestão rodou '
  'pela última vez, use stf_ingestao_log — não esta coluna.';

-- ── Índices ──
create index if not exists stf_decisoes_ministro_data_idx
  on public.stf_decisoes (ministro_id, data_decisao desc);
create index if not exists stf_decisoes_data_idx
  on public.stf_decisoes (data_decisao desc);
create index if not exists stf_decisoes_ano_idx
  on public.stf_decisoes (ano_decisao);
create index if not exists stf_decisoes_processo_idx
  on public.stf_decisoes (processo);
-- Suporta o corte mais frequente da interface: monocráticas de um ministro.
create index if not exists stf_decisoes_tipo_origem_idx
  on public.stf_decisoes (tipo_origem, data_decisao desc);

-- ── Leitura pública ──
-- Mesmo contrato das demais tabelas do site: todo o conteúdo é aberto.
alter table public.stf_decisoes enable row level security;

drop policy if exists stf_decisoes_select_public on public.stf_decisoes;
create policy stf_decisoes_select_public
  on public.stf_decisoes
  for select
  to anon, authenticated
  using (true);

grant select on public.stf_decisoes to anon, authenticated;

-- ────────────────────────────────────────────────────────────────
-- VERIFICAÇÃO PÓS-BACKFILL
--   select ano_decisao, count(*) from public.stf_decisoes
--    group by 1 order by 1 desc limit 5;
--   -- 2026 deve ter ~71.499 linhas e max(data_decisao) recente.
--
--   select ministro_resolucao, count(*) from public.stf_decisoes group by 1;
--   -- 'desconhecido' alto = mapa de relatores precisa de manutenção,
--   --  mas NENHUMA linha foi descartada por isso.
--
-- stf_votacoes segue intacta. Não descarte antes de o front migrar.
-- ────────────────────────────────────────────────────────────────
