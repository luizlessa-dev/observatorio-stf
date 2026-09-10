-- ────────────────────────────────────────────────────────────────
-- 0016 — Perfil decisório por ministro: natureza do ato + taxa de
-- provimento, classificados por REGRA (leitura literal do texto
-- jurídico), sem LLM e sem custo de API. Substitui a reconstrução do
-- termômetro por classificação de IA (0014, revertida em 0015) depois
-- de o custo estimado (~US$100-400 pro histórico) ter sido descartado.
--
-- POR QUE ISTO NÃO É "TENDÊNCIA IDEOLÓGICA"
-- Não há eixo progressista/conservador aqui. "Provido"/"não provido"
-- é o resultado literal que o próprio STF escreveu no andamento — não
-- é uma leitura de mérito substantivo nem de lado político. A mesma
-- disciplina de docs/proposta-schema-stf-decisoes.md seção 5 se
-- aplica: natureza do ato vem antes de qualquer leitura de resultado,
-- e "negado seguimento"/"não conhecido" (recusa de admissibilidade)
-- NUNCA conta como "contrário" — são coisas diferentes.
--
-- POR QUE UMA TABELA DE DICIONÁRIO, NÃO UM CASE INLINE NA VIEW
-- 169 valores distintos de andamento_bruto no escopo (monocráticas
-- com ministro nomeado). Uma tabela é auditável e extensível por
-- INSERT/UPDATE simples — o mesmo raciocínio do MAPA_MINISTRO do
-- conector, só que aqui é mapa de RESULTADO, não de identidade.
-- ~91% do escopo mapeado nesta migration; o resto ("DECISÃO DO
-- RELATOR" sem outro detalhe, "DECISÃO" genérica, sigilosas sem
-- andamento explícito) fica de fora de propósito — é genuinamente
-- ambíguo, não dá pra saber o resultado só pelo texto do andamento.
-- Nenhuma decisão é descartada: fica "não classificada", visível na
-- view, nunca contada como se fosse um resultado.
-- ────────────────────────────────────────────────────────────────

create table if not exists public.stf_natureza_ato_mapa (
  andamento_bruto  text primary key,
  natureza_ato     text not null check (natureza_ato in
                      ('merito', 'admissibilidade', 'cautelar',
                       'processual', 'devolucao')),
  sentido_merito   text check (sentido_merito in
                      ('favoravel', 'contrario', 'parcial')),
  notas            text,
  criado_em        timestamptz not null default now(),

  constraint stf_natureza_ato_mapa_sentido_so_em_merito check (
    sentido_merito is null or natureza_ato = 'merito'
  )
);

comment on table public.stf_natureza_ato_mapa is
  'Dicionário andamento_bruto -> natureza do ato (+ sentido, só dentro de '
  'mérito), classificado por regra/leitura literal do texto jurídico do STF. '
  'Sem LLM. Extensível: novo andamento_bruto vira uma linha nova, nunca um '
  'CASE reescrito. Ver migration 0016 e docs/proposta-schema-stf-decisoes.md §5.';

comment on column public.stf_natureza_ato_mapa.natureza_ato is
  'merito = o tribunal decidiu o pedido; admissibilidade = recusou processar '
  '(negado seguimento, não conhecido — NÃO é julgamento de mérito); '
  'cautelar = liminar/prisão preventiva, decisão provisória; '
  'processual = estados que não julgam o pedido (sobrestado, prejudicado, '
  'extinção, desistência, arquivamento, declínio de competência); '
  'devolucao = devolução por repercussão geral/543-B, não decide o caso.';

comment on column public.stf_natureza_ato_mapa.sentido_merito is
  'Só preenchido quando natureza_ato = merito. favoravel/contrario/parcial '
  'em relação ao que foi pedido — não a um "lado político". Pode ficar nulo '
  'mesmo em mérito quando o andamento não deixa o sentido claro por si só '
  '(ex.: "Julgado mérito de tema com repercussão geral").';

