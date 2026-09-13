import { useEffect, useState } from "react";
import { useBuscaDecisoes } from "../hooks/useBuscaDecisoes";
import { fmtData } from "../lib/formato";

interface MinistroOpcao {
  id: string;
  nome: string;
}

interface Props {
  ministros: MinistroOpcao[];
}

export default function BuscaDecisoes({ ministros }: Props) {
  const [processoDigitado, setProcessoDigitado] = useState("");
  const [processo, setProcesso] = useState(""); // debounced — é o que dispara a consulta
  const [ministroId, setMinistroId] = useState("");
  const [limit, setLimit] = useState(30);

  // Debounce de 400ms: é busca exata (ver useBuscaDecisoes.ts), então cada
  // tecla digitada só teria chance de bater no banco quando o processo
  // completo estiver certo — mas ainda assim não faz sentido consultar a
  // cada caractere.
  useEffect(() => {
    const t = setTimeout(() => setProcesso(processoDigitado), 400);
    return () => clearTimeout(t);
  }, [processoDigitado]);

  const { decisoes, loading, buscou, processoNormalizado } = useBuscaDecisoes(processo, ministroId, limit);

  const nomePorMinistro = new Map(ministros.map((m) => [m.id, m.nome]));

  return (
    <div className="flex-1 py-7">
      {/* Filtros */}
      <div className="flex items-end gap-3 mb-5 flex-wrap">
        <div className="flex flex-col gap-1">
          <label htmlFor="busca-processo" className="text-[9px] font-semibold uppercase tracking-[1px] text-subtle">
            Número do processo
          </label>
          <input
            id="busca-processo"
            type="text"
            placeholder="Ex.: HC 276824, ARE 1619494"
            value={processoDigitado}
            onChange={(e) => { setProcessoDigitado(e.target.value); setLimit(30); }}
            className="bg-card border border-border rounded-sm px-3 py-[7px] text-[12px] text-ink placeholder:text-subtle outline-none focus:border-white/20 w-64 font-mono"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="busca-ministro" className="text-[9px] font-semibold uppercase tracking-[1px] text-subtle">
            Ministro
          </label>
          <select
            id="busca-ministro"
            value={ministroId}
            onChange={(e) => { setMinistroId(e.target.value); setLimit(30); }}
            className="bg-card border border-border rounded-sm px-3 py-[7px] text-[12px] text-ink outline-none focus:border-white/20 w-56"
          >
            <option value="">Todos os ministros</option>
            {ministros.map((m) => (
              <option key={m.id} value={m.id}>{m.nome}</option>
            ))}
          </select>
        </div>

        {loading && (
          <span className="text-[10px] text-subtle animate-pulse pb-2">buscando…</span>
        )}
      </div>

      {/* Estado inicial: nada buscado ainda */}
      {!buscou && (
        <div className="border border-border rounded-sm px-4 py-10 text-center text-[12px] text-subtle">
          Digite o número <strong className="text-muted font-semibold">completo</strong> de um
          processo (ex.: <span className="font-mono text-muted">HC 276824</span>) ou
          escolha um ministro para ver as decisões.
        </div>
      )}

      {/* Resultados — overflow-x-auto no container externo porque as 4
          colunas (130+90+100px fixas + assunto) não cabem numa tela de
          celular; sem isso a grade estourava a viewport sem barra de
          rolagem nenhuma (achado ao testar em 375px). */}
      {buscou && (
        <div className="border border-border rounded-sm overflow-x-auto">
          <div style={{ minWidth: 560 }}>
            <div
              className="grid text-[9px] font-bold uppercase tracking-[1px] text-subtle bg-card border-b border-border px-4 py-[8px]"
              style={{ gridTemplateColumns: "130px 1fr 90px 100px" }}
            >
              <span>Processo</span>
              <span>Assunto</span>
              <span>Origem</span>
              <span>Andamento</span>
            </div>

            {decisoes.length === 0 && !loading && (
              <div className="px-4 py-8 text-[11px] text-subtle text-center">
                {processoNormalizado
                  ? <>Nenhuma decisão encontrada para "<span className="font-mono">{processoNormalizado}</span>".</>
                  : "Nenhuma decisão encontrada."}
              </div>
            )}

            {decisoes.map((d) => (
              <div
                key={d.id}
                className="grid border-b border-border last:border-0 px-4 py-[10px] items-start gap-2 hover:bg-white/[0.02] transition-colors"
                style={{ gridTemplateColumns: "130px 1fr 90px 100px" }}
              >
                <div>
                  <div className="font-mono text-[12px] text-ink">{d.processo}</div>
                  <div className="text-[9px] text-subtle mt-[2px]">{fmtData(d.data_decisao)}</div>
                  {d.ministro_id && nomePorMinistro.get(d.ministro_id) && (
                    <div className="text-[9px] text-subtle mt-[1px]">{nomePorMinistro.get(d.ministro_id)}</div>
                  )}
                </div>
                <div className="text-[11px] text-muted leading-[1.4] line-clamp-2">
                  {d.assunto ?? <span className="opacity-30">—</span>}
                </div>
                <div className="text-[10px] text-subtle">
                  {d.tipo_origem === "MONOCRÁTICA" ? "Monocrática" : "Colegiada"}
                </div>
                <div className="text-[11px] text-muted">{d.andamento_bruto}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Carregar mais */}
      {buscou && decisoes.length >= limit && (
        <button
          onClick={() => setLimit((l) => l + 30)}
          className="mt-4 w-full py-2 text-[10px] font-semibold uppercase tracking-[1px] text-subtle border border-border rounded-sm hover:bg-card transition-colors"
        >
          Carregar mais 30
        </button>
      )}

      <p className="text-[10px] text-subtle mt-6 max-w-2xl leading-[1.6]">
        Busca pelo número exato do processo (classe + número, ex.: "HC 276824") e, opcionalmente,
        por ministro — ainda não há busca por número incompleto nem por palavra-chave no assunto,
        porque essas buscas não têm índice no banco e ficariam lentas demais. Ver{" "}
        <a href="/metodologia" className="underline hover:text-ink">Metodologia</a>.
      </p>
    </div>
  );
}
