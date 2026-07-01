"""
Scraping de processos relacionados por tema de Repercussão Geral
Fonte: portal.stf.jus.br/jurisprudenciaRepercussao/verAndamentoProcesso.asp

Cada tema tem uma tabela de processos relacionados (sobrestados aguardando
o julgamento do leading case). Conta as linhas dessa tabela e salva em
stf_repercussao_geral.processos_imp.

IMPORTANTE: precisa de cookie de sessão — inicializa via listarProcesso.asp.

Execução:
  python3 ingestao/stf/fetch_processos_imp.py [--batch 100] [--delay 0.4]
"""

import os, time, argparse, warnings
import requests
import urllib3
from bs4 import BeautifulSoup
from supabase import create_client

warnings.filterwarnings("ignore")
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

LISTA_URL  = "https://portal.stf.jus.br/jurisprudenciaRepercussao/listarProcesso.asp"
ANDAMENTO_URL = "https://portal.stf.jus.br/jurisprudenciaRepercussao/verAndamentoProcesso.asp"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept-Language": "pt-BR,pt;q=0.9",
}


def init_session() -> requests.Session:
    """Cria sessão com cookie ASPSESSIONID necessário para verAndamentoProcesso."""
    session = requests.Session()
    session.headers.update(HEADERS)
    session.get(LISTA_URL + "?exportar=csv", verify=False, timeout=30)
    return session


def fetch_count(session: requests.Session, incidente_id: str, tema: int) -> int | None:
    """Conta processos relacionados na tabela 2 de verAndamentoProcesso."""
    try:
        resp = session.get(
            ANDAMENTO_URL,
            params={"incidente": incidente_id, "numeroTema": tema},
            verify=False,
            timeout=20,
        )
        if resp.status_code != 200 or len(resp.text) < 1000:
            return None
        soup = BeautifulSoup(resp.text, "html.parser")
        tables = soup.select("table")
        if len(tables) < 2:
            return 0
        # Tabela 2: Processo | Origem | Ocorrência (processos relacionados ao tema)
        rows = tables[1].select("tr")
        return max(0, len(rows) - 1)  # desconta header
    except Exception:
        return None


def run(batch: int = 100, delay: float = 0.4):
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    res = sb.table("stf_repercussao_geral") \
        .select("id, tema, incidente_id") \
        .is_("processos_imp", "null") \
        .not_.is_("incidente_id", "null") \
        .order("tema") \
        .limit(batch) \
        .execute()

    temas = res.data
    print(f"{len(temas)} temas a processar (batch={batch})")
    if not temas:
        print("✅ Nenhum tema pendente.")
        return

    print("Inicializando sessão com o portal STF...")
    session = init_session()

    atualizados = 0
    erros = 0
    for t in temas:
        count = fetch_count(session, t["incidente_id"], t["tema"])
        if count is None:
            erros += 1
            # Renova sessão a cada 5 erros consecutivos
            if erros % 5 == 0:
                print(f"  [{t['tema']}] Renovando sessão após erros...")
                session = init_session()
        else:
            sb.table("stf_repercussao_geral") \
                .update({"processos_imp": count}) \
                .eq("id", t["id"]) \
                .execute()
            atualizados += 1
            erros = 0

        if (atualizados + erros) % 20 == 0:
            print(f"  {atualizados} ok / {erros} erros — tema {t['tema']}...")

        time.sleep(delay)

    total = sb.table("stf_repercussao_geral").select("id", count="exact").not_.is_("processos_imp","null").execute().count
    print(f"\n✅ {atualizados} atualizados | {erros} erros | {total}/1470 total preenchidos")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch", type=int, default=100)
    parser.add_argument("--delay", type=float, default=0.4)
    args = parser.parse_args()
    run(args.batch, args.delay)