-- ── admissibilidade ──────────────────────────────────────────────
insert into public.stf_natureza_ato_mapa (andamento_bruto, natureza_ato) values
  ('Negado seguimento', 'admissibilidade'),
  ('DECISÃO DO(A) RELATOR(A) - NEGADO SEGUIMENTO', 'admissibilidade'),
  ('JULG. POR DESPACHO - NEGADO SEGUIMENTO', 'admissibilidade'),
  ('Não conhecido(s)', 'admissibilidade'),
  ('DECISÃO DO(A) RELATOR(A) - NÃO CONHECIDO', 'admissibilidade'),
  ('JULG. POR DESPACHO - NAO CONHECIDO', 'admissibilidade'),
  ('Inadmitidos os embargos de divergência', 'admissibilidade'),
  ('Embargos não conhecidos', 'admissibilidade'),
  ('Agravo regimental não conhecido', 'admissibilidade'),
  ('Negado seguimento por ausência de preliminar, art. 327 do RISTF', 'admissibilidade'),
  ('DECISÃO DO(A) RELATOR(A) - INADMITIDOS OS EMBARGOS', 'admissibilidade'),
  ('JULG. P/DESPAC.- INADMITIDOS OS EMBARGOS', 'admissibilidade'),
  ('Não conhecido por ausência de preliminar, art. 327 do RISTF', 'admissibilidade'),
  ('Embargos recebidos como agravo regimental desde logo não conhecido', 'admissibilidade'),
  ('LIMINAR POR DESPACHO - NAO CONHECIDA', 'admissibilidade'),
  ('LIMINAR POR DESPACHO - NEGADO SEGUIMENTO', 'admissibilidade'),
  ('Rejeitada a queixa', 'admissibilidade'),
  ('Rejeitada a denúncia', 'admissibilidade'),
  ('Decisão pela inexistência de repercussão geral', 'admissibilidade'),
  ('Agravo provido e desde logo negado seguimento ao RE', 'admissibilidade')
on conflict (andamento_bruto) do nothing;

-- ── devolucao ────────────────────────────────────────────────────
insert into public.stf_natureza_ato_mapa (andamento_bruto, natureza_ato) values
  ('Determinada a devolução, art. 543-B do CPC', 'devolucao'),
  ('Determinada a devolução pelo regime da repercussão geral', 'devolucao'),
  ('Determinada a devolução', 'devolucao'),
  ('Agravo provido e determinada a devolução, art. 543-B do CPC', 'devolucao'),
  ('Reconsidero e devolvo pelo art. 543-B do CPC', 'devolucao'),
  ('Reconsidero e devolvo pelo regime da repercussão geral', 'devolucao'),
  ('Agravo provido e determinada a devolução pelo regime da repercussão geral', 'devolucao'),
  ('Determinada a devolução em razão de representativo da controvérsia', 'devolucao'),
  ('AI provido e determinada a conversão em RE', 'devolucao'),
  ('AI provido e determinada a subida do RE', 'devolucao'),
  ('Determinada a remessa ao STJ para julgamento como REsp (art. 1.033 do CPC)', 'devolucao'),
  ('Agravo provido e RE pendente de julgamento', 'devolucao'),
  ('Decisão pela existência de repercussão geral', 'devolucao')
on conflict (andamento_bruto) do nothing;

-- ── cautelar ─────────────────────────────────────────────────────
insert into public.stf_natureza_ato_mapa (andamento_bruto, natureza_ato) values
  ('Liminar indeferida', 'cautelar'),
  ('Liminar deferida', 'cautelar'),
  ('DECISÃO LIMINAR - INDEFERIDA', 'cautelar'),
  ('DECISÃO LIMINAR - DEFERIDA', 'cautelar'),
  ('LIMINAR JULG. POR DESPACHO - INDEFERIDA', 'cautelar'),
  ('Liminar deferida em parte', 'cautelar'),
  ('LIMINAR POR DESPACHO - DEFERIDA', 'cautelar'),
  ('Decisão liminar (segredo de justiça)', 'cautelar'),
  ('Liminar deferida ad referendum', 'cautelar'),
  ('Liminar parcialmente deferida ad referendum', 'cautelar'),
  ('LIMINAR JULGADA PELO PRESIDENTE - INDEFERIDA', 'cautelar'),
  ('LIMINAR JULGADA PELO PRESIDENTE - DEFERIDA', 'cautelar'),
  ('Liminar indeferida ad referendum', 'cautelar'),
  ('LIMINAR POR DESPACHO - DEFERIDA EM PARTE', 'cautelar'),
  ('Concedida a suspensão', 'cautelar'),
  ('Denegada a suspensão', 'cautelar'),
  ('Decretada a prisão', 'cautelar'),
  ('Revogada a prisão', 'cautelar'),
  ('JULG. P/DESP.-DECRETADA PRISAO EXTRADIT.', 'cautelar')
