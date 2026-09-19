"""
Ingestão: Acervo processual — Corte Aberta
Fonte: transparencia.stf.jus.br/extensions/acervo (Qlik Sense)

Painel de acervo — todos os processos em tramitação no STF numa data de
captura (22.390 na captura de 2026-09-18), não um recorte por ano como
Controle Concentrado ou Reclamações. A tabela visível no painel mostra só
6 colunas (Processo, Relator, Número Único, Data autuação, Ramo do
Direito, Assuntos); o export .xlsx real tem 36 colunas — conferido
baixando o arquivo e inspecionando com openpyxl antes de escrever este
script, não assumido a partir da UI.

Mesmo mecanismo de export nativo (.xlsx) dos outros painéis Corte Aberta
recentes — ver _corte_aberta_qlik.py.

"Processo criminal" não é booleano apesar do nome: a fonte usa o campo
para a categoria "Cível"/"Criminal", não um sim/não — mantido como texto.

Execução:
  python3 ingestao/stf/fetch_acervo.py [--dry-run]
"""

import argparse
import io
import os
import re
import unicodedata
import warnings
from datetime import datetime

import openpyxl
from playwright.sync_api import sync_playwright
from supabase import create_client

from _corte_aberta_qlik import baixar_xlsx, bool_sim_nao, valor, NI

warnings.filterwarnings("ignore")

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

URL_PAINEL = "https://transparencia.stf.jus.br/extensions/acervo/acervo.html"


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


def data_iso(v):
    """Datetime nativo do openpyxl, string 'dd/mm/aaaa' ou '-' -> ISO ou None."""
    v = valor(v)
    if v is None:
        return None
    if isinstance(v, datetime):
        return v.isoformat()
    try:
        d, m, a = str(v).split("/")
        return f"{a}-{m}-{d}"
    except ValueError:
        return None


def processar(xlsx_bytes: bytes, ministros: list[dict]) -> list[dict]:
    wb = openpyxl.load_workbook(io.BytesIO(xlsx_bytes), read_only=True)
    ws = wb[wb.sheetnames[0]]
    rows = ws.iter_rows(values_only=True)
    header = [str(h).strip() for h in next(rows)]

    linhas = []
    for row in rows:
        r = dict(zip(header, row))
        processo = valor(r.get("Processo"))
        if not processo:
            continue
        relator_bruto = valor(r.get("Relator"))
        linhas.append({
            "processo": processo,
            "ministro_id": resolver_ministro(relator_bruto, ministros),
            "relator_bruto": relator_bruto,
            "numero_unico": valor(r.get("Número único")),
            "grupo_origem": valor(r.get("Grupo origem")),
            "tipo_classe": valor(r.get("Tipo classe")),
            "classe": valor(r.get("Classe")),
            "numero": valor(r.get("Número")),
            "link_processo": valor(r.get("Link do processo")),
            "data_autuacao": data_iso(r.get("Data autuação")),
            "data_autuacao_agregada": valor(r.get("Data autuação agregada")),
            "data_primeira_distribuicao": data_iso(r.get("Data primeira distribuição")),
            "data_ultima_distribuicao": data_iso(r.get("Data última distribuição")),
            "data_primeira_decisao": data_iso(r.get("Data primeria decisão")),
            "data_ultima_decisao": data_iso(r.get("Data última decisão")),
            "data_ultimo_andamento": data_iso(r.get("Data último andamento")),
            "grupo_ultimo_andamento": valor(r.get("Grupo último andamento")),
            "subgrupo_ultimo_andamento": valor(r.get("Subgrupo último andamento")),
            "descricao_ultimo_andamento": valor(r.get("Descrição último andamento")),
            "observacao_ultimo_andamento": valor(r.get("Observação último andamento")),
            "orgao_origem": valor(r.get("Órgão origem")),
            "ramo_direito": valor(r.get("Ramo do Direito")),
            "assuntos": valor(r.get("Assuntos")),
            "legislacao": valor(r.get("Legislação")),
            "meio_processo": valor(r.get("Meio processo")),
            "tipo_localizacao_atual": valor(r.get("Tipo localização atual")),
            "localizacao_atual_agrupada": valor(r.get("Localização atual agrupada")),
            "localizacao_atual": valor(r.get("Localização atual")),
            "preferencia_criminal": bool_sim_nao(r.get("Preferência criminal")),
            "processo_criminal": valor(r.get("Processo criminal")),
            "acordao_pendente_publicacao": bool_sim_nao(r.get("Acórdão pendente de publicação")),
            "processo_em_instrucao": bool_sim_nao(r.get("Processo em instrução")),
            "situacao_decisao_final": valor(r.get("Situação da decisão final")),
            "processo_sobrestado": bool_sim_nao(r.get("Processo sobrestado")),
            "recurso_interno_pendente": bool_sim_nao(r.get("Recurso interno pendente")),
            "liminar_pendente": bool_sim_nao(r.get("Liminar pendente")),
            "pedido_vista": bool_sim_nao(r.get("Pedido de Vista")),
            "representativo_controversia": bool_sim_nao(r.get("Representativo Controvérsia")),
        })
    return linhas


def run(dry_run: bool = False, arquivo_local: str | None = None):
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    ministros = sb.table("stf_ministros").select("id, nome").execute().data

    if arquivo_local:
        with open(arquivo_local, "rb") as f:
            xlsx_bytes = f.read()
    else:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page()
            print("Abrindo painel de Acervo (navegador headless)...")
            xlsx_bytes = baixar_xlsx(page, URL_PAINEL, "Lista de processos")
            browser.close()

    lote = processar(xlsx_bytes, ministros)
    resolvidos = sum(1 for l in lote if l["ministro_id"])
    print(f"  {len(lote)} processos ({resolvidos} com ministro_id resolvido, "
          f"{len(lote) - resolvidos} sem correspondência)")

    if not dry_run:
        for i in range(0, len(lote), 500):
            sb.table("stf_acervo").upsert(lote[i:i + 500], on_conflict="processo").execute()

    print(f"\n✅ {len(lote)} processos do acervo "
          f"{'processados (dry-run, nada salvo)' if dry_run else 'gravados'}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--arquivo-local", help="Usa um .xlsx já baixado em vez de acessar o painel")
    args = parser.parse_args()
    run(args.dry_run, args.arquivo_local)
