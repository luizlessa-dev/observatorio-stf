"""
Ingestão: Decisões do STF — Corte Aberta (Qlik Sense, fonte primária)

Fonte:  wss://transparencia.stf.jus.br/app/<APP_ID>  (objeto UbMrYBg, 21 colunas)
Destino: public.stf_decisoes

Substitui fetch_votacoes_bigquery.py, cuja fonte
(basedosdados.br_stf_corte_aberta.decisoes) está estática desde março/2025 e
não tem nada além de 19/01/2025 — a ingestão já capturou 100% do que existe lá.
Ver docs/auditoria-fonte-e-normalizacao-votacoes.md e
docs/proposta-schema-stf-decisoes.md.

PRINCÍPIO: este script NÃO interpreta. Todo campo da fonte é gravado como veio.
O único juízo que ele emite é resolver `ministro_id`, e mesmo isso fica
registrado em `ministro_resolucao` para ser auditável. `sentido` não é
preenchido — foi a pressa em preencher o equivalente disso que produziu os 64%
de "Ausente" em stf_votacoes.

Execução:
  python3 ingestao/stf/fetch_decisoes_qlik.py --ano 2026 [--dry-run]
  python3 ingestao/stf/fetch_decisoes_qlik.py --ano 2026 --dry-run   # padrão seguro
"""

from __future__ import annotations

import argparse
import asyncio
import http.cookiejar
import json
import os
import ssl
import sys
import tempfile
import urllib.request
from datetime import date, datetime

import websockets
from supabase import create_client

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

# ── Fonte ───────────────────────────────────────────────────────────────────
HOST   = "transparencia.stf.jus.br"
APP_ID = "023307ab-d927-4144-aabb-831b360515bb"   # corte_aberta_decisoes (prod)
OBJ_ID = "UbMrYBg"                                # tabela de 21 colunas
CAMPO_ANO = "Ano decisão"                         # campo real, para a seleção

# A intermediária que o STF não envia (ver TLS abaixo). URL vem do próprio
# certificado folha, no campo Authority Information Access.
AIA_INTERMEDIARIA = "http://secure.globalsign.com/cacert/gsgccr6alphasslca2025.crt"

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")

# O Qlik recusa GetHyperCubeData acima de 10.000 CÉLULAS por requisição
# (erro 6001 "Result too large") — o limite é em células, não em linhas. Com as
# 21 colunas deste objeto, isso dá 476 linhas por página. A altura é calculada
# a partir da largura real devolvida pela fonte, para não quebrar de novo se
# uma coluna for acrescentada lá.
QLIK_MAX_CELULAS = 10_000
BATCH_SIZE = 500    # linhas por upsert no Supabase

# ── Trava de destino ────────────────────────────────────────────────────────
# Mesmo padrão de fetch_votacoes_bigquery.py (Fase D1): o destino não vem de
# argumento nem de variável de ambiente, propositalmente. Só muda se alguém
# editar esta constante conscientemente.
DESTINATION_SCHEMA = "public"
DESTINATION_TABLE = "stf_decisoes"


def resolver_destino() -> str:
    """Resolve e valida a tabela de destino. Falha explicitamente se não for
    public.stf_decisoes — schema diferente, nome vazio, sem prefixo stf_ ou
    qualquer outro nome."""
    tabela = DESTINATION_TABLE
    if (
        not tabela
        or DESTINATION_SCHEMA != "public"
        or not tabela.startswith("stf_")
        or tabela != "stf_decisoes"
    ):
        raise RuntimeError(
            f"Destino de escrita não autorizado: "
            f"'{DESTINATION_SCHEMA}.{tabela or '(vazio)'}' — esperado 'public.stf_decisoes'"
        )
    return tabela