on conflict (andamento_bruto) do nothing;

-- ── processual ───────────────────────────────────────────────────
insert into public.stf_natureza_ato_mapa (andamento_bruto, natureza_ato) values
  ('Prejudicado', 'processual'),
  ('DECISÃO DO(A) RELATOR(A) - PREJUDICADO', 'processual'),
  ('Sobrestado', 'processual'),
  ('SOBRESTADO O PROCESSO', 'processual'),
  ('Sobrestado, aguardando decisão do STJ', 'processual'),
  ('SOBRESTADO EXAME DESTE RECURSO', 'processual'),
  ('SOBRESTADO ATÉ DECISÃO DO STJ', 'processual'),
  ('JULGAMENTO POR DESPACHO - PREJUDICADO', 'processual'),
  ('Homologada a desistência', 'processual'),
  ('DECISÃO DO(A) RELATOR(A) - HOMOLOGADA A DESISTÊNCIA', 'processual'),
  ('JULG. POR DESPACHO -HOMOL. A DESISTENCIA', 'processual'),
  ('HOMOLOGADA A DESISTENCIA', 'processual'),
  ('Extinto o processo', 'processual'),
  ('JULGAMENTO POR DESP.- EXTINTO O PROCESSO', 'processual'),
  ('Embargos rejeitados', 'processual'),
  ('Reconsideração', 'processual'),
  ('RECONSIDERAÇÃO', 'processual'),
  ('Declinada a competência', 'processual'),
  ('DECISÃO DO(A) RELATOR(A) - DECLINANDO DA COMPETÊNCIA', 'processual'),
  ('JULG. P/DESPACHO-DECLINACAO COMPETENCIA', 'processual'),
  ('Embargos recebidos', 'processual'),
  ('Embargos recebidos em parte', 'processual'),
  ('Admitidos embargos de divergência', 'processual'),
  ('DECISÃO DO(A) RELATOR(A) - ADMITIDOS OS EMBARGOS', 'processual'),
  ('JULGAMENTO POR DESPACHO - ADMITIDOS OS EMBARGOS', 'processual'),
  ('Determinado arquivamento', 'processual'),
  ('JULGAMENTO POR DESPACHO - ARQUIVADO', 'processual'),
  ('DECISÃO DO(A) RELATOR(A) - ARQUIVADO', 'processual'),
  ('Adotado rito do Art. 12, da Lei 9.868/99', 'processual'),
  ('Convertido em diligência', 'processual'),
  ('CONVERTIDO EM DILIGÊNCIA', 'processual'),
  ('Reconsidero e julgo prejudicado o recurso interno', 'processual'),
  ('Declarada a extinção da punibilidade', 'processual'),
  ('JULG. POR DESP.-EXTINCAO DA PUNIBILIDADE', 'processual'),
  ('DECISÃO DO(A) RELATOR(A) - EXTINÇÃO DA PUNIBILIDADE', 'processual'),
  ('Decretada a deserção', 'processual'),
  ('JULG. P/ DESP. - PREJ./DESIST.', 'processual'),
  ('Homologação de acordo de não persecução penal - art.28-A do CPP', 'processual'),
  ('Homologado acordo de não persecução penal', 'processual'),
  ('Homologação de transação penal', 'processual'),
  ('Homologado o acordo', 'processual'),
  ('Homologado', 'processual'),
  ('Recebida denúncia', 'processual'),
  ('Recebida a queixa', 'processual'),
  ('Recebidos', 'processual'),
  ('Recebidos em parte', 'processual'),
  ('QUESTAO DE ORDEM', 'processual'),
  ('Questão de ordem', 'processual'),
  ('Declarada a restauração dos autos', 'processual'),
  ('À Secretaria, para o regular trâmite', 'processual'),
  ('DECISÃO DO PRESIDENTE - HOMOL. A SENTENÇA', 'processual'),
  ('Decisão Ratificada', 'processual'),
  ('Liminar prejudicada', 'processual'),
  ('LIMINAR POR DESPACHO - PREJUDICADA', 'processual'),
  ('Reconsidero e determino a distribuição', 'processual'),
  ('JULGAMENTO POR DESPACHO - DESERTO', 'processual')
