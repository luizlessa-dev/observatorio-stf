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


class TestNormalizacaoVoto(unittest.TestCase):
    """Fase D2: corrige o bug de correspondência por substring em ordem
    incorreta (achado e documentado — não corrigido — na Fase D1). Termos
    específicos/negativos ("indeferido", "não provido", "improcedente",
    "provido em parte") são substring de termos genéricos/positivos
    ("deferido", "provido", "procedente") e por isso precisam ser checados
    antes deles. Ver docs/auditoria-fonte-e-normalizacao-votacoes.md."""

    def test_deferido_e_favor(self):
        self.assertEqual(mod.normalizar_voto("Deferido"), "favor")

    def test_indeferido_e_contra(self):
        self.assertEqual(mod.normalizar_voto("Indeferido"), "contra")

    def test_provido_e_favor(self):
        self.assertEqual(mod.normalizar_voto("Provido"), "favor")

    def test_nao_provido_e_contra(self):
        self.assertEqual(mod.normalizar_voto("Não Provido"), "contra")

    def test_parcialmente_provido_e_favor(self):
        self.assertEqual(mod.normalizar_voto("Parcialmente Provido"), "favor")

    def test_provido_em_parte_e_favor(self):
        self.assertEqual(mod.normalizar_voto("Provido Em Parte"), "favor")

    def test_procedente_e_favor(self):
        self.assertEqual(mod.normalizar_voto("Procedente"), "favor")

    def test_improcedente_e_contra(self):
        self.assertEqual(mod.normalizar_voto("Improcedente"), "contra")

    def test_parcialmente_procedente_e_favor(self):
        self.assertEqual(mod.normalizar_voto("Parcialmente Procedente"), "favor")

    def test_denegada_a_ordem_e_contra(self):
        self.assertEqual(mod.normalizar_voto("Denegada a ordem"), "contra")

    def test_concedida_a_ordem_e_favor(self):
        self.assertEqual(mod.normalizar_voto("Concedida a ordem"), "favor")

    def test_caixa_diferente_nao_afeta_classificacao(self):
        self.assertEqual(mod.normalizar_voto("INDEFERIDO"), "contra")
        self.assertEqual(mod.normalizar_voto("indeferido"), "contra")

    def test_acentuacao_diferente_nao_afeta_classificacao(self):
        # variante sem o "ã" (ex.: fonte com encoding degradado) deve
        # classificar igual à forma acentuada
        self.assertEqual(mod.normalizar_voto("Nao Provido"), "contra")
        self.assertEqual(mod.normalizar_voto("Não Provido"), "contra")

    def test_string_vazia_e_ausente(self):
        self.assertEqual(mod.normalizar_voto(""), "ausente")

    def test_none_e_ausente(self):
        self.assertEqual(mod.normalizar_voto(None), "ausente")

    def test_valor_desconhecido_e_ausente(self):
        self.assertEqual(mod.normalizar_voto("andamento nunca visto"), "ausente")

    def test_negado_seguimento_e_ausente(self):
        # maior categoria de andamento monocrático (~622 mil registros na
        # fonte) não é um "voto" no sentido deferido/indeferido — permanece
        # fora do MAPA_VOTO propositalmente. Ver seção "Compatibilidade de
        # dados" da auditoria.
        self.assertEqual(mod.normalizar_voto("Negado Seguimento"), "ausente")

    def test_frase_completa_com_indeferido_nao_e_classificada_como_deferido(self):
        self.assertEqual(mod.normalizar_voto("Pedido conhecido e indeferido"), "contra")

    def test_frase_completa_com_nao_provido(self):
        self.assertEqual(
            mod.normalizar_voto("Agravo regimental conhecido e não provido"), "contra"
        )


class TestNormalizacaoResultado(unittest.TestCase):
    def test_deferido_e_procedente(self):
        self.assertEqual(mod.normalizar_resultado("Deferido"), "procedente")

    def test_indeferido_e_improcedente(self):
        self.assertEqual(mod.normalizar_resultado("Indeferido"), "improcedente")

    def test_provido_e_procedente(self):
        self.assertEqual(mod.normalizar_resultado("Provido"), "procedente")

    def test_nao_provido_e_improcedente(self):
        self.assertEqual(mod.normalizar_resultado("Não Provido"), "improcedente")

    def test_procedente_e_procedente(self):
        self.assertEqual(mod.normalizar_resultado("Procedente"), "procedente")

    def test_improcedente_e_improcedente(self):
        self.assertEqual(mod.normalizar_resultado("Improcedente"), "improcedente")

    def test_parcialmente_provido_e_parcial(self):
        self.assertEqual(mod.normalizar_resultado("Parcialmente Provido"), "parcial")

    def test_provido_em_parte_e_parcial(self):
        self.assertEqual(mod.normalizar_resultado("Provido Em Parte"), "parcial")

    def test_parcialmente_procedente_e_parcial(self):
        self.assertEqual(mod.normalizar_resultado("Parcialmente Procedente"), "parcial")

    def test_denegada_a_ordem_e_improcedente(self):
        self.assertEqual(mod.normalizar_resultado("Denegada a ordem"), "improcedente")

    def test_concedida_a_ordem_e_procedente(self):
        self.assertEqual(mod.normalizar_resultado("Concedida a ordem"), "procedente")

    def test_string_vazia_e_none(self):
        self.assertIsNone(mod.normalizar_resultado(""))

    def test_none_e_none(self):
        self.assertIsNone(mod.normalizar_resultado(None))

    def test_valor_desconhecido_e_none(self):
        self.assertIsNone(mod.normalizar_resultado("andamento nunca visto"))

    def test_valores_de_saida_respeitam_check_constraint_do_schema(self):
        # public.stf_votacoes_voto_check / stf_votacoes_resultado_check
        # (conferidos ao vivo no Supabase na Fase D2, somente leitura)
        votos_validos = {"favor", "contra", "abstencao", "ausente"}
        resultados_validos = {"procedente", "improcedente", "parcial"}
        amostras = [
            "Deferido", "Indeferido", "Provido", "Não Provido", "Procedente",
            "Improcedente", "Parcialmente Provido", "Provido Em Parte",
            "Denegada a ordem", "Concedida a ordem", "Prejudicado",
            "Sobrestado", "Negado Seguimento", "", None,
        ]
        for andamento in amostras:
            self.assertIn(mod.normalizar_voto(andamento), votos_validos)
            resultado = mod.normalizar_resultado(andamento)
            self.assertTrue(resultado is None or resultado in resultados_validos)


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
