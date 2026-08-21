"""
PDF Processing and Native Text Layer Validation Module for KaiExtract.
Validates editable vs scanned image PDFs and extracts text with natural reading layout,
preventing vertical letter fragmentation from rotated PDF matrices.
"""

import io
import os
import re
from typing import Tuple
import pypdfium2 as pdfium
import pdfplumber
import pypdf

def heal_vertical_letters(text: str) -> str:
    """
    Detects and merges vertical single-character sequences caused by rotated PDF text
    or layout engine artifacts (e.g. C\\nE\\nR\\nE\\nN\\nD -> CEREND).
    """
    if not text:
        return ""

    def merge_single_chars(match):
        lines = match.group(0).split('\n')
        merged = "".join(l.strip() for l in lines if l.strip())
        return " " + merged + " "

    # Matches 3 or more consecutive single character lines
    pattern = r'(?:^[a-zA-Z0-9À-ÿ\.\-\:\/]\s*\n){3,}[a-zA-Z0-9À-ÿ\.\-\:\/]\s*'
    healed = re.sub(pattern, merge_single_chars, text, flags=re.MULTILINE)
    
    # Normalize multiple spaces and extra blank lines
    healed = re.sub(r'[ \t]+', ' ', healed)
    healed = re.sub(r'\n{3,}', '\n\n', healed)
    return healed.strip()

def validate_and_extract_pdf_text(pdf_bytes: bytes) -> Tuple[bool, str, str]:
    """
    Validates if the provided PDF bytes contain a native extractable text layer.
    Extracts high-fidelity natural reading text without vertical character splitting.
    
    Returns:
        Tuple[bool, str, str]: (is_valid, extracted_text, error_message)
    """
    if not pdf_bytes:
        return False, "", "Arquivo PDF vazio."

    extracted_pages = []

    # 1. Primary Engine: PDFium (Google Chromium's native engine)
    # Most accurate reading order, handles rotated text & micro-kerning without splitting characters
    try:
        doc = pdfium.PdfDocument(pdf_bytes)
        if len(doc) == 0:
            return False, "", "O arquivo PDF não contém páginas."
            
        for page in doc:
            textpage = page.get_textpage()
            p_text = textpage.get_text_range()
            if p_text and p_text.strip():
                extracted_pages.append(p_text.strip())
    except Exception as e:
        extracted_pages = []

    # 2. Fallback Engine: pdfplumber (with layout=False & tolerance tuning)
    if not extracted_pages:
        try:
            with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                for page in pdf.pages:
                    # layout=False avoids the pdfminer character-per-line vertical bug
                    p_text = page.extract_text(layout=False, x_tolerance=2, y_tolerance=3) or ""
                    if p_text and p_text.strip():
                        extracted_pages.append(p_text.strip())
        except Exception:
            extracted_pages = []

    # 3. Tertiary Fallback: pypdf
    if not extracted_pages:
        try:
            reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
            for page in reader.pages:
                p_text = page.extract_text() or ""
                if p_text and p_text.strip():
                    extracted_pages.append(p_text.strip())
        except Exception as e:
            return False, "", f"Arquivo PDF inválido ou corrompido: {str(e)}"

    full_text = "\n\n".join(extracted_pages).strip()
    
    # 4. Apply vertical letter healing safety filter
    full_text = heal_vertical_letters(full_text)

    # 5. Native text layer verification:
    non_space_chars = len([c for c in full_text if not c.isspace()])
    if non_space_chars < 30:
        return (
            False,
            "",
            "Erro: PDFs do tipo imagem não são suportados nesta etapa. Envie um PDF editável ou um arquivo .TXT."
        )

    return True, full_text, ""
