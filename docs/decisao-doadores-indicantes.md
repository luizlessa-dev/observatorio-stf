# Nota de decisão — eixo "doadores dos presidentes indicantes"

Fase C1, 2026-07-26. Decisão **proposta, não implementada** — nenhuma
remoção, restauração ou publicação foi executada nesta fase.

## Estado confirmado

| Artefato | Estado |
|---|---|
| Tabela `stf_doadores_indicante` em produção | **Não existe** (confirmado por inspeção read-only em 2026-07-26) |
| `supabase/migrations/0001_schema_inicial.sql` | Declara a tabela + 2 índices (linhas 88–103) |
| `src/types/database.ts` | Declara o tipo da tabela (bloco anotado na C1 como pendente de decisão) |
| `ingestao/tse/fetch_doadores_indicante.py` | Deletado no working tree (anterior à C0; deleção preservada) |
| UI / consultas do frontend | Nenhuma referência |
| Dados em produção | Nenhum (a tabela nunca chegou a existir lá) |

## Análise

- **Finalidade legítima:** rastrear financiamento eleitoral de quem indica
  ministros tem interesse público em tese, mas o desenho atual liga
  doadores → presidente → ministro por mera adjacência de chaves
  (`ministro_id` na tabela de doadores), sem nenhum evento que conecte o
  doador ao ministro.
- **Risco de inferência indevida:** alto. O modelo convida à leitura
  "empresa X financiou o ministro Y", que os dados não sustentam. Para
  pessoas físicas nomeadas (doador_cpf/doador_nome), há também exposição
  de terceiros sem papel na história.
- **Qualidade causal:** nula no desenho atual — doação ao candidato a
  presidente não tem relação causal demonstrável com a atuação do ministro
  indicado anos depois.
- **Valor jornalístico:** existiria apenas em apurações caso a caso, com
  contexto e contraditório — não como painel estrutural permanente.
- **Segurança jurídica:** associação reputacional automatizada entre
  doadores lícitos e ministros é exatamente o perfil de risco que gerou a
  contenção das Fases A/C0. LGPD agrava para doadores pessoa física.
- **Custo de manutenção:** pipeline TSE próprio para uma feature sem UI.
- **Estado do código:** incompleto e órfão — script deletado, tabela
  inexistente, tipo sem consumidor.

## Recomendação

**Remoção definitiva do modelo** (migration futura removendo a declaração
da tabela do schema versionado — via nova baseline ou migration editada em
fase própria — e limpeza do tipo em `database.ts`), com **arquivamento
histórico** do racional nesta nota e no git (o script deletado permanece
recuperável no histórico de commits).

Se um dia o tema voltar, deve voltar como **apuração editorial caso a
caso** (matéria com documentos, contexto e contraditório), nunca como
tabela relacional publicada ligando doadores a ministros.

## O que fica para a fase de implementação

1. Remover o bloco `stf_doadores_indicante` de `src/types/database.ts`.
2. Tratar a declaração na 0001 (nova baseline de schema ou migration de
   limpeza) — sem `DROP` em produção, onde a tabela não existe.
3. Registrar a decisão final no changelog editorial.
