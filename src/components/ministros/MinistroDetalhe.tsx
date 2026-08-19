import type { Ministro } from "../../lib/seed";
import Termometro from "../termometro/Termometro";
import { useDecisoes } from "../../hooks/useDecisoes";
import { useGastos } from "../../hooks/useGastos";
import {
  usePresidencias,
  cargoAtual,
  presidiaNoMes,
  ROTULO_CARGO,
} from "../../hooks/usePresidencias";

interface Props { ministro: Ministro; }

const MESES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

function fmtData(iso: string): string {
  const [, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia} ${MESES[parseInt(mes, 10) - 1]}`;
}

function fmtDataCompleta(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia} ${MESES[parseInt(mes, 10) - 1]} ${ano}`;
}

function fmtMes(mes: number, ano: number) {
  return `${MESES[mes - 1]}/${ano}`;
}

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

// Onda 1 (2026-08-17): toda tela que serve dado datado precisa dizer até
// quando o dado vai. O bloco de decisões se chamava "Últimas decisões
// monocráticas" e mostrava janeiro de 2025 sem ano na data — o leitor
// concluía que era deste ano. Ver docs/auditoria-onda-1.md.
function Carimbo({ ate }: { ate: string | null }) {
  if (!ate) return null;
  return (
    <span className="text-[8.5px] text-subtle whitespace-nowrap normal-case tracking-normal font-normal">
      dados até {ate}
    </span>
  );
}