# ── Colunas do objeto Qlik, na ordem em que a fonte devolve ─────────────────
# Conferida em 2026-08-17 via GetLayout/qDimensionInfo. A ordem POSICIONAL é o
# contrato — o SEBRAE já teve incidente por lista fora de ordem misturando o
# conteúdo de três campos (ver brasilia-insider, 2026-07-22). O script valida
# a ordem contra a fonte antes de ler qualquer linha.
COLUNAS_FONTE = [
    "idFatoDecisao",
    "Processo",
    "Relator atual",
    "Nome Ministro (a)",              # = campo Qlik "Relator decisão"
    "Meio Processo",
    "Origem decisão",
    "Ambiente julgamento",
    "Data de autuação",
    "Data baixa",
    "Indicador colegiado",            # = campo Qlik "Tipo origem decisão"
    "Ano da decisão",
    "Data da decisão",
    "Tipo decisão",
    "Andamento decisão",
    "Observação do andamento",
    "Ramo direito",
    "Assuntos do processo",           # duplicata de "Ramo direito" na fonte
    "Indicador de tramitação",
    "Órgão julgador",
    "Descrição Procedência Processo",
    "Descrição Órgão Origem",
]

# ── Resolução de ministro ───────────────────────────────────────────────────
# 37 valores distintos em "Relator decisão", lista fechada e pequena. Os dois
# maiores NÃO são nomes: MINISTRO PRESIDENTE (19,4%) e NÃO SE APLICA (7,0%).
RELATOR_NAO_NOMEIA = {
    "MINISTRO PRESIDENTE": "presidencia",
    # A vice-presidência é rotativa como a presidência e stf_presidencias já
    # guarda o cargo — mas resolver por ela exigiria o histórico completo de
    # vices, que hoje só existe de 28/09/2023 em diante. Até lá é desconhecido
    # explícito, e entra na contagem do log como qualquer outro.
    "VICE-PRESIDENTE": "desconhecido",
    "PRESIDENTE DA COMISSÃO DE JURISPRUDÊNCIA": "nao_aplicavel",
    "NÃO SE APLICA": "nao_aplicavel",
}

# Divergências conhecidas entre o nome na fonte e o nome em stf_ministros.
# Alias EXPLÍCITO em vez de casamento aproximado: um "parecido o bastante"
# atribuiria decisão ao ministro errado, que é pior do que não atribuir.
# Chave = nome normalizado da fonte; valor = nome normalizado do banco.
ALIAS_RELATOR = {
    "marco aurelio": "marco aurelio mello",
}

VAZIO = {"", "-", "*NI*", "NÃO INFORMADO", "NAO INFORMADO"}


def _limpar(v: str | None) -> str | None:
    """Texto da fonte → None quando é marcador de vazio. `*NI*` é o 'não
    informado' do STF e aparece muito em Observação."""
    if v is None:
        return None
    s = str(v).strip()
    return None if s.upper() in VAZIO else s


