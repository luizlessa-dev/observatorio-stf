"""
Calcula os scores do termômetro de tendência de voto por ministro.
Roda após fetch_votacoes_csv.py popular stf_votacoes.

Score 0–10: 0 = conservador / 10 = progressista
Dimensões ponderadas por categoria de processo (via tag na ementa).

Fonte alternativa para bootstrap: Base dos Dados
  pip install basedosdados
  import basedosdados as bd
  df = bd.read_sql("SELECT * FROM `basedosdados.br_stf_corte_suprema.votacao`", billing_project_id="...")
"""

import os
from supabase import create_client

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

# Palavras-chave por dimensão para classificar votos via ementa
DIMENSOES = {
    "score_direitos_civis": [
        "aborto", "lgbtq", "racial", "indígena", "quilombola",
        "deficiência", "discriminação", "igualdade",
    ],
    "score_lib_imprensa": [
        "imprensa", "censura", "jornalismo", "liberdade de expressão",
        "fake news", "internet", "redes sociais", "sigilo",
    ],
    "score_seg_publica": [
        "policia", "prisão", "habeas corpus", "execução penal",
        "tráfico", "arma", "milícia", "flagrante",
    ],
    "score_economico": [
        "tributário", "imposto", "privatização", "concessão",
        "regulação", "mercado", "previdência", "trabalhista",
    ],
    "score_democracia": [
        "democracia", "eleição", "partido", "mandato", "inelegibilidade",
        "golpe", "impeachment", "soberania", "constituição",
    ],
}

# Votos progressistas = "favor" em causas progressistas ou "contra" em causas conservadoras
PROGRESSISTA_FAVOR  = ["direitos_civis", "lib_imprensa", "democracia"]
PROGRESSISTA_CONTRA = ["seg_publica"]  # voto contra punitivismo = progressista

def calcular_score(votos: list[dict], dim_key: str) -> float:
    keywords = DIMENSOES[dim_key]
    relevantes = [
        v for v in votos
        if any(kw in v["ementa"].lower() for kw in keywords)
    ]
    if not relevantes:
        return 5.0  # neutro se sem dados

    prog = sum(1 for v in relevantes if v["voto"] == "favor")
    total = len(relevantes)
    return round((prog / total) * 10, 2)

def run():
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    ministros = sb.table("stf_ministros").select("id, nome").execute().data

    for m in ministros:
        votos = sb.table("stf_votacoes") \
            .select("voto, ementa") \
            .eq("ministro_id", m["id"]) \
            .execute().data

        if not votos:
            print(f"[{m['nome']}] sem votos — pulando")
            continue

        scores = {dim: calcular_score(votos, dim) for dim in DIMENSOES}
        score_geral = round(sum(scores.values()) / len(scores), 2)

        sb.table("stf_ministros").update({
            "score_geral":          score_geral,
            **scores,
            "updated_at":           "now()",
        }).eq("id", m["id"]).execute()

        print(f"[{m['nome']}] geral={score_geral} {scores}")

if __name__ == "__main__":
    run()
