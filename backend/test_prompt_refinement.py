import unittest
from extractor import KaiExtractorCore

class TestPromptRefinementAntiCannibalization(unittest.TestCase):
    def setUp(self):
        self.extractor = KaiExtractorCore()

    def test_barcode_physical_isolation_prevents_valor_total_cannibalization(self):
        """
        Tests that when a barcode containing '00000000000000' or internal amounts is present,
        valor_total only extracts the explicit billing value and NEVER slices inside the barcode.
        """
        text = (
            "EMPRESA DE SERVICOS PREDIAIS LTDA\n"
            "CNPJ: 10.000.000/0001-00\n"
            "CONDOMINIO RESIDENCIAL BEIRA MAR\n"
            "VALOR TOTAL A PAGAR: R$ 3.750,00\n"
            "VENCIMENTO: 25/11/2026\n"
            "LINHA DIGITAVEL: 34191.09008 00000.000000 00000.000000 0 00000000000000"
        )
        res = self.extractor.extract_document(text)
        dados = res["dados_extraidos"]
        spans = res["grounding_spans"]

        self.assertEqual(dados["valor_total"], "3.750,00")
        self.assertNotEqual(dados["valor_total"], "0,00")
        
        # Verify no span overlaps with the barcode text
        barcode_span = next(s for s in spans if s["field"] == "linha_digitavel")
        for s in spans:
            if s["field"] != "linha_digitavel":
                overlaps = (s["start"] < barcode_span["end"] and s["end"] > barcode_span["start"])
                self.assertFalse(overlaps, f"Field {s['field']} overlaps with isolated barcode span!")

    def test_zero_hallucination_on_absent_condominium_name(self):
        """
        Tests that when no condominium name is present in the text,
        condominio_nome returns empty string instead of hallucinating 'Condomínio Edifício Geral'.
        """
        text = (
            "SECRETARIA DA RECEITA FEDERAL\n"
            "GUIA DE RECOLHIMENTO DARF\n"
            "VALOR DO PRINCIPAL: R$ 500,00\n"
            "TOTAL A PAGAR: R$ 500,00\n"
            "VENCIMENTO: 20/12/2026\n"
            "CODIGO DE BARRAS: 85890000005-2 00000179260-8 82008202611-3 00000000000-0"
        )
        res = self.extractor.extract_document(text)
        dados = res["dados_extraidos"]

        # Must not hallucinate fictitious condominium names
        self.assertNotIn("Geral", dados["condominio_nome"])
        self.assertEqual(dados["condominio_nome"], "")

    def test_prohibition_of_fake_values_when_no_explicit_billing_field(self):
        """
        Tests that if a document has no explicit total amount outside the barcode,
        it does not invent or slice numbers from the barcode sequence.
        """
        text = (
            "DOCUMENTO DE CONSULTA BANCARIA\n"
            "LINHA DIGITAVEL: 23793.38128 60012.345678 90001.234567 1 98760000850000"
        )
        res = self.extractor.extract_document(text)
        dados = res["dados_extraidos"]
        self.assertEqual(dados["valor_total"], "")

    def test_all_extracted_spans_are_100_percent_verbatim(self):
        """
        Tests exact verbatim character correspondence: raw_text[s['start']:s['end']] == s['matched_text'].
        """
        text = (
            "COMPANHIA ENERGETICA DE PERNAMBUCO\n"
            "CNPJ 10.835.932/0001-08\n"
            "NOME DO CLIENTE: EDIFICIO AVIS LIBERTAS\n"
            "VALOR TOTAL A PAGAR: R$ 7.789,35\n"
            "VENCIMENTO: 10/06/2026\n"
            "DATA DE EMISSAO: 18/05/2026\n"
            "CHAVE DE ACESSO: 2626 0510 8359 3200 0108 6600 0411 7390 3810 9946 1908\n"
            "LINHA DIGITAVEL: 34191.09933 05877.202936 85834.530009 1 14730000778935"
        )
        res = self.extractor.extract_document(text)
        spans = res["grounding_spans"]
        self.assertGreaterEqual(len(spans), 6)

        for s in spans:
            raw_slice = text[s["start"]:s["end"]]
            self.assertEqual(raw_slice, s["matched_text"])

if __name__ == "__main__":
    unittest.main()
