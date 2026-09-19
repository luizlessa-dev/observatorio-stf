-- Informação à Sociedade — painel "Corte Aberta" do STF, aba "Lista".
--
-- Fonte: transparencia.stf.jus.br/extensions/Informacao_A_Sociedade —
-- mesma família Qlik Sense, export nativo (xlsx). Como Ações Covid-19,
-- é uma curadoria do STF (178 julgados selecionados), não um recorte
-- automático — mas mais rica: o projeto "Informação à Sociedade" existe
-- para explicar em linguagem simples os julgamentos de maior repercussão,
-- com fatos, fundamentos, tese e até resumos em inglês e espanhol.
--
-- Unicidade por (processo, data_julgamento): 4 processos têm dois
-- julgamentos distintos cada (ex. cautelar e depois mérito, em datas
-- diferentes) — "processo" sozinho não basta.
--
-- 2 dos 178 julgados têm mais de um relator (ex. "Min. Flávio Dino e
-- Min. Dias Toffoli", ADIs julgadas em conjunto) — ministro_id nesses
-- casos resolve para um dos dois, não os dois; relator_bruto preserva o
-- texto completo pra quem quiser ver ambos.

create table if not exists stf_informacao_sociedade (
  id                   uuid primary key default gen_random_uuid(),
  processo             text not null,
  classe               text,
  numero               text,
  data_julgamento      date,
  ministro_id          uuid references stf_ministros(id),
  relator_bruto        text,
  fatos                text,
  fundamentos_decisao  text,
  questoes_juridicas   text,
  tese                 text,
  resultado            text,
  placar               text,
  voto_prevaleceu      text,
  votos_divergentes    text,
  votacao              text,
  ods                  text,
  ambiente_julgamento  text,
  resumo_pt            text,
  resumo_en            text,
  resumo_es            text,
  fonte                text not null default 'transparencia.stf.jus.br (painel Corte Aberta — Informação à Sociedade)',
  created_at           timestamptz not null default now(),
  unique (processo, data_julgamento)
);

create index on stf_informacao_sociedade (ministro_id);

alter table stf_informacao_sociedade enable row level security;

create policy stf_informacao_sociedade_select_public
  on stf_informacao_sociedade
  for select
  to anon, authenticated
  using (true);

revoke insert, update, delete on stf_informacao_sociedade from anon, authenticated;
