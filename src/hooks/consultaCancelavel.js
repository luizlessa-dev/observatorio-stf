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

function mensagemTecnica(motivo) {
  if (motivo && typeof motivo.message === "string") return motivo.message;
  return String(motivo);
}

function aplicarErro(motivo, deps) {
  // Log técnico para depuração; nunca chega à UI/aria-live (revisão AUD-01, item 3.3).
  console.error("[repercussao-geral] falha ao consultar stf_repercussao_geral:", mensagemTecnica(motivo));
  deps.setErro(MENSAGEM_PUBLICA_ERRO);
  deps.setTemas([]);
  deps.setTotal(0);
  deps.setLoading(false);
}

/**
 * @param {() => PromiseLike<import('./consultaCancelavel').ResultadoConsulta>} consultar
 * @param {import('./consultaCancelavel').DepsConsultaCancelavel} deps
 * @returns {() => void} função de cancelamento — chamar no cleanup do efeito
 */
export function executarConsultaCancelavel(consultar, deps) {
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
    aplicarErro(motivo, deps);
    return () => { cancelado = true; };
  }

  Promise.resolve(resultado).then(
    ({ data, count, error }) => {
      if (cancelado) return;
      if (error) {
        // Erro de consulta é estado próprio — nunca vira lista vazia.
        aplicarErro(error, deps);
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
      aplicarErro(motivo, deps);
    },
  );

  return () => { cancelado = true; };
}
