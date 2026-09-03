# Política editorial — seção "Casos"

2026-09-02. Cria a seção `/casos`, que cobre controvérsias envolvendo
ministros do STF por apuração editorial caso a caso.

## Contexto e precedente

Em 2026-07-26, um eixo adjacente ("doadores dos presidentes indicantes") foi
formalmente rejeitado — ver `docs/decisao-doadores-indicantes.md`. O desenho
proposto ligava doadores a ministros por mera adjacência de chave numa
tabela relacional, convidando uma leitura causal ("empresa X financiou o
ministro Y") que os dados não sustentavam. A própria nota de decisão já
apontava o caminho certo: se o tema voltasse, deveria voltar como "apuração
editorial caso a caso, com documentos, contexto e contraditório — nunca como
tabela relacional publicada ligando pessoas".

A seção `/casos` implementa exatamente isso. O vínculo ministro↔caso é um
array de slugs digitado à mão no frontmatter de cada arquivo Markdown,
revisável em PR de git — nunca uma junção automática. Cada caso é uma peça
autoral única, não uma linha gerada por pipeline.

Isso não é um convite a reabrir o eixo dos doadores por outra porta. Um caso
sobre financiamento eleitoral só pode existir aqui se, como qualquer outro
caso, tiver um evento concreto documentado conectando as partes — não a mera
existência de uma doação e uma indicação subsequente.

## Regra de status

- **`em_apuracao`** (default): a apuração está em andamento. O texto não usa
  linguagem de culpa, condenação ou confissão — nada que sugira conclusão
  antes do devido processo.
- **`confirmado`**: só se aplica quando o texto nomeia um evento concreto —
  decisão judicial transitada, confissão formal, conclusão oficial de
  investigação/processo administrativo. "Muita cobertura de imprensa" ou
  "consenso público" não qualificam.
- **`arquivado`**: a apuração foi encerrada sem conclusão adicional. O corpo
  do texto explica o motivo do arquivamento (fonte se retratou, processo
  arquivado, apuração não avançou).

Mudar o status de um caso é uma decisão editorial, não uma opção de UI —
exige atualizar `data_atualizacao` e deixar uma nota visível no corpo
explicando o que mudou.

## Regra de fontes

Todo caso precisa de ao menos uma fonte (`fontes[]`, obrigatório no schema).
Preferência, em ordem: fonte primária/documento oficial > apuração própria
com documentos > imprensa de referência. O `label` de cada fonte precisa
dizer o que ela é (ex. "Decisão publicada no DJe", "Reportagem — Folha de
S.Paulo, 2026-08-01"), não só repetir o nome do veículo.

## Regra de contraditório

Qualquer pessoa ou instituição citada num caso pode pedir correção ou
direito de resposta pelo canal já existente no rodapé do site
(`mailto:luiz@thebrinsider.com`, "Contato e direito de resposta"). Uma
correção vira `data_atualizacao` + uma nota visível no corpo do texto — nunca
uma edição silenciosa que apaga o que estava escrito antes.

## Regra de linguagem

Nenhum caso usa os rótulos ideológicos suspensos do resto do site
(`Religioso`, `Anti-aborto`, `Evangélico`, `Conservador`, `Mercado`,
`Garantismo`) nem reintroduz um score. Esta lista é a mesma usada no
guardrail mecânico (`tests/integridade-casos.test.mjs`) — doc e teste não
divergem; se a lista mudar, muda nos dois lugares na mesma edição.

## O que isso não é

- Não é `ClaimReview` (schema.org de fact-checking formal) — o site não tem
  metodologia de rating publicada para reivindicar esse tipo. Ver o mesmo
  raciocínio em `docs/auditoria-onda-1.md` (C1) sobre não afirmar mais do
  que o dado sustenta.
- Não é caixa de denúncia nem conteúdo gerado por usuário. Todo caso é
  autoria editorial, revisada antes de publicar.
- Não reabre o modelo de tabela relacional rejeitado para doadores — o
  vínculo ministro↔caso continua manual, arquivo por arquivo.

## O que fica para a fase de implementação

1. Schema em `src/content.config.ts`.
2. `src/pages/casos/index.astro` e `src/pages/casos/[slug].astro`.
3. Bloco "Casos relacionados" em `src/pages/ministros/[slug].astro`.
4. Guardrail mecânico em `tests/integridade-casos.test.mjs`.
