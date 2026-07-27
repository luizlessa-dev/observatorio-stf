# Auditoria da fonte BigQuery e correção da normalização — Fase D2

Data: 2026-07-27. Fase exclusivamente analítica e local: nenhuma escrita foi
feita no Supabase, nenhum backfill foi executado, o cron e os scores
permanecem desativados. Todas as consultas ao BigQuery e ao Postgres do
Supabase nesta fase são `SELECT` somente leitura.

## 1. Fonte atual

- **Projeto BigQuery (billing):** `brinsider-dou`
- **Projeto/dataset/tabela (dados):** `basedosdados.br_stf_corte_aberta.decisoes`
- **Mantenedor:** [Base dos Dados](https://basedosdados.org) (dataset público,
  `br_stf_corte_aberta`, acesso `allUsers` como `READER`)
- **Descrição da tabela:** "Decisões de corte aberta do STF"
- **Descrição do dataset:** não disponível via API (`"description not
  available in the API"`)

## 2. Cobertura

Consulta agregada sobre a tabela inteira (todos os `tipo_julgamento`):

| Métrica | Valor |
|---|---|
| Total de linhas | 2.708.849 |
| `data_decisao` mínima | 2000-01-03 |
| `data_decisao` máxima | **2025-01-19** |
| `ano` mínimo / máximo | 2000 / 2025 |

Cobertura por ano (últimos anos, todos os tipos de julgamento):

| Ano | Registros | `data_decisao` mín. | `data_decisao` máx. |
|---|---|---|---|
| 2025 | 1.068 | 2025-01-01 | **2025-01-19** |
| 2024 | 72.731 | 2024-01-02 | 2024-09-03 |
| 2023 | 76.707 | 2023-01-02 | 2023-09-26 |
| 2022 | 89.898 | 2022-01-03 | 2022-12-31 |
| 2021 | 98.102 | 2021-01-02 | 2021-12-31 |
| 2020 | 99.444 | 2020-01-02 | 2020-12-31 |

A cobertura já vinha se deteriorando antes de 2025: 2023 para em setembro,
2024 para em setembro, 2025 tem apenas 19 dias de dados. Não é uma
interrupção súbita em 2026 — é uma defasagem crescente da fonte que já era
visível em 2023–2024.

## 3. Atualização

- `lastModifiedTime` da tabela: **2025-03-03T12:03:19Z**
- Particionamento: `RANGE_BUCKET` pela coluna `ano`, com `start=2000,
  end=2025, interval=1` — a definição de partição do BigQuery **nem sequer
  inclui 2025 ou 2026** no intervalo declarado (o `end` de uma range partition
  é exclusivo). As linhas de 2025 existem na tabela (fora do range
  declarado, em partição de overflow), mas não há nenhuma linha de 2026.
- Conclusão: a tabela não é atualizada desde março de 2025 e, na prática, os
  dados reais param em 19/01/2025. Este mirror da Base dos Dados está
  abandonado ou com atualização suspensa — não é um recurso confiável para
  ingestão corrente.

## 4. Causa do zero em 2026

**Diagnóstico:** ausência real de dados na fonte, não um bug de query, de
schema ou de filtro.

**Evidência:**
1. `MAX(data_decisao)` em toda a tabela = `2025-01-19`. Não existe nenhuma
   linha com `ano = 2026` nem com `ano = 2025` além de janeiro.
2. `MAX(ano)` = 2025; a definição de particionamento por `ano` vai só até
   2024 (end exclusivo em 2025).
3. `lastModifiedTime` do dataset é de março de 2025 — a tabela não recebeu
   nenhuma carga desde então.
4. O tipo da coluna é `DATE` (não `STRING`/`TIMESTAMP`), a query do script
   usa `WHERE ano = {ano}` sobre uma coluna `INTEGER` corretamente tipada —
   não há problema de tipo, timezone, alias ou nome de campo errado.

**Conclusão:** o zero em `ano = 2026` é esperado e correto dado o estado da
fonte. Não decorre do bug de normalização (que age depois da consulta) nem de
erro na query. É atraso/abandono da fonte "Base dos Dados" — condizente com o
fato de que o `data_maxima` já registrado em `stf_votacoes` (2025-01-19, ver
seção 3 do briefing da Fase D1) **coincide exatamente** com o máximo
disponível na fonte hoje: a ingestão já capturou 100% do que existe.

## 5. Entidade real

A tabela `basedosdados.br_stf_corte_aberta.decisoes` mistura três populações
bem diferentes de decisão, pelo campo `tipo_julgamento`:

