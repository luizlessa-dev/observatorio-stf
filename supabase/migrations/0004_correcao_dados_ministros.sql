-- ────────────────────────────────────────────────────────────────
-- 0004 — Correção dos dados publicados de ministros (Onda 1)
-- Auditoria de 2026-08-17. Ver docs/auditoria-onda-1.md.
--
-- Esta migration corrige DADOS ERRADOS que estavam no ar, não schema
-- de acesso. Três classes de problema:
--
--   A1. `aposentadoria_comp` divergia do aniversário real de 75 anos
--       em 8 dos 10 ministros em exercício (7 com o ANO errado, até
--       10 anos de diferença no caso de Fux). As datas tinham dia e
--       mês precisos — aparência de apuração — mas eram digitadas à
--       mão, sem derivação de nada.
--
--   A2. `data_posse` errada para Edson Fachin (constava 2015-04-02;
--       a posse foi em 2015-06-16) e Flávio Dino (constava
--       2023-12-22, que é a data da aprovação no Senado; a posse foi
--       em 2024-02-22).
--
--   A4. `cargo_anterior` errado para Gilmar Mendes (constava
--       "PGR / TCU" — ele nunca foi PGR nem integrou o TCU), Edson
--       Fachin (constava "Professor USP" — ele é do Paraná) e Nunes
--       Marques (constava "Procurador Federal" — o cargo imediatamente
--       anterior era a magistratura federal de 2ª instância).
--
-- ESTRATÉGIA CONTRA REINCIDÊNCIA
-- `aposentadoria_comp` deixa de ser um campo digitado e passa a ser
-- DERIVADO de `data_nascimento` (nascimento + 75 anos, art. 40, §1º,
-- II da CF com a redação da EC 88/2015). A data de nascimento é um
-- fato verificável e estável; a data de aposentadoria não é um fato
-- independente, é uma conta. Um trigger mantém as duas em sincronia,
-- então uma correção futura de nascimento propaga sozinha.
--
-- FONTES (uma por afirmação, conferidas em 2026-08-17)
--   * Datas de posse: páginas "Dados e Datas" de cada ministro no
--     portal do STF (Termo de Posse, Livro para Registro dos Termos
--     de Posse) — fonte primária.
--     ATENÇÃO: a página "Dados e Datas" de Flávio Dino no portal traz
--     "3 de março de 2011", que é a data de posse de Luiz Fux. É erro
--     do próprio portal. A data usada aqui (2024-02-22) vem do
--     noticiário institucional do STF sobre a sessão solene de posse.
--   * Datas de nascimento: Wikidata (P569), conferidas contra os
--     levantamentos de Poder360, CNN Brasil e Migalhas sobre ordem de
--     aposentadoria compulsória. As duas apurações batem em 10/10.
--   * Cargos anteriores: portal do STF e verbetes biográficos.
--
-- `data_nascimento` NÃO recebe grant público. A regra da 0003 —
-- "não adicionar colunas à view pública sem decisão editorial" — vale;
-- a data de nascimento é insumo interno de cálculo, e o que o site
-- precisa exibir (`aposentadoria_comp`) já é público.
--
-- Idempotente: add column if not exists, updates por `nome` com valor
-- final fixo, create or replace view.
-- ────────────────────────────────────────────────────────────────

-- ── 1. Data de nascimento como fonte da verdade ──
alter table public.stf_ministros
  add column if not exists data_nascimento date;

comment on column public.stf_ministros.data_nascimento is
  'Data de nascimento do ministro. Fonte da verdade de aposentadoria_comp '
  '(nascimento + 75 anos). Coluna INTERNA — sem grant para anon/authenticated.';

comment on column public.stf_ministros.aposentadoria_comp is
  'DERIVADA de data_nascimento + 75 anos pelo trigger '
  'trg_stf_ministros_aposentadoria. Não editar à mão: a edição é '
  'sobrescrita. Para corrigir, corrija data_nascimento.';

update public.stf_ministros set data_nascimento = v.nasc
from (values
  ('Gilmar Mendes',       date '1955-12-30'),
  ('Cármen Lúcia',        date '1954-04-19'),
  ('Dias Toffoli',        date '1967-11-15'),
  ('Luiz Fux',            date '1953-04-26'),
  ('Edson Fachin',        date '1958-02-08'),
  ('Alexandre de Moraes', date '1968-12-13'),
  ('Nunes Marques',       date '1972-05-16'),
  ('André Mendonça',      date '1972-12-27'),
  ('Cristiano Zanin',     date '1975-11-15'),
  ('Flávio Dino',         date '1968-04-30')
) as v(nome, nasc)
where public.stf_ministros.nome = v.nome
  and public.stf_ministros.data_nascimento is distinct from v.nasc;

-- ── 2. Trigger que mantém aposentadoria_comp derivada ──
create or replace function public.stf_calc_aposentadoria()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.data_nascimento is not null then
    new.aposentadoria_comp := (new.data_nascimento + interval '75 years')::date;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_stf_ministros_aposentadoria on public.stf_ministros;

create trigger trg_stf_ministros_aposentadoria
  before insert or update of data_nascimento, aposentadoria_comp
  on public.stf_ministros
  for each row
  execute function public.stf_calc_aposentadoria();

