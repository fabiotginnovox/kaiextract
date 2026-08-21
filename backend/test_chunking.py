import unittest
import os
import shutil
from extractor import KaiExtractorCore
from normalizer import ERPNormalizer

class TestIntelligentChunkingAndGlobalGrounding(unittest.TestCase):
    def setUp(self):
        self.extractor = KaiExtractorCore()
        self.output_dir = "./test_outputs_chunking"
        os.makedirs(self.output_dir, exist_ok=True)

    def tearDown(self):
        if os.path.exists(self.output_dir):
            shutil.rmtree(self.output_dir)

    def _generate_synthetic_multipage_document(self) -> str:
        """
        Builds a multi-page synthetic document (~12,000 characters) across 3 distinct pages.
        - Page 1: Header, Condomínio info, Concessionária info, and initial usage breakdown.
        - Page 2: Middle details, fiscal authorization protocol, reading values, and taxes.
        - Page 3: Bank slip, bar code / linha digitável, PIX copy & paste, and total due.
        """
        # Page 1 (approx 4,500 chars)
        page1 = (
            "================================================================================\n"
            "DANFE - NOTA FISCAL DE ENERGIA ELETRICA ELETRONICA - CONCESSIONARIA CPFL\n"
            "COMPANHIA PAULISTA DE FORCA E LUZ - CPFL\n"
            "CNPJ: 02.838.720/0001-28\n"
            "ENDERECO FORNECEDOR: RODOVIA ENG MIGUEL NOEL NASCENTES BURNIER, 1755, CAMPINAS - SP\n"
            "Ligue gratis 0800 010 10 10 | Atendimento 24h\n"
            "--------------------------------------------------------------------------------\n"
            "DADOS DO DESTINATARIO / PAGADOR:\n"
            "NOME DO CLIENTE: CONDOMINIO RESIDENCIAL JARDINS DO LAGO\n"
            "CNPJ: 45.123.456/0001-99\n"
            "ENDERECO DO CONDOMINIO: AV DAS PALMEIRAS, 500 - BLOCO A - JARDIM DAS FLORES\n"
            "CODIGO DA INSTALACAO: 9876543210\n"
            "--------------------------------------------------------------------------------\n"
            "DESCRICAO DETALHADA DOS ITENS FATURADOS:\n"
        )
        page1 += ("Item consumo tarifa fixa TUSD Ponta 120 kWh R$ 1,25000 Valor R$ 150,00\n" * 35)
        page1 += "\n\x0c"  # Form feed / Page 1 break

        # Page 2 (approx 4,500 chars)
        page2 = (
            "================================================================================\n"
            "--- PAGINA 2 - DEMONSTRATIVO DE TRIBUTOS E LEITURAS FISCAIS ---\n"
            "NOTA FISCAL Nº 000847291 - SERIE 001 - DATA DE EMISSAO: 15/05/2026\n"
            "CHAVE DE ACESSO: 3526 0502 8387 2000 0128 5500 1000 8472 9110 9834 7291\n"
            "PROTOCOLO DE AUTORIZACAO: 1352600098472910\n"
            "NUMERO DO MEDIDOR: 88776655\n"
            "LEITURA ANTERIOR: 12450 em 15/04/2026\n"
            "LEITURA ATUAL: 13900 em 15/05/2026\n"
            "PROXIMA LEITURA: 15/06/2026\n"
            "--------------------------------------------------------------------------------\n"
            "HISTORICO DE CONSUMO DOS ULTIMOS MESES:\n"
        )
        page2 += ("Mes 01/2026 Consumo 1400 kWh Media Diaria 46.6 kWh Bandeira Verde\n" * 40)
        page2 += "\n\x0c"  # Form feed / Page 2 break

        # Page 3 (approx 3,000 chars)
        page3 = (
            "================================================================================\n"
            "--- PAGINA 3 - FICHA DE COMPENSACAO BANCARIA / INFORMACOES DE PAGAMENTO ---\n"
            "VENCIMENTO: 10/06/2026\n"
            "TOTAL A PAGAR: R$ 5.430,90\n"
            "VALOR ORIGINAL: R$ 5.430,90\n"
            "DESCONTO: R$ 0,00 | ACRESCIMOS: R$ 0,00\n"
            "APOS VENCIMENTO MULTA DE 2% (R$ 108,62) + JUROS AO DIA R$ 1,81 (0,0333% ao dia)\n"
            "LINHA DIGITAVEL: 83660000005-4 43090048100-3 10062026123-0 00012345678-9\n"
            "CHAVE PIX: 00020126580014BR.GOV.BCB.PIX0136cpfl-financeiro-pix@cpfl.com.br5204000053039865405.43090\n"
            "--------------------------------------------------------------------------------\n"
            "AUTENTICACAO MECANICA - RECIBO DO SACADO:\n"
        )
        page3 += ("Instrucoes bancarias: Receber ate 30 dias apos o vencimento com os devidos encargos.\n" * 20)

        return page1 + page2 + page3

    def test_intelligent_chunking_splits_on_page_and_natural_boundaries(self):
        doc = self._generate_synthetic_multipage_document()
        self.assertGreaterEqual(len(doc), 8000)

        chunks = self.extractor._create_intelligent_chunks(doc, chunk_size=5000, overlap=800)
        self.assertGreaterEqual(len(chunks), 2)

        # Check all chunks have text and forward progress
        for i, (s, e, chunk_text) in enumerate(chunks):
            self.assertGreater(e, s)
            self.assertEqual(chunk_text, doc[s:e])
            if i > 0:
                prev_s, prev_e, _ = chunks[i-1]
                # Check overlap exists between adjacent chunks
                self.assertLess(s, prev_e)
                self.assertGreater(s, prev_s)

    def test_global_grounding_coordinates_match_raw_text_exactly(self):
        doc = self._generate_synthetic_multipage_document()
        res = self.extractor.extract_document(
            doc,
            output_dir=self.output_dir,
            chunk_size=5000,
            overlap=800
        )

        self.assertTrue(res["success"])
        dados = res["dados_extraidos"]
        spans = res["grounding_spans"]

        # Ensure key fields on Page 1, Page 2 and Page 3 were found and consolidated
        self.assertEqual(dados["condominio_nome"], "CONDOMINIO RESIDENCIAL JARDINS DO LAGO")
        self.assertIn("COMPANHIA PAULISTA", dados["fornecedor_nome"])
        self.assertEqual(dados["valor_total"], "5.430,90")
        self.assertEqual(dados["data_vencimento"], "2026-06-10")
        self.assertEqual(dados["data_emissao"], "2026-05-15")
        self.assertIn("83660000005", dados["linha_digitavel"])

        # VERIFY 100% GLOBAL COORDINATE FIDELITY
        # Every single global span start:end must match the exact raw_text slice
        self.assertGreaterEqual(len(spans), 5)
        for s in spans:
            g_start = s["start"]
            g_end = s["end"]
            matched = s["matched_text"]
            self.assertLess(g_start, g_end)
            self.assertLessEqual(g_end, len(doc))
            
            raw_slice = doc[g_start:g_end]
            self.assertEqual(
                raw_slice,
                matched,
                f"Global span mismatch for field {s['field']}: expected '{matched}' but doc[{g_start}:{g_end}] was '{raw_slice}'"
            )

    def test_overlap_deduplication_removes_duplicate_spans(self):
        # Create dummy overlapping spans
        raw = "VALOR TOTAL R$ 1.500,00 VENCIMENTO 10/10/2026 LINHA DIGITAVEL 83660000001-4 45080048100-3"
        spans = [
            {"field": "valor_total", "label": "Valor Total", "color": "#fbbf24", "start": 12, "end": 23, "matched_text": "R$ 1.500,00"},
            # Duplicate from overlap zone with same coordinates
            {"field": "valor_total", "label": "Valor Total", "color": "#fbbf24", "start": 12, "end": 23, "matched_text": "R$ 1.500,00"},
            {"field": "data_vencimento", "label": "Vencimento", "color": "#f472b6", "start": 35, "end": 45, "matched_text": "10/10/2026"}
        ]

        dedup = self.extractor._deduplicate_spans(spans)
        self.assertEqual(len(dedup), 2)
        self.assertEqual(dedup[0]["field"], "valor_total")
        self.assertEqual(dedup[1]["field"], "data_vencimento")

    def test_jsonl_and_html_generation_with_chunked_document(self):
        doc = self._generate_synthetic_multipage_document()
        res = self.extractor.extract_document(
            doc,
            output_dir=self.output_dir,
            chunk_size=4000,
            overlap=600
        )

        self.assertTrue(os.path.exists(res["jsonl_path"]))
        self.assertTrue(os.path.exists(res["html_path"]))
        
        with open(res["html_path"], "r", encoding="utf-8") as f:
            html_content = f.read()
            self.assertIn("CONDOMINIO RESIDENCIAL JARDINS DO LAGO", html_content)
            self.assertIn("5.430,90", html_content)
            self.assertIn("kai-highlight", html_content)

if __name__ == "__main__":
    unittest.main()