| `tipo_julgamento` | Registros |
|---|---|
| Monocrática | 1.547.589 |
| Não Informado | 803.662 |
| Colegiada | 355.996 |
| Não Se Aplica | 1.602 |

O script consulta exclusivamente `tipo_julgamento = 'Monocrática'` — decisões
**individuais de um único relator**, não votações colegiadas com múltiplos
ministros. Dentro dessa população, o campo `andamento` é dominado por
disposições processuais que não são "voto" em nenhum sentido comum:

| `andamento` (Monocrática) | Registros |
|---|---|
| Negado Seguimento | 621.850 |
| Determinada A Devolução, Art. 543-B Do Cpc | 142.406 |
| Determinada A Devolução Pelo Regime Da Repercussão Geral | 128.407 |
| Não Conhecido(S) | 82.530 |
| Agravo Não Provido | 68.090 |
| Não Provido | 62.972 |
| Prejudicado | 54.180 |
| ... | ... |
| Deferido / Provido / Procedente / Indeferido / etc. | minoria |

**"Negado seguimento"**, sozinho, é a maior categoria (40% das decisões
monocráticas) e é uma decisão de **admissibilidade processual** (o relator
recusa dar prosseguimento ao recurso), não um julgamento de mérito
favorável/contrário. O mesmo vale para "determinada a devolução" (devolução
por repercussão geral/543-B) e "não conhecido" (recurso não admitido). Nenhum
desses três — que juntos somam **852.743 registros**, mais da metade de toda
a população monocrática — cabe naturalmente em `voto ∈ {favor, contra,
abstencao, ausente}`.

## 6. Compatibilidade com `stf_votacoes`

| Campo de origem | Campo de destino | Compatibilidade | Problema |
|---|---|---|---|
| `relator` | `ministro_id` (via `MAPA_MINISTRO` → `stf_ministros`) | Parcial | Lista fechada de 21 grafias; relatores fora dela são descartados silenciosamente (`sem_ministro`), sem falhar a execução |
| `classe` + `numero` | `processo` | Compatível | Concatenação simples, sem ambiguidade |
| `data_decisao` | `data` | Compatível | Ambos `DATE`; nome de coluna diferente, mapeamento correto no código |
| `andamento` | `voto` | **Problemático** | Ver seções 5, 8 e 14 — vocabulário de origem muito mais rico (dezenas de disposições processuais) que o domínio de destino (4 valores); maioria cai em `ausente` |
| `andamento` | `resultado` | **Problemático** | Mesmo problema; domínio de destino tem só 3 valores + `null` |
| `assunto_processo` | `ementa` (truncado a 500 chars) | Compatível | Truncamento e limpeza de `_x000d_` já tratados no código |
| — | — | **Ausente** | Nenhum campo bruto (`andamento` original, `tipo_julgamento`, `modalidade_julgamento`) é persistido em `stf_votacoes` — só o valor já normalizado. Ver seção 14 (impacto histórico) |
| `tipo_julgamento = 'Monocrática'` | implícito em "votações" | **Incompatibilidade conceitual** | Ver seção 5 e seção 16: decisão monocrática de relator não é sinônimo de "votação" |

Não há incompatibilidade de tipo, timezone ou nome de coluna mal resolvido —
a incompatibilidade é **conceitual e de vocabulário**: a origem é um
inventário de disposições processuais de decisões individuais; o destino
modela um resultado binário/ternário de "voto".

## 7. Comparação BigQuery × CSV oficial

`ingestao/stf/fetch_votacoes_csv.py` aponta para
`https://transparencia.stf.jus.br/extensions/decisoes/decisoes.csv`. Uma
requisição de sonda somente leitura (`curl` com `Range` de 4KB, sem executar
o script) a essa URL retorna:

- Sem User-Agent de navegador: `403 Forbidden` (bloqueio de bot/WAF)
- Com User-Agent de navegador: **`404 Not Found`** — `"The requested
  resource cannot be found."`

A URL codificada no script está morta. O próprio comentário no arquivo já
sinalizava isso (`# verificar se mudou`). Além disso, o script:

- não resolve `ministro_id` a partir do nome do ministro no CSV (`TODO`
  explícito na linha 37);
- nunca chama `.upsert()` — está incompleto, não apenas desatualizado;
- usa uma normalização de voto/resultado **diferente e mais simples**
  (`if "favor" in v`, etc.) que não sofre do bug de substring dos termos
  processuais do STF porque nunca chegou a ser alimentada com dados reais do
  STF (os valores de origem no painel de decisões são outra taxonomia,
  ainda não mapeada).

