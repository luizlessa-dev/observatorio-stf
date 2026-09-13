/**
 * Collection "casos" — apurações editoriais sobre controvérsias envolvendo
 * ministros do STF. Markdown versionado em git, não tabela Supabase: o
 * vínculo com cada ministro é um array de slugs digitado à mão no
 * frontmatter, revisável em PR — nunca uma junção automática por chave.
 * Ver docs/decisao-doadores-indicantes.md e docs/politica-editorial-casos.md.
 */
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// AUD-12: um caso chegou a produção com data_atualizacao no futuro
// (2026-09-16 num build feito em 2026-09-13) — nada barrava isso no schema.
// `.refine` roda no build, com a data real da máquina que builda; qualquer
// data de publicação/atualização depois de "hoje" quebra o build em vez de
// publicar silenciosamente uma data que ainda não aconteceu.
//
// Fuso: a redação é em horário do Brasil (America/Sao_Paulo, UTC-3, sem
// horário de verão desde 2019), não UTC. `new Date().toISOString()` usa UTC,
// que fica até 3h à frente do relógio de quem escreve — perto da meia-noite
// de Brasília isso pode aceitar como "não futura" uma data que ainda É
// amanhã em Brasília (UTC já virou o dia, o editor não). Calcular "hoje"
// explicitamente no fuso de redação evita essa folga e casa com quem
// realmente publica.
//
// Isto não abre uma exceção para conteúdo agendado — a política editorial
// (docs/politica-editorial-casos.md) não prevê publicação futura hoje. Se
// isso mudar, o lugar certo é uma flag explícita tipo `agendado: true` nesta
// mesma validação, não afrouxar esta regra.
const FUSO_EDITORIAL = "America/Sao_Paulo";
const dataYYYYMMDD = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
function hojeNoFusoEditorial(): string {
  // en-CA formata como YYYY-MM-DD nativamente — evita parsear/reordenar string.
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO_EDITORIAL }).format(new Date());
}
function naoEhFutura(valor: string): boolean {
  return valor <= hojeNoFusoEditorial();
}

const casos = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/casos" }),
  schema: z.object({
    titulo: z.string(),
    resumo: z.string().max(300),
    // Slugs de slugMinistro() (src/lib/slug.ts), curados à mão — nunca
    // inferidos por adjacência de chave.
    ministros: z.array(z.string()).min(1),
    // em_apuracao: default, sem linguagem de culpa.
    // confirmado: exige evento concreto nomeado no texto (decisão judicial,
    //   confissão, conclusão oficial de investigação).
    // arquivado: com nota do motivo do arquivamento.
    status: z.enum(["em_apuracao", "confirmado", "arquivado"]),
    // superRefine (não refine) porque só ele dá acesso ao valor recebido pra
    // interpolar na mensagem — Astro já contextualiza arquivo e campo no erro
    // de build (confirmado em 2026-09-13 com um caso de teste descartável);
    // faltava só o valor e a data de referência usada na comparação.
    data_publicacao: dataYYYYMMDD.superRefine((valor, ctx) => {
      if (naoEhFutura(valor)) return;
      ctx.addIssue({
        code: "custom",
        message: `data_publicacao "${valor}" está no futuro — hoje em ${FUSO_EDITORIAL} é ${hojeNoFusoEditorial()} (achado AUD-12)`,
      });
    }),
    data_atualizacao: dataYYYYMMDD
      .superRefine((valor, ctx) => {
        if (naoEhFutura(valor)) return;
        ctx.addIssue({
          code: "custom",
          message: `data_atualizacao "${valor}" está no futuro — hoje em ${FUSO_EDITORIAL} é ${hojeNoFusoEditorial()} (achado AUD-12)`,
        });
      })
      .optional(),
    fontes: z
      .array(
        z.object({
          label: z.string(),
          url: z.string().url(),
        })
      )
      .min(1),
  }),
});

export const collections = { casos };
