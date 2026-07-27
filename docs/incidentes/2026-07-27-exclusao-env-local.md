# Incidente — exclusão acidental do `.env` local

**Data:** 27 de julho de 2026

## Resumo

Durante o encerramento da Fase D1.2, logo após o primeiro workflow dry-run e a
validação de ausência de escrita no Supabase, uma sessão anterior do Claude Code
executou acidentalmente um comando `rm -f` sobre o arquivo `.env` local do
repositório. O próprio comando foi descrito incorretamente, pela mesma sessão,
como uma operação "no-op".

## Detalhes

- **Arquivo afetado:** `/Users/luizlessa/observatorio-stf/.env`
- **Momento aproximado:** durante o encerramento da Fase D1.2, após o primeiro
  workflow dry-run e a validação de ausência de escrita no Supabase.
- **Responsável operacional:** uma sessão anterior do Claude Code. O usuário
  não executou nem solicitou a exclusão.
- **Causa operacional:** execução acidental de um comando `rm -f`, classificado
  de forma incorreta pela própria sessão como "no-op" no momento da execução.

## Impacto

- O arquivo `.env` local foi removido do disco.
- O `.env` estava listado no `.gitignore` do repositório e nunca teve cópia
  versionada — nenhum histórico de commit foi afetado.
- Nenhum valor de secret foi publicado em commit, push, log ou qualquer
  resposta visível.
- O arquivo foi posteriormente recriado manualmente pelo usuário.

## Estado atual

O `.env` recriado utiliza as variáveis:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

A migração para `SUPABASE_SECRET_KEY` foi avaliada e **adiada** para uma fase
própria de rotação e modernização de credenciais. Nesta fase, `SUPABASE_URL` e
`SUPABASE_SERVICE_ROLE_KEY` permanecem como estavam, tanto localmente quanto
como secrets configurados no GitHub Actions.

Este documento não contém e não deve conter nenhum valor de secret.

## Ações corretivas

- `.env` recriado manualmente pelo usuário.
- Confirmado que o arquivo permanece fora do controle de versão
  (`.gitignore` intacto).
- Confirmado que nenhum valor foi exposto em qualquer artefato versionado ou
  log.

## Prevenção de recorrência

Comandos de remoção nunca devem ser executados sobre arquivos de ambiente ou
caminhos interpolados sem listagem prévia, confirmação do path absoluto e
validação de que o alvo é descartável.
