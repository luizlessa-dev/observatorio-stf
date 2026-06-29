"""
Calcula os scores do termômetro de tendência de voto por ministro.
Roda após fetch_votacoes_bigquery.py popular stf_votacoes.

Score 0–10: 0 = conservador / 10 = progressista

Metodologia (v2):
  Usa palavras-chave no campo assunto_processo (não narrativo) para identificar
  votos em matérias com conotação ideológica. O score é normalizado
  Z-score entre os ministros e rescalonado para 0–10, de modo que
  os valores reflitam posição *relativa* dentro da corte atual —
  mais honesto do que valores absolutos de proporção bruta.

  Dimensões:
    - Direitos civis: processos sobre minorias, indígenas, igualdade
    - Liberdade de imprensa: sigilo, liberdade de expressão, internet
    - Segurança pública: punitivismo (favor = punitivista = conservador)
    - Econômico: livre mercado vs. regulação (favor tributário = conservador)
    - Democracia: eleições, mandato, inelegibilidade

  Para seg_publica e economico o sinal é invertido (favor = conservador).
"""

import os, math
from supabase import create_client

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

# Palavras-chave no assunto_processo por dimensão
DIMENSOES = {
    "score_direitos_civis": {
        "kw": ["indígena", "quilombola", "racial", "lgb", "aborto",
               "deficiência", "discriminação", "igualdade", "criança",
               "mulher", "feminicídio", "minoria"],
        "prog_eh_favor": True,
    },
    "score_lib_imprensa": {
        "kw": ["imprensa", "censura", "liberdade de expressão", "sigilo",
               "fake news", "internet", "redes sociais", "jornalismo",
               "manifestação", "liberdade de reunião"],
        "prog_eh_favor": True,
    },
    "score_seg_publica": {
        "kw": ["habeas corpus", "prisão preventiva", "liberdade provisória",
               "tráfico", "execução penal", "regime", "pena", "flagrante",
               "investigação criminal", "policial"],
        "prog_eh_favor": False,  # favor = punitivista = conservador → inverter
    },
    "score_economico": {
        "kw": ["tributário", "contribuição", "imposto", "previdência",
               "trabalhista", "privatização", "concessão", "regulação",
               "fgts", "salário", "benefício"],
        "prog_eh_favor": False,  # favor em tributário = pro-fisco/estado = progressista?
                                 # Na ausência de narrativa, mantemos neutro como base
        "neutro": True,          # dimensão difícil de inferir — peso reduzido
    },
    "score_democracia": {
        "kw": ["elei", "partido", "mandato", "inelegibilidade",
               "impeachment", "soberania", "constituição", "democracia",
               "direito político", "ação penal"],
        "prog_eh_favor": True,
    },
}

MIN_VOTOS_RELEVANTES = 3  # ignora dimensão se menos de N votos relevantes


def taxa_bruta(votos: list, dim_cfg: dict):
    """Proporção de votos progressistas nos processos relevantes da dimensão."""
    kws = dim_cfg["kw"]
    relevantes = [v for v in votos if any(kw in v["ementa"].lower() for kw in kws)]
    if len(relevantes) < MIN_VOTOS_RELEVANTES:
        return None

    favor = sum(1 for v in relevantes if v["voto"] == "favor")
    taxa = favor / len(relevantes)

    if not dim_cfg.get("prog_eh_favor", True) and not dim_cfg.get("neutro"):
        taxa = 1.0 - taxa  # inverte o sinal (favor = conservador)

    return taxa


def normalizar_zscore(valores: list) -> list:
    """Z-score rescalonado para 0–10. None → 5.0 (neutro)."""
    reais = [v for v in valores if v is not None]
    if len(reais) < 2:
        return [5.0] * len(valores)

    media = sum(reais) / len(reais)
    desvio = math.sqrt(sum((x - media) ** 2 for x in reais) / len(reais))
    if desvio == 0:
        return [5.0] * len(valores)

    resultado = []
    for v in valores:
        if v is None:
            resultado.append(5.0)
        else:
            z = (v - media) / desvio
            # clamp em ±2.5 desvios e rescala para 0–10
            z_clamped = max(-2.5, min(2.5, z))
            resultado.append(round((z_clamped + 2.5) / 5.0 * 10, 2))
    return resultado


def run():
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    ministros = sb.table("stf_ministros").select("id, nome").execute().data

    # 1ª passagem: calcular taxas brutas de todos os ministros por dimensão
    dados: dict[str, dict] = {}  # ministro_id → {dim: taxa_bruta}
    for m in ministros:
        votos = (sb.table("stf_votacoes")
                   .select("voto, ementa")
                   .eq("ministro_id", m["id"])
                   .execute().data)
        if not votos:
            print(f"[{m['nome']}] sem votos — pulando")
            continue
        dados[m["id"]] = {
            "nome": m["nome"],
            "taxas": {dim: taxa_bruta(votos, cfg) for dim, cfg in DIMENSOES.items()},
        }

    if not dados:
        print("Nenhum dado disponível.")
        return

    ids = list(dados.keys())

    # 2ª passagem: normalizar por dimensão (Z-score entre ministros)
    for dim in DIMENSOES:
        taxas = [dados[mid]["taxas"][dim] for mid in ids]
        norm  = normalizar_zscore(taxas)
        for mid, score in zip(ids, norm):
            dados[mid].setdefault("scores", {})[dim] = score

    # 3ª passagem: score geral = média das dimensões com dados (exceto neutro)
    for mid, info in dados.items():
        dims_validas = [
            d for d, cfg in DIMENSOES.items()
            if not cfg.get("neutro")
        ]
        score_geral = round(
            sum(info["scores"][d] for d in dims_validas) / len(dims_validas), 2
        )
        info["scores"]["score_geral"] = score_geral

        sb.table("stf_ministros").update({
            "score_geral":          score_geral,
            "score_direitos_civis": info["scores"]["score_direitos_civis"],
            "score_lib_imprensa":   info["scores"]["score_lib_imprensa"],
            "score_seg_publica":    info["scores"]["score_seg_publica"],
            "score_economico":      info["scores"]["score_economico"],
            "score_democracia":     info["scores"]["score_democracia"],
            "updated_at":           "now()",
        }).eq("id", mid).execute()

        print(
            f"[{info['nome']}] geral={score_geral:4.1f} | "
            + " | ".join(f"{d.replace('score_','')[:4]}={info['scores'][d]:4.1f}" for d in DIMENSOES)
        )


if __name__ == "__main__":
    run()
