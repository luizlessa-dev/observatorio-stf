"""
Ingestão: Recebimento e Baixa de processos — Corte Aberta
Fonte: transparencia.stf.jus.br/extensions/recebidos_baixados (Qlik Sense)

Diferente dos outros painéis Corte Aberta recentes, o export nativo aqui
sai como .csv (não .xlsx) — conferido baixando o arquivo real antes de
escrever este script.

Escopo: ANO CORRENTE, não histórico completo — decisão deliberada, ao
contrário do que a primeira tentativa sugeria. O painel fixa uma variável
`ano_andamento` (2026 na captura) como filtro padrão; o passo "Limpar"
do helper compartilhado (_corte_aberta_qlik.baixar_xlsx) remove esse
filtro junto com o resto, e isso faz o volume explodir de ~60 mil para
1,83 MILHÃO de linhas só em "baixados" (histórico desde a fundação do
tribunal). Ingerir isso tudo não se justificou neste momento — por isso
este script usa baixar_ano_atual() aqui embaixo, uma variante que pula o
"Limpar" e preserva o filtro de ano. Se um dia fizer sentido editorial
ter o histórico completo, é um projeto à parte, não uma ingestão de
rotina.

Duas abas, duas chamadas de baixar_ano_atual(): "Lista de recebidos" e
"Lista de baixados". Cada linha é um EVENTO de movimentação (recebimento
ou baixa), não um processo único — por isso a tabela permite o mesmo
processo aparecer uma vez em cada lista. A coluna "Relator" vem sempre
vazia em "Lista de recebidos" (processo só ganha relator na distribuição,
não na autuação) — ministro_id fica null para todo esse lado, por
desenho da fonte, não por falha de resolução.

"-" é o placeholder de vazio deste export específico (diferente de
"*NI*" usado nos painéis .xlsx) — daí o valor_csv() próprio em vez do
valor() de _corte_aberta_qlik.

Execução:
  python3 ingestao/stf/fetch_recebimento_baixa.py [--dry-run]
"""

import argparse
import csv
import io
import os
import re
import unicodedata
import warnings
from datetime import datetime

from playwright.sync_api import sync_playwright
from supabase import create_client

warnings.filterwarnings("ignore")


def baixar_ano_atual(page, url_painel: str, sidebar_label: str) -> bytes:
    """Como _corte_aberta_qlik.baixar_xlsx, mas SEM o clique em "Limpar" —
    preserva o filtro `ano_andamento` fixado no painel em vez de limpar
    pra histórico completo. Ver nota de escopo no topo do arquivo."""
    import base64

    page.goto(url_painel, wait_until="load", timeout=60000)
    page.wait_for_timeout(9000)

    item = page.get_by_text(sidebar_label, exact=True).first
    item.wait_for(state="visible", timeout=20000)
    item.click()
    page.wait_for_timeout(4000)

    page.evaluate(
        """() => {
            window.__exportUrl = null;
            window.open = function(url) {
                window.__exportUrl = url;
                return { close(){}, focus(){}, closed:false };
            };
        }"""
    )
    page.locator("#MainHeader a.nav-link.d-none.d-md-block").first.click()
    page.wait_for_function("() => window.__exportUrl !== null", timeout=90000)
    page.wait_for_timeout(3000)

    ultimo_erro = None
    for _ in range(5):
        try:
            b64 = page.evaluate(
                """async () => {
                    const full = new URL(window.__exportUrl, location.origin).href;
                    const resp = await fetch(full, { credentials: 'include' });
                    if (!resp.ok) throw new Error('status ' + resp.status);
                    const buf = await resp.arrayBuffer();
                    let binary = '';
                    const bytes = new Uint8Array(buf);
                    const chunk = 0x8000;
                    for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
                    return btoa(binary);
                }"""
            )
            return base64.b64decode(b64)
        except Exception as e:
            ultimo_erro = e
            page.wait_for_timeout(4000)
    raise RuntimeError(f"export falhou após 5 tentativas: {ultimo_erro}")

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

URL_PAINEL = "https://transparencia.stf.jus.br/extensions/recebidos_baixados/recebidos_baixados.html"


def normalizar(txt: str) -> str:
    txt = unicodedata.normalize("NFD", txt)
    return "".join(c for c in txt if unicodedata.category(c) != "Mn").upper().strip()


def resolver_ministro(relator_bruto: str, ministros: list[dict]) -> str | None:
    if not relator_bruto:
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


