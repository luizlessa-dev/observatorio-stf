"""
Utilitários compartilhados pelos scripts de ingestão dos painéis Corte
Aberta (Qlik Sense) que exportam via botão nativo (.xlsx) na barra
superior — diferente de fetch_passagens_diarias.py, que usa a extensão
swr-sense-export (.csv). Ver fetch_controle_concentrado.py e
fetch_reclamacoes.py para o uso.

O seletor do botão de export (`#MainHeader a.nav-link.d-none.d-md-block`,
primeiro elemento) é estável entre painéis — o rótulo do botão muda (varia
com o nome da aba/objeto ativo), mas a classe e a posição, não.
"""

import base64

NI = "*NI*"


def baixar_xlsx(page, url_painel: str, sidebar_label: str) -> bytes:
    page.goto(url_painel, wait_until="load", timeout=60000)
    page.wait_for_timeout(9000)

    item = page.get_by_text(sidebar_label, exact=True).first
    item.wait_for(state="visible", timeout=20000)
    item.click()
    page.wait_for_timeout(4000)

    # limpa qualquer filtro/seleção residual de sessão anterior — o export
    # "reflete o filtro atual", então isso importa de verdade
    try:
        page.locator("#MainHeader").get_by_text("Limpar", exact=True).first.click(timeout=3000)
        page.wait_for_timeout(1500)
    except Exception:
        pass

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
    page.wait_for_function("() => window.__exportUrl !== null", timeout=30000)
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


def valor(v):
    """'*NI*' -> None; string vazia -> None; resto passa direto."""
    if v is None or v == NI or v == "":
        return None
    return v


def bool_sim_nao(v):
    v = valor(v)
    if v is None:
        return None
    return str(v).strip().lower() == "sim"
