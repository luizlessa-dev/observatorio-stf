"""
Ingestão: STF Corte Aberta (Base dos Dados / BigQuery)
Tabela: basedosdados.br_stf_corte_aberta.decisoes
Projeto de billing: brinsider-dou

Mapeamento:
  relator  → ministro (via tabela stf_ministros)
  andamento → voto (ver MAPA_VOTO abaixo)
  assunto  → dimensão do termômetro (ver DIMENSOES em calc_scores_termometro.py)

Execução:
  python3 ingestao/stf/fetch_votacoes_bigquery.py [--ano 2024] [--dry-run]
"""

import os, sys, re, argparse
from datetime import date
from supabase import create_client
from google.cloud import bigquery
import warnings
warnings.filterwarnings("ignore")

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
GCP_PROJECT   = os.environ.get("GCP_PROJECT", "brinsider-dou")

# Andamento → voto individual do relator
MAPA_VOTO = {
    "deferido":            "favor",
    "deferido em parte":   "favor",
    "provido":             "favor",
    "parcialmente provido":"favor",
    "concedida a ordem":   "favor",
    "procedente":          "favor",
    "procedente em parte": "favor",
    "indeferido":          "contra",
    "não provido":         "contra",
    "denegada a ordem":    "contra",
    "improcedente":        "contra",
    "prejudicado":         "abstencao",
    "sobrestado":          "abstencao",
}

# Andamento → resultado (do colegiado)
MAPA_RESULTADO = {
    "deferido":            "procedente",
    "deferido em parte":   "parcial",
    "provido":             "procedente",
    "parcialmente provido":"parcial",
    "concedida a ordem":   "procedente",
    "procedente":          "procedente",
    "procedente em parte": "parcial",
    "indeferido":          "improcedente",
    "não provido":         "improcedente",
    "denegada a ordem":    "improcedente",
    "improcedente":        "improcedente",
}

# Nome no BigQuery → iniciais do banco
MAPA_MINISTRO = {
    "Min. Alexandre De Moraes":  "AM",
    "Min. Alexandre de Moraes":  "AM",
    "Min. Edson Fachin":         "EF",
    "Min. Cármen Lúcia":         "CL",
    "Min. Carmen Lucia":         "CL",
    "Min. Dias Toffoli":         "DT",
    "Min. Luiz Fux":             "LF",
    "Min. Gilmar Mendes":        "GM",
    "Min. Cristiano Zanin":      "CZ",
    "Min. Flávio Dino":          "FD",
    "Min. Flavio Dino":          "FD",
    "Min. Nunes Marques":        "NM",
    "Min. André Mendonça":       "AM2",
    "Min. Andre Mendonca":       "AM2",
    # Ministros já aposentados (para histórico)
    "Min. Luís Roberto Barroso": "LRB",
    "Min. Luis Roberto Barroso": "LRB",
    "Min. Rosa Weber":           "RW",
    "Min. Ricardo Lewandowski":  "RL",
    "Min. Marco Aurélio":        "MA",
    "Min. Marco Aurelio":        "MA",
    "Min. Celso De Mello":       "CM",
}

def normalizar_voto(andamento: str) -> str:
    a = andamento.lower().strip()
    for k, v in MAPA_VOTO.items():
        if k in a:
            return v
    return "ausente"

def normalizar_resultado(andamento: str):
    a = andamento.lower().strip()
    for k, v in MAPA_RESULTADO.items():
        if k in a:
            return v
    return None

def run(ano: int, dry_run: bool = False):
    sb   = create_client(SUPABASE_URL, SUPABASE_KEY)
    bqc  = bigquery.Client(project=GCP_PROJECT)

    # Buscar IDs dos ministros no Supabase
    rows_min = sb.table("stf_ministros").select("id, iniciais, nome").execute().data
    iniciais_to_id = {m["iniciais"]: m["id"] for m in rows_min}
    print(f"Ministros no banco: {list(iniciais_to_id.keys())}")

    # Query BigQuery — apenas decisões monocráticas do relator (= voto individual)
    # Decisões colegiadas têm relator mas o voto coletivo não é desagregado aqui
    q = f"""
    SELECT
        classe,
        numero,
        relator,
        andamento,
        tipo_julgamento,
        assunto_processo,
        data_decisao
    FROM `basedosdados.br_stf_corte_aberta.decisoes`
    WHERE ano = {ano}
      AND relator IS NOT NULL
      AND andamento IS NOT NULL
      AND tipo_julgamento = 'Monocrática'
    ORDER BY data_decisao DESC
    """

    print(f"Baixando decisões monocráticas de {ano}...")
    rows = list(bqc.query(q).result())
    print(f"{len(rows):,} decisões encontradas")

    inseridos = 0
    sem_ministro = set()

    lote = []
    for r in rows:
        relator = str(r["relator"]).strip()
        iniciais = MAPA_MINISTRO.get(relator)

        if not iniciais:
            sem_ministro.add(relator)
            continue

        ministro_id = iniciais_to_id.get(iniciais)
        if not ministro_id:
            # Ministro histórico (ex-ministro) — pula
            continue

        andamento = str(r["andamento"] or "").strip()
        data = r["data_decisao"].isoformat() if r["data_decisao"] else None
        if not data:
            continue

        processo = f"{r['classe']} {r['numero']}".strip()
        ementa   = (str(r["assunto_processo"] or "")[:500]
                    .replace("_X000d_", " — "))

        lote.append({
            "ministro_id": ministro_id,
            "processo":    processo,
            "classe":      str(r["classe"] or ""),
            "data":        data,
            "ementa":      ementa,
            "voto":        normalizar_voto(andamento),
            "resultado":   normalizar_resultado(andamento),
        })

        if len(lote) >= 500:
            lote_unico = list({(r["ministro_id"], r["processo"], r["data"]): r for r in lote}.values())
            if not dry_run:
                sb.table("stf_votacoes").upsert(
                    lote_unico,
                    on_conflict="ministro_id,processo,data"
                ).execute()
            inseridos += len(lote_unico)
            print(f"  {inseridos:,} inseridos...")
            lote = []

    if lote:
        lote_unico = list({(r["ministro_id"], r["processo"], r["data"]): r for r in lote}.values())
        if not dry_run:
            sb.table("stf_votacoes").upsert(
                lote_unico,
                on_conflict="ministro_id,processo,data"
            ).execute()
        inseridos += len(lote_unico)

    print(f"\n✅ {inseridos:,} votações inseridas no Supabase (ano={ano})")

    if sem_ministro:
        print(f"\n⚠️  Relatores não mapeados ({len(sem_ministro)}):")
        for r in sorted(sem_ministro):
            print(f"  {r}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--ano",     type=int, default=date.today().year)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    run(args.ano, args.dry_run)
