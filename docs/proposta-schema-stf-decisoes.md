# Proposta de schema — `stf_decisoes`

**Data:** 2026-08-17 · **Status:** proposta, nada aplicado · **Achado:** D1

Substituição da fonte morta (Base dos Dados, parada em 19/01/2025) pela fonte
primária do STF, e do modelo `stf_votacoes` por um modelo que guarda o valor
bruto. Nenhuma migration foi escrita nem aplicada — este documento existe para
ser aprovado antes de qualquer código.

---

## 1. A fonte

`transparencia.stf.jus.br` é um servidor **Qlik Sense**. O mashup Corte Aberta
declara em JavaScript aberto os 13 app IDs de produção
(`extensions/corte_aberta/qliksense.js`).

| | |
|---|---|
| App | `corte_aberta_decisoes` — `023307ab-d927-4144-aabb-831b360515bb` |
| Objeto | `UbMrYBg` (tabela, 21 colunas) |
| Linhas | **2.973.557** |
| Cobertura | 2000 a 2026, **71.499 decisões só em 2026** |
| Decisão mais recente | **14/08/2026** |
| Reload do app | diário, ~09h15 UTC |
| Autenticação | anônima |

Contra o que existe hoje: a Base dos Dados tem 2.708.849 linhas paradas em
19/01/2025, com 17 campos. Esta fonte tem 2.973.557 linhas atualizadas
diariamente, com 21 campos, e é primária em vez de espelho de terceiro.

### Duas armadilhas de acesso, já resolvidas na sonda

1. **Cadeia TLS incompleta.** O STF serve só o certificado folha, sem a
   intermediária. O `curl` disfarça (busca por AIA); Python quebra com
   `unable to get local issuer certificate`. Solução: baixar
   `secure.globalsign.com/cacert/gsgccr6alphasslca2025.crt` e montar o bundle
   com o `certifi`.
2. **WebSocket exige cookie.** `wss://…/app/<id>` devolve **403** sem sessão.
   É preciso um `GET https://transparencia.stf.jus.br/single/?appid=<id>`
   antes, para colher o `X-Qlik-Session`.

O conector reaproveita `brasilia-insider/ingestao/sebrae_connector.py`, que já
faz `OpenDoc` → `GetObject` → `GetHyperCubeData` paginado com retry.

---

## 2. Por que tabela nova, e não migrar `stf_votacoes`

**O argumento que decide sozinho:** `stf_votacoes` não guarda o `andamento`
bruto — só o valor já normalizado. Foi por isso que o bug do "Ausente" não pôde
ser corrigido com um `UPDATE`: a informação de origem foi destruída na
ingestão. A auditoria D2 estimou 133.681 registros (17,6%) classificados errado
pelo bug de substring, e não há como recomputá-los sem reingerir tudo.

Manter o schema atual é herdar essa propriedade. Guardar o bruto é aditivo e
barato; **não** guardar é a decisão cara.

Os outros três motivos:

- **A entidade está errada.** É *decisão*, não *votação*. Os 64% de `ausente`
  são o sintoma: o domínio de destino (4 valores) não comporta o vocabulário da
  origem (293 valores).
- **A fonte agora distingue monocrática de colegiada** (`Tipo origem decisão`),
  que é justamente a separação que falta ao modelo atual.
- **Tabela paralela permite cutover por bloco**, sem downtime, e deixa comparar
  velho contra novo para medir o tamanho do estrago.

`stf_votacoes` fica congelada até o front migrar, e então é descartada.

---

## 3. O que a sonda mostrou sobre os dados

### 3.1 O vocabulário de `Andamento decisão` tem 293 valores — e três gramáticas

| Ocorrências | Valor |
|---:|---|
| 725.544 | `Negado seguimento` |
| 199.383 | `DECISÃO DO(A) RELATOR(A) - NEGADO SEGUIMENTO` |
| 197.623 | `Agravo regimental não provido` |
| 160.555 | `Determinada a devolução pelo regime da repercussão geral` |
| 143.936 | `Determinada a devolução, art. 543-B do CPC` |
| 134.425 | `DECISÃO DO RELATOR` |
| 96.571 | `JULG. POR DESPACHO - NEGADO SEGUIMENTO` |
| 90.362 | `Não conhecido(s)` |
| 78.385 | `Não provido` |
| 68.311 | `Agravo não provido` |

Os 25 valores mais frequentes cobrem 2.434.359 linhas (**81,9%**). O `MAPA_VOTO`
atual tem 15 chaves.