def _data(v: str | None) -> str | None:
    """'07/11/2002 00:00:00' → '2002-11-07'. Devolve None para vazio/inválido —
    nunca inventa data."""
    s = _limpar(v)
    if not s:
        return None
    s = s.split(" ")[0]
    for fmt in ("%d/%m/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(s, fmt).date().isoformat()
        except ValueError:
            continue
    return None


def _bool(v: str | None) -> bool | None:
    s = (_limpar(v) or "").upper()
    if s in {"SIM", "S", "TRUE", "1"}:
        return True
    if s in {"NÃO", "NAO", "N", "FALSE", "0"}:
        return False
    return None


def _int(v: str | None) -> int | None:
    s = _limpar(v)
    if not s:
        return None
    try:
        return int(float(s.replace(".", "").replace(",", ".")))
    except ValueError:
        return None


def normalizar_nome_relator(bruto: str) -> str:
    """'MIN. GILMAR MENDES' → 'gilmar mendes'. Só para casar com o banco —
    o valor bruto é sempre persistido intacto."""
    import re
    import unicodedata
    s = unicodedata.normalize("NFKD", bruto or "").encode("ascii", "ignore").decode()
    s = re.sub(r"^\s*MIN(A)?\.?\s+", "", s, flags=re.I)
    return re.sub(r"\s+", " ", s).strip().lower()


class ResolvedorMinistro:
    """Resolve relator_bruto → (ministro_id, como_foi_resolvido).

    Nunca descarta linha. O MAPA_MINISTRO do script antigo jogava fora, sem
    falhar, todo relator que não reconhecia — o que apagava a decisão do acervo
    sem deixar rastro. Aqui o não resolvido entra com ministro_id nulo e
    ministro_resolucao='desconhecido', e a contagem vai para o log.
    """

    def __init__(self, ministros: list[dict], presidencias: list[dict]):
        self._por_nome = {normalizar_nome_relator(m["nome"]): m["id"] for m in ministros}
        # (inicio, fim, ministro_id) só de presidentes, ordenado
        self._presid = sorted(
            [
                (p["inicio"], p["fim"], p["ministro_id"])
                for p in presidencias
                if p["cargo"] == "presidente"
            ]
        )
        self.desconhecidos: dict[str, int] = {}

    def _nao_resolvido(self, rotulo: str) -> tuple[None, str]:
        """Registra no log e devolve desconhecido. TODO caminho que resulta em
        'desconhecido' passa por aqui — senão o relatório final subnotifica, que
        é a forma silenciosa do mesmo erro que esta ingestão veio corrigir."""
        self.desconhecidos[rotulo] = self.desconhecidos.get(rotulo, 0) + 1
        return None, "desconhecido"

    def resolver(self, bruto: str, data_decisao: str | None) -> tuple[str | None, str]:
        bruto = (bruto or "").strip()

        especial = RELATOR_NAO_NOMEIA.get(bruto.upper())
        if especial == "presidencia":
            mid = self._presidente_em(data_decisao)
            if mid:
                return mid, "presidencia"
            # Presidência daquela data ainda não está em stf_presidencias.
            # A tabela só cobre de 28/09/2023 em diante (migration 0006);
            # completar o histórico recupera ~19,4% do acervo. Até lá, entra
            # como desconhecido — a linha não se perde.
            return self._nao_resolvido(f"{bruto} (sem presidência conhecida em {data_decisao})")
        if especial == "desconhecido":
            return self._nao_resolvido(bruto)
        if especial:
            return None, especial

        chave = normalizar_nome_relator(bruto)
        chave = ALIAS_RELATOR.get(chave, chave)
        mid = self._por_nome.get(chave)
        if mid:
            return mid, "nome"

        return self._nao_resolvido(bruto)

    def _presidente_em(self, data: str | None) -> str | None:
        if not data:
            return None
        for inicio, fim, mid in self._presid:
            if inicio <= data and (fim is None or data < fim):
                return mid
        return None


# ── TLS ─────────────────────────────────────────────────────────────────────
def contexto_ssl() -> ssl.SSLContext:
    """O STF serve a cadeia incompleta: só o certificado folha, sem a
    intermediária. O curl disfarça (busca por AIA); Python falha com
    'unable to get local issuer certificate'. Baixa a intermediária apontada
    pelo próprio certificado e a acrescenta ao bundle do certifi.

    A validação continua completa até uma raiz confiável — isto NÃO desliga
    verificação de certificado.
    """
    import certifi

    with urllib.request.urlopen(AIA_INTERMEDIARIA, timeout=30) as r:
        der = r.read()
    pem = ssl.DER_cert_to_PEM_cert(der)

    bundle = tempfile.NamedTemporaryFile("w", suffix=".pem", delete=False)
    with open(certifi.where(), encoding="utf-8") as base:
        bundle.write(base.read())
    bundle.write("\n" + pem)
    bundle.close()
    return ssl.create_default_context(cafile=bundle.name)


def cookie_sessao(ctx: ssl.SSLContext) -> str:
    """O WebSocket do Qlik devolve 403 sem sessão. Um GET em /single/ emite o
    X-Qlik-Session anônimo que o handshake exige."""
    cj = http.cookiejar.CookieJar()
    op = urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(cj),
        urllib.request.HTTPSHandler(context=ctx),
    )
    op.addheaders = [("User-Agent", UA), ("Accept-Language", "pt-BR,pt;q=0.9")]
    op.open(f"https://{HOST}/single/?appid={APP_ID}", timeout=30).read(1024)
    cookies = "; ".join(f"{c.name}={c.value}" for c in cj)
    if not cookies:
        raise RuntimeError("Não foi possível obter X-Qlik-Session — o WebSocket vai recusar com 403")
    return cookies


