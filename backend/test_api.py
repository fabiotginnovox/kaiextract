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

if __name__ == "__main__":
    unittest.main()
