-- ────────────────────────────────────────────────────────────────
-- 0009 — Ministros históricos e reatribuição do acervo
-- Aplicada em 2026-08-19. Fecha o maior item do backlog do achado D1.
--
-- PROBLEMA
-- stf_ministros tinha 15 linhas para um acervo que cobre 26 anos de
-- Corte. 40,7% das 2,97 milhões de decisões ficavam com
-- ministro_resolucao='desconhecido' — não por perda de dado (o
-- relator_bruto sempre foi preservado), mas por falta de ministro
-- cadastrado com quem casar.
--
-- FONTE (conferida em 2026-08-19)
-- Páginas "Dados e Datas" de cada ministro no portal do STF, seções
-- POSSE NO SUPREMO TRIBUNAL FEDERAL (Termo de Posse, Livro para
-- Registro dos Termos de Posse) e APOSENTADORIA (Decreto presidencial
-- publicado no Diário Oficial). Indicante extraído da seção INDICAÇÃO.
--
-- CHECAGEM CRUZADA INDEPENDENTE
-- Comparando a data de saída com a data de nascimento (Wikidata P569),
-- quase todos saíram DIAS ANTES de completar 70 anos — Ayres Britto 4
-- dias, Cezar Peluso 4, Ilmar Galvão 1. Isso é o comportamento esperado
-- da aposentadoria compulsória vigente antes da EC 88/2015, e corrobora
-- as datas por um caminho que não é a mesma fonte. As exceções são
-- saídas voluntárias documentadas: Rezek (53, foi para a Corte
-- Internacional de Justiça), Jobim (59, Ministério da Defesa), Joaquim
-- Barbosa (59) e Ellen Gracie (63).
--
-- RESSALVAS REGISTRADAS
--  * Menezes Direito e Teori Zavascki morreram no cargo. O portal não
--    tem seção de saída para eles; as datas (2009-09-01 e 2017-01-19)
--    vêm do Wikidata, NÃO da fonte primária. São as duas linhas mais
--    fracas desta migration.
--  * Francisco Rezek serviu dois mandatos (1983–1990 e 1992–1997).
--    Registramos a posse do primeiro e a saída do segundo — simplificação
--    consciente. Tem 1 decisão no acervo, então o impacto é nulo, mas
--    como biografia está incompleto.
--  * data_nascimento fica NULA de propósito para os inativos. O trigger
--    trg_stf_ministros_aposentadoria derivaria aposentadoria_comp =
--    nascimento + 75 anos, o que para quem já saiu é um contrafactual
--    que a interface leria como fato.
--
-- iniciais é UNIQUE e já continha MA (Marco Aurélio) e EG seria de Ellen
-- Gracie, então Moreira Alves entra como MA2 e Eros Grau como EG2 —
-- iniciais_exibicao remove o sufixo na tela (mesmo mecanismo do AM2 de
-- André Mendonça, achado B3).
-- ────────────────────────────────────────────────────────────────

insert into public.stf_ministros
  (nome, iniciais, iniciais_exibicao, data_posse, data_saida,
   indicado_por, indicado_por_curto, partido_indicante, ativo)
