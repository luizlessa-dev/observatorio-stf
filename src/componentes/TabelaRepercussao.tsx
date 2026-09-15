import { useEffect, useState } from "react";
import { useRepercussaoGeral } from "../hooks/useRepercussaoGeral";
import { buscaEstaAplicada, descreverContagem, deveMostrarCarregarMais } from "../lib/contagemRepercussao";

const MESES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
function fmtData(iso: string | null): string {
  if (!iso) return "—";
  const [, mes, dia] = iso.split("-");
  return `${dia} ${MESES[parseInt(mes,10)-1]}`;
}

function fmtAno(iso: string | null): string {
  if (!iso) return "—";
  return iso.split("-")[0];
}

const STATUS_LABEL: Record<string, string> = {
  pendente:  "Pendente",
  julgado:   "Julgado",
  sobrestado:"Sobrestado",
};
const STATUS_CLS: Record<string, string> = {
  pendente:  "border-amber-800/60 text-amber-400",
  julgado:   "border-[#3a5a3a] text-[#8ab88a]",
  sobrestado:"border-border2 text-subtle",
};

const STATUS_TITULO_COL: Record<string, string> = {
  todos: "todos os temas",
  pendente: "temas pendentes",
  julgado: "temas julgados",
  sobrestado: "temas sobrestados",
};

