import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getCollection } from "astro:content";

export async function GET(context: APIContext) {
  const casos = await getCollection("casos");
  const ordenados = [...casos].sort((a, b) =>
    b.data.data_publicacao.localeCompare(a.data.data_publicacao)
  );

  return rss({
    title: "Observatório do STF — Casos",
    description: "Apurações editoriais sobre controvérsias envolvendo ministros do STF.",
    site: context.site!,
    items: ordenados.map((c) => ({
      title: c.data.titulo,
      description: c.data.resumo,
      link: `/casos/${c.id}/`,
      // pubDate reflete a publicação, não a última atualização — uma
      // correção não deve fazer um caso já lido reaparecer como novo.
      pubDate: new Date(c.data.data_publicacao),
      customData: [
        `<status>${c.data.status}</status>`,
        c.data.data_atualizacao ? `<atualizadoEm>${c.data.data_atualizacao}</atualizadoEm>` : "",
        ...c.data.ministros.map((slug) => `<ministro>${slug}</ministro>`),
      ].join(""),
    })),
    customData: `<language>pt-br</language>`,
  });
}
