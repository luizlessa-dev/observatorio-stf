"""
Ingestão: Decisões selecionadas sobre Covid-19 — Corte Aberta
Fonte: transparencia.stf.jus.br/extensions/decisoes_covid (Qlik Sense)

Diferente dos outros painéis Corte Aberta recentes: não é um recorte
bruto de todas as decisões da pandemia (16.265 no total, segundo o
próprio painel) — é uma curadoria do STF, "decisões selecionadas" (232
decisões, 221 processos), com Relatório e Decisão escritos em prosa pelo
próprio tribunal, não metadado estruturado. Confirmado que "Limpar" não
muda esse recorte (testado antes de escrever este script) — não é filtro
de sessão residual, é o conteúdo do painel.

Mesmo mecanismo de export nativo (.xlsx) do módulo compartilhado
(_corte_aberta_qlik.baixar_xlsx) — sem o problema de escopo de ano dos
dois painéis anteriores, porque este painel não tem variável de ano
fixada.

Execução:
  python3 ingestao/stf/fetch_decisoes_covid.py [--dry-run]
"""

import argparse
import io
import os
import re
import unicodedata
import warnings

import openpyxl
from playwright.sync_api import sync_playwright
from supabase import create_client

from _corte_aberta_qlik import baixar_xlsx, valor, NI

warnings.filterwarnings("ignore")

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

URL_PAINEL = "https://transparencia.stf.jus.br/extensions/decisoes_covid/decisoes_covid.html"


def normalizar(txt: str) -> str:
    txt = unicodedata.normalize("NFD", txt)
    return "".join(c for c in txt if unicodedata.category(c) != "Mn").upper().strip()


def resolver_ministro(relator_bruto: str, ministros: list[dict]) -> str | None:
    if not relator_bruto or relator_bruto == NI:
        return None
    nome = re.sub(r"^MIN\.?\s+", "", relator_bruto.strip(), flags=re.IGNORECASE)
    nome_norm = normalizar(nome)
    for m in ministros:
        m_norm = normalizar(m["nome"])
        partes = m_norm.split()
        sobrenome = " ".join(partes[-2:]) if len(partes) > 1 else m_norm
        if sobrenome in nome_norm or m_norm in nome_norm or nome_norm in m_norm:
            return m["id"]
    return None


def processar(dados: bytes, ministros: list[dict]) -> list[dict]:
    wb = openpyxl.load_workbook(io.BytesIO(dados), read_only=True)
    ws = wb[wb.sheetnames[0]]
    rows = ws.iter_rows(values_only=True)
    header = [str(h).strip() for h in next(rows)]

    linhas = {}
    for row in rows:
        r = dict(zip(header, row))
        processo = valor(r.get("Processo"))
        decisao = valor(r.get("Decisão"))
        if not processo or not decisao:
            continue
        relator_bruto = valor(r.get("Relator Atual"))
        id_processo = valor(r.get("Id Processo"))
        linhas[(processo, decisao)] = {
            "processo": processo,
            "ministro_id": resolver_ministro(relator_bruto, ministros),
            "relator_bruto": relator_bruto,
            "materia": valor(r.get("Matéria")),
            "titulo": valor(r.get("Título")),
            "relatorio": valor(r.get("Relatório")),
            "decisao": decisao,
            "tipo_decisao": valor(r.get("Tipo decisão")),
            "link_decisao": valor(r.get("Link Decisão")),
            "id_processo_fonte": int(id_processo) if id_processo else None,
        }
    return list(linhas.values())


def run(dry_run: bool = False, arquivo_local: str | None = None):
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    ministros = sb.table("stf_ministros").select("id, nome").execute().data

    if arquivo_local:
        with open(arquivo_local, "rb") as f:
            dados = f.read()
    else:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page()
            print("Abrindo painel de Ações Covid-19 (navegador headless)...")
            dados = baixar_xlsx(page, URL_PAINEL, "Lista das decisões selecionadas")
            browser.close()

    lote = processar(dados, ministros)
    resolvidos = sum(1 for l in lote if l["ministro_id"])
    print(f"  {len(lote)} decisões ({resolvidos} com ministro_id resolvido, "
          f"{len(lote) - resolvidos} sem correspondência)")

    if not dry_run and lote:
        sb.table("stf_decisoes_covid").upsert(lote, on_conflict="processo,decisao").execute()

    print(f"\n✅ {len(lote)} decisões sobre Covid-19 "
          f"{'processadas (dry-run, nada salvo)' if dry_run else 'gravadas'}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--arquivo-local", help="Usa um .xlsx já baixado em vez de acessar o painel")
    args = parser.parse_args()
    run(args.dry_run, args.arquivo_local)
