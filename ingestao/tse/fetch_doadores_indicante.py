"""
Ingestão: TSE — doadores das campanhas dos presidentes indicantes
Cruza dados já ingeridos no BR Insider (tse_receitas) com ministros do STF.
Requer acesso ao banco do brasilia-insider ou export CSV do TSE.
"""

import os
from supabase import create_client

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

# CPFs dos presidentes que indicaram ministros ativos
PRESIDENTES = {
    "lula_1":    {"cpf": "---",  "nome": "Lula (1º mandato)", "ano_eleicao": 2002},
    "dilma":     {"cpf": "---",  "nome": "Dilma Rousseff",    "ano_eleicao": 2010},
    "temer":     {"cpf": "---",  "nome": "Michel Temer",      "ano_eleicao": 2014},
    "bolsonaro": {"cpf": "---",  "nome": "Jair Bolsonaro",    "ano_eleicao": 2018},
    "lula_3":    {"cpf": "---",  "nome": "Lula (3º mandato)", "ano_eleicao": 2022},
    "fhc":       {"cpf": "---",  "nome": "FHC",               "ano_eleicao": 1998},
}

# Mapeamento ministro → presidente
MINISTRO_PRESIDENTE = {
    "Alexandre de Moraes":  "temer",
    "Edson Fachin":         "dilma",
    "Cármen Lúcia":         "lula_1",
    "Dias Toffoli":         "lula_1",
    "Luiz Fux":             "dilma",
    "Gilmar Mendes":        "fhc",
    "Cristiano Zanin":      "lula_3",
    "Flávio Dino":          "lula_3",
    "Nunes Marques":        "bolsonaro",
    "André Mendonça":       "bolsonaro",
}

def run():
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Busca ministros
    ministros = sb.table("stf_ministros").select("id, nome").execute().data

    for m in ministros:
        pres_key = MINISTRO_PRESIDENTE.get(m["nome"])
        if not pres_key:
            continue

        pres = PRESIDENTES[pres_key]
        print(f"Buscando doadores de {pres['nome']} para {m['nome']}...")

        # TODO: conectar ao banco do brasilia-insider via SUPABASE_URL_BRINSIDER
        # ou importar CSV do TSE diretamente
        # Exemplo de query no BR Insider:
        # SELECT nr_cnpj_cpf_doador, nm_doador, vr_receita
        # FROM tse_receitas
        # WHERE nr_cpf_candidato = '{pres["cpf"]}'
        #   AND ano_eleicao = {pres["ano_eleicao"]}
        # ORDER BY vr_receita DESC LIMIT 50

if __name__ == "__main__":
    run()
