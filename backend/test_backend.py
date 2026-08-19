"""
Unit Tests for KaiExtract Backend.
"""

import unittest
import os
import sys

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from normalizer import ERPNormalizer, parse_monetary_value, format_cnpj, clean_digits
from extractor import KaiExtractorCore

class TestKaiExtractBackend(unittest.TestCase):
    def setUp(self):
        self.extractor = KaiExtractorCore()
        self.samples_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "samples")

    def test_monetary_parser(self):
        self.assertEqual(parse_monetary_value("1.450,80"), 1450.80)
        self.assertEqual(parse_monetary_value("R$ 890,00"), 890.00)
        self.assertEqual(parse_monetary_value("320.50"), 320.50)
        self.assertEqual(parse_monetary_value(None), 0.0)

    def test_cnpj_formatter(self):
        self.assertEqual(format_cnpj("02838720000128"), "02.838.720/0001-28")
        self.assertEqual(clean_digits("02.838.720/0001-28"), "02838720000128")

    def test_cpfl_extraction(self):
        file_path = os.path.join(self.samples_dir, "cpfl_energia.txt")
        result = self.extractor.extract_document(file_path, output_dir="/tmp/kaiextract_test")
        data = result["dados_extraidos"]
        
        self.assertIn("BELLA VISTA", data["condominio_nome"])
        self.assertEqual(data["tipo_conta"], "Consumo > Energia Elétrica")
        self.assertEqual(data["valor_total"], "1.450,80")
        self.assertEqual(data["data_vencimento"], "2026-10-15")
        self.assertTrue(len(data["linha_digitavel"]) > 30)

    def test_schindler_extraction_with_pix(self):
        file_path = os.path.join(self.samples_dir, "schindler_elevadores.txt")
        result = self.extractor.extract_document(file_path, output_dir="/tmp/kaiextract_test")
        data = result["dados_extraidos"]
        
        self.assertIn("Solaris Premium", data["condominio_nome"])
        self.assertEqual(data["tipo_conta"], "Contratos > Elevadores")
        self.assertEqual(data["valor_total"], "890,00")
        self.assertTrue(len(data["chave_pix"]) > 20)
        
        # Test SuperLogica & CondominIA exports
        sl = result["superlogica"]
        cd = result["condominia"]
        self.assertEqual(sl["superlogica_payload"]["VL_TOTAL"], 890.0)
        self.assertEqual(cd["condominia_payload"]["financial"]["amount"], 890.0)

    def test_darf_tax_extraction(self):
        file_path = os.path.join(self.samples_dir, "darf_impostos.txt")
        result = self.extractor.extract_document(file_path, output_dir="/tmp/kaiextract_test")
        data = result["dados_extraidos"]
        
        self.assertIn("VILA NOVA", data["condominio_nome"])
        self.assertEqual(data["tipo_conta"], "Impostos > Taxas e Tributos")
        self.assertEqual(data["valor_total"], "340,00")
        self.assertEqual(data["data_vencimento"], "2026-08-20")

    def test_secovi_extraction_with_rich_attributes(self):
        file_path = os.path.join(self.samples_dir, "secovi_pe.txt")
        result = self.extractor.extract_document(file_path, output_dir="/tmp/kaiextract_test")
        data = result["dados_extraidos"]
        
        self.assertIn("AVIS LIBERTA", data["condominio_nome"])
        self.assertIn("SECOVI", data["fornecedor_nome"])
        self.assertEqual(data["valor_total"], "214,00")
        self.assertEqual(data["data_vencimento"], "2026-06-19")
        self.assertEqual(data["data_emissao"], "2026-05-21")
        self.assertIn("Republica do Libano", data["fornecedor_endereco"])
        self.assertIn("0,07", data["juros_dia"])
        self.assertIn("4,28", data["multa_atraso"])
        self.assertEqual(data["numero_documento"], "9907637002")

if __name__ == "__main__":
    unittest.main()