| Critério | BigQuery (`fetch_votacoes_bigquery.py`) | CSV oficial (`fetch_votacoes_csv.py`) |
|---|---|---|
| Entidade real | Decisões monocráticas individuais | Desconhecida (schema real não confirmável — URL morta) |
| Cobertura temporal | 2000–2025-01-19, mirror parado desde mar/2025 | Indeterminável (URL retorna 404) |
| Atualização | Estática (mirror abandonado) | Indeterminável |
| Campos | 17 campos, schema estável e documentado | Schema assumido no código, nunca validado contra a URL atual |
| Fonte primária | Não — mirror de terceiro (Base dos Dados) | Sim, em tese — mas endpoint não resolve mais |
| Confiabilidade | Alta para o que cobre (schema estável, dataset público), baixa para atualidade | Não avaliável — dead link |
| Implementação atual | Completa, testada, com trava de destino e dry-run | Incompleta (sem resolução de `ministro_id`, sem upsert, `TODO` aberto) |
| Adequação a `stf_votacoes` | Parcial — ver seção 6 | Não avaliável |

**Conclusão:** hoje não existe um caminho funcional para dados mais recentes
que 19/01/2025. O BigQuery está estático desde março/2025; o CSV oficial está
com URL quebrada e implementação incompleta. Nenhum dos dois scripts foi
executado com escrita nesta fase.

## 8. Bug de normalização

**Comportamento antigo:** `normalizar_voto`/`normalizar_resultado` iteravam
`MAPA_VOTO`/`MAPA_RESULTADO` (dicts) na ordem de inserção e retornavam o
primeiro valor cuja chave aparecesse como substring do andamento
(`if k in a`). Como o dict foi escrito com os termos genéricos/positivos
antes dos específicos/negativos, e os termos específicos contêm os genéricos
como substring —`"indeferido"` contém `"deferido"`, `"não provido"` contém
`"provido"`, `"improcedente"` contém `"procedente"`, `"provido em parte"` e
`"parcialmente provido"` contêm `"provido"` — o termo genérico errado era
encontrado primeiro.

**Causa:** correspondência por substring sem ordenação por especificidade,
combinada com uma ordem de dict que colocava por acidente os termos
genéricos antes dos específicos.

**Correção implementada** (`ingestao/stf/fetch_votacoes_bigquery.py`):

1. `_normalizar_texto()`: minúsculas + remoção de acentos (`unicodedata.
   normalize("NFKD", …)` + filtro de caracteres combinantes) + colapso de
   espaços — aplicada tanto ao andamento consultado quanto (implicitamente,
   por já estarem escritas sem acento) às chaves dos mapas.
2. As chaves de `MAPA_VOTO`/`MAPA_RESULTADO` deixaram de ser iteradas na
   ordem de inserção do dict. Em vez disso, `_VOTO_CHAVES_ORDENADAS` e
   `_RESULTADO_CHAVES_ORDENADAS` são as chaves ordenadas por **comprimento
   decrescente**, calculadas uma vez no carregamento do módulo. Como todo
   termo específico que colide com um genérico é sempre uma string mais
   longa que o contém (`"indeferido"` é mais longo que `"deferido"`, etc.),
   ordenar por comprimento decrescente garante — por construção, não caso a
   caso — que o termo mais específico seja sempre testado primeiro. Isso
   corrige a família inteira do bug, não só os três exemplos originalmente
   documentados.
3. Termos reais do STF ausentes do dict original foram adicionados:
   `"provido em parte"` e `"parcialmente procedente"` (a forma real
   observada na fonte é "Provido Em Parte", "Deferido Em Parte", "Procedente
   Em Parte" — não "parcialmente X" — ver seção 12 do briefing original;
   `"parcialmente provido"`/`"parcialmente procedente"` foram mantidos por
   já constarem no dict original e por aparecerem, ainda que raramente, em
   variações como "Agravo Provido E Desde Logo Provido Parcialmente O Re").
4. `andamento` vazio ou `None` passou a retornar explicitamente `"ausente"`
   (voto) / `None` (resultado) antes de qualquer processamento de string,
   sem lançar exceção.

**Comportamento novo** — ver seção 15 para a tabela de validação contra
amostra real.

## 9. Testes

`ingestao/stf/tests/test_fetch_votacoes_bigquery.py` foi reescrito: as
classes `TestNormalizacaoVoto` e `TestNormalizacaoResultado` substituem os
antigos testes `test_BUG_*` (que afirmavam o comportamento incorreto) por
testes que exigem o comportamento correto. Cobertura:

| Caso | Resultado exigido |
|---|---|
| Deferido / Provido / Procedente / Concedida a ordem | favor / procedente |
| Indeferido / Não Provido / Improcedente / Denegada a ordem | contra / improcedente |
| Provido Em Parte / Deferido Em Parte / Parcialmente Provido / Parcialmente Procedente | favor (resultado: parcial) |
| Caixa alta/baixa (`INDEFERIDO`, `indeferido`) | mesma classificação |
| Sem acento (`Nao Provido` vs `Não Provido`) | mesma classificação |
| String vazia | `ausente` / `None` |
| `None` | `ausente` / `None` |
| Valor desconhecido | `ausente` / `None` |
| `"Negado Seguimento"` (fora do MAPA_VOTO) | `ausente` / `None` |
| Frase completa: `"Pedido conhecido e indeferido"` | contra (não "deferido") |
| Frase completa: `"Agravo regimental conhecido e não provido"` | contra |
| Todos os valores de saída respeitam os `CHECK` do schema | ver seção 6 |

Resultado: `python3 -m unittest ingestao.stf.tests.test_fetch_votacoes_bigquery`
— **42 testes, 42 OK** (0 falhas). Ver seção 19 do relatório final para os
demais comandos executados (`npm test`, `typecheck`, `lint`, `build`).

## 10. Impacto histórico

`stf_votacoes` **não armazena o `andamento` bruto** — só `voto` e
`resultado` já normalizados (colunas confirmadas via
`information_schema.columns`: `id, ministro_id, processo, classe, data,
ementa, voto, resultado, tema_id, created_at`). A correção histórica não é
possível a partir do próprio Supabase; depende de reconsultar a fonte.

Distribuição atual em `stf_votacoes` (758.714 registros, consulta somente
leitura):

| `voto` | `resultado` | Registros |
|---|---|---|
| ausente | `null` | 487.778 |
| favor | procedente | 209.393 |
| abstencao | `null` | 50.235 |
| contra | improcedente | 11.308 |
| — | parcial | **0** |

**Nenhum registro tem `resultado = 'parcial'`** e o total de `contra`
(11.308) é essencially idêntico à contagem isolada de "Denegada A Ordem" no
BigQuery entre relatores mapeados (11.338 — pequena diferença por filtro de
data/dedup) — o único termo negativo que **não** colidia com o bug. Isso
confirma, com os dados reais já ingeridos, que a bug afetou 100% do histórico
desde a primeira ingestão: todo registro que deveria ser `contra` ou
`parcial` por "indeferido", "não provido", "improcedente" ou "X em parte"
foi classificado como `favor`/`procedente`.

Quantificação por reconsulta ao BigQuery (Monocrática, relatores presentes em
`MAPA_MINISTRO`, somente leitura):

| Categoria | Registros na fonte | Reproduzível? | Ação futura |
|---|---|---|---|
| "não provido" (contra/improcedente esperado) | 112.113 | Sim — via `andamento` bruto no BigQuery | Reingestão com normalização corrigida |
| "indeferido" (contra/improcedente esperado) | 11.688 | Sim | Reingestão |
| "improcedente" (contra/improcedente esperado) | 3.277 | Sim | Reingestão |
| "em parte" / "parcialmente" (parcial esperado) | 6.603 | Sim | Reingestão |
| "denegada a ordem" (já correto) | 11.338 | — | Nenhuma (não afetado) |
| Positivo genuíno (favor/procedente correto) | 78.763 | — | Nenhuma (não afetado) |
| Fora do `MAPA_VOTO` (`ausente`, correto por design) | 542.068 | — | Ver seção 16 (é ou não é "voto"?) |

**Total potencialmente misclassificado: ~133.681 registros** (soma das
quatro primeiras linhas) — cerca de **60% de todo registro que hoje tem
`voto` diferente de `ausente`/`abstencao`** (133.681 de ~220.701) e **~17,6%
de toda a tabela `stf_votacoes`**.

**Reprodutibilidade:** total. A chave de upsert
(`ministro_id, processo, data`) permite reprocessar exatamente os mesmos
registros a partir do BigQuery (fonte primária dos dados brutos) e
sobrescrever `voto`/`resultado` sem duplicar linhas — desde que uma
reingestão real seja autorizada em etapa própria (ver seção 21.13). Não é
necessário nem possível "inferir" a correção sem reconsultar a fonte, porque
o texto bruto não está no Supabase.

## 11. Validação contra amostra da fonte