on conflict (andamento_bruto) do nothing;

-- ── mérito / favoravel ───────────────────────────────────────────
insert into public.stf_natureza_ato_mapa (andamento_bruto, natureza_ato, sentido_merito) values
  ('DECISÃO DO(A) RELATOR(A) - PROVIDO', 'merito', 'favoravel'),
  ('Provido', 'merito', 'favoravel'),
  ('Procedente', 'merito', 'favoravel'),
  ('JULGAMENTO POR DESPACHO - PROVIDO', 'merito', 'favoravel'),
  ('DECISÃO DO(A) RELATOR(A) - CONHECIDO E PROVIDO', 'merito', 'favoravel'),
  ('JULG. POR DESPACHO - CONHECIDO E PROVIDO', 'merito', 'favoravel'),
  ('Deferido', 'merito', 'favoravel'),
  ('Agravo provido e desde logo provido o RE', 'merito', 'favoravel'),
  ('Concedida a ordem', 'merito', 'favoravel'),
  ('Concedida a ordem de ofício', 'merito', 'favoravel'),
  ('Conhecido e provido', 'merito', 'favoravel'),
  ('DECISÃO DO(A) RELATOR(A) - CONHECER DO AGRAVO E DAR PROVIMENTO AO RE', 'merito', 'favoravel'),
  ('Agravo regimental provido', 'merito', 'favoravel'),
  ('Concedida a segurança', 'merito', 'favoravel'),
  ('Agravo de instrumento provido', 'merito', 'favoravel'),
  ('DECISÃO DO(A) RELATOR(A) - DEFERIDO', 'merito', 'favoravel'),
  ('AGRAVO PROVIDO E DESDE LOGO CONHECIDO E PROVIDO O RE', 'merito', 'favoravel'),
  ('Embargos recebidos como agravo regimental desde logo provido', 'merito', 'favoravel'),
  ('JULG. POR DESPACHO - DEFERIDO', 'merito', 'favoravel')
on conflict (andamento_bruto) do nothing;

-- ── mérito / contrario ───────────────────────────────────────────
insert into public.stf_natureza_ato_mapa (andamento_bruto, natureza_ato, sentido_merito) values
  ('Não provido', 'merito', 'contrario'),
  ('Agravo não provido', 'merito', 'contrario'),
  ('DECISÃO DO(A) RELATOR(A) - NÃO PROVIDO', 'merito', 'contrario'),
  ('JULGAMENTO POR DESPACHO - NAO PROVIDO', 'merito', 'contrario'),
  ('Indeferido', 'merito', 'contrario'),
  ('Denegada a ordem', 'merito', 'contrario'),
  ('Conhecido e negado provimento', 'merito', 'contrario'),
  ('Improcedente', 'merito', 'contrario'),
  ('Denegada a segurança', 'merito', 'contrario'),
  ('JULG. POR DESPACHO - INDEFERIDO', 'merito', 'contrario'),
  ('Conhecido em parte e nessa parte negado provimento', 'merito', 'contrario'),
  ('Agravo regimental não provido', 'merito', 'contrario'),
  ('DECISÃO DO(A) RELATOR(A) - INDEFERIDO', 'merito', 'contrario'),
  ('DECISÃO DO(A) RELATOR(A) - NEGADO PROVIMENTO AO AGRAVO', 'merito', 'contrario'),
  ('Embargos recebidos como agravo regimental desde logo não provido', 'merito', 'contrario'),
  ('DECISÃO DA PRESIDÊNCIA - INDEFERIDO', 'merito', 'contrario')
on conflict (andamento_bruto) do nothing;

