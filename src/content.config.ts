/**
 * Collection "casos" — apurações editoriais sobre controvérsias envolvendo
 * ministros do STF. Markdown versionado em git, não tabela Supabase: o
 * vínculo com cada ministro é um array de slugs digitado à mão no
 * frontmatter, revisável em PR — nunca uma junção automática por chave.
 * Ver docs/decisao-doadores-indicantes.md e docs/politica-editorial-casos.md.
 */
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

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
    data_publicacao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    data_atualizacao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
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
