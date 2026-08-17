# Onda 1 — Parar de publicar erro

**Data:** 2026-08-17
**Origem:** auditoria completa do site, código e banco de produção (32 achados).
**Escopo desta onda:** os 5 achados críticos e os 6 altos/médios que faziam o
site afirmar coisas falsas. Não inclui SEO, GEO, ingestão nem produto — esses
são as ondas 2 e 3.

Testes de regressão: `tests/onda-1.test.mjs` (`npm test`).
Migrations: `0004_correcao_dados_ministros.sql`, `0005_vinculo_assinatura_usuario.sql`.

---

## A1 — Aposentadoria compulsória: 8 de 10 datas erradas

`stf_ministros.aposentadoria_comp` tinha dia e mês precisos — aparência de
apuração — mas era digitada à mão. Sete ministros tinham o **ano** errado.

| Ministro | Nascimento | Estava no ar | Correto |
|---|---|---|---|
| Luiz Fux | 1953-04-26 | 2038-02-22 | **2028-04-26** |
| Cármen Lúcia | 1954-04-19 | 2030-04-04 | **2029-04-19** |
| Gilmar Mendes | 1955-12-30 | 2030-07-28 | **2030-12-30** |
| Edson Fachin | 1958-02-08 | 2039-02-16 | **2033-02-08** |
| Dias Toffoli | 1967-11-15 | 2038-05-15 | **2042-11-15** |
| Flávio Dino | 1968-04-30 | 2049-06-08 | **2043-04-30** |
| Alexandre de Moraes | 1968-12-13 | 2043-12-13 | 2043-12-13 (já correta) |
| Nunes Marques | 1972-05-16 | 2047-05-12 | **2047-05-16** |
| André Mendonça | 1972-12-27 | 2054-12-27 | **2047-12-27** |
| Cristiano Zanin | 1975-11-15 | 2056-07-10 | **2050-11-15** |

**Correção estrutural.** A data de aposentadoria não é um fato independente,
é uma conta: nascimento + 75 anos (art. 40, §1º, II da CF, redação da EC
88/2015). A migration 0004 cria `data_nascimento` como fonte da verdade e um
trigger (`trg_stf_ministros_aposentadoria`) que deriva `aposentadoria_comp` em
todo insert/update. O campo deixou de ser digitável — editar à mão é
sobrescrito.

`data_nascimento` é coluna **interna**: não recebeu grant público, seguindo a
regra da migration 0003 de não ampliar o contrato público sem decisão
editorial. O que o site precisa exibir já é público.

**Fontes:** Wikidata (P569) para nascimento, cruzado com os levantamentos de
Poder360, CNN Brasil e Migalhas sobre ordem de aposentadoria compulsória —
batem em 10/10.

## A2 — Datas de posse de Fachin e Dino

- **Edson Fachin** — constava `2015-04-02`. A posse foi em **16/06/2015**.
- **Flávio Dino** — constava `2023-12-22`, que é a data da aprovação no
  Senado. A posse foi em **22/02/2024**.

**Fonte:** páginas "Dados e Datas" do portal do STF (Termo de Posse, Livro
para Registro dos Termos de Posse). Todas as 10 posses foram reconferidas; as
outras 8 estavam corretas.

> ⚠️ A página "Dados e Datas" de Flávio Dino no portal do STF traz "3 de março
> de 2011", que é a posse de Luiz Fux. É erro do próprio portal. A data usada
> vem do noticiário institucional do STF sobre a sessão solene de posse.

## A3 — "Ausente" em decisão monocrática

`voto = 'ausente'` responde por **487.778 das 758.714** linhas de
`stf_votacoes` (64%). Não é um resultado: é a lixeira do que a normalização
não classificou. Numa decisão monocrática quem decide é o próprio ministro,
então o rótulo afirmava algo logicamente impossível — e o leitor entendia
"o ministro esteve ausente na maioria das decisões".

`VotoChip` passa a renderizar `—` para o não classificado, com `title`
explicando. Os rótulos válidos (Deferido/Indeferido/Prejudicado) continuam.

**Pendente:** reprocessar o corpus separando *tipo de decisão* (monocrática ×
colegiada) de *sentido do voto* — hoje os dois ocupam o mesmo campo.

## A4 — Cargos anteriores

| Ministro | Estava no ar | Correto |
|---|---|---|
| Gilmar Mendes | `PGR / TCU` | Advogado-Geral da União (jan/2000–jun/2002) |
| Edson Fachin | `Advogado/Professor USP` | Professor da UFPR / Procurador do Estado do PR |
| Nunes Marques | `Procurador Federal` | Desembargador do TRF-1 |
| Celso de Mello (inativo) | `PGR / Advocacia` | Procurador do Estado de SP / Advocacia |

Gilmar Mendes nunca foi Procurador-Geral da República nem integrou o TCU.

## A5 / F2 — Carimbo de atualização

Nenhuma tela dizia até quando o dado ia. O bloco "Últimas decisões
monocráticas" mostrava janeiro de 2025 com a data sem ano ("17 jan"), o que
levava o leitor a supor que era do ano corrente. Os blocos de gastos e de
decisões passam a exibir "dados até <data>".

**Não resolve a defasagem** — a ingestão segue desligada (achado D1, onda 2).
Resolve a omissão.

## B1, B2, B3 — Bugs de renderização

- **B1** `aposentadoria_comp` ia crua para a tela ("2030-07-28"), em dois
  lugares da ficha. `useMinistros` agora formata igual à posse.
