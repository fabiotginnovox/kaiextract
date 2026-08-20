"""
API Endpoint Integration Tests for FastAPI backend.
"""

import unittest
from fastapi.testclient import TestClient
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app import app

class TestAPIEndpoints(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_health_endpoint(self):
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "online")

    def test_samples_endpoint(self):
        res = self.client.get("/api/samples")
        self.assertEqual(res.status_code, 200)
        samples = res.json()["samples"]
        self.assertTrue(len(samples) >= 5)

    def test_extract_endpoint_with_text(self):
        sample_text = (
            "ENEL DISTRIBUIÇÃO S.P. - CNPJ: 61.695.227/0001-93\n"
            "CONDOMINIO RESIDENCIAL SOLARIS - CNPJ: 98.765.432/0001-11\n"
            "Total a Pagar: R$ 3.420,80\n"
            "Vencimento: 15/09/2026\n"
            "Linha Digitável: 83610000034-2 20800048100-8 26091512345-6 00000000000-0"
        )
        res = self.client.post("/api/extract", data={"text": sample_text})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["dados_extraidos"]["valor_total"], "3.420,80")
        self.assertEqual(data["dados_extraidos"]["data_vencimento"], "2026-09-15")
        self.assertIn("SOLARIS", data["dados_extraidos"]["condominio_nome"])

    def test_export_superlogica_endpoint(self):
        payload = {
            "erp": "superlogica",
            "data": {
                "condominio_nome": "Condomínio Solaris",
                "condominio_cnpj": "98.765.432/0001-11",
                "tipo_conta": "Consumo > Energia Elétrica",
                "fornecedor_nome": "ENEL SP",
                "fornecedor_cnpj": "61.695.227/0001-93",
                "valor_total": "3.420,80",
                "data_vencimento": "2026-09-15",
                "linha_digitavel": "836100000342208000481008260915123456"
            }
        }
        res = self.client.post("/api/export", json=payload)
        self.assertEqual(res.status_code, 200)
        resp_data = res.json()
        self.assertEqual(resp_data["erp"], "SuperLógica")
        self.assertEqual(resp_data["superlogica_payload"]["VL_TOTAL"], 3420.8)

    def test_audit_endpoint(self):
        res = self.client.get("/api/audit")
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(res.json()["global_accuracy_pct"], 90.0)

    def test_re_extract_with_feedback_hint(self):
        neoenergia_text = (
            "Neoenergia Pernambuco\n"
            "NOME DO CLIENTE:\n"
            "EDIFICIO AVIS LIBERTAS\n"
            "CNPJ 02819-556/0001-30\n"
            "ENDERECO:\n"
            "RUA DOM SEBASTIAO LEME 171 EDIFICIO AVIS LIBERTAS\n"
            "TOTAL A PAGAR\n"
            "R$ 9.024,54\n"
            "VENCIMENTO\n"
            "10/07/2026\n"
            "NOTA FISCAL Nº415197365-SERIE 000/DATA DE EMISSÃO\n"
            "10/06/2026\n"
        )
        # Test re-extract with feedback hint
        payload = {
            "text": neoenergia_text,
            "user_hint": "O nome do condomínio é EDIFICIO AVIS LIBERTAS. Não confunda com a Nota Fiscal.",
            "doc_id": "neoenergia_test"
        }
        res = self.client.post("/api/re-extract", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["dados_extraidos"]["condominio_nome"], "EDIFICIO AVIS LIBERTAS")
        self.assertEqual(data["dados_extraidos"]["valor_total"], "9.024,54")
    def test_re_extract_with_protocol_instruction(self):
        neoenergia_text = (
            "Neoenergia Pernambuco\n"
            "NOME DO CLIENTE:\n"
            "EDIFICIO AVIS LIBERTAS\n"
            "TOTAL A PAGAR\n"
            "R$ 9.024,54\n"
            "10/07/2026\n"
            "NOTA FISCAL Nº415197365-SERIE 000/DATA DE EMISSÃO\n"
            "10/06/2026\n"
            "Protocolo de Autorização: 3262600023218287 - 10/06/2026 às 11:07:33\n"
        )
        payload = {
            "text": neoenergia_text,
            "user_hint": "O número do protocolo de Autorização é importante ser marcado.",
            "doc_id": "neoenergia_protocol_test"
        }
        res = self.client.post("/api/re-extract", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["dados_extraidos"]["protocolo_autorizacao"], "3262600023218287")
        self.assertEqual(data["dados_extraidos"]["numero_documento"], "3262600023218287")
        
        # Check grounding span exists for protocol
        spans = data["grounding_spans"]
        protocol_spans = [s for s in spans if s["field"] in ["protocolo_autorizacao", "numero_documento"]]
        self.assertTrue(len(protocol_spans) > 0)
        self.assertIn("3262600023218287", [s["matched_text"] for s in protocol_spans])

    def test_re_extract_with_next_reading_date(self):
        neoenergia_text = (
            "Neoenergia Pernambuco\n"
            "NOME DO CLIENTE:\n"
            "EDIFICIO AVIS LIBERTAS\n"
            "TOTAL A PAGAR\n"
            "R$ 9.024,54\n"
            "DATAS DE LEITURAS\n"
            "LEITURA ANTERIOR 30/04/2026\n"
            "LEITURA ATUAL 31/05/2026\n"
            "N° DE DIAS 31\n"
            "PRÓXIMA LEITURA 30/06/2026\n"
            "DEMONSTRATIVO DE CONSUMO\n"
            "N MEDIDOR - 81788399\n"
        )
        payload = {
            "text": neoenergia_text,
            "user_hint": "Data da próxima leitura poderia ser marcada",
            "doc_id": "neoenergia_reading_test"
        }
        res = self.client.post("/api/re-extract", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["dados_extraidos"]["proxima_leitura"], "2026-06-30")
        self.assertEqual(data["dados_extraidos"]["numero_medidor"], "81788399")
        
        # Check grounding span for proxima_leitura
        spans = data["grounding_spans"]
        reading_spans = [s for s in spans if s["field"] == "proxima_leitura"]
        self.assertTrue(len(reading_spans) > 0)
        self.assertIn("30/06/2026", [s["matched_text"] for s in reading_spans])

    def test_re_extract_with_chave_de_acesso(self):
        neoenergia_text = (
            "Neoenergia Pernambuco\n"
            "NOME DO CLIENTE:\n"
            "EDIFICIO AVIS LIBERTAS\n"
            "TOTAL A PAGAR\n"
            "R$ 9.024,54\n"
            "Chave de Acesso:\n"
            "2625 0610 8359 3200 0108 5600 0415 1973 6510 8578 4387\n"
            "Protocolo de Autorização: 3262600023218287\n"
        )
        payload = {
            "text": neoenergia_text,
            "user_hint": "Marque a Chave de Acesso",
            "doc_id": "neoenergia_chave_test"
        }
        res = self.client.post("/api/re-extract", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        self.assertTrue(bool(data["dados_extraidos"]["chave_acesso"]))
        
        # Check grounding span for chave_acesso exists
        spans = data["grounding_spans"]
        chave_spans = [s for s in spans if s["field"] == "chave_acesso"]
        self.assertTrue(len(chave_spans) > 0)
        self.assertIn("2625", chave_spans[0]["matched_text"])

if __name__ == "__main__":
    unittest.main()
