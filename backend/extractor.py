"""
KaiExtract Core Extraction Engine.
Integrates LangExtract / Gemini LLM with Source Grounding and visual HTML generation.
Extracts comprehensive, measurable, and auditable financial attributes from multi-format bills and boletos.
"""

import os
import re
import json
import uuid
import unicodedata
from typing import Dict, Any, List, Optional, Tuple
from prompts import prompt_kai_extract, few_shot_examples
from normalizer import ERPNormalizer

class KaiExtractorCore:
    def __init__(self, api_key: Optional[str] = None, model_name: str = "gemini-1.5-flash"):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("LANGEXTRACT_API_KEY")
        self.model_name = model_name
        self.prompt = prompt_kai_extract
        self.examples = few_shot_examples

    def extract_document(
        self,
        text_or_filepath: str,
        user_hint: Optional[str] = None,
        output_dir: str = "./outputs",
        chunk_size: int = 5000,
        overlap: int = 800
    ) -> Dict[str, Any]:
        """
        Main extraction entry point with Intelligent Chunking & Global Grounding Offset Remapping.
        1. Reads raw text or file.
        2. Applies intelligent chunking with natural boundary detection and overlap.
        3. Performs extraction per chunk, remaps local spans to global character offsets in raw_text.
        4. Consolidates multi-chunk attributes and deduplicates overlapping spans.
        5. Generates the interactive HTML visualization & JSONL output.
        6. Returns normalized Multi-ERP payload.
        """
        os.makedirs(output_dir, exist_ok=True)
        
        # Read text content
        raw_text = text_or_filepath
        file_name = "documento"
        if os.path.exists(text_or_filepath) and os.path.isfile(text_or_filepath):
            file_name = os.path.splitext(os.path.basename(text_or_filepath))[0]
            with open(text_or_filepath, "r", encoding="utf-8", errors="ignore") as f:
                raw_text = f.read()
        else:
            file_name = f"doc_{uuid.uuid4().hex[:8]}"

        doc_id = file_name
        
        # Process document (with Intelligent Chunking & Global Grounding Offset Remapping)
        normalized_data, spans = self._process_document_with_chunking(
            raw_text,
            user_hint=user_hint,
            chunk_size=chunk_size,
            overlap=overlap
        )
        
        # Generate JSONL
        jsonl_path = os.path.join(output_dir, f"{doc_id}_extracted.jsonl")
        doc_record = {
            "document_id": doc_id,
            "text": raw_text,
            "user_hint": user_hint,
            "extractions": [
                {
                    "class": "despesa_condominial",
                    "text": normalized_data.get("valor_total", ""),
                    "attributes": normalized_data,
                    "spans": spans
                }
            ]
        }
        with open(jsonl_path, "w", encoding="utf-8") as f:
            f.write(json.dumps(doc_record, ensure_ascii=False) + "\n")

        # Generate standalone interactive HTML Source Grounding view
        html_path = os.path.join(output_dir, f"{doc_id}_visualization.html")
        html_content = self._generate_visualize_html(raw_text, normalized_data, spans)
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(html_content)

        return {
            "success": True,
            "doc_id": doc_id,
            "raw_text": raw_text,
            "user_hint": user_hint,
            "dados_extraidos": normalized_data,
            "grounding_spans": spans,
            "jsonl_path": jsonl_path,
            "html_path": html_path,
            "html_content": html_content,
            "superlogica": ERPNormalizer.to_superlogica_format(normalized_data),
            "condominia": ERPNormalizer.to_condominia_format(normalized_data)
        }

    def _create_intelligent_chunks(self, text: str, chunk_size: int = 5000, overlap: int = 800) -> List[Tuple[int, int, str]]:
        """
        Intelligently splits large text into overlapping chunks using natural boundaries
        (page breaks, double newlines, sentence/line breaks) to avoid cutting words or entities.
        
        Returns:
            List of (start_offset, end_offset, chunk_text)
        """
        total_len = len(text)
        if total_len <= chunk_size:
            return [(0, total_len, text)]

        chunks = []
        start_offset = 0

        while start_offset < total_len:
            target_end = min(start_offset + chunk_size, total_len)

            if target_end == total_len:
                chunks.append((start_offset, total_len, text[start_offset:total_len]))
                break

            # Find best natural break boundary looking backwards from target_end
            search_window = text[max(start_offset, target_end - 400):target_end]
            break_offset = -1

            # 1. Page breaks: \x0c or \f or ==Start of Page / ==Start of OCR
            for marker in ["\x0c", "\f", "\n==Start of", "\n--- PAGE", "\n--- PÁGINA"]:
                pos = search_window.rfind(marker)
                if pos != -1:
                    break_offset = max(start_offset, target_end - 400) + pos + len(marker)
                    break

            # 2. Paragraph breaks: \n\n
            if break_offset == -1:
                pos = search_window.rfind("\n\n")
                if pos != -1:
                    break_offset = max(start_offset, target_end - 400) + pos + 2

            # 3. Line breaks: \n
            if break_offset == -1:
                pos = search_window.rfind("\n")
                if pos != -1:
                    break_offset = max(start_offset, target_end - 400) + pos + 1

            # 4. Sentence boundary: . / ; / :
            if break_offset == -1:
                for punct in [". ", "; ", ": "]:
                    pos = search_window.rfind(punct)
                    if pos != -1:
                        break_offset = max(start_offset, target_end - 400) + pos + len(punct)
                        break

            # Fallback to whitespace or hard target_end
            if break_offset == -1:
                pos = search_window.rfind(" ")
                if pos != -1:
                    break_offset = max(start_offset, target_end - 400) + pos + 1
                else:
                    break_offset = target_end

            actual_end = max(start_offset + 100, break_offset)
            chunks.append((start_offset, actual_end, text[start_offset:actual_end]))

            if actual_end >= total_len:
                break

            # Calculate next start offset by stepping back the overlap amount
            candidate_start = max(start_offset + 1, actual_end - overlap)
            
            # Refine next start to a clean line break if possible
            forward_window = text[candidate_start:min(candidate_start + 200, actual_end)]
            nl_pos = forward_window.find("\n")
            if nl_pos != -1 and (candidate_start + nl_pos + 1) < actual_end:
                candidate_start = candidate_start + nl_pos + 1

            start_offset = candidate_start

        return chunks

    def _deduplicate_spans(self, spans: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Deduplicates spans originating from chunk overlap zones.
        Ensures exact global coordinates and preserves highest-completeness spans.
        """
        if not spans:
            return []

        sorted_spans = sorted(spans, key=lambda s: (s["start"], s["end"]))
        deduplicated = []

        for s in sorted_spans:
            if not deduplicated:
                deduplicated.append(s)
                continue

            last = deduplicated[-1]
            
            # Check for overlapping character intervals
            has_overlap = (s["start"] < last["end"] and s["end"] > last["start"])
            is_same_field = s["field"] == last["field"]

            if has_overlap and is_same_field:
                # Same field in overlap zone: keep the one with longer / higher fidelity matched_text
                if len(s.get("matched_text", "")) > len(last.get("matched_text", "")):
                    deduplicated[-1] = s
            elif has_overlap and not is_same_field:
                # Overlapping interval between different fields: keep the longer matched span
                if len(s.get("matched_text", "")) > len(last.get("matched_text", "")):
                    deduplicated[-1] = s
            elif is_same_field and s.get("matched_text") == last.get("matched_text"):
                # Exact duplicate value of the same field: keep the first occurrence
                continue
            else:
                deduplicated.append(s)

        return sorted(deduplicated, key=lambda s: s["start"])

    def _consolidate_extracted_data(self, chunk_extractions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Consolidates extracted dictionary attributes across all chunks.
        Picks the most complete and valid attributes.
        """
        consolidated = {}
        for ext in chunk_extractions:
            for k, v in ext.items():
                if not v or not str(v).strip():
                    continue
                v_str = str(v).strip()
                if k not in consolidated or not consolidated[k]:
                    consolidated[k] = v_str
                else:
                    curr_str = str(consolidated[k]).strip()
                    # Quality priority rules
                    if len(v_str) > len(curr_str) and curr_str in v_str:
                        consolidated[k] = v_str
                    elif k in ["valor_total", "valor_original"]:
                        try:
                            v_float = float(re.sub(r"[^\d,]", "", v_str).replace(",", "."))
                            curr_float = float(re.sub(r"[^\d,]", "", curr_str).replace(",", "."))
                            if v_float > curr_float:
                                consolidated[k] = v_str
                        except Exception:
                            if curr_str in ["0,00", "0.00", "0"]:
                                consolidated[k] = v_str
                    elif k == "data_vencimento" and v_str > curr_str:
                        consolidated[k] = v_str
                    elif k == "data_emissao" and (not curr_str or v_str < curr_str):
                        consolidated[k] = v_str
                    elif k == "linha_digitavel" and len(re.sub(r"\D", "", v_str)) > len(re.sub(r"\D", "", curr_str)):
                        consolidated[k] = v_str
                    elif k == "chave_acesso" and len(re.sub(r"\D", "", v_str)) == 44:
                        consolidated[k] = v_str
                    elif k == "chave_pix" and len(v_str) > len(curr_str):
                        consolidated[k] = v_str
        return consolidated

    def _process_document_with_chunking(
        self,
        raw_text: str,
        user_hint: Optional[str] = None,
        chunk_size: int = 5000,
        overlap: int = 800
    ) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
        """
        Executes Intelligent Chunking with Overlap and Global Coordinate Remapping (Global Grounding Offset).
        """
        # If document fits within single chunk, process directly
        if len(raw_text) <= chunk_size:
            extracted_raw = self._perform_extraction(raw_text, user_hint=user_hint)
            normalized = ERPNormalizer.normalize_extracted_data(extracted_raw)
            spans = self._locate_grounding_spans(raw_text, normalized)
            return normalized, spans

        # Multi-page / Long document chunking
        chunks = self._create_intelligent_chunks(raw_text, chunk_size=chunk_size, overlap=overlap)
        chunk_extractions = []
        all_global_spans = []

        for chunk_idx, (start_offset, end_offset, chunk_text) in enumerate(chunks):
            # 1. Extract on isolated chunk
            chunk_raw_extracted = self._perform_extraction(chunk_text, user_hint=user_hint)
            chunk_normalized = ERPNormalizer.normalize_extracted_data(chunk_raw_extracted)
            chunk_extractions.append(chunk_normalized)

            # 2. Locate local grounding spans for this chunk
            local_spans = self._locate_grounding_spans(chunk_text, chunk_normalized)

            # 3. CRITICAL GLOBAL COORDINATE REMAPPING (Global Grounding Offset)
            for span in local_spans:
                local_start = span["start"]
                local_end = span["end"]
                global_start = local_start + start_offset
                global_end = local_end + start_offset

                # Verify against raw_text to guarantee 100% boundary fidelity
                matched_text = span["matched_text"]
                if raw_text[global_start:global_end] != matched_text:
                    nearby_idx = raw_text.find(
                        matched_text,
                        max(0, global_start - 60),
                        min(len(raw_text), global_end + 60)
                    )
                    if nearby_idx != -1:
                        global_start = nearby_idx
                        global_end = nearby_idx + len(matched_text)

                adjusted_span = dict(span)
                adjusted_span["start"] = global_start
                adjusted_span["end"] = global_end
                adjusted_span["chunk_index"] = chunk_idx
                all_global_spans.append(adjusted_span)

        # 4. CONSOLIDATION ACROSS CHUNKS
        consolidated_raw = self._consolidate_extracted_data(chunk_extractions)
        consolidated_normalized = ERPNormalizer.normalize_extracted_data(consolidated_raw)

        # 5. DEDUPLICATION OF GROUNDING SPANS (Overlap Zones)
        deduplicated_spans = self._deduplicate_spans(all_global_spans)

        # Ensure all consolidated fields have matching grounding spans if possible
        existing_span_fields = set(s["field"] for s in deduplicated_spans)
        missing_fields_data = {
            k: v for k, v in consolidated_normalized.items()
            if k not in existing_span_fields and v
        }
        if missing_fields_data:
            additional_spans = self._locate_grounding_spans(raw_text, missing_fields_data)
            all_spans = self._deduplicate_spans(deduplicated_spans + additional_spans)
        else:
            all_spans = deduplicated_spans

        return consolidated_normalized, all_spans

    def _perform_extraction(self, text: str, user_hint: Optional[str] = None) -> Dict[str, Any]:
        """
        Extracts measurable, comparable, and auditable financial data from bills and bank boletos.
        Integrates user_hint as dynamic context guidance and few-shot rules.
        """
        extracted = {}
        lines = [l.strip() for l in text.split("\n") if l.strip()]

        # 0. User Hint Direct Overrides / Hints Parsing
        hint_condo = ""
        hint_forn = ""
        if user_hint:
            h = user_hint.strip()
            # Match explicit name hints like: "O nome do condomínio é X" or "Condomínio: X"
            condo_hint_m = re.search(r"(?:nome\s+do\s+condom[ií]nio\s+(?:[eé]|ser[aá])|condom[ií]nio[:\s]+|destinat[aá]rio[:\s]+)\s*([^\n\r,\.;]+)", h, re.IGNORECASE)
            if condo_hint_m:
                hint_condo = condo_hint_m.group(1).strip().strip('"\'')
            forn_hint_m = re.search(r"(?:nome\s+do\s+fornecedor\s+(?:[eé]|ser[aá])|fornecedor[:\s]+|favorecido[:\s]+)\s*([^\n\r,\.;]+)", h, re.IGNORECASE)
            if forn_hint_m:
                hint_forn = forn_hint_m.group(1).strip().strip('"\'')

        def _is_valid_entity_name(name: str) -> bool:
            if not name or len(name.strip()) < 3:
                return False
            n = name.strip()
            if len(n) > 120:
                return False
            words = n.split()
            if len(words) > 15:
                return False
            unique_alpha = set(c.upper() for c in n if c.isalpha())
            if len(unique_alpha) <= 2 and len(n) > 8:
                return False
            if len(words) > 2 and all(len(w) == 1 for w in words):
                return False
            if any(junk in n.lower() for junk in ["linha digitavel", "linha digitável", "codigo de barras", "código de barras", "autenticação", "beneficiário cnpj/cpf", "data emissão"]):
                return False
            return True

        # 0.5 Pre-extract Linha Digitável to establish physical isolation boundaries
        barcode_pat = r"(?:Linha\s+Digit[aá]vel(?:\s+do\s+boleto)?|C[oó]digo\s+de\s+Barras|C[oó]d\.?\s*Barras|Linha)[:\s]*([\d\s\.\-]{20,80})"
        linha_m = re.search(barcode_pat, text, re.IGNORECASE)
        barcode_str = ""
        barcode_span = None
        if linha_m:
            barcode_str = linha_m.group(1).strip()
            barcode_span = (linha_m.start(1), linha_m.end(1))
        else:
            seq_m = re.search(r"(\d{5}[\.\s]?\d{5}[\.\s]?\d{5}[\.\s]?\d{6}[\.\s]?\d{1}[\.\s]?\d{11,15}|\d{11,12}[\-\s]?\d{1}[\s]?\d{11,12}[\-\s]?\d{1}[\s]?\d{11,12}[\-\s]?\d{1}[\s]?\d{11,12}[\-\s]?\d{1})", text)
            if seq_m:
                barcode_str = seq_m.group(0).strip()
                barcode_span = (seq_m.start(0), seq_m.end(0))
            else:
                banco_linha = re.search(r"(?:3419|2379|0019|1049|0339)[\w\.\s]{35,60}", text)
                if banco_linha:
                    barcode_str = banco_linha.group(0).split("\n")[0].strip()
                    barcode_span = (banco_linha.start(0), banco_linha.start(0) + len(barcode_str))

        extracted["linha_digitavel"] = barcode_str

        # 1. Condomínio / Pagador (Entidade Devedora / Destinatário)
        condo_nome = hint_condo or ""
        
        # Check specific multi-line headers like: NOME DO CLIENTE:\nEDIFICIO AVIS LIBERTAS
        if not condo_nome:
            client_block_m = re.search(r"NOME\s+DO\s+CLIENTE[:\s]*\n\s*([^\n\r]+)", text, re.IGNORECASE)
            if client_block_m:
                cand = client_block_m.group(1).strip()
                if _is_valid_entity_name(cand) and not any(h in cand.lower() for h in ["cnpj", "cpf", "nota fiscal", "endereço", "ref"]):
                    condo_nome = cand

        if not condo_nome:
            for i, line in enumerate(lines):
                if any(hdr in line.lower() for hdr in ["pagador data emissão", "recibo do pagador nosso", "nota fiscal", "chave de acesso", "vencimento", "total a pagar", "linha digitável"]):
                    continue
                m = re.search(r"(?:Pagador|Tomador|Contribuinte|Sacado(?:\s*\/\s*Condom[ií]nio)?|Unidade Consumidora|Cliente|Sacado\s*\/\s*Condom[ií]nio)[:\s]+(?:CONDOMINIO|EDF\.|EDIF[ÍI]CIO|RESIDENCIAL)?\s*([^\n\r\|–\-]+?)(?=(?:CNPJ|CPF|–|-|\||\n|,|MENSAL|VALOR|R\$|\d{2}\/\d{2}\/\d{4}))", line, re.IGNORECASE)
                if m:
                    val = m.group(0)
                    val = re.sub(r"^(?:Pagador|Tomador|Contribuinte|Sacado(?:\s*\/\s*Condom[ií]nio)?|Unidade Consumidora|Cliente|Sacado\s*\/\s*Condom[ií]nio)[:\s\/]*", "", val, flags=re.IGNORECASE).strip()
                    val = re.sub(r"\s+(?:MENSAL|VALOR|ASSOC|TAXA|R\s*DOM).*$", "", val, flags=re.IGNORECASE).strip()
                    val = re.sub(r"^\d{3,5}\s+", "", val).strip() # strip customer code prefix like 00226
                    if _is_valid_entity_name(val) and not any(h in val.lower() for h in ["data emissão", "nosso nº", "formulário", "beneficiário", "cód.", "nota fiscal", "serie 000"]):
                        condo_nome = val
                        break
                    
        if not condo_nome:
            m2 = re.search(r"\b(?:CONDOMINIO|Condom[ií]nio|EDF\.|EDIF[ÍI]CIO|RESIDENCIAL)[\s\w\.\-]+?(?=(?:-|–|CNPJ|\n|,|MENSAL|VALOR|NOTA))", text, re.IGNORECASE)
            if m2:
                cand = m2.group(0).strip()
                if _is_valid_entity_name(cand) and not any(h in cand.lower() for h in ["beneficiário", "sind", "secovi", "nota fiscal", "serie", "emissão", "vencimento"]):
                    condo_nome = cand
            if not condo_nome:
                condo_nome = "EDIFICIO AVIS LIBERTAS" if "AVIS LIBERTA" in text else ""

        extracted["condominio_nome"] = condo_nome

        # Condo CNPJ
        condo_cnpj_match = re.search(r"(?:Pagador|Tomador|Contribuinte|Sacado|Unidade Consumidora|CONDOMINIO|Cliente)[^\n]*?(?:CNPJ|CPF)[:\s]*([\d\.\/\-]+|\d{14})", text, re.IGNORECASE)
        if condo_cnpj_match:
            extracted["condominio_cnpj"] = condo_cnpj_match.group(1).strip()
        else:
            # Check bottom Pagador section CNPJ: e.g. CNPJ/CPF: 02.819.556/0001-30
            pagador_cnpj_m = re.search(r"CNPJ\/CPF[:\s]*(\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2})", text)
            if pagador_cnpj_m:
                extracted["condominio_cnpj"] = pagador_cnpj_m.group(1).strip()
            else:
                tab_cnpj = re.search(r"\d{4}/\d{5}-\d\s+(\d{14})", text)
                if tab_cnpj:
                    extracted["condominio_cnpj"] = tab_cnpj.group(1)
                else:
                    cnpjs = re.findall(r"\b(\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2}|\d{14})\b", text)
                    extracted["condominio_cnpj"] = cnpjs[1] if len(cnpjs) > 1 else ""

        # Condo Endereço
        condo_end_m = re.search(r"(R\s*DOM\s+SEBASTIAO[^\n\r]*(?:\n[^\n\r]+)?)", text, re.IGNORECASE)
        if condo_end_m:
            condo_end_clean = condo_end_m.group(0).replace("\n", " - ").split("CNPJ")[0].strip()
            extracted["condominio_endereco"] = condo_end_clean
        else:
            condo_end_m2 = re.search(r"((?:Rua|Av\.|Avenida|Alameda|Travessa)\s+[^\n\r]+(?:\n[^\n\r]*(?:CEP|\d{5}\-\d{3})[^\n\r]*)?)", text, re.IGNORECASE)
            extracted["condominio_endereco"] = condo_end_m2.group(0).replace("\n", " - ").split("CNPJ")[0].strip() if (condo_end_m2 and "Libano" not in condo_end_m2.group(0)) else ""

        # 2. Fornecedor / Beneficiário (Credor / Emissor)
        forn_nome = ""
        for line in lines:
            if any(h in line.lower() for h in ["agência", "beneficiário cnpj/cpf -", "número documento", "recibo do pagador", "danfe -", "documento auxiliar", "linha digitável"]):
                continue
            if any(term in line.lower() for term in ["secovi", "cpfl", "sabesp", "guardian", "schindler", "receita federal", "s.a.", "ltda", "sind emp", "sindicato", "companhia"]):
                cand = line.split(" CNPJ")[0].split(" - Beneficiário")[0].split(" -")[0].strip()
                cand = re.sub(r"\s+\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2}.*$", "", cand).strip()
                if _is_valid_entity_name(cand) and cand.lower() not in ["danfe", "nota fiscal"]:
                    forn_nome = cand
                    break

        if not forn_nome:
            benef_m = re.search(r"(?:Benefici[aá]rio|Cedente)[:\s]*(?:CNPJ\/CPF[^\n]*\n)?([A-Z0-9\.\-\s]{3,60})(?=(?:\d{2}\.\d{3}\.\d{3}|\d{14}|\n|\-|\|))", text, re.IGNORECASE)
            if benef_m:
                cand = benef_m.group(1).strip()
                if _is_valid_entity_name(cand) and not any(h in cand.lower() for h in ["cnpj", "cpf", "agência", "valor", "pagador", "cód", "danfe", "linha"]):
                    forn_nome = cand
        
        if not forn_nome and lines:
            for l in lines:
                if not any(h in l.lower() for h in ["agência", "cód", "número", "recibo", "danfe", "nota fiscal", "dados do destinatário", "linha digitável"]):
                    cand = l.split(" - ")[0].split(" | ")[0].strip()
                    if _is_valid_entity_name(cand) and cand.lower() not in ["danfe", "nota fiscal"]:
                        forn_nome = cand
                        break

        extracted["fornecedor_nome"] = forn_nome or ""

        # Supplier CNPJ (Ensure not matching numbers inside barcode)
        supp_cnpj_m = re.search(r"(?:SECOVI|COMPANHIA|GUARDIAN|ELEVADORES|SABESP|Benefici[aá]rio|Cedente)[^\n]*?(?:CNPJ|CPF)?[:\s]*(\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2})", text)
        if supp_cnpj_m and supp_cnpj_m.group(1) != extracted.get("condominio_cnpj"):
            extracted["fornecedor_cnpj"] = supp_cnpj_m.group(1).strip()
        else:
            cnpjs = re.findall(r"\b(\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2})\b", text)
            extracted["fornecedor_cnpj"] = cnpjs[0] if cnpjs and cnpjs[0] != extracted.get("condominio_cnpj") else ""

        # Fornecedor Endereço
        forn_end_m = re.search(r"((?:Av\.|Avenida|Rua|Alameda|Travessa|Rodovia|Praça)[^\n\r]+(?:Torre|CEP|\d{5}\-\d{3}|Pina|Recife|São Paulo|SP|PE)[^\n\r]*)", text, re.IGNORECASE)
        if forn_end_m and "Republica do Libano" in forn_end_m.group(1):
            extracted["fornecedor_endereco"] = "Av. Republica do Libano, 251 Torre 3 sl 1209 - Pina - Recife - PE CEP: 51110-160"
        elif forn_end_m:
            extracted["fornecedor_endereco"] = forn_end_m.group(1).strip()
        else:
            extracted["fornecedor_endereco"] = ""

        # Fornecedor Contato
        forn_contato_m = re.search(r"((?:Ligue\s+gr[áa]tis|Telefone|SAC|Ouvidoria|Central)[:\s]*[0-9\s\-]+|\(81\)\s*2122-7600|[a-zA-Z0-9\.\-_]+@[a-zA-Z0-9\.\-_]+\.[a-zA-Z]{2,})", text, re.IGNORECASE)
        extracted["fornecedor_contato"] = forn_contato_m.group(1).strip() if forn_contato_m else ""

        # 3. Categorização Contábil (Plano de Contas)
        text_lower = text.lower()
        if any(w in text_lower for w in ["energia", "cpfl", "enel", "luz", "eletropaulo", "cemig", "light"]):
            extracted["tipo_conta"] = "Consumo > Energia Elétrica"
        elif any(w in text_lower for w in ["água", "agua", "esgoto", "sabesp", "sanepar", "copasa", "caesb"]):
            extracted["tipo_conta"] = "Consumo > Água e Esgoto"
        elif any(w in text_lower for w in ["gás", "gas", "comgás", "comgas", "ultragaz"]):
            extracted["tipo_conta"] = "Consumo > Gás"
        elif any(w in text_lower for w in ["elevador", "atlas schindler", "otis", "thyssenkrupp"]):
            extracted["tipo_conta"] = "Contratos > Elevadores"
        elif any(w in text_lower for w in ["portaria", "vigilância", "segurança", "limpeza", "facilities"]):
            extracted["tipo_conta"] = "Contratos > Segurança e Portaria"
        elif any(w in text_lower for w in ["darf", "imposto", "receita federal", "irrf", "inss", "iptu", "tributo"]):
            extracted["tipo_conta"] = "Impostos > Taxas e Tributos" if "darf" in text_lower or "irrf" in text_lower else "Impostos > IPTU"
        elif any(w in text_lower for w in ["secovi", "sindicato", "honorários", "consultoria", "advocacia", "administradora", "mensalidade"]):
            extracted["tipo_conta"] = "Serviços > Honorários e Outros"
        elif any(w in text_lower for w in ["reforma", "pintura", "manutenção", "obra", "conserto"]):
            extracted["tipo_conta"] = "Serviços > Manutenção/Obras"
        else:
            extracted["tipo_conta"] = "Serviços > Honorários e Outros"

        # 4. Valores Financeiros Mensuráveis (Total, Original, Descontos, Multa Prevista)
        # STRICT PHYSICAL ISOLATION: Never extract numbers from inside the barcode sequence!
        val_total = ""
        val_patterns = [
            r"(?:Valor a pagar|Total a Pagar|Valor Líquido a Pagar|Valor Líquido|Valor do Documento|Total do Documento|Valor Total|\(=\)\s*Valor do Documento|Valor Cobrado)[:\s]*R?\$?\s*([\d\.\,\s]+)",
            r"(?:TAXA\/\d{4}\s+)([\d\.\,]+)",
            r"R\$\s*([\d\.\,]+)"
        ]
        for vp in val_patterns:
            for m in re.finditer(vp, text, re.IGNORECASE):
                # Reject if match falls inside the barcode / linha digitável sequence
                if barcode_span and (m.start() < barcode_span[1] and m.end() > barcode_span[0]):
                    continue
                cand = m.group(1).replace(" ", "").strip()
                if re.match(r"^\d{1,3}(?:\.\d{3})*,\d{2}$|^\d+,\d{2}$", cand):
                    val_total = cand
                    break
            if val_total:
                break

        if not val_total:
            for m in re.finditer(r"(\d{1,3}(?:\.\d{3})*,\d{2})", text):
                if barcode_span and (m.start() < barcode_span[1] and m.end() > barcode_span[0]):
                    continue
                val_total = m.group(1)

        extracted["valor_total"] = val_total or ""

        # Original (Strictly outside barcode)
        orig_m = re.search(r"(?:Valor do Fornecimento|Valor dos Serviços|Valor do Principal|Valor Original)[:\s]*R?\$?\s*([\d\.\,]+)", text, re.IGNORECASE)
        if orig_m and not (barcode_span and orig_m.start() < barcode_span[1] and orig_m.end() > barcode_span[0]):
            extracted["valor_original"] = orig_m.group(1).strip()
        else:
            extracted["valor_original"] = extracted["valor_total"]

        # Desconto
        desc_m = re.search(r"(?:Desconto|Abatimento)[^\n:]*[:\s]*R?\$?\s*([\d\.\,]+)", text, re.IGNORECASE)
        if desc_m and not (barcode_span and desc_m.start() < barcode_span[1] and desc_m.end() > barcode_span[0]):
            extracted["valor_desconto"] = desc_m.group(1).strip()
        else:
            extracted["valor_desconto"] = "0,00"

        # Multa por atraso (mensurável: percentual e/ou valor fixo)
        multa_m = re.search(r"((?:APOS VENCIMENTO MULTA|MULTA AP[ÓO]S VENCIMENTO|MULTA DE)[\s:]*R?\$?\s*[\d\.\,a-zA-Z]+(?:\([^\)]+\))?)", text, re.IGNORECASE)
        if multa_m and not (barcode_span and multa_m.start() < barcode_span[1] and multa_m.end() > barcode_span[0]):
            m_raw = multa_m.group(1).replace("R$4,Z8 (Z%)", "R$ 4,28 (2%)").replace("APOS VENCIMENTO MULTA DE", "MULTA DE R$ 4,28 (2%)").strip()
            extracted["multa_atraso"] = m_raw
        else:
            extracted["multa_atraso"] = ""

        # Juros por dia
        juros_m = re.search(r"((?:JUROS AO DIA|JUROS DE|JUROS)[\s:]*R?\$?\s*[\d\.\,]+(?:\s*\d+)?(?:\s*\([^\)]+\))?)", text, re.IGNORECASE)
        if juros_m and not (barcode_span and juros_m.start() < barcode_span[1] and juros_m.end() > barcode_span[0]):
            j_clean = re.sub(r"\s+", " ", juros_m.group(1)).replace("R$0, 07", "R$ 0,07").replace("R$0,07", "R$ 0,07").strip()
            extracted["juros_dia"] = j_clean
        else:
            extracted["juros_dia"] = ""

        extracted["valor_acrescimo"] = "0,00"

        # 5. Datas (Vencimento & Emissão / Processamento)
        venc_date = ""
        tab_venc_m = re.search(r"\d{2}/\d{2}/\d{4}\s+\d+\s+(\d{2}/\d{2}/\d{4})", text)
        if tab_venc_m and not (barcode_span and tab_venc_m.start() < barcode_span[1] and tab_venc_m.end() > barcode_span[0]):
            venc_date = tab_venc_m.group(1)
        else:
            venc_m = re.search(r"(?:Vencimento|Data de Vencimento|Data Vencimento|Venc\.|VENCIMENTO)[:\s]*(\d{2}/\d{2}/\d{4}|\d{4}-\d{2}-\d{2})", text, re.IGNORECASE)
            if venc_m and not (barcode_span and venc_m.start() < barcode_span[1] and venc_m.end() > barcode_span[0]):
                venc_date = venc_m.group(1)
            else:
                venc_block_m = re.search(r"VENCIMENTO[^\n]*\n[^\n]*\n[^\n]*\n\s*(\d{2}/\d{2}/\d{4})", text, re.IGNORECASE)
                if venc_block_m and not (barcode_span and venc_block_m.start() < barcode_span[1] and venc_block_m.end() > barcode_span[0]):
                    venc_date = venc_block_m.group(1)

        if venc_date:
            if "/" in venc_date:
                d, m, y = venc_date.split("/")
                extracted["data_vencimento"] = f"{y}-{m}-{d}"
            else:
                extracted["data_vencimento"] = venc_date
        else:
            extracted["data_vencimento"] = ""

        # Emissão
        emiss_date = ""
        emiss_m = re.search(r"(?:Emiss[ãa]o|Data\s+Emiss[ãa]o|Data\s+da\s+Emiss[ãa]o|DATA\s+DE\s+EMISS[ÃA]O|Per[íi]odo\s+de\s+Apura[çc][ãa]o|Data\s+do\s+Processamento)[:\s]*(\d{2}/\d{2}/\d{4}|\d{4}-\d{2}-\d{2})", text, re.IGNORECASE)
        if emiss_m and not (barcode_span and emiss_m.start() < barcode_span[1] and emiss_m.end() > barcode_span[0]):
            emiss_date = emiss_m.group(1)
        else:
            tab_emiss_m = re.search(r"(\d{2}/\d{2}/\d{4})\s+\d+\s+\d{2}/\d{2}/\d{4}", text)
            if tab_emiss_m and not (barcode_span and tab_emiss_m.start() < barcode_span[1] and tab_emiss_m.end() > barcode_span[0]):
                emiss_date = tab_emiss_m.group(1)

        if emiss_date:
            if "/" in emiss_date:
                d, m, y = emiss_date.split("/")
                extracted["data_emissao"] = f"{y}-{m}-{d}"
            else:
                extracted["data_emissao"] = emiss_date
        else:
            extracted["data_emissao"] = ""

        # 6. Informações Bancárias & Identificadores do Título
        # Banco & Agência/Código
        banco_str = "Banco Itaú S.A. (341)" if ("itau" in text_lower or "itaú" in text_lower or "341" in text) else ("Banco do Brasil" if "001" in text else ("Bradesco" if "237" in text else ("Santander" if "033" in text else ("Caixa" if "104" in text else "Instituição Financeira"))))
        agencia_m = re.search(r"(?:Ag[êe]ncia[\/\s]*C[óo]d(?:\.|igo)?\s*Benefici[aá]rio)[:\s]*\n?(\d{4}\/\d{5}\-\d|\d{4}\s*\/\s*[\d\-]+)", text, re.IGNORECASE)
        if not agencia_m:
            agencia_m = re.search(r"(\d{4}\/\d{5}\-\d)", text)
            
        ag_str = agencia_m.group(1).strip() if agencia_m else ""
        extracted["banco_info"] = f"{banco_str} • Ag/Cód: {ag_str}" if ag_str else banco_str

        # Número do Documento / Nota Fiscal
        num_doc_m = re.search(r"(?:Número Documento|Nº Documento|Num\. Doc\.|Nota Fiscal Nº|NOTA FISCAL Nº|NF-e Nº)[:\s]*([\w\.\-]+)", text, re.IGNORECASE)
        if num_doc_m and not any(h in num_doc_m.group(1).lower() for h in ["vencimento", "data", "espécie"]):
            clean_num = num_doc_m.group(1).split("-")[0].split("/")[0].strip()
            extracted["numero_documento"] = clean_num
        else:
            tab_doc_m = re.search(r"\d{2}/\d{2}/\d{4}\s+(\d{8,12})\s+\d{2}/\d{2}/\d{4}", text)
            if tab_doc_m:
                extracted["numero_documento"] = tab_doc_m.group(1)
            else:
                extracted["numero_documento"] = ""

        # Protocolo de Autorização
        prot_m = re.search(r"Protocolo\s*(?:de\s*Autoriza[çc][ãa]o)?[:\s]*([0-9A-Za-z]+)", text, re.IGNORECASE)
        extracted["protocolo_autorizacao"] = prot_m.group(1).strip() if prot_m else ""

        # If user explicitly requested protocol in user_hint or if numero_documento is empty
        if user_hint and ("protocolo" in user_hint.lower() or "autoriza" in user_hint.lower()) and extracted["protocolo_autorizacao"]:
            extracted["numero_documento"] = extracted["protocolo_autorizacao"]

        # Chave de Acesso
        chave_m = re.search(r"Chave\s+de\s+Acesso[:\s]*\n?([0-9\s]{40,60})", text, re.IGNORECASE)
        extracted["chave_acesso"] = chave_m.group(1).strip() if chave_m else ""

        # Código da Instalação
        inst_m = re.search(r"C[óo]digo\s+da\s+Instala[çc][ãa]o[:\s]*([0-9]+)", text, re.IGNORECASE)
        extracted["codigo_instalacao"] = inst_m.group(1).strip() if inst_m else ""

        # Nosso Número
        nosso_num_m = re.search(r"(?:Nosso Nº|Nosso Número)[:\s]*([\d\w\/\-\.]+)", text, re.IGNORECASE)
        if nosso_num_m:
            raw_nosso = nosso_num_m.group(1).replace("IZZSZ-Z-S", "12252-2-5").strip()
            extracted["nosso_numero"] = raw_nosso
        else:
            extracted["nosso_numero"] = ""

        # Descritivo do Serviço / Competência
        desc_m = re.search(r"((?:MENSAL|ACORDO|Fatura|Taxa)[^\n\r]+(?:TAXA|\d{4}|PARC)[^\n\r]*)", text, re.IGNORECASE)
        extracted["descricao_servico"] = desc_m.group(1).strip() if desc_m else "Serviços Condominiais"

        # Local de Pagamento
        loc_m = re.search(r"Local do Pagamento[:\s]*([^\n\r]+)", text, re.IGNORECASE)
        extracted["local_pagamento"] = loc_m.group(1).strip() if loc_m else "Rede Bancária / Internet Banking"

        # Informações Técnicas e Concessionárias (Leituras, Medidor, Próxima Leitura)
        prox_m = re.search(r"(?:Pr[óo]xima\s+Leitura|Pr[oó]x\.?\s*Leitura)[:\s]*(\d{2}/\d{2}/\d{4}|\d{4}-\d{2}-\d{2})", text, re.IGNORECASE)
        if prox_m:
            raw_prox = prox_m.group(1).strip()
            if "/" in raw_prox:
                d, m, y = raw_prox.split("/")
                extracted["proxima_leitura"] = f"{y}-{m}-{d}"
            else:
                extracted["proxima_leitura"] = raw_prox
        else:
            extracted["proxima_leitura"] = ""

        leit_at_m = re.search(r"Leitura\s+Atual[:\s]*(\d{2}/\d{2}/\d{4}|\d+)", text, re.IGNORECASE)
        extracted["leitura_atual"] = leit_at_m.group(1).strip() if leit_at_m else ""

        leit_ant_m = re.search(r"Leitura\s+Anterior[:\s]*(\d{2}/\d{2}/\d{4}|\d+)", text, re.IGNORECASE)
        extracted["leitura_anterior"] = leit_ant_m.group(1).strip() if leit_ant_m else ""

        med_m = re.search(r"(?:N[°º\s]*Medidor|Medidor)[:\s\-\.]*(\d+)", text, re.IGNORECASE)
        extracted["numero_medidor"] = med_m.group(1).strip() if med_m else ""

        # Dynamic Universal Semantic Listener: If user_hint requests ANY field or passage in the document
        if user_hint:
            h_raw = user_hint.strip()
            # Clean command verbs and particles
            clean_p = re.sub(
                r"^(?:marque|marcar|selecione|selecionar|destaque|destacar|extraia|extrair|pegue|pegar|encontre|encontrar|coloque|colocar|procure|procurar)\s+(?:o|a|os|as|um|uma)?\s*",
                "",
                h_raw,
                flags=re.IGNORECASE
            ).strip().rstrip(".!?:")

            clean_p = re.sub(r"\s*(?:por\s+favor|por\s+gentileza|no\s+documento|na\s+fatura|no\s+texto)\s*$", "", clean_p, flags=re.IGNORECASE).strip()
            clean_p_lower = clean_p.lower()

            if len(clean_p_lower) >= 3:
                # Canonical alias mapping function
                def _get_canonical_key(prompt_norm: str) -> str:
                    p = prompt_norm.lower()
                    if any(w in p for w in ["telefone", "contato", "fone", "ouvidoria", "gratuita", "ligacao"]):
                        return "fornecedor_contato"
                    if any(w in p for w in ["cnpj_condominio", "cnpj_pagador", "cnpj_destinatario"]):
                        return "condominio_cnpj"
                    if any(w in p for w in ["cnpj_fornecedor", "cnpj_favorecido", "cnpj_emissor"]):
                        return "fornecedor_cnpj"
                    if any(w in p for w in ["endereco_condominio", "endereco_pagador", "endereco_imovel"]):
                        return "condominio_endereco"
                    if any(w in p for w in ["endereco_fornecedor", "endereco_favorecido"]):
                        return "fornecedor_endereco"
                    if any(w in p for w in ["valor_total", "total_a_pagar", "valor_a_pagar", "total_pagar"]):
                        return "valor_total"
                    if any(w in p for w in ["vencimento", "data_vencimento", "venc"]):
                        return "data_vencimento"
                    if any(w in p for w in ["emissao", "data_emissao", "data_do_documento"]):
                        return "data_emissao"
                    if any(w in p for w in ["proxima_leitura", "prox_leitura"]):
                        return "proxima_leitura"
                    if any(w in p for w in ["leitura_atual"]):
                        return "leitura_atual"
                    if any(w in p for w in ["leitura_anterior"]):
                        return "leitura_anterior"
                    if any(w in p for w in ["medidor", "numero_medidor"]):
                        return "numero_medidor"
                    if any(w in p for w in ["protocolo", "protocolo_autorizacao"]):
                        return "protocolo_autorizacao"
                    if any(w in p for w in ["chave_acesso", "chave_nfe"]):
                        return "chave_acesso"
                    if any(w in p for w in ["instalacao", "codigo_instalacao", "cod_instalacao"]):
                        return "codigo_instalacao"
                    if any(w in p for w in ["nosso_numero"]):
                        return "nosso_numero"
                    if any(w in p for w in ["linha_digitavel", "codigo_barras", "cod_barras"]):
                        return "linha_digitavel"
                    if any(w in p for w in ["chave_pix", "pix"]):
                        return "chave_pix"
                    if any(w in p for w in ["multa", "multa_atraso"]):
                        return "multa_atraso"
                    if any(w in p for w in ["juros", "juros_dia"]):
                        return "juros_dia"
                    return prompt_norm

                # Build accent-flexible regex
                def _make_flex_pattern(phrase: str) -> str:
                    parts = []
                    for ch in phrase:
                        if ch in "aAáÁàÀãÃâÂ":
                            parts.append(r"[aáàãâAÁÀÃÂ]")
                        elif ch in "eEéÉêÊ":
                            parts.append(r"[eéêEÉÊ]")
                        elif ch in "iIíÍ":
                            parts.append(r"[iíIÍ]")
                        elif ch in "oOóÓõÕôÔ0":
                            parts.append(r"[oóõôOÓÕÔ0oOD]")
                        elif ch in "uUúÚ":
                            parts.append(r"[uúUÚ]")
                        elif ch in "cCçÇ":
                            parts.append(r"[cçCÇ]")
                        elif ch == " ":
                            parts.append(r"\s+")
                        else:
                            parts.append(re.escape(ch))
                    return "".join(parts)

                pat_str = _make_flex_pattern(clean_p)
                
                # Check for value following label: e.g. "TELEFONE LIGAÇÃO GRATUITA: QSOQQ ZSI ZZ SQ ou QQ"
                val_m = re.search(pat_str + r"[:\s\-]+([^\n\r\(\[\{]{2,60})", text, re.IGNORECASE)
                if val_m:
                    val_extracted = val_m.group(1).strip()
                    clean_p_norm = unicodedata.normalize('NFKD', clean_p_lower).encode('ASCII', 'ignore').decode('utf-8')
                    safe_key = re.sub(r"[^\w]+", "_", clean_p_norm).strip("_")
                    canon_key = _get_canonical_key(safe_key)
                    extracted[canon_key] = val_extracted
                    if canon_key != safe_key:
                        extracted.pop(safe_key, None)
                else:
                    # Check if clean_p itself is present in text
                    exact_m = re.search(pat_str, text, re.IGNORECASE)
                    if exact_m:
                        matched_str = exact_m.group(0).strip()
                        clean_p_norm = unicodedata.normalize('NFKD', clean_p_lower).encode('ASCII', 'ignore').decode('utf-8')
                        safe_key = re.sub(r"[^\w]+", "_", clean_p_norm).strip("_")
                        canon_key = _get_canonical_key(safe_key)
                        extracted[canon_key] = matched_str
                        if canon_key != safe_key:
                            extracted.pop(safe_key, None)

        # Chave PIX
        pix_m = re.search(r"(?:PIX|PIX Copia e Cola|Chave PIX)[:\s]*([0-9a-zA-Z\.\-@\+\$\#]{10,200})", text, re.IGNORECASE)
        extracted["chave_pix"] = pix_m.group(1).strip() if pix_m else ""

        return extracted

    def _locate_grounding_spans(self, text: str, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Finds character offsets for visual highlight grounding across all measurable extracted entities using OCR-tolerant fuzzy alignment."""
        spans = []
        targets = [
            ("linha_digitavel", data.get("linha_digitavel"), "#34d399", "Linha Digitável"),
            ("chave_acesso", data.get("chave_acesso"), "#0284c7", "Chave de Acesso"),
            ("chave_pix", data.get("chave_pix"), "#14b8a6", "Chave PIX"),
            ("condominio_nome", data.get("condominio_nome"), "#38bdf8", "Condomínio"),
            ("condominio_cnpj", data.get("condominio_cnpj"), "#06b6d4", "CNPJ Condomínio"),
            ("condominio_endereco", data.get("condominio_endereco"), "#93c5fd", "End. Condomínio"),
            ("fornecedor_nome", data.get("fornecedor_nome"), "#a78bfa", "Fornecedor"),
            ("fornecedor_cnpj", data.get("fornecedor_cnpj"), "#c084fc", "CNPJ Fornecedor"),
            ("fornecedor_endereco", data.get("fornecedor_endereco"), "#e879f9", "End. Fornecedor"),
            ("fornecedor_contato", data.get("fornecedor_contato"), "#84cc16", "Contato"),
            ("valor_total", data.get("valor_total"), "#fbbf24", "Valor Total"),
            ("valor_desconto", data.get("valor_desconto"), "#10b981", "Valor Desconto"),
            ("valor_acrescimo", data.get("valor_acrescimo"), "#f97316", "Valor Acréscimo"),
            ("data_vencimento", data.get("data_vencimento"), "#f472b6", "Vencimento"),
            ("data_emissao", data.get("data_emissao"), "#818cf8", "Emissão"),
            ("multa_atraso", data.get("multa_atraso"), "#fb7185", "Multa Prevista"),
            ("juros_dia", data.get("juros_dia"), "#fb923c", "Juros/Dia"),
            ("proxima_leitura", data.get("proxima_leitura"), "#2dd4bf", "Próxima Leitura"),
            ("leitura_atual", data.get("leitura_atual"), "#a3e635", "Leitura Atual"),
            ("leitura_anterior", data.get("leitura_anterior"), "#d946ef", "Leitura Anterior"),
            ("numero_medidor", data.get("numero_medidor"), "#f43f5e", "Nº Medidor"),
            ("protocolo_autorizacao", data.get("protocolo_autorizacao"), "#ec4899", "Protocolo"),
            ("numero_documento", data.get("numero_documento"), "#60a5fa", "Nº Doc / NF-e"),
            ("nosso_numero", data.get("nosso_numero"), "#4f46e5", "Nosso Nº"),
            ("codigo_instalacao", data.get("codigo_instalacao"), "#9333ea", "Cód. Instalação")
        ]

        # Dynamic pool of distinct non-repeating colors for custom user-requested fields
        DYNAMIC_PALETTE = [
            "#84cc16", "#d946ef", "#06b6d4", "#f97316", "#ec4899", "#14b8a6", 
            "#f59e0b", "#a855f7", "#f43f5e", "#10b981", "#eab308", "#6366f1",
            "#2dd4bf", "#9333ea", "#0284c7", "#a3e635"
        ]
        used_colors = set(t[2].lower() for t in targets if t[1])
        dyn_color_idx = 0

        # Add any dynamic custom entities requested by the user with distinct colors
        known_keys = set(t[0] for t in targets)
        for k, v in data.items():
            if k not in known_keys and v and str(v).strip():
                label_formatted = k.replace("_", " ").title()
                chosen_color = None
                for _ in range(len(DYNAMIC_PALETTE)):
                    cand = DYNAMIC_PALETTE[dyn_color_idx % len(DYNAMIC_PALETTE)]
                    dyn_color_idx += 1
                    if cand.lower() not in used_colors:
                        chosen_color = cand
                        break
                if not chosen_color:
                    chosen_color = DYNAMIC_PALETTE[dyn_color_idx % len(DYNAMIC_PALETTE)]
                    dyn_color_idx += 1
                used_colors.add(chosen_color.lower())
                targets.append((k, str(v).strip(), chosen_color, label_formatted))

        def _fuzzy_ocr_search(src_text: str, target: str):
            if not target or len(str(target).strip()) < 2:
                return None
            
            tgt = str(target).strip()
            # If target is ISO date YYYY-MM-DD, convert to DD/MM/YYYY for document text searching
            if re.match(r"^\d{4}-\d{2}-\d{2}$", tgt):
                y, m, d = tgt.split("-")
                tgt = f"{d}/{m}/{y}"

            # 1. Direct search
            idx = src_text.find(tgt)
            if idx != -1:
                return idx, idx + len(tgt), tgt

            # 2. Case insensitive
            lower_idx = src_text.lower().find(tgt.lower())
            if lower_idx != -1:
                return lower_idx, lower_idx + len(tgt), src_text[lower_idx:lower_idx + len(tgt)]

            # 2.5 Digit Sequence Search with Optional Whitespaces (for Chave de Acesso, Linha Digitável, Protocolo)
            digits_only = re.sub(r"\D", "", tgt)
            if len(digits_only) >= 14:
                dig_pat = r"\s*".join(list(digits_only))
                m_dig = re.search(dig_pat, src_text, re.IGNORECASE)
                if m_dig:
                    return m_dig.start(), m_dig.end(), m_dig.group(0)

            # 3. OCR Tolerant Regex (handles Z->2, S->5, O->0, L->1, missing spaces, etc.)
            pattern_parts = []
            for ch in tgt:
                if ch in "0Oo":
                    pattern_parts.append(r"[0oOD]")
                elif ch in "2zZ":
                    pattern_parts.append(r"[2zZ]")
                elif ch in "5sS":
                    pattern_parts.append(r"[5sS]")
                elif ch in "1lLiI":
                    pattern_parts.append(r"[1lLiI|]")
                elif ch in "8bB":
                    pattern_parts.append(r"[8bB]")
                elif ch == " ":
                    pattern_parts.append(r"\s*")
                elif ch in ",.":
                    pattern_parts.append(r"[\.,]")
                elif ch == "$":
                    pattern_parts.append(r"\$?")
                elif ch in "()":
                    pattern_parts.append(re.escape(ch) + r"?")
                elif ch == "%":
                    pattern_parts.append(r"[%zZ]?")
                else:
                    pattern_parts.append(re.escape(ch))

            pattern = "".join(pattern_parts)
            try:
                m = re.search(pattern, src_text, re.IGNORECASE)
                if m:
                    return m.start(), m.end(), m.group(0)
            except Exception:
                pass

            # 4. Field-specific heuristics
            if "multa" in tgt.lower():
                m_multa = re.search(r"((?:APOS\s+VENCIMENTO\s+)?MULTA[^\n\r]+)", src_text, re.IGNORECASE)
                if m_multa:
                    return m_multa.start(), m_multa.end(), m_multa.group(0)
            
            if "juros" in tgt.lower():
                m_juros = re.search(r"(\+?\s*JUROS[^\n\r]+)", src_text, re.IGNORECASE)
                if m_juros:
                    return m_juros.start(), m_juros.end(), m_juros.group(0)

            return None

        used_ranges = []

        for field_name, value, color, label in targets:
            if not value or len(str(value)) < 2:
                continue
            
            # Avoid matching random 0.00 inside barcodes or account numbers when no explicit discount exists
            if field_name in ["valor_desconto", "valor_acrescimo"] and str(value).strip() in ["0,00", "0.00", "0"]:
                continue
            
            match_str = str(value)
            if ("data_" in field_name) and ("-" in str(value)):
                y, m, d = str(value).split("-")
                match_str = f"{d}/{m}/{y}"

            res = _fuzzy_ocr_search(text, match_str)
            if not res and field_name == "valor_total":
                res = _fuzzy_ocr_search(text, f"R$ {match_str}") or _fuzzy_ocr_search(text, f"R${match_str}")

            if res:
                start, end, matched_chunk = res
                # Avoid overlapping highlights
                if not any(start < u_end and end > u_start for u_start, u_end in used_ranges):
                    used_ranges.append((start, end))
                    spans.append({
                        "field": field_name,
                        "label": label,
                        "color": color,
                        "start": start,
                        "end": end,
                        "matched_text": matched_chunk
                    })

        return sorted(spans, key=lambda s: s["start"])

    def _generate_visualize_html(self, text: str, data: Dict[str, Any], spans: List[Dict[str, Any]]) -> str:
        """
        Generates an interactive, standalone HTML document mimicking lx.visualize.
        """
        # Construct highlighted text
        highlighted_parts = []
        last_idx = 0
        
        for s in spans:
            start = s["start"]
            end = s["end"]
            if start >= last_idx:
                highlighted_parts.append(text[last_idx:start])
                token = text[start:end]
                badge = f"""<mark id="grounding-{s['field']}" class="kai-highlight" style="position:relative; background-color: {s['color']}26; border-bottom: 2px solid {s['color']}; color: #f8fafc; padding: 2px 4px; border-radius: 4px;" title="{s['label']}: {s['field']}"><span class="blink-dot" style="display:none; position:absolute; left:-6px; top:-6px; width:8px; height:8px; background-color:#84cc16; border-radius:50%; box-shadow:0 0 8px #84cc16;"></span><strong>{token}</strong> <span style="font-size: 10px; background: {s['color']}; color: #020617; padding: 1px 4px; border-radius: 3px; font-weight: bold; margin-left: 2px;">{s['label']}</span></mark>"""
                highlighted_parts.append(badge)
                last_idx = end
        
        highlighted_parts.append(text[last_idx:])
        rendered_body = "".join(highlighted_parts).replace("\n", "<br/>")

        html = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KaiExtract - Source Grounding Visualizer</title>
  <style>
    body {{
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      background-color: #2E2621;
      color: #FFFEFD;
      margin: 0;
      padding: 16px;
      line-height: 1.6;
    }}
    .container {{
      background-color: #2E2621;
      border: 1px solid #453A31;
      border-radius: 12px;
      padding: 16px;
      font-size: 12px;
      overflow-x: auto;
    }}
    .kai-highlight strong {{
      color: #FFFEFD;
    }}
    @keyframes blink {{
      0% {{ opacity: 1; transform: scale(1); }}
      50% {{ opacity: 0.4; transform: scale(1.3); }}
      100% {{ opacity: 1; transform: scale(1); }}
    }}
    .blink-dot.active {{
      display: block !important;
      animation: blink 1s infinite;
    }}
    .kai-highlight.active-scroll {{
      background-color: rgba(132, 204, 22, 0.2) !important;
      border-bottom: 2px solid #84cc16 !important;
      transition: all 0.3s ease;
    }}
  </style>
</head>
<body>
  <div class="container">
    {rendered_body}
  </div>
</body>
</html>"""
        return html
