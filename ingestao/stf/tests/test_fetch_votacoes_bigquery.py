"""
Testes de regressão da Fase D1 (recuperação governada da ingestão via WIF).

Não dependem de secrets reais, rede, Supabase ou BigQuery: usam valores
fictícios apenas para satisfazer a leitura de variáveis obrigatórias no
carregamento do módulo, e não chamam run() (que exigiria BigQuery/Supabase
reais).

Execução: python3 -m unittest discover -s ingestao/stf/tests
"""

import importlib.util
import os
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SCRIPT = ROOT / "ingestao" / "stf" / "fetch_votacoes_bigquery.py"


def _carregar_modulo():
    os.environ.setdefault("SUPABASE_URL", "http://test.invalid")
    os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-key-fake")
    spec = importlib.util.spec_from_file_location("fetch_votacoes_bigquery", SCRIPT)
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo


mod = _carregar_modulo()


class TestTravaDeDestino(unittest.TestCase):
    def test_destino_autorizado_resolve_stf_votacoes(self):
        self.assertEqual(mod.resolver_destino(), "stf_votacoes")

    def test_schema_diferente_de_public_falha(self):
        original = mod.DESTINATION_SCHEMA
        try:
            mod.DESTINATION_SCHEMA = "outro_schema"
            with self.assertRaises(RuntimeError):
                mod.resolver_destino()
        finally:
            mod.DESTINATION_SCHEMA = original

    def test_tabela_sem_prefixo_stf_falha(self):
        original = mod.DESTINATION_TABLE
        try:
            mod.DESTINATION_TABLE = "votacoes"
            with self.assertRaises(RuntimeError):
                mod.resolver_destino()
        finally:
            mod.DESTINATION_TABLE = original

    def test_tabela_vazia_falha(self):
        original = mod.DESTINATION_TABLE
        try:
            mod.DESTINATION_TABLE = ""
            with self.assertRaises(RuntimeError):
                mod.resolver_destino()
        finally:
            mod.DESTINATION_TABLE = original

    def test_tabela_diferente_de_stf_votacoes_falha(self):
        original = mod.DESTINATION_TABLE
        try:
            mod.DESTINATION_TABLE = "stf_outra_tabela"
            with self.assertRaises(RuntimeError):
                mod.resolver_destino()
        finally:
            mod.DESTINATION_TABLE = original


class TestTransformacaoBasica(unittest.TestCase):
    def test_normalizar_voto_mapeia_deferido_para_favor(self):
        self.assertEqual(mod.normalizar_voto("Deferido"), "favor")

    def test_normalizar_voto_desconhecido_e_ausente(self):
        self.assertEqual(mod.normalizar_voto("andamento nunca visto"), "ausente")

    def test_normalizar_resultado_mapeia_provido_para_procedente(self):
        self.assertEqual(mod.normalizar_resultado("Provido"), "procedente")

    def test_normalizar_resultado_mapeia_denegada_a_ordem_para_improcedente(self):
        self.assertEqual(mod.normalizar_resultado("Denegada a ordem"), "improcedente")

    # BUG PRÉ-EXISTENTE (achado ao escrever este teste na Fase D1, não
    # introduzido nem corrigido nesta etapa — fora do escopo autorizado de
    # WIF/dry-run). normalizar_voto/normalizar_resultado fazem correspondência
    # por substring (`if k in a`) sobre um dict cuja ordem de inserção coloca
    # "deferido", "provido" e "procedente" antes de "indeferido", "não
    # provido" e "improcedente" — que os contêm como substring. Resultado:
    # "Indeferido", "Não Provido" e "Improcedente" (categoria "contra"/
    # "improcedente") são classificados como "favor"/"procedente". Só
    # "Denegada a ordem" (sem colisão de substring) escapa do bug, coberto
    # pelo teste acima. Estes três testes documentam o comportamento ATUAL —
    # não o correto — para que a correção seja feita conscientemente em uma
    # etapa própria, com avaliação do impacto nos ~758 mil registros já
    # existentes em stf_votacoes. Ver riscos críticos no relatório da Fase D1.
    def test_BUG_normalizar_voto_indeferido_e_classificado_como_favor(self):
        self.assertEqual(mod.normalizar_voto("Indeferido"), "favor")

    def test_BUG_normalizar_voto_nao_provido_e_classificado_como_favor(self):
        self.assertEqual(mod.normalizar_voto("Não Provido"), "favor")

    def test_BUG_normalizar_voto_improcedente_e_classificado_como_favor(self):
        self.assertEqual(mod.normalizar_voto("Improcedente"), "favor")


class TestGuardaDeEscritaNoCodigoFonte(unittest.TestCase):
    """Verificação estática: todo upsert() no script está atrás de `if not dry_run:`."""

    def test_upserts_estao_guardados_por_dry_run(self):
        src = SCRIPT.read_text(encoding="utf-8")
        blocos = src.split("upsert(")[:-1]  # cada elemento termina logo antes de um upsert(
        self.assertGreaterEqual(len(blocos), 2, "esperava pelo menos 2 chamadas a upsert() (lote + flush final)")
        for bloco in blocos:
            trecho_anterior = bloco[-120:]
            self.assertIn(
                "if not dry_run:",
                trecho_anterior,
                "toda chamada a upsert() deveria estar imediatamente atrás de 'if not dry_run:'",
            )

    def test_dry_run_registra_tabela_de_destino_antes_de_qualquer_escrita(self):
        src = SCRIPT.read_text(encoding="utf-8")
        pos_print = src.index("Tabela de destino autorizada")
        pos_upsert = src.index("upsert(")
        self.assertLess(pos_print, pos_upsert, "o log da tabela de destino deveria vir antes do primeiro upsert()")


class TestVariaveisObrigatorias(unittest.TestCase):
    def test_ausencia_de_supabase_url_falha_no_import(self):
        env = os.environ.copy()
        env.pop("SUPABASE_URL", None)
        env.pop("SUPABASE_SERVICE_ROLE_KEY", None)
        resultado = subprocess.run(
            [sys.executable, "-c", f"exec(open({str(SCRIPT)!r}).read())"],
            env=env,
            capture_output=True,
            text=True,
        )
        self.assertNotEqual(resultado.returncode, 0, "import sem SUPABASE_URL deveria falhar")
        self.assertIn("SUPABASE_URL", resultado.stderr)


if __name__ == "__main__":
    unittest.main()