-- ── mérito / parcial ─────────────────────────────────────────────
insert into public.stf_natureza_ato_mapa (andamento_bruto, natureza_ato, sentido_merito) values
  ('Provido em parte', 'merito', 'parcial'),
  ('Procedente em parte', 'merito', 'parcial'),
  ('Concedida em parte a ordem', 'merito', 'parcial'),
  ('JULG. POR DESPACHO-CONHECE EM PARTE E NESSA PARTE DÁ PROVIMENTO', 'merito', 'parcial'),
  ('DECISÃO DO(A) RELATOR(A) - CONHECE EM PARTE E NESSA PARTE DÁ PROVIMENTO', 'merito', 'parcial'),
  ('DECISÃO DO(A) RELATOR(A) - CONHECIDO E PROVIDO EM PARTE', 'merito', 'parcial'),
  ('Deferido em parte', 'merito', 'parcial'),
  ('Agravo provido e desde logo provido parcialmente o RE', 'merito', 'parcial'),
  ('Conhecido e provido em parte', 'merito', 'parcial'),
  ('Concedida em parte a segurança', 'merito', 'parcial'),
  ('DECISÃO DO(A) RELATOR(A) - CONHECER DO AGRAVO E DAR PARCIAL PROVIMENTO AO RE', 'merito', 'parcial'),
  ('Agravo regimental provido em parte', 'merito', 'parcial'),
  ('Conhecido em parte e nessa parte provido', 'merito', 'parcial'),
  ('Conhecido em parte e nessa parte parcialmente provido', 'merito', 'parcial'),
  ('DECISÃO DO PRESIDENTE - INDEFERIDO EM PARTE', 'merito', 'parcial'),
  ('JULGAMENTO POR DESPACHO - AGRAVO PROVIDO E DESDE LOGO CONHECIDO EM PARTE O RE E NESSA PARTE DADO PROVIMENTO', 'merito', 'parcial')
on conflict (andamento_bruto) do nothing;

-- ── mérito / sentido indeterminável pelo texto do andamento ───────
insert into public.stf_natureza_ato_mapa (andamento_bruto, natureza_ato, sentido_merito, notas) values
  ('Julgado mérito de tema com repercussão geral', 'merito', null,
   'O andamento diz que houve julgamento de mérito, mas não diz o sentido — não inventar.')
on conflict (andamento_bruto) do nothing;

create index if not exists stf_natureza_ato_mapa_natureza_idx
  on public.stf_natureza_ato_mapa (natureza_ato);

alter table public.stf_natureza_ato_mapa enable row level security;
create policy stf_natureza_ato_mapa_select_public
  on public.stf_natureza_ato_mapa
  for select to anon, authenticated using (true);
grant select on public.stf_natureza_ato_mapa to anon, authenticated;
-- Só SELECT. Sem INSERT/UPDATE/DELETE público — este projeto Supabase concede
-- grant automático de escrita a anon/authenticated em toda tabela nova (achado
-- registrado em 0014); revogo explicitamente por defesa em profundidade.
revoke insert, update, delete on public.stf_natureza_ato_mapa from anon, authenticated;

-- ────────────────────────────────────────────────────────────────
-- VERIFICAÇÃO — rodar depois de aplicar, antes de seguir pro front
--
--   -- Cobertura: quanto do escopo ficou sem classificação
--   select count(*) as sem_classificacao
--   from stf_decisoes d
--   where d.tipo_origem = 'MONOCRÁTICA' and d.ministro_resolucao = 'nome'
--     and not exists (
--       select 1 from stf_natureza_ato_mapa m
--       where m.andamento_bruto = d.andamento_bruto
--     );
--
--   -- Quais valores ficaram de fora, por volume (confirma que só os
--   -- genuinamente ambíguos ficaram fora, não um typo de transcrição)
--   select d.andamento_bruto, count(*) as n
--   from stf_decisoes d
--   where d.tipo_origem = 'MONOCRÁTICA' and d.ministro_resolucao = 'nome'
--     and not exists (
--       select 1 from stf_natureza_ato_mapa m
--       where m.andamento_bruto = d.andamento_bruto
--     )
--   group by 1 order by n desc;
-- ────────────────────────────────────────────────────────────────
