"""
Ingestão: Ações de Controle Concentrado (ADI/ADC/ADPF/ADO) — Corte Aberta
Fonte: transparencia.stf.jus.br/extensions/controle_concentrado (Qlik Sense)

Painel diferente de Passagens/Diárias: o botão de export aqui não é
"Exportar (CSV)" (extensão swr-sense-export) — é o ícone nativo de
download na barra superior, rotulado com o nome da aba atual
("Processos"), que gera um .xlsx (não .csv) em /tempcontent/<sessão>/.
Mesma técnica de captura via `window.open` (ver fetch_passagens_diarias.py
para o raciocínio completo), mas parseado com openpyxl em vez de csv.

Bruto-primeiro: nenhum campo é reinterpretado, exceto a resolução best-
-effort de `ministro_id` a partir do nome do relator (útil e auditável —
fica null se não bater com nenhum ministro cadastrado).

Execução:
  python3 ingestao/stf/fetch_controle_concentrado.py [--dry-run]
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

URL_PAINEL = "https://transparencia.stf.jus.br/extensions/controle_concentrado/controle_concentrado.html"


def normalizar(txt: str) -> str:
    txt = unicodedata.normalize("NFD", txt)
    return "".join(c for c in txt if unicodedata.category(c) != "Mn").upper().strip()


def resolver_ministro(relator_bruto: str, ministros: list[dict]) -> str | None:
    """'MIN. GILMAR MENDES' -> uuid, por correspondência de nome (sem prefixo)."""
    if not relator_bruto or relator_bruto == NI:
        return None
    nome = re.sub(r"^MIN\.?\s+", "", relator_bruto.strip(), flags=re.IGNORECASE)
    nome_norm = normalizar(nome)
    for m in ministros:
        m_norm = normalizar(m["nome"])
        # sobrenomes costumam bastar: compara os dois últimos tokens do nome do ministro
        partes = m_norm.split()
        sobrenome = " ".join(partes[-2:]) if len(partes) > 1 else m_norm
        if sobrenome in nome_norm or m_norm in nome_norm or nome_norm in m_norm:
            return m["id"]
    return None


def data_iso(v):
    v = valor(v)
    if v is None:
        return None
    if isinstance(v, datetime):
        return v.isoformat()
    # às vezes vem como string 'dd/mm/aaaa'
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
        relator_bruto = valor(r.get("Relator Atual"))
        linhas.append({
            "processo": processo,
            "link_processo": valor(r.get("Link Processo")),
            "ministro_id": resolver_ministro(relator_bruto, ministros),
            "relator_atual_bruto": relator_bruto,
            "ramo_direito": valor(r.get("Ramo do Direito")),
            "assunto": valor(r.get("Assunto relacionado")),
            "meio_processo": valor(r.get("Meio Processo")),
            "data_autuacao": data_iso(r.get("Data Autuação")),
            "data_transito_julgado": data_iso(r.get("Data Trânsito Julgado")),
            "data_baixa": data_iso(r.get("Data Baixa")),
            "em_tramitacao": bool_sim_nao(r.get("Em tramitação?")),
            "situacao_processual": valor(r.get("Situação processual")),
            "tem_decisao_liminar": bool_sim_nao(r.get("Tem decisão liminar?")),
            "tem_decisao_final": bool_sim_nao(r.get("Tem decisão final?")),
            "tem_rito_art12": bool_sim_nao(r.get("Tem Rito Art 12?")),
            "legislacao": valor(r.get("Legislação")),
            "preferencia_ods": valor(r.get("Preferência ODS")),
            "data_publicacao_pauta": data_iso(r.get("Data Publicação Pauta")),
            "data_publicacao_pauta_primeira": data_iso(r.get("Data Publicação Pauta Primeira")),
            "data_publicacao_pauta_ultima": data_iso(r.get("Data Publicação Pauta Última")),
            "conta_publicacao_pauta": valor(r.get("Conta Publicação Pauta")),
            "data_publicacao_decisao_colegiada": data_iso(r.get("Data Publicação Decisão Colegiada")),
            "data_publicacao_decisao_colegiada_primeira": data_iso(r.get("Data Publicação Decisão Colegiada Primeira")),
            "data_publicacao_decisao_colegiada_ultima": data_iso(r.get("Data Publicação Decisão Colegiada Última")),
            "conta_publicacao_decisao_colegiada": valor(r.get("Conta Publicação Decisão Colegiada")),
            "data_decisao_final": data_iso(r.get("Data Decisão Final")),
            "data_decisao_final_primeira": data_iso(r.get("Data Decisão Final Primeira")),
            "data_decisao_final_ultima": data_iso(r.get("Data Decisão Final Última")),
            "conta_decisao_final": valor(r.get("Conta Decisão Final")),
            "data_publicacao_decisao_monocratica": data_iso(r.get("Data Publicação Decisão Monocrática")),
            "data_publicacao_decisao_monocratica_primeira": data_iso(r.get("Data Publicação Decisão Monocrática Primeira")),
            "data_publicacao_decisao_monocratica_ultima": data_iso(r.get("Data Publicação Decisão Monocrática Última")),
            "conta_publicacao_decisao_monocratica": valor(r.get("Conta Publicação Decisão Monocrática")),
        })
    return linhas


def run(dry_run: bool = False):
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    ministros = sb.table("stf_ministros").select("id, nome").execute().data

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        print("Abrindo painel de Controle Concentrado (navegador headless)...")
        xlsx_bytes = baixar_xlsx(page, URL_PAINEL, "Processos")
        browser.close()

    lote = processar(xlsx_bytes, ministros)
    resolvidos = sum(1 for l in lote if l["ministro_id"])
    print(f"  {len(lote)} processos ({resolvidos} com ministro_id resolvido, "
          f"{len(lote) - resolvidos} sem correspondência — relator histórico/'*NI*')")

    if not dry_run:
        for i in range(0, len(lote), 500):
            sb.table("stf_controle_concentrado").upsert(
                lote[i:i + 500], on_conflict="processo"
            ).execute()

    print(f"\n✅ {len(lote)} processos de controle concentrado "
          f"{'processados (dry-run, nada salvo)' if dry_run else 'gravados'}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    run(args.dry_run)