Amostra pequena, determinística (1 linha por `andamento`-alvo, escolhida por
`ROW_NUMBER() OVER (PARTITION BY andamento ORDER BY numero, data_decisao)`,
`rn = 1`, decisões Monocráticas reais). Comparação entre a transformação
antiga (reconstruída do HEAD do repositório antes desta fase) e a nova
(módulo corrigido), executada localmente, sem tocar o Supabase:

| Andamento (real, da fonte) | Voto antigo | Voto novo | Resultado antigo | Resultado novo |
|---|---|---|---|---|
| Deferido | favor | favor | procedente | procedente |
| Indeferido | favor | **contra** | procedente | **improcedente** |
| Provido | favor | favor | procedente | procedente |
| Não Provido | favor | **contra** | procedente | **improcedente** |
| Procedente | favor | favor | procedente | procedente |
| Improcedente | favor | **contra** | procedente | **improcedente** |
| Provido Em Parte | favor | favor | procedente | **parcial** |
| Deferido Em Parte | favor | favor | procedente | **parcial** |
| Denegada A Ordem | contra | contra | improcedente | improcedente |
| Concedida A Ordem | favor | favor | procedente | procedente |
| Negado Seguimento | ausente | ausente | `None` | `None` |
| Conhecido E Negado Provimento | ausente | ausente | `None` | `None` |

6 de 12 termos-alvo mudaram de classificação; os 6 restantes (já corretos ou
fora do `MAPA_VOTO` por design) permaneceram idênticos — sem regressão.

## 12. Decisão sobre o nome e modelo da tabela

`stf_votacoes` sugere resultado de **votação colegiada** (vários ministros
votando um mesmo processo). O que a ingestão atual efetivamente popula é:

- decisões **monocráticas** (um único relator, sem colegiado);
- majoritariamente disposições **processuais** de admissibilidade ("negado
  seguimento", "não conhecido", "determinada a devolução") — 71,6% das
  decisões monocráticas de relatores mapeados —, não julgamentos de mérito
  favor/contra.

**Inconsistência:** o nome e o modelo (`voto`, `resultado`) implicam um
julgamento de mérito individualizado por ministro em um colegiado; a maior
parte dos dados de origem não é isso.

**Impacto no frontend:** `src/hooks/useVotacoes.ts` consulta
`stf_votacoes` filtrando por `ministro_id` e expõe uma lista chamada
"votações" na página de detalhe do ministro — o usuário lê como se fossem
julgamentos colegiados individualizados, quando são despachos monocráticos,
em boa parte de admissibilidade processual.

**Impacto em SEO/indicadores:** qualquer contagem, ranking ou "placar" (favor
× contra) construído sobre esta tabela hoje sub-representa a real atividade
do ministro (71,6% vira `ausente` e é, na prática, invisível em qualquer
agregação de favor/contra) e, até a correção desta fase, também
sobre-representava "favor"/"procedente" por causa do bug de substring.

**Recomendação (não executada nesta fase):** considerar renomear/reparticionar
o domínio em duas entidades:
- `stf_decisoes_monocraticas` — para o que já existe hoje (decisão individual
  de relator, majoritariamente processual);
- um futuro `stf_votacoes_colegiadas` (não implementado) alimentado por
  `tipo_julgamento = 'Colegiada'` (355.996 registros na fonte, ainda não
  auditados nesta fase), que seria o candidato mais fiel ao nome "votação".

Nenhuma migração de nome, schema ou dado foi feita — decisão registrada aqui
para avaliação editorial/técnica futura.

## 13. Plano de correção futura (não executado nesta fase)

1. Revisão e aprovação humana desta correção (diff apresentado na seção 21 do
   relatório final).
2. Dry-run manual do `workflow_dispatch` com a normalização corrigida
   (ainda `dry_run: true`) para confirmar em log real que a contagem e a
   tabela de destino continuam corretas — sem gravar.
3. Decisão editorial separada: reingestão retroativa (upsert corrige
   `voto`/`resultado` dos ~133.681 registros por `on_conflict=
   (ministro_id, processo, data)`) ou aceitar o histórico como está e corrigir
   só daqui para frente.
4. Decisão editorial separada sobre o nome/modelo da tabela (seção 12).
5. Só depois: reingestão real (`dry_run: false`), teste de idempotência
   (segunda execução sem duplicar) e, só então, reativação do `schedule`.
6. Avaliar fonte alternativa/complementar, já que a Base dos Dados está
   parada desde março/2025 e o CSV oficial está com URL morta (seção 7) —
   sem isso, mesmo corrigida a normalização, a tabela não recebe nenhum dado
   posterior a 19/01/2025.