**A mesma disposição aparece em três gramáticas**: `Negado seguimento`,
`DECISÃO DO(A) RELATOR(A) - NEGADO SEGUIMENTO` e
`JULG. POR DESPACHO - NEGADO SEGUIMENTO` somam **1.021.498 linhas (34%)** e são
o mesmo ato. Um mapeador por substring não sabe disso — e "negado seguimento"
não é voto contrário ao mérito, é recusa de admissibilidade.

### 3.2 Um quarto das decisões não nomeia ministro

| Ocorrências | `Relator decisão` |
|---:|---|
| 577.483 | `MINISTRO PRESIDENTE` (19,4%) |
| 209.042 | `NÃO SE APLICA` (7,0%) |
| 187.872 | `MIN. CELSO DE MELLO` |
| … | 34 outros nomes |

`MINISTRO PRESIDENTE` **é resolvível pela data**, cruzando com
`stf_presidencias` (migration 0006, criada para o achado A6). Hoje a tabela só
cobre de 28/09/2023 em diante — resolver os 19,4% inteiros exige preencher o
histórico de presidências desde 2000. É trabalho de apuração, não de código, e
vale a pena: recupera um quinto do acervo.

### 3.3 Dois campos de relator, que não são a mesma coisa

`Relator atual` (35 valores) é o relator **atual do processo**; `Relator
decisão` (37 valores) é **quem decidiu**. Para atribuir uma decisão a um
ministro, o correto é `Relator decisão`. O pipeline antigo usava um campo
`relator` ambíguo do espelho.

### 3.4 Outras distribuições

- **`Tipo origem decisão`**: MONOCRÁTICA 2.568.488 (86,4%) · COLEGIADA 405.069 (13,6%)
- **`Tipo decisão`** (7): Decisão Final 2.449.772 · Decisão em recurso interno 305.689 · Sobrestamento 81.445 · Interlocutória 72.417 · Liminar 58.991 · Decisão 3.029 · Rep. Geral 2.214
- **`Órgão julgador`** (5): MONOCRÁTICA · 2ª TURMA · 1ª TURMA · TRIBUNAL PLENO · PLENÁRIO VIRTUAL - RG
- **`Meio Processo`** (2): FÍSICO 1.536.118 · ELETRÔNICO 1.437.439
- ⚠️ **`Ramo direito` e `Assuntos do processo` são o mesmo campo Qlik**
  (`Assunto Concatenado`, 12.018 distintos). São duplicata no objeto — persistir
  uma coluna só.

---

## 4. Mapeamento campo a campo

| # | Campo na fonte (Qlik) | Coluna proposta | Tipo | Nota |
|---|---|---|---|---|
| 1 | `idFatoDecisao` | `id_fato_decisao` | `bigint unique` | **Chave natural.** Idempotência sem heurística |
| 2 | `Processo` | `processo` | `text` | "AC 1", "HC 251142" |
| 3 | `Relator decisão` | `relator_bruto` | `text` | Como veio, sempre |
| 4 | `Relator atual` | `relator_atual_bruto` | `text` | Relator do processo ≠ quem decidiu |
| 5 | `Tipo origem decisão` | `tipo_origem` | `text` | MONOCRÁTICA / COLEGIADA |
| 6 | `Tipo decisão` | `tipo_decisao` | `text` | 7 valores |
| 7 | `Andamento decisão` | `andamento_bruto` | `text` | **Nunca normalizar na escrita** |
| 8 | `Observação decisão` | `observacao` | `text` | Texto da decisão |
| 9 | `Data decisão` | `data_decisao` | `date` | |
| 10 | `Ano decisão` | `ano_decisao` | `smallint` | Redundante, mas é a partição natural |
| 11 | `Órgão julgador` | `orgao_julgador` | `text` | |
| 12 | `Origem decisão` | `origem_decisao` | `text` | Distingue sessão virtual de presencial |
| 13 | `Ambiente julgamento` | `ambiente_julgamento` | `text` | Presencial / Virtual |
| 14 | `Meio Processo` | `meio_processo` | `text` | Físico / Eletrônico |
| 15 | `Assunto Concatenado` | `assunto` | `text` | Cobre os campos 15 e 16 da fonte |
| 16 | *(duplicata)* | — | — | `Ramo direito` = mesmo campo Qlik |
| 17 | `Data Autuação` | `data_autuacao` | `date` | |
| 18 | `Data Baixa` | `data_baixa` | `date` | |
| 19 | `Processo em Tramitação` | `em_tramitacao` | `boolean` | |
| 20 | `Descrição Órgão Origem` | `orgao_origem` | `text` | 1.042 valores |
| 21 | `Descrição Procedência Processo` | `procedencia` | `text` | 105 valores (UF/país) |

