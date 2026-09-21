# Apuração interna — diferenças de remuneração entre ministros do STF

Status: **resposta da LAI recebida e verificada — achado principal confirmado
por fonte primária, rubrica a rubrica** (21/09/2026). Ver seção "Resposta da
LAI e verificação direta" abaixo — é a conclusão desta apuração. O restante
do documento (rodadas 1-3) é o histórico de como chegamos até aqui. Este
documento não
é um caso editorial (não segue o schema de `src/content/casos`) — é uma nota
de trabalho para orientar uma eventual apuração futura, criada a partir da
pergunta "os servidores com o mesmo cargo ganham o mesmo em todos os
gabinetes?" feita sobre a tabela `stf_gastos_servidores` (ver
`docs/../supabase/migrations/0021_gastos_servidores_gabinete.sql`).

## Pedido de LAI protocolado

- **Protocolo**: `03746202602442094`
- **Canal**: Fala.BR, ouvidoria do STF (LAI)
- **Registrado em**: 13-14/09/2026 (confirmação recebida em 14/09/2026)
- **Prazo legal de resposta**: até 20 dias corridos, prorrogáveis por mais 10
  (Lei nº 12.527/2011, art. 11) — estimativa: resposta inicial esperada até
  ~04/10/2026, com prorrogação possível até ~14/10/2026.
- **Conteúdo do pedido**: detalhamento rubrica a rubrica da remuneração dos
  ministros em exercício, com base na decisão do STF de 25/03/2026 (RE
  968646/RE 1059466, Temas 976 e 966) que criou a obrigação de publicação
  mensal por rubrica — ver texto completo enviado na seção "Próximos passos"
  abaixo e no histórico da conversa.
- **Acompanhamento**: usar o número de protocolo em
  https://falabr.cgu.gov.br para consultar andamento. Login é necessário
  (não temos acesso automatizado a isso) — precisa ser checado manualmente
  pelo usuário quando a resposta chegar.

## O que os dados (fonte: egesp-portal.stf.jus.br, ref. 09/2026) mostram

1. **Nenhum cargo, nem mesmo "Assessor de Ministro", tem remuneração igual entre
   gabinetes.** Variação de até 5x dentro do mesmo título (ex.: Assessor de
   Ministro vai de R$ 10.832,34 a R$ 54.752,61). Isso por si só não é anômalo —
   cargos comissionados têm níveis internos (símbolos/padrões) que a fonte não
   detalha, só mostra o título genérico.

2. **O achado que chama atenção**: mesmo o cargo "MINISTRO" varia de forma
   relevante, apesar do subsídio nominal fixo de R$ 46.366,19/mês (valor que já
   registramos separadamente em `stf_gastos` como `subsidio_ministro`):

   | Ministro | Remuneração bruta (set/2026) | Posse | Cargo anterior |
   |---|---|---|---|
   | Cármen Lúcia | R$ 62.594,36 | 2006 | Procuradora do Estado de MG |
   | Luiz Fux | R$ 62.594,36 | 2011 | Ministro do STJ |
   | Edson Fachin (Presidente) | R$ 62.594,36 | 2015 | Professor UFPR / Procurador do Estado do PR |
   | André Mendonça | R$ 57.957,74 | 2021 | Ministro da Justiça / AGU |
   | Nunes Marques | R$ 57.957,74 | 2020 | Desembargador do TRF-1 |
   | Flávio Dino | R$ 55.639,43 | 2024 | Ministro da Justiça (foi juiz federal antes da carreira política) |
   | Gilmar Mendes | R$ 49.613,77 | 2002 | Advogado-Geral da União |
   | Alexandre de Moraes | R$ 48.684,50 | 2017 | Ministro da Justiça |
   | Cristiano Zanin | R$ 46.366,19 (= subsídio nominal, sem adicional) | 2023 | Advogado de defesa (sem carreira pública anterior) |
   | Dias Toffoli | R$ 39.822,05 (**abaixo** do subsídio nominal) | 2009 | Advogado-Geral da União |

   Fonte da coluna "cargo anterior": `stf_ministros.cargo_anterior` (já publicado
   no site).

## Hipóteses institucionais (não confirmadas para casos individuais)

Achadas via busca por contexto público — nenhuma delas foi confirmada rubrica a
rubrica para um ministro específico, então não podem virar afirmação factual
até checarmos a fonte primária certa (ver "Próximos passos"):

