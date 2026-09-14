"""
Ingestão: Passagens aéreas e diárias do gabinete de cada ministro do STF
Fonte: transparencia.stf.jus.br — painéis Qlik Sense "Transparência -
Passagens Aéreas" e "Transparência - Diárias".

Diferente de rendimento_folha (HTML simples com requests+BeautifulSoup),
esses painéis não têm URL estática de export — o botão "Exportar (CSV)"
dispara um export no próprio app Qlik (sessão + WebSocket) e só depois
gera uma URL de download (`/tempcontent/<sessão>/<arquivo>.csv`) via
`window.open`. Por isso a ingestão usa Playwright (Chromium headless)
pra abrir o painel, clicar no botão e capturar essa URL, em vez de um
GET direto.

Escopo: só linhas cuja lotação bate com "GABINETE MINISTRO/MINISTRA X" —
mesmo filtro de fetch_gastos.py. Isso cobre o ministro e quem está
lotado no gabinete dele (juiz convocado, assessor), não a folha de
viagens do tribunal inteiro.

Execução:
  python3 ingestao/stf/fetch_passagens_diarias.py [--dry-run]
"""

import os, re, csv, io, argparse, warnings, unicodedata
from playwright.sync_api import sync_playwright
from supabase import create_client

warnings.filterwarnings("ignore")

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

APPID = "36ff6da1-92c2-41ab-8995-fd7153419ab2"
URL_PASSAGENS = f"https://transparencia.stf.jus.br/single/?appid={APPID}&sheet=RGBzz&opt=currsel"
URL_DIARIAS = f"https://transparencia.stf.jus.br/single/?appid={APPID}&sheet=3385332f-145b-49bb-ad91-0908ca9d8909&opt=currsel"

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

GABINETE_PRESIDENCIA_INICIAIS = "EF"  # Fachin é presidente desde fev/2025

MESES_PT = {
    "janeiro": 1, "fevereiro": 2, "março": 3, "marco": 3, "abril": 4,
    "maio": 5, "junho": 6, "julho": 7, "agosto": 8, "setembro": 9,
    "outubro": 10, "novembro": 11, "dezembro": 12,
}


def identificar_ministro(lotacao: str, iniciais_to_id: dict):
    """'Gabinete do Ministro Gilmar Mendes' / 'Gabinete da Ministra Cármen Lúcia' → UUID"""
    u = (lotacao or "").upper().strip()

    if u in ("GABINETE DA PRESIDÊNCIA", "GABINETE DA PRESIDENCIA"):
        return iniciais_to_id.get(GABINETE_PRESIDENCIA_INICIAIS)

    for prefixo in ("GABINETE DA MINISTRA ", "GABINETE DO MINISTRO ", "GABINETE MINISTRA ", "GABINETE MINISTRO "):
        if u.startswith(prefixo):
            nome_raw = u[len(prefixo):].strip().lower()
            nome_norm = unicodedata.normalize("NFD", nome_raw)
            nome_norm = "".join(c for c in nome_norm if unicodedata.category(c) != "Mn")
            for chave, iniciais in NOME_MINISTRO.items():
                chave_norm = unicodedata.normalize("NFD", chave)
                chave_norm = "".join(c for c in chave_norm if unicodedata.category(c) != "Mn")
                if chave_norm in nome_norm or nome_norm in chave_norm:
                    return iniciais_to_id.get(iniciais)
            break

    return None


def parse_valor(raw: str):
    """'R$ 2.984,51' → 2984.51 ; '-' ou '' → None"""
    raw = (raw or "").strip()
    if not raw or raw == "-":
        return None
    limpo = raw.replace("R$", "").replace(".", "").replace(",", ".").strip()
    try:
        return round(float(limpo), 2)
    except ValueError:
        return None


def parse_quantidade(raw: str):
    """'3,50' → 3.5 ; '-' ou '' → None"""
    raw = (raw or "").strip()
    if not raw or raw == "-":
        return None
    try:
        return round(float(raw.replace(",", ".")), 2)
    except ValueError:
        return None


def parse_data(raw: str):
    """'26/01/2025' → '2025-01-26' ; '-' ou '' → None"""
    raw = (raw or "").strip()
    if not raw or raw == "-":
        return None
    partes = raw.split("/")
    if len(partes) != 3:
        return None
    d, m, y = partes
    return f"{y}-{m}-{d}"


def baixar_csv(page, url: str) -> str:
    """Abre o painel Qlik, clica em 'Exportar (CSV)' e retorna o texto do CSV."""
    page.goto(url, wait_until="load", timeout=60000)

    page.evaluate(
        """() => {
            window.__csvExportUrl = null;
            window.open = function(url) {
                window.__csvExportUrl = url;
                return { close: function () {}, focus: function () {}, closed: false };
            };
        }"""
    )

    # O rótulo varia entre painéis: "Exporta (CSV)" numa aba, "Exportar (CSV)" na outra.
    botao = page.get_by_text(re.compile(r"^Exportar?\s*\(CSV\)$"))
    botao.wait_for(timeout=30000)
    botao.click()

    page.wait_for_function("() => window.__csvExportUrl !== null", timeout=30000)
    csv_url = page.evaluate("() => window.__csvExportUrl")

    return page.evaluate(
        """async (url) => {
            const resp = await fetch(url, { credentials: 'include' });
            return await resp.text();
        }""",
        csv_url,
    )


