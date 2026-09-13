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

/**
 * @param {() => PromiseLike<import('./consultaCancelavel').ResultadoConsulta>} consultar
 * @param {import('./consultaCancelavel').DepsConsultaCancelavel} deps
 * @returns {() => void} função de cancelamento — chamar no cleanup do efeito
 */
export function executarConsultaCancelavel(consultar, deps) {
  let cancelado = false;
  deps.setLoading(true);
  deps.setErro(null);

  Promise.resolve(consultar()).then(
    ({ data, count, error }) => {
      if (cancelado) return;
      if (error) {
        // Erro de consulta é estado próprio — nunca vira lista vazia.
        deps.setErro(error.message);
        deps.setTemas([]);
        deps.setTotal(0);
      } else {
        // Vazio de verdade (sem `error`) também é estado próprio — nunca
        // vira mensagem de erro.
        deps.setTemas(data ?? []);
        deps.setTotal(count ?? 0);
      }
      deps.setLoading(false);
    },
    (motivo) => {
      // Rede fora do ar, DNS, CORS bloqueado etc. chegam como rejeição da
      // Promise, não como `{ error }` no corpo da resposta — supabase-js só
      // garante o formato `{ data, error }` quando o fetch em si completa.
      // Sem este ramo, uma queda de rede real deixava `loading` preso em
      // true para sempre (nem erro, nem vazio, nem carregando de verdade).
      if (cancelado) return;
      const mensagem = motivo instanceof Error ? motivo.message : "Falha de rede ao carregar os temas.";
      deps.setErro(mensagem);
      deps.setTemas([]);
      deps.setTotal(0);
      deps.setLoading(false);
    },
  );

  return () => { cancelado = true; };
}
