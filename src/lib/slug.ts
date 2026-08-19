// Slug do ministro para a URL. Estável: deriva do nome, que é a chave usada
// pela ingestão para resolver o relator. Se o nome mudar no banco, a URL muda —
// por isso o nome em stf_ministros é grafado como a fonte o escreve e não é
// editado por conveniência de exibição (para isso existe iniciais_exibicao).
export function slugMinistro(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
