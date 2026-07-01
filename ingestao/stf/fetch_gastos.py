"""
Ingestão: Custo por Gabinete dos Ministros do STF
Fonte: egesp-portal.stf.jus.br/transparencia/rendimento_folha (paginado, 96 páginas)

Agrega remuneração bruta de todos os servidores lotados em "GABINETE MINISTRO X"
e insere como um registro mensal por ministro na tabela stf_gastos.

Também insere o subsídio fixo dos próprios ministros (R$ 46.366,19/mês).

Execução:
  python3 ingestao/stf/fetch_gastos.py [--dry-run]
"""

import os, re, time, argparse, warnings
from datetime import date
import requests
from bs4 import BeautifulSoup
from supabase import create_client

warnings.filterwarnings("ignore")

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

BASE_URL = "https://egesp-portal.stf.jus.br/transparencia/rendimento_folha"
SUBSIDIO_MINISTRO = 46366.19

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept-Language": "pt-BR,pt;q=0.9",
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
}


def parse_valor(raw: str) -> float:
    """'R$ 28.116,85' → 28116.85"""
    limpo = raw.replace("R$", "").replace(".", "").replace(",", ".").strip()
    try:
        return float(limpo)
    except ValueError:
        return 0.0


GABINETE_PRESIDENCIA_INICIAIS = "EF"  # Fachin é presidente desde fev/2025

def identificar_ministro(unidade: str, iniciais_to_id: dict):
    """'GABINETE MINISTRO GILMAR MENDES' / 'GABINETE MINISTRA CÁRMEN LÚCIA' → UUID"""
    u = unidade.upper().strip()

    # Presidência → Fachin (presidente atual)
    if u == "GABINETE DA PRESIDÊNCIA" or u == "GABINETE DA PRESIDENCIA":
        iniciais = GABINETE_PRESIDENCIA_INICIAIS
        return iniciais, iniciais_to_id.get(iniciais)

    # Remove prefixo masculino ou feminino
    for prefixo in ("GABINETE MINISTRA ", "GABINETE MINISTRO "):
        if u.startswith(prefixo):
            nome_raw = u[len(prefixo):].strip().lower()
            # normaliza acentos para comparação
            import unicodedata
            nome_norm = unicodedata.normalize("NFD", nome_raw)
            nome_norm = "".join(c for c in nome_norm if unicodedata.category(c) != "Mn")
            for chave, iniciais in NOME_MINISTRO.items():
                chave_norm = unicodedata.normalize("NFD", chave)
                chave_norm = "".join(c for c in chave_norm if unicodedata.category(c) != "Mn")
                if chave_norm in nome_norm or nome_norm in chave_norm:
                    return iniciais, iniciais_to_id.get(iniciais)
            break

    return None, None


def buscar_pagina(session, pagina: int) -> list:
    url = BASE_URL if pagina == 1 else f"{BASE_URL}?page={pagina}"
    resp = session.get(url, timeout=20)
    resp.encoding = "utf-8"
    soup = BeautifulSoup(resp.text, "html.parser")
    rows = soup.select("table tr")

    servidores = []
    for tr in rows[2:]:  # pula 2 linhas de header
        cols = [td.get_text(strip=True) for td in tr.select("td")]
        if len(cols) < 9:
            continue
        servidores.append({
            "nome":       cols[1],
            "unidade":    cols[5],
            "valor_bruto": parse_valor(cols[7]),
        })
    return servidores


def run(dry_run: bool = False):
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    ministros = sb.table("stf_ministros").select("id, iniciais, nome").execute().data
    iniciais_to_id = {m["iniciais"]: m["id"] for m in ministros}

    session = requests.Session()
    session.headers.update(HEADERS)

    # Descobre total de páginas
    resp = session.get(BASE_URL, timeout=20)
    resp.encoding = "utf-8"
    soup = BeautifulSoup(resp.text, "html.parser")
    numeros = [int(m) for m in re.findall(r"page=(\d+)", resp.text)]
    total_paginas = max(numeros) if numeros else 1

    # Extrai mês de referência da página (ex: "Referência: Maio/2026")
    ref_el = soup.select_one("table tr td")
    ref_texto = ref_el.get_text(strip=True) if ref_el else ""
    ref_match = re.search(r"(\w+)/(\d{4})", ref_texto)
    MESES_PT = {"janeiro":1,"fevereiro":2,"março":3,"abril":4,"maio":5,"junho":6,
                "julho":7,"agosto":8,"setembro":9,"outubro":10,"novembro":11,"dezembro":12}
    if ref_match:
        mes_ref = MESES_PT.get(ref_match.group(1).lower(), date.today().month)
        ano_ref = int(ref_match.group(2))
    else:
        mes_ref = date.today().month
        ano_ref = date.today().year

    print(f"Referência: {mes_ref}/{ano_ref} | {total_paginas} páginas")

    # Acumula custo por gabinete
    custo_gabinete = {}   # iniciais → {total, count}
    rows_primeira = buscar_pagina(session, 1)

    for pagina in range(1, total_paginas + 1):
        if pagina == 1:
            servidores = rows_primeira
        else:
            time.sleep(0.3)
            servidores = buscar_pagina(session, pagina)

        for s in servidores:
            iniciais, ministro_id = identificar_ministro(s["unidade"], iniciais_to_id)
            if not ministro_id:
                continue
            if iniciais not in custo_gabinete:
                custo_gabinete[iniciais] = {"ministro_id": ministro_id, "total": 0.0, "count": 0}
            custo_gabinete[iniciais]["total"] += s["valor_bruto"]
            custo_gabinete[iniciais]["count"] += 1

        if pagina % 10 == 0:
            print(f"  {pagina}/{total_paginas} páginas processadas...")

    print(f"\nGabinetes encontrados: {len(custo_gabinete)}")
    for iniciais, dados in sorted(custo_gabinete.items()):
        print(f"  {iniciais}: {dados['count']} servidores | R$ {dados['total']:,.2f}/mês")

    lote = []

    # 1. Custo total do gabinete (servidores)
    for iniciais, dados in custo_gabinete.items():
        lote.append({
            "ministro_id": dados["ministro_id"],
            "ano":         ano_ref,
            "mes":         mes_ref,
            "categoria":   "custo_gabinete",
            "descricao":   f"Remuneração bruta total dos servidores do gabinete ({dados['count']} servidores)",
            "valor":       round(dados["total"], 2),
            "fonte":       "egesp-portal.stf.jus.br/transparencia/rendimento_folha",
        })

    # 2. Subsídio dos próprios ministros
    for m in ministros:
        if m["iniciais"] in iniciais_to_id:
            lote.append({
                "ministro_id": m["id"],
                "ano":         ano_ref,
                "mes":         mes_ref,
                "categoria":   "subsidio_ministro",
                "descricao":   "Subsídio bruto do ministro",
                "valor":       SUBSIDIO_MINISTRO,
                "fonte":       "egesp-portal.stf.jus.br/transparencia/estrut_remu_membros_e_servidores",
            })

    if not dry_run and lote:
        sb.table("stf_gastos").upsert(
            lote,
            on_conflict="ministro_id,ano,mes,categoria,descricao"
        ).execute()

    print(f"\n✅ {len(lote)} registros de gastos inseridos (referência {mes_ref}/{ano_ref})")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    run(args.dry_run)
