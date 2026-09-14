// Achado AUD-01: o bug original era `data: null` (de um erro de RLS, rede ou
// coluna renomeada) virando silenciosamente "Nenhum tema encontrado" — sem
// jeito de distinguir uma falha de consulta de uma tabela vazia de verdade.
//
// Em JS puro (não .ts) de propósito: o resto do projeto testa comportamento
// só por inspeção de texto do fonte (node --test sem jsdom/testing-library).
// Extrair esta função pra fora do hook React permite testar o comportamento
// de verdade — sucesso, vazio, erro, rede fora do ar, corrida entre consultas
// — sem precisar adicionar DOM nem framework de teste de React ao projeto.
// Ver src/hooks/consultaCancelavel.d.ts para os tipos e
// src/hooks/useRepercussaoGeral.ts para quem consome isto dentro de um
// useEffect.

// Revisão de 2026-09-13, item 3.3: `erro` é anunciado ao vivo (aria-live) e
// renderizado no DOM por TabelaRepercussao — expor `error.message` bruto do
// Supabase ali vazaria detalhe interno (nome de tabela, RLS, coluna) para
// qualquer visitante e para tecnologia assistiva. A mensagem pública é sempre
// a mesma string genérica; o detalhe técnico só vai para o console, nunca
// para `deps.setErro`.
const MENSAGEM_PUBLICA_ERRO = "Não foi possível carregar os temas agora. Tente novamente em instantes.";

// Revisão seguinte (mesma rodada de auditoria, achado da revisão
// independente): a primeira versão deste arquivo mandava error.message cru
// pro console.error incondicionalmente — o console do navegador é visível a
// qualquer visitante que abra o DevTools, então nome de tabela/RLS/host
// continuavam vazando, só que num canal diferente do DOM. Em produção
// (`import.meta.env.DEV === false`, o caso real do site publicado) o console
// só recebe um código genérico, sem detalhe algum. O detalhe completo só
// aparece com o servidor de desenvolvimento rodando localmente
// (`astro dev`), onde não há visitante nenhum além de quem está
// desenvolvendo. Não há telemetria/observabilidade neste projeto para onde
// mandar o detalhe completo de forma controlada — se isso mudar, é lá que o
// detalhe completo deveria ir, não no console do navegador do visitante.
const CODIGO_ERRO_PUBLICO = "RG-ERR";

function mensagemTecnica(motivo) {
  if (motivo && typeof motivo.message === "string") return motivo.message;
  return String(motivo);
}

function registrarErroTecnico(motivo, dev) {
  if (dev) {
    console.error("[repercussao-geral] falha ao consultar stf_repercussao_geral:", mensagemTecnica(motivo));
  } else {
    console.error(`[repercussao-geral] falha ao consultar dados (código ${CODIGO_ERRO_PUBLICO})`);
  }
}

function aplicarErro(motivo, deps, dev) {
  registrarErroTecnico(motivo, dev);
  deps.setErro(MENSAGEM_PUBLICA_ERRO);
  deps.setTemas([]);
  deps.setTotal(0);
  deps.setLoading(false);
}

/**
 * @param {() => PromiseLike<import('./consultaCancelavel').ResultadoConsulta>} consultar
 * @param {import('./consultaCancelavel').DepsConsultaCancelavel} deps
 * @param {{ dev?: boolean }} [opcoes] `dev` força o modo de log (para
 *   testes); por padrão segue `import.meta.env.DEV` do bundler. Em
 *   `node --test` (sem Vite) `import.meta.env` é `undefined`, então o
 *   padrão cai em produção (log sanitizado) — o mesmo caminho que o site
 *   publicado usa de verdade.
 * @returns {() => void} função de cancelamento — chamar no cleanup do efeito
 */
export function executarConsultaCancelavel(consultar, deps, opcoes = {}) {
  const dev = opcoes.dev ?? Boolean(import.meta.env?.DEV);
  let cancelado = false;
  deps.setLoading(true);
  deps.setErro(null);

  let resultado;
  try {
    resultado = consultar();
  } catch (motivo) {
    // `consultar` pode lançar de forma síncrona (ex.: erro ao montar a query
    // antes de qualquer chamada de rede) — sem este try/catch, isso escapava
    // de executarConsultaCancelavel direto para dentro do useEffect do
    // chamador, sem nunca setar erro/loading.
    aplicarErro(motivo, deps, dev);
    return () => { cancelado = true; };
  }

  Promise.resolve(resultado).then(
    ({ data, count, error }) => {
      if (cancelado) return;
      if (error) {
        // Erro de consulta é estado próprio — nunca vira lista vazia.
        aplicarErro(error, deps, dev);
      } else {
        // Vazio de verdade (sem `error`) também é estado próprio — nunca
        // vira mensagem de erro.
        deps.setTemas(data ?? []);
        deps.setTotal(count ?? 0);
        deps.setLoading(false);
      }
    },
    (motivo) => {
      // Rede fora do ar, DNS, CORS bloqueado etc. chegam como rejeição da
      // Promise, não como `{ error }` no corpo da resposta — supabase-js só
      // garante o formato `{ data, error }` quando o fetch em si completa.
      // Sem este ramo, uma queda de rede real deixava `loading` preso em
      // true para sempre (nem erro, nem vazio, nem carregando de verdade).
      if (cancelado) return;
      aplicarErro(motivo, deps, dev);
    },
  );

  return () => { cancelado = true; };
}
