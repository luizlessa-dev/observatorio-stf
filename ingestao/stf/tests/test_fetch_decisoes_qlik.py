"""
Testes do conector Qlik de decisões do STF (achado D1).

Não dependem de secrets reais, rede, Qlik ou Supabase: usam valores fictícios
só para satisfazer a leitura das variáveis obrigatórias no carregamento do
módulo, e nunca chamam run() nem extrair().

Execução: python3 -m unittest discover -s ingestao/stf/tests
"""

import importlib.util
import os
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SCRIPT = ROOT / "ingestao" / "stf" / "fetch_decisoes_qlik.py"


def _carregar_modulo():
    os.environ.setdefault("SUPABASE_URL", "http://test.invalid")
    os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-key-fake")
    spec = importlib.util.spec_from_file_location("fetch_decisoes_qlik", SCRIPT)
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo


mod = _carregar_modulo()


class TestTravaDeDestino(unittest.TestCase):
    """Mesma trava de fetch_votacoes_bigquery.py: o destino não vem de
    argumento nem de env var, e um valor inesperado falha em vez de escrever
    na tabela errada."""

    def setUp(self):
        self.schema = mod.DESTINATION_SCHEMA
        self.tabela = mod.DESTINATION_TABLE

    def tearDown(self):
        mod.DESTINATION_SCHEMA = self.schema
        mod.DESTINATION_TABLE = self.tabela

    def test_destino_correto(self):
        self.assertEqual(mod.resolver_destino(), "stf_decisoes")

    def test_recusa_tabela_vazia(self):
        mod.DESTINATION_TABLE = ""
        with self.assertRaises(RuntimeError):
            mod.resolver_destino()

    def test_recusa_schema_diferente(self):
        mod.DESTINATION_SCHEMA = "auth"
        with self.assertRaises(RuntimeError):
            mod.resolver_destino()

    def test_recusa_tabela_sem_prefixo(self):
        mod.DESTINATION_TABLE = "decisoes"
        with self.assertRaises(RuntimeError):
            mod.resolver_destino()

    def test_recusa_outra_tabela_stf(self):
        mod.DESTINATION_TABLE = "stf_votacoes"
        with self.assertRaises(RuntimeError):
            mod.resolver_destino()


class TestContratoDeColunas(unittest.TestCase):
    """A leitura do hipercubo é POSICIONAL. Se a fonte reordenar ou renomear
    colunas e o script seguir lendo, grava campo trocado — foi assim que o
    SEBRAE misturou o conteúdo de três campos em 2026-07-22."""

    def test_vinte_e_uma_colunas(self):
        self.assertEqual(len(mod.COLUNAS_FONTE), 21)

    def test_colunas_essenciais_presentes(self):
        for c in ("idFatoDecisao", "Processo", "Data da decisão",
                  "Andamento decisão", "Indicador colegiado", "Nome Ministro (a)"):
            self.assertIn(c, mod.COLUNAS_FONTE)

    def test_validacao_de_ordem_existe_no_codigo(self):
        src = SCRIPT.read_text(encoding="utf-8")
        self.assertIn("titulos != COLUNAS_FONTE", src,
                      "a comparação que interrompe a ingestão quando a fonte muda sumiu")


class TestConversores(unittest.TestCase):
    def test_data_formato_do_stf(self):
        self.assertEqual(mod._data("07/11/2002 00:00:00"), "2002-11-07")
        self.assertEqual(mod._data("14/08/2026"), "2026-08-14")

    def test_data_invalida_vira_none_em_vez_de_inventada(self):
        for v in (None, "", "*NI*", "data ruim", "31/02/2020"):
            self.assertIsNone(mod._data(v), f"valor {v!r} deveria virar None")

    def test_marcador_de_vazio_do_stf(self):
        # `*NI*` é o "não informado" do STF e aparece muito em Observação.
        self.assertIsNone(mod._limpar("*NI*"))
        self.assertIsNone(mod._limpar("  "))
        self.assertEqual(mod._limpar("  Negado seguimento "), "Negado seguimento")

    def test_booleano(self):
        self.assertIs(mod._bool("SIM"), True)
        self.assertIs(mod._bool("NÃO"), False)
        self.assertIsNone(mod._bool("*NI*"))

    def test_normalizacao_de_nome_do_relator(self):
        self.assertEqual(mod.normalizar_nome_relator("MIN. GILMAR MENDES"), "gilmar mendes")
        self.assertEqual(mod.normalizar_nome_relator("MIN. CÁRMEN LÚCIA"), "carmen lucia")
        self.assertEqual(mod.normalizar_nome_relator("MINA. ROSA WEBER"), "rosa weber")