# ── Qlik RPC ────────────────────────────────────────────────────────────────
class Sessao:
    def __init__(self, ws):
        self.ws = ws
        self._id = 0

    async def rpc(self, method, params=None, handle=-1):
        self._id += 1
        mid = self._id
        await self.ws.send(json.dumps({
            "jsonrpc": "2.0", "id": mid, "handle": handle,
            "method": method, "params": params or [],
        }))
        while True:
            msg = json.loads(await asyncio.wait_for(self.ws.recv(), timeout=120))
            if msg.get("id") == mid:
                if "error" in msg:
                    raise RuntimeError(f"Qlik {method}: {msg['error']}")
                return msg


async def extrair(ano: int) -> list[dict]:
    """Abre o app, seleciona o ano e devolve as linhas cruas do objeto."""
    ctx = contexto_ssl()
    hdr = {"User-Agent": UA, "Origin": f"https://{HOST}", "Cookie": cookie_sessao(ctx)}

    async with websockets.connect(
        f"wss://{HOST}/app/{APP_ID}",
        additional_headers=hdr,
        ssl=ctx,
        max_size=None,
        open_timeout=60,
        ping_interval=None,   # o Qlik usa keepalive próprio
    ) as ws:
        await asyncio.wait_for(ws.recv(), timeout=30)   # OnAuthenticationInformation
        s = Sessao(ws)

        app = (await s.rpc("OpenDoc", [APP_ID]))["result"]["qReturn"]["qHandle"]
        layout = (await s.rpc("GetAppLayout", [], app))["result"]["qLayout"]
        print(f"App: {layout.get('qTitle')} — último reload {layout.get('qLastReloadTime')}")

        # Seleção do ano no servidor. Evita puxar 2,97M linhas para filtrar aqui.
        campo = (await s.rpc("GetField", [CAMPO_ANO], app))["result"]["qReturn"]["qHandle"]
        if not campo:
            raise RuntimeError(f"Campo '{CAMPO_ANO}' não existe no app — a fonte mudou de schema")
        ok = (await s.rpc("Select", [str(ano), False, 0], campo))["result"]["qReturn"]
        if not ok:
            raise RuntimeError(f"Seleção de ano={ano} recusada pelo Qlik")

        obj = (await s.rpc("GetObject", [OBJ_ID], app))["result"]["qReturn"]["qHandle"]
        if not obj:
            raise RuntimeError(f"Objeto {OBJ_ID} não existe no app — a fonte mudou")
        hc = (await s.rpc("GetLayout", [], obj))["result"]["qLayout"]["qHyperCube"]

        # Contrato posicional: se a fonte reordenar ou renomear colunas, para
        # aqui em vez de gravar campo trocado.
        titulos = [d["qFallbackTitle"] for d in hc["qDimensionInfo"]]
        if titulos != COLUNAS_FONTE:
            raise RuntimeError(
                "Colunas da fonte mudaram — ingestão interrompida para não gravar "
                f"campo trocado.\n  esperado: {COLUNAS_FONTE}\n  recebido: {titulos}"
            )

        total = hc["qSize"]["qcy"]
        largura = hc["qSize"]["qcx"]
        print(f"Ano {ano}: {total:,} decisões na fonte".replace(",", "."))
        if total == 0:
            return []

        altura = max(1, QLIK_MAX_CELULAS // largura)
        print(f"  página: {altura} linhas ({largura} colunas, teto de {QLIK_MAX_CELULAS} células)")

        linhas: list[dict] = []
        offset = 0
        while offset < total:
            pagina = [{"qTop": offset, "qLeft": 0, "qWidth": largura, "qHeight": altura}]
            for tentativa in range(1, 4):
                try:
                    r = await s.rpc("GetHyperCubeData", ["/qHyperCubeDef", pagina], obj)
                    break
                except RuntimeError as e:
                    # 6001 é determinístico (página grande demais) — repetir não
                    # ajuda, e mascararia um aumento de colunas na fonte.
                    if "6001" in str(e) or "too large" in str(e).lower():
                        raise RuntimeError(
                            f"Qlik recusou página de {altura}x{largura} células. "
                            "A fonte deve ter ganhado colunas; ajuste QLIK_MAX_CELULAS "
                            f"ou revise COLUNAS_FONTE.\n  {e}"
                        ) from e
                    if tentativa == 3:
                        raise
                    print(f"  erro em offset={offset}, tentativa {tentativa}/3: {e}")
                    await asyncio.sleep(2 * tentativa)
                except (asyncio.TimeoutError, TimeoutError) as e:
                    if tentativa == 3:
                        raise
                    print(f"  timeout em offset={offset}, tentativa {tentativa}/3: {e}")
                    await asyncio.sleep(2 * tentativa)

            matriz = r["result"]["qDataPages"][0]["qMatrix"]
            if not matriz:
                break
            for row in matriz:
                linhas.append(dict(zip(COLUNAS_FONTE, [c.get("qText") for c in row])))
            offset += len(matriz)
            if offset % 5000 < altura:
                print(f"  {offset:,}/{total:,}".replace(",", "."))

        if len(linhas) != total:
            raise RuntimeError(
                f"Extração incompleta: {len(linhas)}/{total} linhas. Nada foi gravado — "
                "rode de novo em vez de carregar um ano pela metade."
            )
        return linhas


def mapear(linha: dict, resolvedor: ResolvedorMinistro) -> dict | None:
    """Linha crua da fonte → registro de stf_decisoes. None se faltar o mínimo."""
    id_fato = _int(linha.get("idFatoDecisao"))
    data_dec = _data(linha.get("Data da decisão"))
    processo = _limpar(linha.get("Processo"))
    relator = _limpar(linha.get("Nome Ministro (a)")) or "NÃO INFORMADO"
    andamento = _limpar(linha.get("Andamento decisão"))
    tipo_origem = _limpar(linha.get("Indicador colegiado"))

    # Sem chave natural, sem data ou sem andamento a linha não é utilizável —
    # e são justamente os NOT NULL da tabela.
    if id_fato is None or not data_dec or not processo or not andamento or not tipo_origem:
        return None

    ministro_id, resolucao = resolvedor.resolver(relator, data_dec)

    return {
        "id_fato_decisao":     id_fato,
        "processo":            processo,
        "relator_bruto":       relator,
        "relator_atual_bruto": _limpar(linha.get("Relator atual")),
        "tipo_origem":         tipo_origem,
        "tipo_decisao":        _limpar(linha.get("Tipo decisão")),
        "andamento_bruto":     andamento,
        "observacao":          _limpar(linha.get("Observação do andamento")),
        "data_decisao":        data_dec,
        "ano_decisao":         _int(linha.get("Ano da decisão")) or int(data_dec[:4]),
        "orgao_julgador":      _limpar(linha.get("Órgão julgador")),
        "origem_decisao":      _limpar(linha.get("Origem decisão")),
        "ambiente_julgamento": _limpar(linha.get("Ambiente julgamento")),
        "meio_processo":       _limpar(linha.get("Meio Processo")),
        "assunto":             _limpar(linha.get("Ramo direito")),
        "data_autuacao":       _data(linha.get("Data de autuação")),
        "data_baixa":          _data(linha.get("Data baixa")),
        "em_tramitacao":       _bool(linha.get("Indicador de tramitação")),
        "orgao_origem":        _limpar(linha.get("Descrição Órgão Origem")),
        "procedencia":         _limpar(linha.get("Descrição Procedência Processo")),
        "ministro_id":         ministro_id,
        "ministro_resolucao":  resolucao,
        # `sentido` NÃO é preenchido de propósito. Ver comentário da coluna na
        # migration 0007 e docs/proposta-schema-stf-decisoes.md, seção 5.
    }


def run(ano: int, dry_run: bool = True) -> int:
    tabela = resolver_destino()
    print(f"Tabela de destino autorizada: {DESTINATION_SCHEMA}.{tabela}")
    print(f"Modo: {'DRY-RUN (nada é gravado)' if dry_run else 'ESCRITA REAL'}")

    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    ministros = sb.table("stf_ministros").select("id, nome").execute().data
    presidencias = (
        sb.table("stf_presidencias").select("ministro_id, cargo, inicio, fim").execute().data
    )
    print(f"{len(ministros)} ministros e {len(presidencias)} mandatos de presidência carregados")

    resolvedor = ResolvedorMinistro(ministros, presidencias)
    linhas = asyncio.run(extrair(ano))

    registros, descartadas = [], 0
    vistos: set[int] = set()
    for linha in linhas:
        reg = mapear(linha, resolvedor)
        if reg is None:
            descartadas += 1
            continue
        # A fonte pode repetir idFatoDecisao dentro da mesma página; o upsert
        # do PostgREST recusa lote com chave duplicada.
        if reg["id_fato_decisao"] in vistos:
            continue
        vistos.add(reg["id_fato_decisao"])
        registros.append(reg)

    print(f"\n{len(registros):,} registros mapeados, {descartadas} sem campo obrigatório"
          .replace(",", "."))

    from collections import Counter
    por_resolucao = Counter(r["ministro_resolucao"] for r in registros)
    for k, v in por_resolucao.most_common():
        print(f"  ministro_resolucao={k:14s} {v:,}".replace(",", "."))

    gravados = 0
    for i in range(0, len(registros), BATCH_SIZE):
        lote = registros[i:i + BATCH_SIZE]
        if not dry_run:
            sb.table(tabela).upsert(lote, on_conflict="id_fato_decisao").execute()
        gravados += len(lote)
        if gravados % 5000 < BATCH_SIZE:
            print(f"  {gravados:,}/{len(registros):,}".replace(",", "."))

    verbo = "seriam gravados" if dry_run else "gravados"
    print(f"\n{gravados:,} registros {verbo} em {tabela} (ano={ano})".replace(",", "."))

    if resolvedor.desconhecidos:
        total_desc = sum(resolvedor.desconhecidos.values())
        print(f"\nRelatores não resolvidos ({len(resolvedor.desconhecidos)} distintos, "
              f"{total_desc:,} linhas) — as linhas ENTRARAM, com ministro_id nulo:"
              .replace(",", "."))
        for nome, n in sorted(resolvedor.desconhecidos.items(), key=lambda x: -x[1])[:20]:
            print(f"  {n:>8,}  {nome}".replace(",", "."))

    return gravados


if __name__ == "__main__":
    p = argparse.ArgumentParser(description="Ingestão de decisões do STF via Qlik")
    p.add_argument("--ano", type=int, default=date.today().year)
    # Fail-closed: sem --escrever, é dry-run. O inverso (--dry-run opcional)
    # transformaria um esquecimento em escrita acidental em produção.
    p.add_argument("--escrever", action="store_true",
                   help="grava no Supabase (sem esta flag, é dry-run)")
    p.add_argument("--dry-run", action="store_true", help="explícito; é o padrão")
    args = p.parse_args()

    if args.escrever and args.dry_run:
        sys.exit("--escrever e --dry-run são mutuamente exclusivos")

    run(args.ano, dry_run=not args.escrever)