### Colunas derivadas — recomputáveis sem reingerir

| Coluna | Tipo | Regra |
|---|---|---|
| `ministro_id` | `uuid → stf_ministros` | De `relator_bruto`; `MINISTRO PRESIDENTE` resolvido por data via `stf_presidencias` |
| `ministro_resolucao` | `text` | Como foi resolvido: `nome` \| `presidencia` \| `nao_aplicavel` \| `desconhecido`. Torna a atribuição auditável |
| `sentido` | `text null` | **Fica nulo até haver taxonomia publicada.** Ver seção 5 |
| `ingerido_em` | `timestamptz` | |
| `fonte` | `text` | URL do app Qlik |

### DDL de referência (não aplicar ainda)

```sql
create table public.stf_decisoes (
  id                  uuid primary key default gen_random_uuid(),
  id_fato_decisao     bigint      not null unique,
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
  -- derivadas
  ministro_id         uuid references public.stf_ministros(id),
  ministro_resolucao  text check (ministro_resolucao in
                        ('nome','presidencia','nao_aplicavel','desconhecido')),
  sentido             text,
  ingerido_em         timestamptz not null default now(),
  fonte               text        not null default
                        'transparencia.stf.jus.br/app/023307ab-…/UbMrYBg'
);

create index on public.stf_decisoes (ministro_id, data_decisao desc);
create index on public.stf_decisoes (data_decisao desc);
create index on public.stf_decisoes (ano_decisao);
```

---

## 5. A decisão que é sua, não minha

**`sentido` nasce nulo e fica nulo até existir uma taxonomia publicada.**

Foi a pressa em preencher esse campo que produziu os 64% de "Ausente". Com
`andamento_bruto` guardado, preencher depois é um `UPDATE` — não uma
reingestão. Não há custo em esperar.

Quando for definir a taxonomia, o problema real não é técnico:

- "Negado seguimento" (34% do acervo, somadas as três grafias) é **recusa de
  admissibilidade**, não julgamento de mérito. Chamar de "contra" seria tão
  errado quanto chamar de "ausente".
- "Determinada a devolução" (304.491 somando as duas formas) é **devolução à
  origem por repercussão geral** — não é decisão sobre o caso.
- Sobrestamento, prejudicado e não conhecido são estados processuais.

Minha sugestão é classificar em **natureza do ato** (mérito / admissibilidade /
cautelar / processual / devolução) em vez de sentido de voto, e só depois — e
só dentro de "mérito" — falar em favorável/contrário. Mas isso é decisão
editorial, com metodologia para publicar, no mesmo espírito da contenção C0/C1.

---

## 6. Plano de execução, se aprovado

| # | Etapa | Depende de |
|---|---|---|
| 1 | Migration `0007_stf_decisoes.sql` — tabela, índices, RLS, grant de leitura | aprovação deste doc |
| 2 | `ingestao/stf/fetch_decisoes_qlik.py` — Qlik WS, bundle TLS, trava de destino, `--dry-run`, `--ano` | 1 |
| 3 | Testes do conector, no molde de `test_fetch_votacoes_bigquery.py` | 2 |
| 4 | Backfill 2000–2026 por ano (2,97M linhas, paginado) | 3 |
| 5 | Cron diário 12h UTC no workflow, com alerta de pipeline parada | 4 |
| 6 | Front lê `stf_decisoes`; `stf_votacoes` congelada e depois descartada | 4 |
| 7 | *(opcional, apuração)* histórico de presidências desde 2000 → recupera os 19,4% de `MINISTRO PRESIDENTE` | — |

As etapas 1 a 3 são meio dia. A 4 é tempo de máquina. A 7 é apuração manual e
pode ficar para depois — o conector já grava `ministro_resolucao = 'presidencia'`
onde conseguir, e `'desconhecido'` no resto, sem descartar linha nenhuma.

> **Regra que o conector herda da auditoria:** relator fora da lista conhecida
> **não é descartado silenciosamente**. O `MAPA_MINISTRO` antigo jogava fora as
> linhas que não reconhecia, sem falhar. Aqui a linha entra com
> `ministro_id = null` e `ministro_resolucao = 'desconhecido'`, e a contagem
> desses casos vai para o log da execução.
