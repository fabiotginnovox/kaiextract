"""
Batch Accuracy Audit Tool for KaiExtract.
Runs validation against sample documents and reports precision metrics.
"""

import os
import json
import sys
from extractor import KaiExtractorCore

def run_accuracy_audit(samples_dir: str = "./samples", output_dir: str = "./outputs") -> dict:
    if not os.path.exists(samples_dir):
        # Fallback to current directory samples
        samples_dir = os.path.join(os.path.dirname(__file__), "samples")
    
    extractor = KaiExtractorCore()
    files = [f for f in os.listdir(samples_dir) if f.endswith(".txt")]
    files.sort()
    
    total_docs = len(files)
    if total_docs == 0:
        print(f"❌ No .txt sample files found in {samples_dir}")
        return {"total": 0, "accuracy": 0.0}

    results = []
    total_score = 0
    
    print(f"\n=======================================================")
    print(f"📊 [KaiExtract Audit] Starting Batch Accuracy Verification")
    print(f"📁 Samples Directory: {samples_dir}")
    print(f"📄 Total Documents: {total_docs}")
    print(f"=======================================================\n")

    for idx, filename in enumerate(files, 1):
        filepath = os.path.join(samples_dir, filename)
        try:
            res = extractor.extract_document(filepath, output_dir=output_dir)
            data = res["dados_extraidos"]
            
            # Metric checks
            has_condo = bool(data.get("condominio_nome"))
            has_supplier = bool(data.get("fornecedor_nome"))
            has_value = bool(data.get("valor_total") and data.get("valor_total") != "0,00")
            has_due_date = bool(data.get("data_vencimento"))
            has_payment_code = bool(data.get("linha_digitavel") or data.get("chave_pix"))
            has_category = bool(" > " in data.get("tipo_conta", ""))
            
            passed_checks = sum([has_condo, has_supplier, has_value, has_due_date, has_payment_code, has_category])
            doc_score = (passed_checks / 6.0) * 100.0
            total_score += doc_score
            
            status_symbol = "✅" if doc_score == 100 else ("⚠️" if doc_score >= 80 else "❌")
            print(f"[{idx}/{total_docs}] {status_symbol} {filename:25} | Score: {doc_score:5.1f}% | Cat: {data.get('tipo_conta')}")
            print(f"      💰 Valor: R$ {data.get('valor_total')} | Venc: {data.get('data_vencimento')} | Favorecido: {data.get('fornecedor_nome')[:30]}")
            
            results.append({
                "file": filename,
                "score": doc_score,
                "data": data,
                "html_view": res.get("html_path")
            })
        except Exception as e:
            print(f"[{idx}/{total_docs}] ❌ {filename:25} | Error: {str(e)}")
            results.append({
                "file": filename,
                "score": 0.0,
                "error": str(e)
            })

    global_accuracy = (total_score / (total_docs * 100.0)) * 100.0 if total_docs > 0 else 0.0
    print(f"\n=======================================================")
    print(f"🎯 GLOBAL ACCURACY SCORE: {global_accuracy:.1f}%")
    print(f"=======================================================\n")

    report = {
        "total_documents": total_docs,
        "global_accuracy_pct": round(global_accuracy, 2),
        "results": results
    }

    report_path = os.path.join(output_dir, "accuracy_audit_report.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    return report

if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    samples_dir = os.path.join(current_dir, "samples")
    outputs_dir = os.path.join(current_dir, "../outputs")
    run_accuracy_audit(samples_dir, outputs_dir)