def valor_csv(v):
    """'-' e string vazia -> None; resto passa direto (.strip())."""
    if v is None:
        return None
    v = v.strip()
    return None if v in ("", "-") else v


def data_iso_csv(v):
    v = valor_csv(v)
    if v is None:
        return None
    try:
        d, m, a = v.split("/")
        return f"{a}-{m}-{d}"
    except ValueError:
        return None


def bool_sim_nao_csv(v):
    v = valor_csv(v)
    if v is None:
        return None
    return v.strip().lower() == "sim"


def linhas_brutas(dados: bytes):
    """O export desse painel alterna formato (xlsx com filtro de ano
    ativo, csv puro sem ele — confirmado nas duas capturas reais, sem
    padrão claro do porquê) — detecta pela assinatura em vez de assumir.
    Cada linha já sai como dict {coluna: valor}."""
    if dados[:2] == b"PK":
        import openpyxl
        wb = openpyxl.load_workbook(io.BytesIO(dados), read_only=True)
        ws = wb[wb.sheetnames[0]]
        rows = ws.iter_rows(values_only=True)
        header = [str(h).strip() for h in next(rows)]
        for row in rows:
            yield dict(zip(header, row))
    else:
        texto = dados.decode("utf-8")
        yield from csv.DictReader(io.StringIO(texto))


def data_iso_qualquer(v):
    """Data vinda de csv (string 'dd/mm/aaaa') ou xlsx (datetime nativo)."""
    if isinstance(v, datetime):
        return v.isoformat()
    return data_iso_csv(v) if isinstance(v, str) else None


def processar(dados: bytes, ministros: list[dict]) -> list[dict]:
    """Uma única exportação já traz os dois tipos de andamento
    combinados (recebido + baixado) — confirmado nas duas capturas reais
    (mesma contagem 63.901/60.413 batendo com os KPIs do painel,
    independente de qual aba do sidebar disparou o export). Por isso só
    existe um `dados`, não um por tipo_andamento."""
    linhas = []
    for r in linhas_brutas(dados):
        classe = valor_csv(r.get("Classe"))
        numero_bruto = r.get("Número")
        if not classe or numero_bruto in (None, "", "-"):
            continue
        tipo_andamento = valor_csv(r.get("Tipo andamento"))
        relator_bruto = valor_csv(r.get("Relator"))
        try:
            numero = int(numero_bruto)
        except (ValueError, TypeError):
            continue
        qtd_bruto = r.get("Qtd de processos")
        linhas.append({
            "tipo_andamento": tipo_andamento,
            "classe": classe,
            "numero": numero,
            "ministro_id": resolver_ministro(relator_bruto, ministros),
            "relator_bruto": relator_bruto,
            "link_processo": valor_csv(r.get("Link")),
            "meio_processo": valor_csv(r.get("Meio processo")),
            "grupo_origem": valor_csv(r.get("Grupo origem")),
            "data_autuacao": data_iso_qualquer(r.get("Data autuação")),
            "em_tramitacao": bool_sim_nao_csv(r.get("Em tramitação")),
            "data_baixa": data_iso_qualquer(r.get("Data baixa")),
            "ultima_localizacao": valor_csv(r.get("Última localização")),
            "orgao_origem": valor_csv(r.get("Órgão origem")),
            "procedencia": valor_csv(r.get("Procedência")),
            "ramo_direito": valor_csv(r.get("Ramo do direito")),
            "assunto_completo": valor_csv(r.get("Assunto completo")),
            "qtd_processos": int(qtd_bruto) if qtd_bruto not in (None, "", "-") else None,
        })
    return linhas


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
            print("Abrindo painel de Recebimento e Baixa (navegador headless)...")
            dados = baixar_ano_atual(page, URL_PAINEL, "Lista de recebidos")
            browser.close()

    lote = processar(dados, ministros)
    resolvidos = sum(1 for l in lote if l["ministro_id"])
    print(f"  {len(lote)} eventos ({resolvidos} com ministro_id resolvido, "
          f"{len(lote) - resolvidos} sem correspondência)")

    if not dry_run:
        for i in range(0, len(lote), 500):
            sb.table("stf_recebimento_baixa").upsert(
                lote[i:i + 500], on_conflict="classe,numero,tipo_andamento"
            ).execute()

    print(f"\n✅ {len(lote)} eventos de recebimento/baixa "
          f"{'processados (dry-run, nada salvo)' if dry_run else 'gravados'}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--arquivo-local", help="Usa um export já baixado em vez de acessar o painel")
    args = parser.parse_args()
    run(args.dry_run, args.arquivo_local)
