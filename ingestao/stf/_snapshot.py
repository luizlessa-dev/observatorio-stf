"""
AUD-11: registra um snapshot versionado (linhas, hash, timestamp) de cada
execução bem-sucedida de ingestão, na tabela stf_snapshots — pra existir um
histórico público e verificável de quando cada fonte foi atualizada pela
última vez, além do "atualizado até [data]" que as telas já mostram.

Escopo desta rodada: só a infraestrutura (esta função + tabela +
supabase/migrations/0027_stf_snapshots.sql) e a integração real em
fetch_gastos.py, o único conector que bate em egesp-portal.stf.jus.br —
domínio alcançável para testar de verdade neste ambiente. Os outros
conectores batem em transparencia.stf.jus.br, que devolve 403 pra runners
hospedados (ver comentário em .github/workflows/ingestao-decisoes.yml) — não
dá pra validar a integração de ponta a ponta neles sem a máquina certa. O
padrão aqui (chamar registrar_snapshot logo após o upsert bem-sucedido, com
os mesmos registros que acabaram de ser gravados) é o que os outros
conectores devem seguir quando alguém com acesso à rede certa validar.

Uso:
    from _snapshot import registrar_snapshot
    ...
    sb.table("stf_gastos").upsert(lote, on_conflict="...").execute()
    registrar_snapshot(sb, "stf_gastos", lote, fonte=BASE_URL)
"""

import hashlib
import json


def calcular_hash(registros: list[dict]) -> str:
    """Hash determinístico do conteúdo de `registros`.

    Serializa cada registro com chaves ordenadas e ordena a lista de strings
    resultante antes de concatenar — não depende da ordem de iteração do
    dict nem da ordem em que os registros chegaram (upsert em lote não
    garante ordem estável entre execuções). Dois snapshots com o mesmo
    conteúdo, em ordem diferente, produzem o mesmo hash; conteúdo diferente
    (um valor mudou, uma linha foi adicionada/removida) sempre produz hash
    diferente.
    """
    linhas_serializadas = sorted(
        json.dumps(r, sort_keys=True, default=str, ensure_ascii=False) for r in registros
    )
    bruto = "\n".join(linhas_serializadas).encode("utf-8")
    return hashlib.sha256(bruto).hexdigest()


def registrar_snapshot(sb, tabela: str, registros: list[dict], fonte: str, metadata: dict | None = None) -> None:
    """Insere uma linha em stf_snapshots.

    Nunca lança: snapshot é telemetria sobre uma ingestão que já teve
    sucesso — uma falha aqui (rede, RLS, coluna renomeada) não pode
    derrubar um pipeline que já gravou os dados reais corretamente. Só
    avisa no stdout, pro operador ver no log da Action sem o job falhar.
    """
    try:
        sb.table("stf_snapshots").insert({
            "tabela": tabela,
            "linhas": len(registros),
            "hash": calcular_hash(registros),
            "fonte": fonte,
            "metadata": metadata or {},
        }).execute()
    except Exception as e:
        print(f"aviso: falha ao registrar snapshot de {tabela} em stf_snapshots: {e}")
