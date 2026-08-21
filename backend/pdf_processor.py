"""
PDF Processing and Native Text Layer Validation Module for KaiExtract.
Validates editable vs scanned image PDFs and extracts text with high layout fidelity.
"""

import io
import os
from typing import Tuple
import pypdf
import pdfplumber

def validate_and_extract_pdf_text(pdf_bytes: bytes) -> Tuple[bool, str, str]:
    """
    Validates if the provided PDF bytes contain a native extractable text layer.
    
    Returns:
        Tuple[bool, str, str]: (is_valid, extracted_text, error_message)
    """
    if not pdf_bytes:
        return False, "", "Arquivo PDF vazio."

    extracted_pages = []

    # 1. High-fidelity extraction using pdfplumber (preserves columns and tables)
    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            if len(pdf.pages) == 0:
                return False, "", "O arquivo PDF não contém páginas."
                
            for page_idx, page in enumerate(pdf.pages):
                text = page.extract_text(layout=True) or page.extract_text() or ""
                if text and text.strip():
                    extracted_pages.append(text.strip())
    except Exception as e:
        extracted_pages = []

    # 2. Fallback extraction using pypdf if pdfplumber had issues
    if not extracted_pages:
        try:
            reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
            if len(reader.pages) == 0:
                return False, "", "O arquivo PDF não contém páginas."
                
            for page in reader.pages:
                text = page.extract_text() or ""
                if text and text.strip():
                    extracted_pages.append(text.strip())
        except Exception as e:
            return False, "", f"Arquivo PDF inválido ou corrompido: {str(e)}"

    full_text = "\n\n".join(extracted_pages).strip()

    # 3. Native text layer verification:
    # If the text is empty or contains fewer than 30 non-whitespace characters,
    # it is a scanned image or non-editable bitmap PDF without a text layer.
    non_space_chars = len([c for c in full_text if not c.isspace()])
    if non_space_chars < 30:
        return (
            False,
            "",
            "Erro: PDFs do tipo imagem não são suportados nesta etapa. Envie um PDF editável ou um arquivo .TXT."
        )

    return True, full_text, ""