-- Recalcula todos os que já têm nascimento preenchido.
-- Efeito observado nesta aplicação (antes → depois):
--   Gilmar Mendes        2030-07-28 → 2030-12-30   (dia/mês)
--   Cármen Lúcia         2030-04-04 → 2029-04-19   (ano)
--   Dias Toffoli         2038-05-15 → 2042-11-15   (ano)
--   Luiz Fux             2038-02-22 → 2028-04-26   (ano, −10)
--   Edson Fachin         2039-02-16 → 2033-02-08   (ano)
--   Alexandre de Moraes  2043-12-13 → 2043-12-13   (já correta)
--   Nunes Marques        2047-05-12 → 2047-05-16   (dia)
--   André Mendonça       2054-12-27 → 2047-12-27   (ano)
--   Cristiano Zanin      2056-07-10 → 2050-11-15   (ano)
--   Flávio Dino          2049-06-08 → 2043-04-30   (ano)
update public.stf_ministros
   set data_nascimento = data_nascimento
 where data_nascimento is not null;

-- ── 3. Datas de posse (A2) ──
update public.stf_ministros
   set data_posse = date '2015-06-16'
 where nome = 'Edson Fachin' and data_posse <> date '2015-06-16';

update public.stf_ministros
   set data_posse = date '2024-02-22'
 where nome = 'Flávio Dino' and data_posse <> date '2024-02-22';

-- ── 4. Cargos anteriores (A4) ──
update public.stf_ministros
   set cargo_anterior = 'Advogado-Geral da União'
 where nome = 'Gilmar Mendes';

update public.stf_ministros
   set cargo_anterior = 'Professor da UFPR / Procurador do Estado do PR'
 where nome = 'Edson Fachin';

update public.stf_ministros
   set cargo_anterior = 'Desembargador do TRF-1'
 where nome = 'Nunes Marques';

-- Registro inativo com o mesmo tipo de erro: Celso de Mello nunca foi
-- Procurador-Geral da República. Corrigido junto para que a ficha
-- histórica não nasça errada quando for publicada.
update public.stf_ministros
   set cargo_anterior = 'Procurador do Estado de SP / Advocacia'
 where nome = 'Celso de Mello' and cargo_anterior = 'PGR / Advocacia';

-- ── 5. Rótulos de exibição (B2, B3) ──
-- O front vinha derivando rótulo de apresentação por fatiamento de
-- string: `indicado_por.split(" ")[0]` produzia "Ind. Fernando",
-- "Ind. Jair", "Governo Fernando" — tratamento de chefe de Estado pelo
-- primeiro nome. E `iniciais` é UNIQUE, então André Mendonça carregava
-- a chave de desambiguação "AM2" direto no avatar.
--
-- A correção separa CHAVE de RÓTULO: `iniciais` continua única e
-- técnica; `iniciais_exibicao` é o que aparece na tela.
alter table public.stf_ministros
  add column if not exists indicado_por_curto text;

alter table public.stf_ministros
  add column if not exists iniciais_exibicao text;

comment on column public.stf_ministros.indicado_por_curto is
  'Nome curto do presidente que indicou, para uso em rótulo compacto. '
  'Não derivar de indicado_por por fatiamento de string.';

comment on column public.stf_ministros.iniciais_exibicao is
  'Iniciais para exibição. Diferente de `iniciais`, que é UNIQUE e '
  'pode conter sufixo de desambiguação (ex.: AM2).';

update public.stf_ministros
   set indicado_por_curto = case
         when indicado_por like 'Fernando H%' then 'FHC'
         when indicado_por like 'Michel%'     then 'Temer'
         when indicado_por like 'Jair%'       then 'Bolsonaro'
         when indicado_por like 'Dilma%'      then 'Dilma'
         when indicado_por like 'Lula%'       then 'Lula'
         when indicado_por like 'José Sarney%' then 'Sarney'
         when indicado_por like 'Fernando Collor%' then 'Collor'
         else indicado_por
       end
 where indicado_por_curto is null or indicado_por_curto = '';

update public.stf_ministros
   set iniciais_exibicao = regexp_replace(iniciais, '[0-9]+$', '')
 where iniciais_exibicao is null or iniciais_exibicao = '';

-- ── 6. Contrato público: view e grants ──
-- Acrescenta apenas os dois rótulos de exibição, que são apresentação
-- de dado já público. `data_nascimento` fica de fora de propósito.
create or replace view public.stf_ministros_publicos
  with (security_invoker = true) as
select
  id,
  nome,
  iniciais,
  data_posse,
  data_saida,
  indicado_por,
  partido_indicante,
  cargo_anterior,
  formacao,
  aposentadoria_comp,
  ativo,
  indicado_por_curto,
  iniciais_exibicao
from public.stf_ministros;

grant select (indicado_por_curto, iniciais_exibicao)
  on public.stf_ministros to anon, authenticated;

-- ────────────────────────────────────────────────────────────────
-- VERIFICAÇÃO PÓS-APLICAÇÃO
--   select nome, data_nascimento, aposentadoria_comp,
--          (data_nascimento + interval '75 years')::date as esperado
--     from public.stf_ministros where ativo
--    order by aposentadoria_comp;
--   -- aposentadoria_comp deve ser igual a `esperado` em 10/10.
--
-- ROLLBACK: esta migration corrige dados factualmente errados. Não há
-- rollback desejável. Se for preciso reverter o schema:
--   drop trigger trg_stf_ministros_aposentadoria on public.stf_ministros;
--   drop function public.stf_calc_aposentadoria();
--   -- as colunas novas podem ficar; não quebram nada.
-- ────────────────────────────────────────────────────────────────
