"""
Ingestão: Temas de Repercussão Geral do STF
Fonte: portal.stf.jus.br/jurisprudenciaRepercussao/listarProcesso.asp?exportar=csv
       (retorna HTML com tabela completa — 1470 temas em uma requisição)

Execução:
  python3 ingestao/stf/fetch_repercussao_geral.py [--dry-run]
"""

import os, re, argparse, warnings
import requests
from bs4 import BeautifulSoup
from supabase import create_client

warnings.filterwarnings("ignore")

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

URL = "https://portal.stf.jus.br/jurisprudenciaRepercussao/listarProcesso.asp?exportar=csv"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "pt-BR,pt;q=0.9",
    "Referer": "https://portal.stf.jus.br/jurisprudenciaRepercussao/pesquisarProcesso.asp",
}

# Temas com relevância jornalística elevada
TEMAS_DESTAQUE = {
    6, 21, 26, 49, 57, 69, 73, 80, 97, 99, 113, 119, 130, 145, 150,
    161, 168, 177, 180, 199, 203, 210, 226, 228, 247, 260, 265, 280,
    302, 330, 339, 344, 360, 369, 373, 383, 393, 420, 450, 467, 498,
    529, 537, 548, 576, 581, 635, 636, 660, 683, 699, 725, 760, 761,
    796, 803, 806, 809, 880, 881, 923, 929, 940, 945, 958, 988, 993,
    1008, 1049, 1051, 1075,
}

NOME_MINISTRO = {
    "alexandre de moraes": "AM",
    "edson fachin": "EF",
    "carmen lucia": "CL",
    "cármen lúcia": "CL",
    "dias toffoli": "DT",
    "luiz fux": "LF",
    "gilmar mendes": "GM",
    "cristiano zanin": "CZ",
    "flávio dino": "FD",
    "flavio dino": "FD",
    "nunes marques": "NM",
    "kassio nunes marques": "NM",
    "andré mendonça": "AM2",
    "andre mendonca": "AM2",
    "luís roberto barroso": "LRB",
    "luis roberto barroso": "LRB",
    "rosa weber": "RW",
    "ricardo lewandowski": "RL",
    "marco aurélio": "MA",
    "marco aurelio": "MA",
    "celso de mello": "CM",
    "ellen gracie": None,
    "carlos britto": None,
    "joaquim barbosa": None,
    "ayres britto": None,
    "sepúlveda pertence": None,
}


def parse_data(raw: str):
    m = re.search(r"(\d{2})/(\d{2})/(\d{4})", raw)
    return f"{m.group(3)}-{m.group(2)}-{m.group(1)}" if m else None


def parse_status(raw: str) -> str:
    r = raw.lower()
    if "trânsito" in r or "transitado" in r or "julgado" in r or "mérito" in r:
        return "julgado"
    if "sobrestado" in r:
        return "sobrestado"
    return "pendente"


def run(dry_run: bool = False):
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    ministros = sb.table("stf_ministros").select("id, iniciais").execute().data
    iniciais_to_id = {m["iniciais"]: m["id"] for m in ministros}

    print("Baixando tabela completa de repercussão geral...")
    resp = requests.get(URL, headers=HEADERS, verify=False, timeout=60)
    resp.encoding = "utf-8"

    soup = BeautifulSoup(resp.text, "html.parser")
    rows = soup.select("table tbody tr")
    print(f"{len(rows)} temas encontrados")

    lote = []
    sem_relator = 0

    for tr in rows:
        cols = [td.get_text(separator=" ", strip=True) for td in tr.select("td")]
        if len(cols) < 5:
            continue

        # col0: número do tema (ex: "0001")
        tema_raw = cols[0].strip().lstrip("0") or "0"
        try:
            tema_num = int(tema_raw)
        except ValueError:
            continue

        titulo = cols[1][:500] if cols[1] else f"Tema {tema_num}"
        # Remove sufixo "Ver Descrição"
        titulo = re.sub(r"\s*Ver Descrição.*$", "", titulo).strip()

        leading_case_raw = cols[2] if len(cols) > 2 else ""
        m = re.search(r"(RE|ADI|ADC|ADPF|AI|ARE|HC|MS|MI|RHC|Rcl|AP|Inq)\s*\d+", leading_case_raw)
        leading_case = m.group(0).strip() if m else None

        relator_raw = (cols[3] if len(cols) > 3 else "").lower()
        relator_raw = re.sub(r"quadro de votos.*$", "", relator_raw, flags=re.IGNORECASE).strip()
        relator_raw = relator_raw.replace("min.", "").strip()

        relator_id = None
        for nome, iniciais in NOME_MINISTRO.items():
            if nome in relator_raw and iniciais:
                relator_id = iniciais_to_id.get(iniciais)
                break
        if relator_id is None:
            sem_relator += 1

        status_raw = cols[4] if len(cols) > 4 else ""
        status = parse_status(status_raw)
        data_reconh = parse_data(status_raw)

        tese_col = cols[5] if len(cols) > 5 else ""
        data_julg = parse_data(tese_col)
        tese = re.sub(r"^\d{2}/\d{2}/\d{4}\s*", "", tese_col).strip()[:2000]

        lote.append({
            "tema": tema_num,
            "titulo": titulo,
            "tese": tese or None,
            "status": status,
            "data_reconh": data_reconh,
            "data_julg": data_julg,
            "leading_case": leading_case,
            "processos_imp": None,
            "relator_id": relator_id,
            "destaque": tema_num in TEMAS_DESTAQUE,
        })

    print(f"{len(lote)} temas parseados | {sem_relator} sem relator mapeado (ministros históricos)")

    if not dry_run and lote:
        # upsert em lotes de 200
        for i in range(0, len(lote), 200):
            sb.table("stf_repercussao_geral").upsert(
                lote[i:i+200], on_conflict="tema"
            ).execute()
            print(f"  {min(i+200, len(lote))}/{len(lote)} inseridos...")

    print(f"\n✅ {len(lote)} temas de repercussão geral inseridos")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    run(args.dry_run)