export default function TabelaRepercussao() {
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(50);

  // AUD-13: deep-link de /buscar (?busca=...) — lido só depois de montar,
  // em useEffect, pra não divergir do HTML gerado no build (que nunca
  // conhece window.location.search) e causar mismatch de hidratação.
  useEffect(() => {
    const buscaDaUrl = new URLSearchParams(window.location.search).get("busca");
    if (buscaDaUrl) setSearch(buscaDaUrl);
  }, []);

  // Cabeçalho (H1 + contagem real) já vem do wrapper estático em
  // src/pages/repercussao-geral.astro, computado no build — não duplicar
  // aqui. Duplicar produzia dois H1 na página e um "0 temas" piscando antes
  // da hidratação, porque o total desta ilha só chega depois do fetch
  // client-side (achado da auditoria de SEO, item 8).
  const { temas, total, loading, erro, tentarNovamente } = useRepercussaoGeral(filtroStatus, search, limit);
  const buscaAplicada = buscaEstaAplicada(search);

  const statusRegiao = loading
    ? "Carregando temas…"
    : erro
      ? erro
      : descreverContagem(temas.length, total, filtroStatus, buscaAplicada);

  return (
    <div className="flex-1 overflow-y-auto px-8 py-7">
      {/* Filtros */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        {/* AUD-02: overflow-hidden cortava "Sobrestado" sem forma de alcançá-lo
            em telas ≤390px — nem toque nem teclado chegavam ao botão. Rolagem
            horizontal deliberada substitui o corte silencioso. */}
        <div
          role="group"
          aria-label="Filtrar por status"
          className="flex items-center gap-[2px] bg-card border border-border rounded-sm overflow-x-auto max-w-full"
        >
          {(["todos","pendente","julgado","sobrestado"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFiltroStatus(s)}
              aria-pressed={filtroStatus === s}
              className={`px-3 py-[5px] text-[11px] font-semibold uppercase tracking-[0.8px] whitespace-nowrap flex-shrink-0 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white/70 ${
                filtroStatus === s
                  ? "bg-white/10 text-ink"
                  : "text-subtle hover:text-muted"
              }`}
            >
              {s === "todos" ? "Todos" : STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Revisão de 2026-09-13, item 3.1: rótulo visível (não mais
              sr-only) — o placeholder sozinho não é um rótulo persistente e
              some assim que o usuário digita. */}
          <label htmlFor="busca-repercussao" className="text-[11px] text-subtle whitespace-nowrap">
            Buscar título
          </label>
          <input
            id="busca-repercussao"
            type="text"
            placeholder="Ex.: prisão em segunda instância"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-card border border-border rounded-sm px-3 py-[5px] text-[12px] text-ink placeholder:text-subtle outline-none focus-visible:border-white/40 focus-visible:ring-2 focus-visible:ring-white/30 w-56"
          />
        </div>
      </div>

      {/* Região de status: única fonte de verdade sobre loading/erro/contagem,
          anunciada a leitor de tela via aria-live (achado AUD-06). */}
      <p role="status" aria-live="polite" className="text-[11px] text-subtle mb-3">
        {statusRegiao}
      </p>

      {/* Tabela semântica (achado AUD-03: divs com grid não expunham relação
          célula↔cabeçalho a tecnologia assistiva). */}
      <div className="border border-border rounded-sm overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">
            Temas de repercussão geral do STF, {STATUS_TITULO_COL[filtroStatus] ?? "todos"}
            {buscaAplicada ? `, filtrados por "${search}"` : ""}
          </caption>
          <thead>
            <tr className="text-[11px] font-bold uppercase tracking-[1px] text-subtle bg-card border-b border-border">
              <th scope="col" className="px-4 py-[8px] font-bold w-[56px]">Tema</th>
              <th scope="col" className="px-4 py-[8px] font-bold">Título</th>
              <th scope="col" className="px-4 py-[8px] font-bold w-[110px]">Leading Case</th>
              <th scope="col" className="px-4 py-[8px] font-bold w-[90px]">Reconh.</th>
              <th scope="col" className="px-4 py-[8px] font-bold w-[70px]">Status</th>
              <th scope="col" className="px-4 py-[8px] font-bold w-[70px] text-right">Processos</th>
            </tr>
          </thead>
          <tbody>
            {erro && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center">
                  {/* Mesma mensagem pública do statusRegiao acima — nunca o
                      detalhe técnico de error.message (achado da revisão,
                      item 3.3). */}
                  <p className="text-[12px] text-red-400 mb-2">{erro}</p>
                  <button
                    type="button"
                    onClick={tentarNovamente}
                    className="text-[11px] font-semibold uppercase tracking-[1px] text-ink border border-border2 rounded-sm px-3 py-[6px] hover:bg-card transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/70"
                  >
                    Tentar novamente
                  </button>
                </td>
              </tr>
            )}

            {!erro && temas.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-[12px] text-subtle text-center">
                  {descreverContagem(0, total, filtroStatus, buscaAplicada)}
                </td>
              </tr>
            )}

            {!erro && temas.map((t) => (
              <tr
                key={t.id}
                className={`border-b border-border last:border-0 hover:bg-white/[0.02] transition-colors ${
                  t.destaque ? "border-l-2 border-l-white/20" : ""
                }`}
              >
                <td className="px-4 py-[10px] align-top font-mono text-[11px] text-subtle">
                  {String(t.tema).padStart(4, "0")}
                  {t.destaque && <span className="ml-1 text-[11px] text-white/40" aria-label="tema em destaque">★</span>}
                </td>
                <td className="px-4 py-[10px] align-top">
                  <div className="text-[11px] text-muted leading-[1.4] mb-[2px] line-clamp-2">
                    {t.titulo}
                  </div>
                  {t.tese && (
                    <div className="text-[11px] text-subtle leading-[1.4] line-clamp-2 mt-[2px]">
                      {t.tese}
                    </div>
                  )}
                </td>
                <td className="px-4 py-[10px] align-top font-mono text-[11px] text-subtle">{t.leading_case ?? "—"}</td>
                <td className="px-4 py-[10px] align-top text-[11px] text-subtle">
                  {fmtData(t.data_reconh)} {fmtAno(t.data_reconh)}
                </td>
                <td className="px-4 py-[10px] align-top">
                  <span className={`text-[11px] font-semibold px-[7px] py-[2px] rounded-sm border whitespace-nowrap ${
                    STATUS_CLS[t.status] ?? "border-border2 text-subtle"
                  }`}>
                    {STATUS_LABEL[t.status] ?? t.status}
                  </span>
                </td>
                <td className="px-4 py-[10px] align-top text-[11px] text-subtle text-right">
                  {t.processos_imp != null
                    ? t.processos_imp.toLocaleString("pt-BR")
                    : <span className="opacity-30">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Carregar mais — só quando de fato há mais itens além dos já
          carregados (temas.length < total), não apenas "carregou uma página
          cheia" (temas.length >= limit podia mostrar o botão mesmo quando
          limit === total, sem mais nada a carregar). */}
      {deveMostrarCarregarMais({ erro, loading, carregados: temas.length, total }) && (
        <button
          type="button"
          onClick={() => setLimit((l) => l + 50)}
          className="mt-4 w-full py-2 text-[11px] font-semibold uppercase tracking-[1px] text-subtle border border-border rounded-sm hover:bg-card transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/70"
        >
          Carregar mais 50
        </button>
      )}
    </div>
  );
}
