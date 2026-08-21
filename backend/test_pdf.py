import unittest
import io
from fastapi.testclient import TestClient
from app import app
from pdf_processor import validate_and_extract_pdf_text
import pypdf

class TestPDFProcessingAndValidation(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def _create_sample_editable_pdf(self) -> bytes:
        """Creates a minimal in-memory PDF with native text."""
        pdf_str = """%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 280 >>
stream
BT
/F1 12 Tf
50 700 Td
(COMPANHIA PAULISTA DE FORCA E LUZ - CPFL) Tj
ET
BT
/F1 12 Tf
50 680 Td
(CNPJ: 02.838.720/0001-28) Tj
ET
BT
/F1 12 Tf
50 660 Td
(Total a Pagar: R$ 1.450,80) Tj
ET
BT
/F1 12 Tf
50 640 Td
(Vencimento: 15/10/2026) Tj
ET
BT
/F1 12 Tf
50 620 Td
(Unidade Consumidora: CONDOMINIO EDIFICIO BELLA VISTA) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000236 00000 n 
0000000567 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
634
%%EOF"""
        return pdf_str.encode('latin1')

    def _create_sample_scanned_image_pdf(self) -> bytes:
        """Creates a blank/image PDF without any text layer."""
        writer = pypdf.PdfWriter()
        writer.add_blank_page(width=612, height=792)
        buf = io.BytesIO()
        writer.write(buf)
        return buf.getvalue()

    def test_editable_pdf_extraction_success(self):
        pdf_bytes = self._create_sample_editable_pdf()
        is_valid, text, err = validate_and_extract_pdf_text(pdf_bytes)
        self.assertTrue(is_valid)
        self.assertIn("CPFL", text)
        self.assertEqual(err, "")

    def test_scanned_image_pdf_blocking(self):
        pdf_bytes = self._create_sample_scanned_image_pdf()
        is_valid, text, err = validate_and_extract_pdf_text(pdf_bytes)
        self.assertFalse(is_valid)
        self.assertEqual(text, "")
        self.assertEqual(err, "Erro: PDFs do tipo imagem não são suportados nesta etapa. Envie um PDF editável ou um arquivo .TXT.")

    def test_api_extract_with_editable_pdf(self):
        pdf_bytes = self._create_sample_editable_pdf()
        files = {
            "file": ("fatura_cpfl.pdf", pdf_bytes, "application/pdf")
        }
        res = self.client.post("/api/extract", files=files)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["file_type"], "pdf")
        self.assertTrue(data["pdf_url"].startswith("/api/pdf/"))
        self.assertIn("CPFL", data["raw_text"])
        self.assertIn("COMPANHIA PAULISTA", data["dados_extraidos"]["fornecedor_nome"])

    def test_api_extract_with_scanned_image_pdf_returns_400(self):
        pdf_bytes = self._create_sample_scanned_image_pdf()
        files = {
            "file": ("escaneado.pdf", pdf_bytes, "application/pdf")
        }
        res = self.client.post("/api/extract", files=files)
        self.assertEqual(res.status_code, 400)
        data = res.json()
        self.assertEqual(data["detail"], "Erro: PDFs do tipo imagem não são suportados nesta etapa. Envie um PDF editável ou um arquivo .TXT.")

    def test_api_extract_with_invalid_file_type_returns_400(self):
        files = {
            "file": ("planilha.xlsx", b"dummy content", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        }
        res = self.client.post("/api/extract", files=files)
        self.assertEqual(res.status_code, 400)
        data = res.json()
        self.assertEqual(data["detail"], "Formato de arquivo não suportado. Por favor, envie apenas arquivos .TXT ou .PDF.")

if __name__ == "__main__":
    unittest.main()
