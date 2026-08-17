-- ────────────────────────────────────────────────────────────────
-- 0005 — Vínculo entre assinatura paga e usuário autenticado (Onda 1, C2)
-- Auditoria de 2026-08-17. Ver docs/auditoria-onda-1.md.
--
-- PROBLEMA
-- O webhook do Stripe (api/webhook.ts) grava em stf_assinaturas com
-- `email`, `stripe_customer_id` e `stripe_sub_id`, mas NUNCA preenche
-- `user_id`. A única policy da tabela é:
--
--     "usuario ve propria assinatura"  SELECT  using (auth.uid() = user_id)
--
-- Com `user_id` nulo, `auth.uid() = null` avalia para NULL — nunca
-- true — e a linha fica invisível para o próprio dono. Somando-se a
-- isso, o front consulta por e-mail (`getAssinatura()`), não por
-- user_id. Resultado: o pagamento é debitado, a linha é criada, e o
-- site continua mostrando o botão de apoio para sempre.
--
-- A tabela tem zero linhas hoje — ninguém foi prejudicado ainda —, mas
-- o checkout está no ar e funcionando.
--
-- SOLUÇÃO EM DUAS PARTES
--
--   1. Policy por e-mail verificado. O fluxo real é: a pessoa paga
--      ANTES de ter conta (o checkout só pede e-mail). Quando ela
--      entra por magic link, `auth.uid()` existe mas `user_id` na
--      linha ainda é nulo. A policy por e-mail cobre exatamente essa
--      janela. É seguro porque o e-mail no JWT do Supabase só é
--      emitido depois que a pessoa clicou no link enviado para ele —
--      ou seja, é e-mail verificado por construção.
--
--   2. Backfill do user_id, para que o vínculo não dependa
--      permanentemente de comparação por string. Feito por função
--      SECURITY DEFINER, porque `auth.users` não é acessível via
--      PostgREST nem pela role da aplicação. A função é revogada de
--      anon/authenticated: só service_role (o webhook) chama.
--
-- NENHUMA das duas partes amplia acesso a dados de terceiros: as duas
-- restringem à própria linha do próprio usuário.
-- ────────────────────────────────────────────────────────────────

-- ── 1. Policy complementar por e-mail verificado ──
drop policy if exists "assinante ve propria assinatura por email"
  on public.stf_assinaturas;

create policy "assinante ve propria assinatura por email"
  on public.stf_assinaturas
  for select
  to authenticated
  using (
    email is not null
    and email = (auth.jwt() ->> 'email')
  );

comment on table public.stf_assinaturas is
  'Contribuições recorrentes via Stripe. Duas policies de leitura, ambas '
  'restritas à própria linha: por user_id (quando já vinculado) e por e-mail '
  'verificado do JWT (cobre quem paga antes de criar conta). Migration 0005.';

-- ── 2. Resolução de user_id a partir do e-mail ──
create or replace function public.stf_resolver_user_id(p_email text)
returns uuid
language sql
security definer
set search_path = pg_catalog, public, auth
as $$
  select u.id
    from auth.users u
   where lower(u.email) = lower(p_email)
     and u.email_confirmed_at is not null
   order by u.created_at
   limit 1;
$$;

comment on function public.stf_resolver_user_id(text) is
  'Devolve o id do usuário autenticado com este e-mail confirmado, ou null. '
  'SECURITY DEFINER porque auth.users não é acessível pela role da aplicação. '
  'Uso exclusivo do webhook do Stripe (service_role) para preencher '
  'stf_assinaturas.user_id. NÃO exponha para anon/authenticated: permitiria '
  'sondar quais e-mails têm conta.';

revoke all on function public.stf_resolver_user_id(text) from public, anon, authenticated;
grant execute on function public.stf_resolver_user_id(text) to service_role;

-- ── 3. Vínculo automático quando a conta é criada depois do pagamento ──
-- Se a pessoa contribuiu e só então criou conta, este trigger amarra a
-- linha órfã ao usuário novo, sem depender de o webhook rodar de novo.
create or replace function public.stf_vincular_assinatura_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  update public.stf_assinaturas
     set user_id    = new.id,
         updated_at = now()
   where user_id is null
     and lower(email) = lower(new.email);
  return new;
end;
$$;

drop trigger if exists trg_stf_vincular_assinatura on auth.users;

create trigger trg_stf_vincular_assinatura
  after insert on auth.users
  for each row
  execute function public.stf_vincular_assinatura_novo_usuario();

-- ── 4. Backfill do que já existe (hoje: nenhuma linha) ──
update public.stf_assinaturas a
   set user_id = public.stf_resolver_user_id(a.email)
 where a.user_id is null
   and a.email is not null
   and public.stf_resolver_user_id(a.email) is not null;

-- ────────────────────────────────────────────────────────────────
-- VERIFICAÇÃO
--   select email, user_id is not null as vinculada, status
--     from public.stf_assinaturas;
--   -- e, autenticado como o assinante, getAssinatura() deve devolver a linha.
-- ────────────────────────────────────────────────────────────────