class TestResolucaoDeMinistro(unittest.TestCase):
    """O MAPA_MINISTRO antigo descartava em silêncio o relator que não
    reconhecia — apagava a decisão do acervo sem deixar rastro. Aqui nada é
    descartado, e todo caminho até 'desconhecido' entra na contagem do log."""

    MINISTROS = [
        {"id": "uuid-fachin", "nome": "Edson Fachin"},
        {"id": "uuid-gilmar", "nome": "Gilmar Mendes"},
        {"id": "uuid-marco",  "nome": "Marco Aurélio Mello"},
    ]
    PRESIDENCIAS = [
        {"ministro_id": "uuid-fachin", "cargo": "presidente",
         "inicio": "2025-09-29", "fim": None},
        {"ministro_id": "uuid-gilmar", "cargo": "vice_presidente",
         "inicio": "2025-09-29", "fim": None},
    ]

    def _r(self):
        return mod.ResolvedorMinistro(self.MINISTROS, self.PRESIDENCIAS)

    def test_resolve_por_nome(self):
        mid, como = self._r().resolver("MIN. GILMAR MENDES", "2026-05-01")
        self.assertEqual((mid, como), ("uuid-gilmar", "nome"))

    def test_ministro_presidente_resolvido_pela_data(self):
        # 19,4% do acervo. Sem isto, um quinto das decisões fica órfã.
        mid, como = self._r().resolver("MINISTRO PRESIDENTE", "2026-05-01")
        self.assertEqual((mid, como), ("uuid-fachin", "presidencia"))

    def test_ministro_presidente_fora_do_periodo_conhecido(self):
        r = self._r()
        mid, como = r.resolver("MINISTRO PRESIDENTE", "2010-05-01")
        self.assertIsNone(mid)
        self.assertEqual(como, "desconhecido")
        self.assertTrue(r.desconhecidos, "o caso precisa aparecer no relatório final")

    def test_nao_se_aplica_nao_e_desconhecido(self):
        r = self._r()
        mid, como = r.resolver("NÃO SE APLICA", "2026-05-01")
        self.assertEqual((mid, como), (None, "nao_aplicavel"))
        self.assertFalse(r.desconhecidos, "NÃO SE APLICA é resposta da fonte, não falha nossa")

    def test_vice_presidente_entra_na_contagem(self):
        # Regressão: a primeira versão devolvia 'desconhecido' sem contar,
        # e 97 linhas sumiam do relatório final.
        r = self._r()
        _, como = r.resolver("VICE-PRESIDENTE", "2026-05-01")
        self.assertEqual(como, "desconhecido")
        self.assertEqual(sum(r.desconhecidos.values()), 1)

    def test_alias_explicito_para_divergencia_de_nome(self):
        # A fonte diz "MIN. MARCO AURÉLIO"; o banco, "Marco Aurélio Mello".
        mid, como = self._r().resolver("MIN. MARCO AURÉLIO", "2015-05-01")
        self.assertEqual((mid, como), ("uuid-marco", "nome"))

    def test_relator_desconhecido_nao_derruba_a_execucao(self):
        r = self._r()
        mid, como = r.resolver("MIN. SEPÚLVEDA PERTENCE", "2005-05-01")
        self.assertEqual((mid, como), (None, "desconhecido"))
        self.assertEqual(r.desconhecidos["MIN. SEPÚLVEDA PERTENCE"], 1)


class TestMapeamento(unittest.TestCase):
    LINHA = {
        "idFatoDecisao": "6640001",
        "Processo": "AC 1",
        "Relator atual": "MIN. GILMAR MENDES",
        "Nome Ministro (a)": "MIN. GILMAR MENDES",
        "Meio Processo": "ELETRÔNICO",
        "Origem decisão": "MONOCRÁTICA",
        "Ambiente julgamento": "Presencial",
        "Data de autuação": "07/11/2002 00:00:00",
        "Data baixa": "*NI*",
        "Indicador colegiado": "MONOCRÁTICA",
        "Ano da decisão": "2026",
        "Data da decisão": "14/08/2026 00:00:00",
        "Tipo decisão": "Decisão Final",
        "Andamento decisão": "Negado seguimento",
        "Observação do andamento": "*NI*",
        "Ramo direito": "DIREITO TRIBUTÁRIO",
        "Assuntos do processo": "DIREITO TRIBUTÁRIO",
        "Indicador de tramitação": "NÃO",
        "Órgão julgador": "MONOCRÁTICA",
        "Descrição Procedência Processo": "SÃO PAULO",
        "Descrição Órgão Origem": "TRF3",
    }

    def _mapear(self, **override):
        linha = dict(self.LINHA, **override)
        r = mod.ResolvedorMinistro(
            [{"id": "uuid-gilmar", "nome": "Gilmar Mendes"}], [])
        return mod.mapear(linha, r)

    def test_grava_o_andamento_bruto_sem_normalizar(self):
        # O motivo de existir desta tabela. stf_votacoes guardava só o valor
        # normalizado, e por isso o bug do "Ausente" ficou irrecuperável.
        self.assertEqual(self._mapear()["andamento_bruto"], "Negado seguimento")

    def test_nunca_preenche_sentido(self):
        reg = self._mapear()
        self.assertNotIn("sentido", reg,
                         "sentido fica nulo até haver taxonomia publicada")

    def test_chave_natural_da_fonte(self):
        self.assertEqual(self._mapear()["id_fato_decisao"], 6640001)

    def test_marcadores_de_vazio_viram_null(self):
        reg = self._mapear()
        self.assertIsNone(reg["observacao"])
        self.assertIsNone(reg["data_baixa"])

    def test_descarta_linha_sem_campo_obrigatorio(self):
        for campo in ("idFatoDecisao", "Data da decisão", "Processo",
                      "Andamento decisão", "Indicador colegiado"):
            self.assertIsNone(self._mapear(**{campo: ""}),
                              f"linha sem {campo} não satisfaz os NOT NULL da tabela")


class TestGuardaDeEscritaNoCodigoFonte(unittest.TestCase):
    def test_upsert_atras_da_flag_de_dry_run(self):
        src = SCRIPT.read_text(encoding="utf-8")
        for i, linha in enumerate(src.splitlines()):
            if ".upsert(" in linha:
                anteriores = "\n".join(src.splitlines()[max(0, i - 4):i])
                self.assertIn("if not dry_run:", anteriores,
                              f"upsert na linha {i+1} não está atrás de `if not dry_run:`")

    def test_dry_run_e_o_padrao(self):
        # Fail-closed: sem --escrever, não grava. O inverso transformaria um
        # esquecimento em escrita acidental em produção.
        src = SCRIPT.read_text(encoding="utf-8")
        self.assertIn("dry_run=not args.escrever", src)


if __name__ == "__main__":
    unittest.main()