values
  ('Moreira Alves',      'MA2','MA', date '1975-06-20', date '2003-04-22', 'Ernesto Geisel',      'Geisel',     'ARENA',     false),
  ('Néri da Silveira',   'NS', 'NS', date '1981-09-01', date '2002-04-24', 'João Figueiredo',     'Figueiredo', 'ARENA/PDS', false),
  ('Aldir Passarinho',   'AP', 'AP', date '1982-09-02', date '1991-05-09', 'João Figueiredo',     'Figueiredo', 'ARENA/PDS', false),
  ('Francisco Rezek',    'FR', 'FR', date '1983-03-24', date '1997-02-05', 'João Figueiredo',     'Figueiredo', 'ARENA/PDS', false),
  ('Sydney Sanches',     'SS', 'SS', date '1984-08-31', date '2003-04-25', 'João Figueiredo',     'Figueiredo', 'ARENA/PDS', false),
  ('Octavio Gallotti',   'OG', 'OG', date '1984-11-20', date '2000-10-31', 'João Figueiredo',     'Figueiredo', 'ARENA/PDS', false),
  ('Sepúlveda Pertence', 'SP', 'SP', date '1989-05-17', date '2007-08-23', 'José Sarney',         'Sarney',     'PMDB',      false),
  ('Carlos Velloso',     'CV', 'CV', date '1990-06-13', date '2006-01-19', 'Fernando Collor',     'Collor',     'PRN',       false),
  ('Ilmar Galvão',       'IG', 'IG', date '1991-06-26', date '2003-05-03', 'Fernando Collor',     'Collor',     'PRN',       false),
  ('Maurício Corrêa',    'MC', 'MC', date '1994-12-15', date '2004-05-07', 'Itamar Franco',       'Itamar',     'PMDB',      false),
  ('Nelson Jobim',       'NJ', 'NJ', date '1997-04-15', date '2006-03-29', 'Fernando H. Cardoso', 'FHC',        'PSDB',      false),
  ('Ellen Gracie',       'EG', 'EG', date '2000-12-14', date '2011-08-05', 'Fernando H. Cardoso', 'FHC',        'PSDB',      false),
  ('Ayres Britto',       'AB', 'AB', date '2003-06-25', date '2012-11-14', 'Lula (1º mandato)',   'Lula',       'PT',        false),
  ('Cezar Peluso',       'CP', 'CP', date '2003-06-25', date '2012-08-30', 'Lula (1º mandato)',   'Lula',       'PT',        false),
  ('Joaquim Barbosa',    'JB', 'JB', date '2003-06-25', date '2014-07-30', 'Lula (1º mandato)',   'Lula',       'PT',        false),
  ('Eros Grau',          'EG2','EG', date '2004-06-30', date '2010-07-30', 'Lula (1º mandato)',   'Lula',       'PT',        false),
  ('Menezes Direito',    'MD', 'MD', date '2007-09-05', date '2009-09-01', 'Lula (2º mandato)',   'Lula',       'PT',        false),
  ('Teori Zavascki',     'TZ', 'TZ', date '2012-11-29', date '2017-01-19', 'Dilma Rousseff',      'Dilma',      'PT',        false)
on conflict (iniciais) do nothing;

-- ── Reatribuição do acervo já ingerido ──
-- Reexecutar o conector nos 27 anos levaria ~1h50 e faria a mesma coisa:
-- a resolução de ministro é derivada, não vem da fonte. O UPDATE aplica
-- exatamente a mesma regra de normalização de fetch_decisoes_qlik.py
-- (tira prefixo MIN./MINA., remove acento, minúsculas, colapsa espaços).
--
-- Rodar em fatias por ano — o UPDATE inteiro de 746 mil linhas estoura o
-- tempo limite da conexão e faz rollback.
with norm as (
  select d.id,
         regexp_replace(
           lower(unaccent(regexp_replace(d.relator_bruto, '^\s*MIN[A]?\.?\s+', '', 'i'))),
           '\s+', ' ', 'g') as chave
  from public.stf_decisoes d
  where d.ministro_resolucao = 'desconhecido'
),
alvo as (
  select n.id, m.id as ministro_id
  from norm n
  join public.stf_ministros m
    on regexp_replace(lower(unaccent(m.nome)), '\s+', ' ', 'g') =
       -- alias explícito: a fonte diz "MIN. MARCO AURÉLIO"; o banco,
       -- "Marco Aurélio Mello". Mesmo alias do conector.
       case when n.chave = 'marco aurelio' then 'marco aurelio mello' else n.chave end
)
update public.stf_decisoes d
   set ministro_id = a.ministro_id,
       ministro_resolucao = 'nome'
  from alvo a
 where d.id = a.id;

-- ────────────────────────────────────────────────────────────────
-- RESULTADO OBSERVADO (2026-08-19)
--   ministro_resolucao   antes      depois
--   nome                 47,7%   →  73,5%
--   desconhecido         40,7%   →  14,9%
--   nao_aplicavel         7,0%      7,0%
--   presidencia           4,6%      4,6%
--
-- O que sobra em 'desconhecido':
--   441.879  MINISTRO PRESIDENTE, até 2023-09-27 — resolvível
--            preenchendo stf_presidencias antes de 28/09/2023
--     1.180  VICE-PRESIDENTE — idem, para a vice-presidência
-- Nenhum é ministro faltando no cadastro. O item 2 do backlog fechou.
-- ────────────────────────────────────────────────────────────────