def processar_passagens(texto_csv: str, iniciais_to_id: dict) -> list:
    reader = csv.DictReader(io.StringIO(texto_csv), delimiter="\t")
    linhas = {}
    for row in reader:
        rid = (row.get("Id") or "").strip()
        if not rid or rid == "-":
            continue
        lotacao = (row.get("Lotação") or "").strip()
        ministro_id = identificar_ministro(lotacao, iniciais_to_id)
        if not ministro_id:
            continue

        mes_nome, _, ano_str = (row.get("Mês/Ano") or "").strip().partition("/")
        try:
            ano = int(ano_str)
        except ValueError:
            continue

        linhas[rid] = {
            "ministro_id": ministro_id,
            "passagem_id": rid,
            "nome": (row.get("Passageiro") or "").strip() or None,
            "cargo": (row.get("Cargo") or "").strip() or None,
            "lotacao": lotacao or None,
            "motivo": (row.get("Motivo da viagem") or "").strip() or None,
            "ano": ano,
            "mes": MESES_PT.get(mes_nome.strip().lower()),
            "data_ida": parse_data(row.get("Data ida")),
            "data_volta": parse_data(row.get("Data volta")),
            "tipo_passagem": (row.get("Tipo passagem") or "").strip() or None,
            "trecho": (row.get("Trecho") or "").strip() or None,
            "valor_bilhete": parse_valor(row.get("Valor bilhete")),
            "valor_reembolso": parse_valor(row.get("Valor reembolso")),
            "custo_efetivo": parse_valor(row.get("Custo efetivo")),
        }
    return list(linhas.values())


def processar_diarias(texto_csv: str, iniciais_to_id: dict) -> list:
    reader = csv.DictReader(io.StringIO(texto_csv), delimiter="\t")
    linhas = {}
    for row in reader:
        rid = (row.get("Id") or "").strip()
        if not rid or rid == "-":
            continue
        lotacao = (row.get("Lotação Diária") or "").strip()
        ministro_id = identificar_ministro(lotacao, iniciais_to_id)
        if not ministro_id:
            continue

        try:
            ano = int((row.get("Anos") or "").strip())
        except ValueError:
            continue

        linhas[rid] = {
            "ministro_id": ministro_id,
            "diaria_id": rid,
            "nome": (row.get("Beneficiário") or "").strip() or None,
            "cargo": (row.get("Cargo") or "").strip() or None,
            "lotacao": lotacao or None,
            "tipo_diaria": (row.get("Tipo diária") or "").strip() or None,
            "motivo": (row.get("Motivo") or "").strip() or None,
            "moeda": (row.get("Moeda") or "").strip() or None,
            "quantidade": parse_quantidade(row.get("Quantidade")),
            "valor_total": parse_valor(row.get("Valor Total")),
            "ano": ano,
            "mes": MESES_PT.get((row.get("Mês") or "").strip().lower()),
        }
    return list(linhas.values())


def run(dry_run: bool = False):
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    ministros = sb.table("stf_ministros").select("id, iniciais, nome").execute().data
    iniciais_to_id = {m["iniciais"]: m["id"] for m in ministros}

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        print("Abrindo painel de Passagens Aéreas (navegador headless)...")
        csv_passagens = baixar_csv(page, URL_PASSAGENS)
        total_linhas_passagens = csv_passagens.count("\n") - 1
        lote_passagens = processar_passagens(csv_passagens, iniciais_to_id)
        print(f"  {len(lote_passagens)} passagens de gabinetes de ministros "
              f"(de {total_linhas_passagens} linhas na fonte)")

        print("Abrindo painel de Diárias (navegador headless)...")
        csv_diarias = baixar_csv(page, URL_DIARIAS)
        total_linhas_diarias = csv_diarias.count("\n") - 1
        lote_diarias = processar_diarias(csv_diarias, iniciais_to_id)
        print(f"  {len(lote_diarias)} diárias de gabinetes de ministros "
              f"(de {total_linhas_diarias} linhas na fonte)")

        browser.close()

    if not dry_run:
        for i in range(0, len(lote_passagens), 500):
            sb.table("stf_passagens").upsert(
                lote_passagens[i:i + 500], on_conflict="passagem_id"
            ).execute()
        for i in range(0, len(lote_diarias), 500):
            sb.table("stf_diarias").upsert(
                lote_diarias[i:i + 500], on_conflict="diaria_id"
            ).execute()

    print(f"\n✅ {len(lote_passagens)} passagens e {len(lote_diarias)} diárias "
          f"{'processadas (dry-run, nada salvo)' if dry_run else 'gravadas'}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    run(args.dry_run)
