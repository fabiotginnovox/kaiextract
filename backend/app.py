"""
FastAPI Server for KaiExtract.
Provides REST endpoints for document extraction, visual source grounding, and Multi-ERP exports.
"""

import os
import json
from typing import Optional, Dict, Any
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from pydantic import BaseModel

from extractor import KaiExtractorCore
from normalizer import ERPNormalizer
from audit_accuracy import run_accuracy_audit
from pdf_processor import validate_and_extract_pdf_text

app = FastAPI(
    title="KaiExtract API",
    description="Multi-ERP Condominium Financial Extraction & Source Grounding Engine",
    version="1.0.0"
)

# Enable CORS for local Vite/React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")
SAMPLES_DIR = os.path.join(BASE_DIR, "samples")
os.makedirs(OUTPUTS_DIR, exist_ok=True)

extractor_engine = KaiExtractorCore()

class ExtractRequest(BaseModel):
    text: str
    doc_name: Optional[str] = "documento"

class ReExtractRequest(BaseModel):
    text: str
    user_hint: Optional[str] = None
    doc_id: Optional[str] = None

class ExportRequest(BaseModel):
    erp: str  # "superlogica" | "condominia" | "universal"
    data: Dict[str, Any]

@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "service": "KaiExtract Core",
        "engine": "Gemini 1.5 Flash Grounded",
        "supported_erps": ["SuperLógica", "CondominIA", "Universal"]
    }

@app.get("/api/samples")
def get_samples():
    """Returns available sample documents for instant one-click testing."""
    samples = []
    if os.path.exists(SAMPLES_DIR):
        for filename in sorted(os.listdir(SAMPLES_DIR)):
            if filename.endswith(".txt"):
                filepath = os.path.join(SAMPLES_DIR, filename)
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()
                
                title = filename.replace(".txt", "").replace("_", " ").title()
                if "schindler" in filename:
                    title = "Manutenção Elevadores"
                if "cpfl" in filename or "sabesp" in filename:
                    category = "Consumo"
                elif "schindler" in filename or "portaria" in filename:
                    category = "Contratos"
                elif "secovi" in filename:
                    category = "Serviços"
                else:
                    category = "Impostos"
                samples.append({
                    "id": filename,
                    "title": title,
                    "category": category,
                    "content": content
                })
    return {"samples": samples}

@app.post("/api/extract")
async def extract_document_endpoint(
    text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None)
):
    """
    Extracts structured data from uploaded .txt or .pdf file or direct text body.
    Validates native text layer for PDFs (blocks scanned image PDFs).
    """
    document_text = ""
    file_type = "txt"
    pdf_bytes: Optional[bytes] = None

    if file:
        filename = (file.filename or "").lower()
        content_type = (file.content_type or "").lower()
        is_pdf = filename.endswith(".pdf") or "pdf" in content_type
        is_txt = filename.endswith(".txt") or "text" in content_type or not filename

        if not (is_pdf or is_txt):
            raise HTTPException(
                status_code=400,
                detail="Formato de arquivo não suportado. Por favor, envie apenas arquivos .TXT ou .PDF."
            )

        content_bytes = await file.read()
        if is_pdf:
            file_type = "pdf"
            is_valid, extracted_txt, err_msg = validate_and_extract_pdf_text(content_bytes)
            if not is_valid:
                raise HTTPException(status_code=400, detail=err_msg)
            document_text = extracted_txt
            pdf_bytes = content_bytes
        else:
            file_type = "txt"
            document_text = content_bytes.decode("utf-8", errors="ignore")
    elif text:
        document_text = text
    else:
        raise HTTPException(status_code=400, detail="Nenhum arquivo ou texto foi fornecido.")

    if not document_text.strip():
        raise HTTPException(status_code=400, detail="O texto do documento está vazio.")

    try:
        result = extractor_engine.extract_document(document_text, output_dir=OUTPUTS_DIR)
        doc_id = result["doc_id"]

        pdf_url = None
        if file_type == "pdf" and pdf_bytes:
            pdf_save_path = os.path.join(OUTPUTS_DIR, f"{doc_id}.pdf")
            with open(pdf_save_path, "wb") as f:
                f.write(pdf_bytes)
            pdf_url = f"/api/pdf/{doc_id}"

        return {
            "status": "success",
            "doc_id": doc_id,
            "file_type": file_type,
            "pdf_url": pdf_url,
            "raw_text": result["raw_text"],
            "dados_extraidos": result["dados_extraidos"],
            "grounding_spans": result["grounding_spans"],
            "html_viewer_url": f"/api/visualize/{doc_id}",
            "superlogica": result["superlogica"],
            "condominia": result["condominia"]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro durante a extração: {str(e)}")

@app.post("/api/re-extract")
async def re_extract_document_endpoint(request: ReExtractRequest):
    """
    Re-extracts structured data and regenerates source grounding spans 
    guided by dynamic user feedback / context hint (Feedback Loop).
    """
    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="O texto do documento está vazio.")

    try:
        result = extractor_engine.extract_document(
            text_or_filepath=request.text,
            user_hint=request.user_hint,
            output_dir=OUTPUTS_DIR
        )
        return {
            "status": "success",
            "doc_id": result["doc_id"],
            "user_hint": request.user_hint,
            "raw_text": result["raw_text"],
            "dados_extraidos": result["dados_extraidos"],
            "grounding_spans": result["grounding_spans"],
            "html_viewer_url": f"/api/visualize/{result['doc_id']}",
            "superlogica": result["superlogica"],
            "condominia": result["condominia"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro durante a re-extração: {str(e)}")

@app.get("/api/visualize/{doc_id}", response_class=HTMLResponse)
def get_visualization_html(doc_id: str):
    """
    Returns the standalone HTML visualization for the requested document.
    """
    html_path = os.path.join(OUTPUTS_DIR, f"{doc_id}_visualization.html")
    if not os.path.exists(html_path):
        raise HTTPException(status_code=404, detail="Visualização não encontrada.")
    
    with open(html_path, "r", encoding="utf-8") as f:
        html_content = f.read()
    return HTMLResponse(content=html_content, status_code=200)

@app.get("/api/pdf/{doc_id}")
def get_pdf_file(doc_id: str):
    """
    Returns the original uploaded PDF file for in-browser rendering.
    """
    pdf_path = os.path.join(OUTPUTS_DIR, f"{doc_id}.pdf")
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="Arquivo PDF não encontrado.")
    return FileResponse(pdf_path, media_type="application/pdf")

@app.post("/api/export")
def export_data(request: ExportRequest):
    """
    Formats the extracted or manually edited data for the specified ERP.
    """
    target_erp = request.erp.lower()
    data = request.data

    if target_erp == "superlogica":
        return ERPNormalizer.to_superlogica_format(data)
    elif target_erp == "condominia":
        return ERPNormalizer.to_condominia_format(data)
    else:
        return {
            "erp": "Universal",
            "data": ERPNormalizer.normalize_extracted_data(data)
        }

@app.get("/api/audit")
def audit_accuracy_endpoint():
    """Runs the batch accuracy test and returns the report."""
    return run_accuracy_audit(samples_dir=SAMPLES_DIR, output_dir=OUTPUTS_DIR)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