- **B2** `indicado_por.split(" ")[0]` produzia "Ind. Fernando", "Ind. Jair",
  "Ind. Michel" e "Governo Fernando" — chefe de Estado pelo primeiro nome.
  Nova coluna `indicado_por_curto` (FHC, Temer, Bolsonaro, Lula, Dilma).
- **B3** `iniciais` é `UNIQUE` no banco, então André Mendonça carregava a chave
  de desambiguação `AM2` direto no avatar. Nova coluna `iniciais_exibicao`
  separa chave técnica de rótulo.

## C1 — Apoio, não acesso

`/assinar` cobrava R$ 29,90/mês sob o título "Acesso completo ao Observatório",
e `/sucesso` confirmava "acesso a todos os recursos". **Não existe recurso
restrito**: as policies RLS de `stf_ministros`, `stf_gastos`, `stf_votacoes` e
`stf_repercussao_geral` são todas `using (true)` para `anon`. Vender acesso ao
que já é aberto é publicidade enganosa (art. 37 do CDC) — num veículo cuja
tese é integridade.

A Fase C1 já tinha limpado a lista de benefícios inexistentes, mas deixou de
pé o enquadramento. Agora:

- "Apoie o Observatório", "Contribuir R$ X", "Apoiar" / "Apoiador" no topo.
- Ressalva explícita na tela: *"Hoje não há área restrita. Tudo o que está
  publicado é aberto, e contribuir não desbloqueia nada."*
- A lista descreve o que a contribuição **sustenta**, não o que ela entrega.

**Regra mantida por teste — e ela é temporal.** Uma camada paga está no roteiro
do projeto. O que os testes protegem é a *ordem*: entrega primeiro, promessa
depois. Enquanto não existir funcionalidade restrita **no ar**, as expressões
"acesso completo", "todos os recursos", "exclusivo" e "área do assinante" não
podem aparecer nessas páginas. Quando a camada paga for lançada, afrouxe
`tests/onda-1.test.mjs` **na mesma mudança** que a publica — nunca antes.

Telas que precisarão mudar junto quando isso acontecer: `src/pages/Assinar.tsx`,
`src/pages/Sucesso.tsx` e o rótulo "Apoiador" em `src/components/layout/Layout.tsx`.

## C2 — Assinante nunca era reconhecido

O webhook gravava `stf_assinaturas` sem `user_id`, e a única policy era
`auth.uid() = user_id`. Com `user_id` nulo a comparação nunca é verdadeira: a
linha ficava invisível para o próprio dono. O pagamento seria debitado e o site
continuaria mostrando o botão de apoio para sempre. A tabela tem zero linhas —
ninguém foi prejudicado —, mas o checkout está no ar.

Correção em três partes (migration 0005 + `api/webhook.ts`):

1. Policy adicional por **e-mail verificado do JWT**, que cobre o caso real —
   a pessoa paga antes de ter conta. Seguro porque o Supabase só emite o e-mail
   no JWT depois que a pessoa clicou no magic link.
2. `stf_resolver_user_id()` (SECURITY DEFINER, exclusiva de `service_role`) —
   o webhook passa a preencher `user_id` quando a conta já existe.
3. Trigger em `auth.users` que amarra a linha órfã quando a conta é criada
   depois do pagamento.

**Bônus encontrado no caminho:** `sub.current_period_end` saiu do objeto
`Subscription` e foi para os itens da assinatura na versão de API declarada
(`2025-05-28.basil`). `new Date(undefined * 1000).toISOString()` lança — o
webhook responderia **500** ao Stripe e a assinatura nunca seria registrada.
`fimDoPeriodo()` lê dos dois lugares.

---

## Ordem de aplicação

1. **Migrations 0004 e 0005** — aplicadas em produção em 2026-08-17.
   Ambas só **acrescentam** colunas, policies e funções; nenhuma revoga algo
   que o frontend em produção use. O bundle antigo continuou funcionando, e as
   datas erradas saíram do ar no mesmo instante.
2. **Deploy do frontend** — traz formatação, rótulos e o reposicionamento de
   `/assinar`.

## Verificação

```sql
select nome, data_nascimento, aposentadoria_comp,
       aposentadoria_comp = (data_nascimento + interval '75 years')::date as confere
  from public.stf_ministros where ativo order by aposentadoria_comp;
-- confere = true em 10/10
```

```bash
npm test        # 43 testes, inclui tests/onda-1.test.mjs
npm run typecheck
npm run lint
npm run build
```

## Fica para a onda 2

Achados vizinhos que esta onda **não** tocou, de propósito:

- **B4** — a data de cada decisão ainda sai sem ano ("17 jan"). O carimbo no
  cabeçalho já resolve a ambiguidade de recência; o ano por linha fica.
- **B6** — "Os onze (hoje dez)" e "10 ministros em exercício" continuam fixos
  no código, em três lugares.
- **D1** — ingestão diária segue desligada; `stf_votacoes` para em 19/01/2025.
- **D2** — `anon` ainda tem grant de `INSERT`/`UPDATE` em
  `stf_ministros_publicos` (bloqueado por RLS e por falta de grant na
  tabela-base, mas indevido).
- **A6** — o gabinete de Fachin (9 servidores) segue sem a nota de que ele
  preside o STF desde 29/09/2025.
- **C3** — sem termos, política de privacidade, contato ou metodologia.
