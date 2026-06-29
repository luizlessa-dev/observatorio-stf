"""
Ingestão: STF Estatística — votações por ministro (CSV)
Fonte: https://portal.stf.jus.br/estatistica/
Método: download CSV do painel Corte Aberta + upsert Supabase
"""

import os, requests, csv, io
from datetime import date
from supabase import create_client

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

# URL do export CSV do painel de decisões STF (verificar se mudou)
STF_CSV_URL = "https://transparencia.stf.jus.br/extensions/decisoes/decisoes.csv"

def run():
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    print("Baixando CSV de votações STF...")
    r = requests.get(STF_CSV_URL, timeout=60)
    r.raise_for_status()

    reader = csv.DictReader(io.StringIO(r.text))
    rows = []
    for row in reader:
        rows.append({
            "processo":  row.get("numero_processo", "").strip(),
            "classe":    row.get("classe", "").strip(),
            "data":      row.get("data_julgamento", "").strip(),
            "ementa":    row.get("ementa", "").strip()[:500],
            "voto":      normalizar_voto(row.get("resultado_ministro", "")),
            "resultado": normalizar_resultado(row.get("resultado", "")),
        })

    print(f"{len(rows)} votações encontradas")
    # TODO: resolver ministro_id via nome do ministro no CSV
    # sb.table("stf_votacoes").upsert(rows).execute()

def normalizar_voto(v: str) -> str:
    v = v.lower().strip()
    if "favor" in v:   return "favor"
    if "contra" in v:  return "contra"
    if "absten" in v:  return "abstencao"
    return "ausente"

def normalizar_resultado(v: str) -> str | None:
    v = v.lower().strip()
    if "procedente" in v and "impro" not in v: return "procedente"
    if "improcedente" in v: return "improcedente"
    if "parcial" in v:      return "parcial"
    return None

if __name__ == "__main__":
    run()