export default function MinistroDetalhe({ ministro: m }: Props) {
  const { decisoes, total: totalDecisoes, comoPresidente, loading: loadingDecisoes } =
    useDecisoes(m.id);
  const { gastos, loading: loadingGastos } = useGastos(m.id);

  const { presidencias } = usePresidencias();

  const subsidio = gastos.find((g) => g.categoria === "subsidio_ministro");
  const gabinete = gastos.find((g) => g.categoria === "custo_gabinete");
  const gastoRef = subsidio ?? gabinete;

  const cargo = cargoAtual(presidencias, m.id);
  // Achado A6: o gabinete do presidente aparece com uma fração dos servidores
  // dos demais porque a estrutura de apoio da Presidência não corre por ele.
  // Sem esta nota, o número convida à leitura de que o gabinete "custa menos".
  const presidiaNoMesDoGasto =
    !!gastoRef && presidiaNoMes(presidencias, m.id, gastoRef.ano, gastoRef.mes);

  return (
    <div className="flex-1 overflow-y-auto px-8 py-7">
      {/* Breadcrumb */}
      <div className="text-[11px] text-subtle mb-[22px] flex items-center gap-[6px]">
        <span>Ministros</span>
        <span className="text-border2">›</span>
        <span className="text-ink font-medium">{m.nome}</span>
      </div>

      {/* Cabeçalho */}
      <div className="flex items-start gap-5 pb-6 border-b border-border mb-[22px]">
        <div className="w-[68px] h-[68px] rounded-full bg-surface border border-border2 flex items-center justify-center font-display text-[22px] font-bold text-muted flex-shrink-0">
          {m.iniciais_exibicao}
        </div>
        <div>
          <div className="font-display text-[26px] font-bold text-white leading-[1.2] mb-1">
            {m.nome}
          </div>
          <div className="text-[12px] text-subtle mb-[10px]">
            Ministro desde {m.data_posse} · Aposentadoria compulsória {m.aposentadoria}
          </div>
          <div className="flex gap-[5px] flex-wrap">
            {cargo && (
              <span className="text-[10px] font-semibold px-[9px] py-[3px] rounded-sm border border-white bg-white text-canvas">
                {ROTULO_CARGO[cargo]}
              </span>
            )}
            <span className="text-[10px] font-medium px-[9px] py-[3px] rounded-sm border border-white/40 text-white">
              Indicado por {m.indicado_por}
            </span>
            <span className="text-[10px] font-medium px-[9px] py-[3px] rounded-sm border border-border2 text-muted">
              {m.partido_indicante}
            </span>
          </div>
        </div>
      </div>

      {/* Bloco indicação */}
      <div className="grid grid-cols-4 border border-border rounded-sm overflow-hidden mb-6">
        {[
          { label: "Indicado por",  val: m.indicado_por,      sub: m.partido_indicante },
          { label: "Cargo anterior", val: m.cargo_anterior,   sub: `Governo ${m.indicado_por_curto}` },
          { label: "Posse",         val: m.data_posse,        sub: "Data de posse no STF" },
          { label: "Aposentadoria", val: m.aposentadoria || "—", sub: "Compulsória aos 75 anos" },
        ].map((c, i) => (
          <div key={i} className={`px-4 py-[13px] ${i < 3 ? "border-r border-border" : ""}`}>
            <div className="text-[9px] font-semibold uppercase tracking-[1px] text-subtle mb-1">{c.label}</div>
            <div className="text-[13px] font-semibold text-ink leading-snug">{c.val}</div>
            <div className="text-[10px] text-subtle mt-[2px]">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Análise de padrões decisórios — suspensa na Fase C0; rótulo do
          produto ("Termômetro") retirado na Fase C1 para não anunciar
          funcionalidade indisponível. Ver docs/auditoria-integridade-dados.md. */}
      <div className="mb-6">
        <div className="flex items-center gap-[10px] mb-[14px]">
          <div className="w-5 h-px bg-subtle" />
          <span className="text-[9px] font-semibold uppercase tracking-[1.5px] text-subtle">
            Análise de padrões decisórios
          </span>
        </div>
        <Termometro />
      </div>

      {/* Gastos */}
      {(loadingGastos || gastos.length > 0) && (
        <div className="border border-border rounded-sm overflow-hidden mb-6">
          <div className="px-4 py-[9px] bg-card border-b border-border flex items-center justify-between gap-3">
            <span className="text-[9px] font-bold uppercase tracking-[1.5px] text-subtle">
              Custo ao erário
            </span>
            {loadingGastos
              ? <span className="text-[8px] text-subtle animate-pulse">carregando…</span>
              : <Carimbo ate={gastoRef ? fmtMes(gastoRef.mes, gastoRef.ano) : null} />}
          </div>
          {gastos.length > 0 && (() => {
            const totalMes = (subsidio?.valor ?? 0) + (gabinete?.valor ?? 0);
            return (
              <div className="grid grid-cols-3 divide-x divide-border">
                <div className="px-4 py-[13px]">
                  <div className="text-[9px] font-semibold uppercase tracking-[1px] text-subtle mb-1">Subsídio</div>
                  <div className="text-[15px] font-bold text-ink">{fmtBRL(subsidio?.valor ?? 0)}</div>
                  <div className="text-[9px] text-subtle mt-[2px]">por mês</div>
                </div>
                <div className="px-4 py-[13px]">
                  <div className="text-[9px] font-semibold uppercase tracking-[1px] text-subtle mb-1">Custo do gabinete</div>
                  <div className="text-[15px] font-bold text-ink">{fmtBRL(gabinete?.valor ?? 0)}</div>
                  <div className="text-[9px] text-subtle mt-[2px]">
                    {gabinete ? `${parseInt(gabinete.descricao.match(/\d+/)?.[0] ?? "0")} servidores` : "—"}
                  </div>
                </div>
                <div className="px-4 py-[13px]">
                  <div className="text-[9px] font-semibold uppercase tracking-[1px] text-subtle mb-1">Total mensal</div>
                  <div className="text-[15px] font-bold text-white">{fmtBRL(totalMes)}</div>
                  <div className="text-[9px] text-subtle mt-[2px]">
                    ref. {gastoRef ? fmtMes(gastoRef.mes, gastoRef.ano) : "—"}
                  </div>
                </div>
              </div>
            );
          })()}

          {presidiaNoMesDoGasto && (
            <div className="px-4 py-[10px] border-t border-border bg-card/50">
              <p className="text-[10px] text-muted leading-[1.55]">
                <strong className="font-semibold text-ink">
                  Não comparável ao dos demais gabinetes.
                </strong>{" "}
                {m.nome} presidia o STF na competência acima, e a
                estrutura de apoio da Presidência não integra o gabinete do
                ministro — parte da equipe que apareceria aqui está lotada na
                Presidência.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Decisões — ocupa largura total */}
      <div className="border border-border rounded-sm overflow-hidden">
        <div className="px-4 py-[9px] bg-card border-b border-border flex items-center justify-between gap-3">
          <span className="text-[9px] font-bold uppercase tracking-[1.5px] text-subtle">
            Decisões monocráticas como relator
            {totalDecisoes > 0 && (
              <span className="ml-2 font-normal normal-case tracking-normal text-subtle">
                {totalDecisoes.toLocaleString("pt-BR")} no total
              </span>
            )}
          </span>
          {loadingDecisoes
            ? <span className="text-[8px] text-subtle animate-pulse">carregando…</span>
            : <Carimbo ate={decisoes[0] ? fmtDataCompleta(decisoes[0].data_decisao) : null} />}
        </div>

        {/* Achado D1: decisões assinadas na condição de presidente do STF NÃO
            entram na lista nem na contagem acima. Em 2026, Fachin tem 35 como
            relator e 28.115 como presidente — somar faria a ficha dele exibir
            quase 7x o volume de Moraes, quando ele é justamente quem tem menos
            decisões próprias, porque presidir redistribui a pauta. */}
        {comoPresidente > 0 && (
          <div className="px-4 py-[10px] border-b border-border bg-card/50">
            <p className="text-[10px] text-muted leading-[1.55]">
              <strong className="font-semibold text-ink">
                Fora desta lista:
              </strong>{" "}
              {comoPresidente.toLocaleString("pt-BR")} decisões assinadas na
              condição de presidente do STF — plantão e competência da
              Presidência, não a pauta do ministro como relator.
            </p>
          </div>
        )}

        {!loadingDecisoes && decisoes.length === 0 && (
          <div className="px-4 py-5 text-[11px] text-subtle text-center">
            Sem decisões monocráticas registradas como relator
          </div>
        )}

        {decisoes.map((d) => (
          <div
            key={d.id}
            className="grid border-b border-border last:border-0 px-4 py-[9px] items-start gap-2"
            style={{ gridTemplateColumns: "64px 1fr 150px" }}
          >
            <div className="font-mono text-[9px] text-subtle pt-[1px]">
              {fmtData(d.data_decisao)}
            </div>
            <div>
              <div className="text-[11px] text-muted leading-[1.35] line-clamp-2">
                {d.assunto ?? "—"}
              </div>
              <div className="font-mono text-[8.5px] text-subtle mt-[2px]">
                {d.processo}
                {d.tipo_decisao && <span className="ml-2 opacity-60">{d.tipo_decisao}</span>}
              </div>
            </div>
            {/* O andamento sai COMO O STF ESCREVEU. Não há tradução para
                favorável/contrário: "Negado seguimento" é recusa de
                admissibilidade, não julgamento de mérito, e foi essa tradução
                que produziu os 64% de "Ausente" na tabela antiga. */}
            <div className="text-[9px] text-subtle leading-[1.3] text-right">
              {d.andamento_bruto}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
