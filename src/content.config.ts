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
// data de publicação/atualização depois de "agora" quebra o build em vez de
// publicar silenciosamente uma data que ainda não aconteceu.
const dataYYYYMMDD = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
function naoEhFutura(valor: string): boolean {
  return valor <= new Date().toISOString().slice(0, 10);
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
    data_publicacao: dataYYYYMMDD.refine(naoEhFutura, {
      message: "data_publicacao não pode estar no futuro (achado AUD-12)",
    }),
    data_atualizacao: dataYYYYMMDD
      .refine(naoEhFutura, { message: "data_atualizacao não pode estar no futuro (achado AUD-12)" })
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
