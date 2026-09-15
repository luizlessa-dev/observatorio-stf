"""
Testes de ingestao/stf/_snapshot.py (achado AUD-11).

Não dependem de rede nem Supabase real: calcular_hash é testado
diretamente, e registrar_snapshot é testado com um client fake que só
grava o que recebeu, sem nenhuma chamada de rede.

Execução: python3 -m unittest discover -s ingestao/stf/tests
"""

import sys
import unittest
from pathlib import Path

# _snapshot.py é importado como sibling module (mesmo diretório) — os
# scripts de ingestão fazem `from _snapshot import registrar_snapshot`
# contando com sys.path[0] == diretório do script quando rodados via
# `python3 ingestao/stf/fetch_gastos.py`. `unittest discover`, ao contrário,
# não adiciona ingestao/stf/ ao sys.path automaticamente — só o diretório
# de start (ingestao/stf/tests/). Sem esta linha, o import falharia aqui
# mesmo funcionando em produção.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from _snapshot import calcular_hash, registrar_snapshot  # noqa: E402


class TestCalcularHash(unittest.TestCase):
    def test_mesmo_conteudo_mesma_ordem_mesmo_hash(self):
        a = [{"x": 1, "y": "a"}, {"x": 2, "y": "b"}]
        b = [{"x": 1, "y": "a"}, {"x": 2, "y": "b"}]
        self.assertEqual(calcular_hash(a), calcular_hash(b))

    def test_mesmo_conteudo_ordem_diferente_mesmo_hash(self):
        # upsert em lote não garante ordem estável entre execuções — o hash
        # não pode depender disso, senão todo snapshot pareceria "mudou"
        # mesmo quando o conteúdo real é idêntico.
        a = [{"x": 1, "y": "a"}, {"x": 2, "y": "b"}]
        b = [{"x": 2, "y": "b"}, {"x": 1, "y": "a"}]
        self.assertEqual(calcular_hash(a), calcular_hash(b))

    def test_conteudo_diferente_hash_diferente(self):
        a = [{"x": 1, "y": "a"}]
        b = [{"x": 1, "y": "mudou"}]
        self.assertNotEqual(calcular_hash(a), calcular_hash(b))

    def test_uma_linha_a_mais_muda_o_hash(self):
        a = [{"x": 1}]
        b = [{"x": 1}, {"x": 2}]
        self.assertNotEqual(calcular_hash(a), calcular_hash(b))

    def test_lista_vazia_nao_lanca(self):
        self.assertIsInstance(calcular_hash([]), str)


class _TabelaFake:
    def __init__(self, chamadas):
        self._chamadas = chamadas

    def insert(self, payload):
        self._chamadas.append(payload)
        return self

    def execute(self):
        return {"data": [], "error": None}


class _SupabaseFake:
    """Espião mínimo: registra o payload de .table('stf_snapshots').insert(...)."""

    def __init__(self):
        self.chamadas = []

    def table(self, nome):
        assert nome == "stf_snapshots", f"registrar_snapshot só deveria escrever em stf_snapshots, não {nome}"
        return _TabelaFake(self.chamadas)


class _SupabaseQueLanca:
    def table(self, nome):
        raise RuntimeError("falha de rede simulada")


class TestRegistrarSnapshot(unittest.TestCase):
    def test_grava_tabela_linhas_hash_fonte(self):
        sb = _SupabaseFake()
        registros = [{"a": 1}, {"a": 2}, {"a": 3}]
        registrar_snapshot(sb, "stf_gastos", registros, fonte="https://exemplo.stf.jus.br")

        self.assertEqual(len(sb.chamadas), 1)
        payload = sb.chamadas[0]
        self.assertEqual(payload["tabela"], "stf_gastos")
        self.assertEqual(payload["linhas"], 3)
        self.assertEqual(payload["hash"], calcular_hash(registros))
        self.assertEqual(payload["fonte"], "https://exemplo.stf.jus.br")
        self.assertEqual(payload["metadata"], {})

    def test_metadata_opcional_e_repassada(self):
        sb = _SupabaseFake()
        registrar_snapshot(sb, "stf_gastos", [{"a": 1}], fonte="f", metadata={"mes_ref": 9, "ano_ref": 2026})
        self.assertEqual(sb.chamadas[0]["metadata"], {"mes_ref": 9, "ano_ref": 2026})

    def test_lista_vazia_ainda_registra_snapshot_de_zero_linhas(self):
        # Zero linhas ingeridas é, em si, um fato verificável que vale
        # registrar (ex.: fonte fora do ar devolveu página vazia) — não é
        # tratado como "nada a fazer" e pulado silenciosamente.
        sb = _SupabaseFake()
        registrar_snapshot(sb, "stf_gastos", [], fonte="f")
        self.assertEqual(sb.chamadas[0]["linhas"], 0)

    def test_falha_de_rede_nao_lanca(self):
        # Requisito central do achado: uma ingestão que já gravou os dados
        # reais com sucesso não pode falhar por causa da telemetria de
        # snapshot. Não deve lançar nada.
        sb = _SupabaseQueLanca()
        try:
            registrar_snapshot(sb, "stf_gastos", [{"a": 1}], fonte="f")
        except Exception as e:  # pragma: no cover - é exatamente isso que o teste barra
            self.fail(f"registrar_snapshot não deveria propagar exceção, mas lançou: {e}")


if __name__ == "__main__":
    unittest.main()