- **PVTAC** (Parcela de Valorização por Tempo de Antiguidade na Carreira) — 5%
  do subsídio por quinquênio de "atividade judicante" (juízes e membros do MP),
  até 35%, instituída por decisão do STF de 25/03/2026. Compatível com Fux
  (ex-Ministro STJ) e Nunes Marques (ex-Desembargador) estarem acima do
  subsídio nominal. [Migalhas](https://www.migalhas.com.br/depeso/460943/penduricalhos-e-teto-remuneratorio-a-decisao-do-stf),
  [O Hoje](https://ohoje.com/2026/06/26/ministros-do-stf-votam-por-liberar-parte-dos-adicionais-salariais-de-magistrados-e-membros-do-mp/).
- **VPNI** por Adicional por Tempo de Serviço incorporado até 2006 pode ser
  cumulativo com a PVTAC, desde que não conte o mesmo período duas vezes.
- **Teto constitucional e "redutor"** (art. 37, XI, CF) — mecanismo que pode
  **reduzir** a remuneração de alguém abaixo do subsídio nominal quando a soma
  de múltiplas fontes públicas de renda ultrapassa o teto. É a hipótese mais
  plausível para o caso do Toffoli (único abaixo do subsídio), mas não
  verificamos se ele de fato acumula outra fonte de renda pública sujeita ao
  teto — pode ser isso, pode ser outra coisa. [STF
  notícias](https://noticias.stf.jus.br/postsnoticias/stf-mantem-obrigatoriedade-de-respeito-ao-teto-remuneratorio-e-limitacao-sobre-o-pagamentos-de-verbas-indenizatorias/),
  [Conjur](https://www.conjur.com.br/2015-jun-11/interesse-publico-stf-reabre-discussao-direito-adquirido-teto-remuneratorio/).
- Zanin (sem nenhuma carreira pública anterior) recebe exatamente o subsídio
  nominal, sem nenhum adicional — consistente com a hipótese acima (nada a
  incorporar de carreira anterior), mas também é uma amostra de 1.

**Atenção**: essas hipóteses explicam um padrão agregado, não cada caso
individual. Não afirmamos motivo específico para nenhum ministro sem a fonte
primária rubrica a rubrica.

## O que tentamos e o que confirmamos (2ª rodada, 13/09/2026)

- `portal.stf.jus.br` tem uma ferramenta oficial de busca de remuneração
  (`/remuneracao/pesquisarRemuneracao.asp`, endpoint
  `/remuneracao/listaTiposDeFolha.asp?ano=YYYY&mes=MM`). Testamos 20 períodos
  entre 01/2023 e 05/2026 — todas as consultas retornaram
  `"sucesso":false,"folhas":[]`. **Ferramenta está fora do ar/sem dados
  carregados**, não é questão de período específico. Vale checar de novo mais
  adiante, mas não insistir agora.

- Painel oficial do CNJ (Portaria 63/2017, "Painel de Remuneração dos
  Magistrados", via QlikSense em `paineisanalytics.cnj.jus.br`) tem exatamente
  o detalhamento por rubrica que precisamos (Subsídio, Direitos Pessoais,
  Indenizações, Direitos Eventuais, Previdência Pública, Imposto de Renda) —
  mas **confirmamos que o STF não está nessa base**. Buscamos "TOFFOLI" no
  filtro de Magistrado e ele aparece, mas só com registros de Tribunal = CNJ
  (da época em que foi Presidente do CNJ, 2018-2020, todos com valores
  zerados — não é remuneração STF). Buscamos "ST" no filtro de Tribunal e só
  retornou STJ e STM, nunca STF. Isso é coerente com um fato institucional:
  o CNJ não tem competência correcional sobre o próprio STF (é o STF quem
  preside o CNJ — art. 103-B, CF), então o STF não está sujeito à Portaria
  63/2017 do jeito que os demais tribunais estão. **Este caminho está
  descartado.**

- Achamos a página oficial "[Estrutura Remuneratória (Ministros e
  Servidores)](https://egesp-portal.stf.jus.br/transparencia/estrut_remu_membros_e_servidores)"
  do próprio STF (link a partir de Portal STF → Transparência → Pessoas →
  Remuneração). Ela mostra a tabela oficial de vencimento básico e
  gratificações por carreira/nível/padrão (Analista e Técnico Judiciário) e a
  tabela de cargos em comissão/funções de confiança (CJ-1 a CJ-4, FC-1 a
  FC-6) — isso explica a variação de "Assessor de Ministro" entre gabinetes
  (são símbolos/níveis diferentes de CJ, a fonte da folha só mostra o título
  genérico, não o nível). **Achado relevante**: para o cargo MINISTRO, a
  tabela mostra um valor único e fixo — R$ 46.366,19, ativo e inativo, sem
  níveis/padrões. Ou seja, **não existe tabela oficial de níveis para
  ministro** — a variação de R$ 39.822 a R$ 62.594 que vemos na folha real não
  vem de nenhuma estrutura publicada, vem inteiramente de parcelas pessoais
  adicionais (reforça a hipótese de PVTAC/VPNI/indenização individual, não
  resolve qual é).

## 3ª rodada (13/09/2026) — achado legal importante + mais fontes descartadas

- **A pergunta "existe fonte alternativa?" valia a pena — achamos uma base
  legal nova e forte, mas nenhuma fonte de dados nova.** O STF decidiu, em
  tese de repercussão geral de 25/03/2026 (RE 968646/RE 1059466, Temas 976 e
  966, mais RCL 88319 e ADIs 6606/6601/6604), que:
  - o teto é R$ 46.366,19 e a soma de vantagens acima do subsídio não pode
    passar de **70%** do teto, dividido em dois blocos de 35%: (1)
    "antiguidade" — 5% do subsídio a cada 5 anos de carreira, até 35% (== a
    PVTAC que já tínhamos como hipótese) — e (2) verbas indenizatórias
    (diárias, ajuda de custo, licença-prêmio não gozada etc.), também até 35%;
  - regras valem desde a folha-base de abril/2026 (impacto a partir de
    maio/2026);
  - pagamentos retroativos a decisões administrativas/judiciais anteriores a
    fevereiro/2026 ficam suspensos até auditoria conjunta CNJ+CNMP autorizada
    pelo STF;
  - **"todos os tribunais e órgãos do MP deverão publicar mensalmente em seus
    sites o valor exato recebido por cada membro, detalhando cada rubrica,
    sob pena de responsabilidade dos gestores"** — obrigação de transparência
    ativa criada pelo próprio STF. Fonte:
    [notícia oficial do STF](https://noticias.stf.jus.br/postsnoticias/stf-aprova-tese-que-unifica-teto-salarial-e-extingue-pagamentos-extras-para-magistratura-e-mp/).
  - Todos os valores observados na nossa amostra (R$ 39.822 a R$ 62.594)
    ficam dentro do teto de 70% acima do subsídio (que seria R$ 78.822,52) —
    nada aponta, pelos números brutos, para descumprimento desse limite.

  **Isso muda o enquadramento do pedido de LAI**: não é só "quero mais dado",
  é "o STF já decidiu que isso deveria estar público mensalmente — onde
  está?".

- **Retentamos a ferramenta `portal.stf.jus.br/remuneracao` pela interface
  real** (não só via fetch direto), inclusive para maio/2026 (mês em que a
  nova regra passou a valer). Mesmo resultado: "Nenhuma folha válida para o
  período", com a mesma chamada de rede
  (`/remuneracao/listaTiposDeFolha.asp?ano=2026&mes=05`) que já teríamos feito
  manualmente. Confirma que não é problema de sessão/cache — a ferramenta
  está genuinamente sem dados carregados, incluindo no período em que a regra
  de transparência já estaria valendo.

- **Retentamos o painel do CNJ com mais paciência.** Busca por "TOFFOLI" no
  filtro de Magistrado retornou resultados — mas só com Tribunal = CNJ (época
  em que ele foi Presidente do CNJ, 2018-2020, valores todos zerados).
  Buscamos "ST" no filtro de Tribunal: retornou STJ e STM, nunca STF.
  **Confirmado definitivamente: o STF não está nessa base.**

- **Mapeamos todas as páginas de transparência do egesp-portal.stf.jus.br**
  (menu completo: Estrutura Remuneratória, Quantitativo de Cargos, Quadro de
  Servidores, Remuneração/rendimento_folha, Terceirizados, Ressarcimento de
  Pessoal Cedido, Serviço Extraordinário, Rol de Responsáveis, Indenização de
  Licença Prêmio, Indenização de Transporte de Oficiais de Justiça,
  Concursos, Estagiários, Benefícios, Assistência Médica). Duas delas
  (Serviço Extraordinário, Indenização de Licença Prêmio) **funcionam e
  publicam rubrica individual por nome e matrícula** — mas nenhuma lista os
  ministros: são benefícios que só se aplicam a servidor (hora extra,
  licença-prêmio não gozada de servidor). **Não existe, em nenhuma dessas
  páginas, uma que detalhe a rubrica "Direitos Pessoais" (quinquênio/VPNI/
  PVTAC) dos próprios ministros** — que é exatamente a peça que falta para
  explicar a variação de R$ 39.822 a R$ 62.594.

**Conclusão desta rodada**: esgotamos as fontes gratuitas/públicas que
conseguimos mapear. O LAI segue sendo o próximo passo necessário — mas agora
com fundamento mais forte (citando a própria decisão do STF de 25/03/2026 que
criou essa obrigação de publicação e não parece estar sendo cumprida para os
próprios ministros).

## Resposta da LAI e verificação direta (21/09/2026)

**A resposta chegou em 21/09/2026** (dentro do prazo, antes do vencimento em
14/10/2026), assinada pela Secretaria de Gestão de Pessoas do STF. Texto
literal da resposta:

> "As informações requeridas podem ser encontradas no site do STF, no menu
> Transparência e Prestação de Contas, item Pessoas e gestão de recursos -
> Pessoas - Remuneração. [...] a parcela de antiguidade na carreira está
> discriminada na coluna B (Vantagens Pessoais), enquanto as verbas
> indenizatórias estão discriminadas na coluna C (Vantagens de natureza
> periódica/eventual ou relativas às lotações dos servidores)."

**Avaliação da resposta em si**: é uma resposta-remissão (aponta para uma
página, não entrega os dados no formato pedido). Não atende ao pedido 3 (CSV/
planilha eletrônica, art. 8º §3º III da LAI) nem confirma se a publicação
mensal por rubrica exigida pela decisão de 25/03/2026 está de fato
implementada para os próprios ministros — só diz "a informação está lá". O
anexo enviado pela Ouvidoria é um print do próprio fluxo de navegação (com
nome e valores tarjados no exemplo), não os dados em si.

**Mas a remissão procede — testamos e a informação está lá, de verdade.**
Fomos direto a `egesp-portal.stf.jus.br/transparencia/rendimento_folha`,
filtramos por Cargo Efetivo = MINISTRO, mês de referência Agosto/2026 (o mês
mais recente já fechado — Setembro/2026 ainda não tinha `FOLHA NORMAL`
publicada na data da consulta, confirmado pelo endpoint
`tipos_folhas_referencia?ano=2026&mes=9` retornando vazio), e abrimos o
botão "Mais informações" (endpoint `/transparencia/show_detalhes?id=...`)
para 4 ministros. Isso abre exatamente a tabela rubrica a rubrica pedida na
LAI — colunas (A) a (S), com legenda oficial de cada uma. Dados
verificados diretamente, não de segunda mão:

| Ministro | Matrícula | (A) Subsídio | (B) Vantagens Pessoais | (C) Verbas indenizatórias | Observação |
|---|---|---|---|---|---|
| Cristiano Zanin | 61 | R$ 46.366,19 | **R$ 0,00** | R$ 0,00 | Sem carreira pública anterior — bate com a hipótese |
| Cármen Lúcia | 50 | R$ 46.366,19 | **R$ 16.228,17** | R$ 0,00 | 16.228,17 / 46.366,19 = **exatamente 35,0%** — no teto do bloco |
| Luiz Fux | 53 | R$ 46.366,19 | **R$ 16.228,17** | R$ 0,00 | Idêntico a Cármen Lúcia — também no teto de 35% |
| Dias Toffoli | 52 | R$ 46.366,19 | **R$ 6.954,93** | R$ 0,00 | 15,0% — abaixo do teto; ver achado sobre férias abaixo |

**Achado principal, agora confirmado por fonte primária**: a variação de
remuneração entre ministros vem **inteiramente da coluna B (Vantagens
Pessoais — antiguidade/VPNI)**. A coluna C (verbas indenizatórias) está
zerada para os 4 ministros checados, sem exceção. Isso refuta, para esses
casos, qualquer leitura de que a diferença viesse de indenizações — é
100% antiguidade de carreira, exatamente como o bloco "PVTAC" da decisão de
25/03/2026 previa. Dois ministros com tempo de carreira mais longo (Cármen
Lúcia desde 2006, Fux desde 2011) bateram no teto de 35% do bloco; Toffoli
(posse em 2009, portanto carreira mais longa que Fux) está abaixo do teto
nessa rubrica — o que por si só já é um dado a mais a explicar numa eventual
pergunta de LAI complementar, mas não está relacionado ao achado abaixo.

**Achado secundário, resolve a "anomalia Toffoli" da rodada 1**: a rodada 1
achou Toffoli como único ministro **abaixo** do subsídio nominal (R$
39.822,05 vs. R$ 46.366,19) e levantou a hipótese do redutor de teto
constitucional (acúmulo com outra fonte pública de renda). **A hipótese do
teto está refutada para agosto/2026**: o campo (K) "Abate teto" do
contracheque dele é R$ 0,00, igual ao de todos os outros. A explicação real
está numa rubrica separada, (N) "Férias", que veio **negativa: -R$
13.499,07** — um ajuste/desconto pontual daquele mês, não uma redução
estrutural. A conta fecha exatamente:

```
(F) Total bruto após teto           R$ 53.321,12   (= 46.366,19 + 6.954,93 de antiguidade)
(N) Férias (negativa, only Toffoli) R$ -13.499,07
= Remuneração bruta (valor que a lista pública mostra)   R$ 39.822,05  ✓ bate com a rodada 1
(M) Total de descontos              R$ -23.341,22
= Remuneração líquida                                     R$ 16.480,83  ✓ bate com a rodada 1
```

Não apuramos a causa exata do valor negativo em Férias (pode ser desconto de
férias adiantadas/gozadas fora do período aquisitivo, ajuste de exercício
anterior, etc. — a legenda do próprio portal não detalha (N) além do nome) —
mas o mecanismo (um lançamento pontual de um mês, não uma parcela
estrutural) já está estabelecido pela própria fonte primária.

**O que isso significa para o pedido de LAI**: os itens 1 (contracheque
discriminado) e 3 (formato) não foram plenamente atendidos pela resposta
formal — teríamos que insistir num recurso se quiséssemos o CSV oficial ou a
confirmação por escrito de que a página cumpre a decisão de 25/03/2026. Mas,
na prática, já temos a resposta ao item 1 por conta própria, verificada
diretamente na fonte primária oficial do STF, para os 4 ministros checados
(e o mecanismo é generalizável — o mesmo botão "Mais informações" está
disponível para qualquer um dos 10 em exercício). Não vemos necessidade de
recurso só para obter o dado; só faria sentido se o objetivo editorial for
também documentar a lacuna de formato/transparência ativa em si.

**Pendência, se quisermos fechar 100%**: checar os 6 ministros restantes em
exercício (Moraes, Mendonça, Nunes Marques, Dino, Gilmar Mendes, Fachin) pelo
mesmo processo, e considerar repetir para setembro/2026 assim que a folha
for publicada, para confirmar que o padrão (variação só na coluna B) se
mantém mês a mês.

## Próximos passos, se formos adiante

1. ~~Tentar de novo o painel do CNJ~~ — feito, descartado (STF não está lá).
2. Considerar pedido via LAI/e-SIC do STF pedindo o detalhamento rubrica a
   rubrica (contracheque) dos 10 ministros em exercício para o mês de
   referência — o que já republicamos (nome + remuneração bruta) é amparado
   pela LAI; o detalhamento por rubrica é o próximo nível de transparência,
   não uma nova categoria de dado sensível.
3. Tentar de novo a ferramenta `portal.stf.jus.br/remuneracao` daqui a
   algumas semanas, para ver se voltou a funcionar.
4. Só depois de ter a explicação rubrica a rubrica — não a hipótese — decidir
   se isso vira uma seção do site (ex.: página "Remuneração comparada" ou um
   caso editorial). Sem a fonte primária, publicar a variação sozinha, sem
   explicação, arriscaria insinuar irregularidade sem prova — o que viola a
   política editorial do site (`docs/politica-editorial-casos.md`).
