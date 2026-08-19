"""
Multi-ERP Normalizer & Exporter for KaiExtract.
Handles formatting and transformations for SuperLógica, CondominIA, and Universal standards.
Normalizes measurable, comparable, and auditable financial attributes.
"""

import re
from typing import Dict, Any, Optional

def clean_digits(value: Optional[str]) -> str:
    """Removes all non-digit characters from a string."""
    if not value:
        return ""
    return re.sub(r"\D", "", str(value))

def parse_monetary_value(value: Any) -> float:
    """Converts diverse monetary representations (e.g. '1.450,80', 'R$ 1450.80', 1450.8) to float."""
    if value is None:
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    
    val_str = str(value).replace("R$", "").replace(" ", "").strip()
    if not val_str:
        return 0.0
    
    # Handle Brazilian number format 1.450,80 vs standard 1450.80
    if "," in val_str and "." in val_str:
        val_str = val_str.replace(".", "").replace(",", ".")
    elif "," in val_str:
        val_str = val_str.replace(",", ".")
        
    try:
        return float(val_str)
    except ValueError:
        return 0.0

def format_brl(value: float) -> str:
    """Formats float to BRL currency string: '1.450,80'."""
    return f"{value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

def format_cnpj(cnpj_raw: Optional[str]) -> str:
    """Formats 14-digit string to XX.XXX.XXX/XXXX-XX."""
    digits = clean_digits(cnpj_raw)
    if len(digits) == 14:
        return f"{digits[0:2]}.{digits[2:5]}.{digits[5:8]}/{digits[8:12]}-{digits[12:14]}"
    return cnpj_raw or ""

class ERPNormalizer:
    @staticmethod
    def normalize_extracted_data(raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """Ensures all standard KaiExtract fields are clean, typed, and normalized."""
        valor_total_float = parse_monetary_value(raw_data.get("valor_total"))
        valor_orig_float = parse_monetary_value(raw_data.get("valor_original", valor_total_float))
        valor_desc_float = parse_monetary_value(raw_data.get("valor_desconto", 0.0))
        valor_acres_float = parse_monetary_value(raw_data.get("valor_acrescimo", 0.0))
        
        linha_dig = str(raw_data.get("linha_digitavel", "")).strip()
        chave_pix = str(raw_data.get("chave_pix", "")).strip()

        return {
            "condominio_nome": str(raw_data.get("condominio_nome", "")).strip(),
            "condominio_cnpj": format_cnpj(raw_data.get("condominio_cnpj")),
            "condominio_endereco": str(raw_data.get("condominio_endereco", "")).strip(),
            "tipo_conta": str(raw_data.get("tipo_conta", "Outros")).strip(),
            "fornecedor_nome": str(raw_data.get("fornecedor_nome", "")).strip(),
            "fornecedor_cnpj": format_cnpj(raw_data.get("fornecedor_cnpj")),
            "fornecedor_endereco": str(raw_data.get("fornecedor_endereco", "")).strip(),
            "fornecedor_contato": str(raw_data.get("fornecedor_contato", "")).strip(),
            "valor_total": format_brl(valor_total_float),
            "valor_total_float": valor_total_float,
            "valor_original": format_brl(valor_orig_float),
            "valor_desconto": format_brl(valor_desc_float),
            "valor_acrescimo": format_brl(valor_acres_float),
            "multa_atraso": str(raw_data.get("multa_atraso", "")).strip(),
            "juros_dia": str(raw_data.get("juros_dia", "")).strip(),
            "data_vencimento": str(raw_data.get("data_vencimento", "")).strip(),
            "data_emissao": str(raw_data.get("data_emissao", "")).strip(),
            "banco_info": str(raw_data.get("banco_info", "")).strip(),
            "numero_documento": str(raw_data.get("numero_documento", "")).strip(),
            "nosso_numero": str(raw_data.get("nosso_numero", "")).strip(),
            "descricao_servico": str(raw_data.get("descricao_servico", "")).strip(),
            "local_pagamento": str(raw_data.get("local_pagamento", "")).strip(),
            "linha_digitavel": linha_dig,
            "chave_pix": chave_pix,
            "metodo_pagamento": "PIX" if chave_pix and not linha_dig else ("Boleto" if linha_dig else "Transferência/Outro")
        }

    @staticmethod
    def to_superlogica_format(data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Adapts payload to SuperLógica Contas a Pagar standard structure.
        """
        normalized = ERPNormalizer.normalize_extracted_data(data)
        
        # SuperLógica Plano de Contas mapping
        cat = normalized["tipo_conta"]
        plano_contas = "1.02.01 - Despesas Operacionais"
        if "Consumo" in cat:
            plano_contas = "1.02.01.01 - Concessionárias (Água/Luz/Gás)"
        elif "Contratos" in cat:
            plano_contas = "1.02.01.02 - Contratos de Manutenção e Conservação"
        elif "Impostos" in cat:
            plano_contas = "1.02.02.01 - Tributos e Encargos Fiscais"
        elif "Serviços" in cat:
            plano_contas = "1.02.01.05 - Serviços de Terceiros"

        return {
            "erp": "SuperLógica",
            "tipo_registro": "DESPESA_APRESENTADA",
            "superlogica_payload": {
                "ST_NOME_CONDOMINIO": normalized["condominio_nome"],
                "ST_CNPJ_CONDOMINIO": clean_digits(normalized["condominio_cnpj"]),
                "ST_ENDERECO_CONDOMINIO": normalized["condominio_endereco"],
                "ST_FAVORECIDO": normalized["fornecedor_nome"],
                "ST_CNPJ_FAVORECIDO": clean_digits(normalized["fornecedor_cnpj"]),
                "ST_ENDERECO_FAVORECIDO": normalized["fornecedor_endereco"],
                "ST_EMAIL_FAVORECIDO": normalized["fornecedor_contato"],
                "VL_TOTAL": normalized["valor_total_float"],
                "DT_VENCIMENTO": normalized["data_vencimento"],
                "DT_EMISSAO": normalized["data_emissao"] or normalized["data_vencimento"],
                "ST_PLANO_CONTAS": plano_contas,
                "ST_NUMERO_DOCUMENTO": normalized["numero_documento"],
                "ST_NOSSO_NUMERO": normalized["nosso_numero"],
                "ST_LINHADIGITAVEL": clean_digits(normalized["linha_digitavel"]),
                "ST_CHAVEPIX": normalized["chave_pix"],
                "ST_OBSERVACAO": f"{normalized['descricao_servico']} - Categoria: {cat}"
            }
        }

    @staticmethod
    def to_condominia_format(data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Adapts payload to CondominIA REST standard structure.
        """
        normalized = ERPNormalizer.normalize_extracted_data(data)
        return {
            "erp": "CondominIA",
            "resource": "accounts_payable",
            "condominia_payload": {
                "entity": {
                    "name": normalized["condominio_nome"],
                    "document": clean_digits(normalized["condominio_cnpj"]),
                    "address": normalized["condominio_endereco"]
                },
                "vendor": {
                    "trade_name": normalized["fornecedor_nome"],
                    "document": clean_digits(normalized["fornecedor_cnpj"]),
                    "address": normalized["fornecedor_endereco"],
                    "contact_email": normalized["fornecedor_contato"]
                },
                "financial": {
                    "category": normalized["tipo_conta"],
                    "description": normalized["descricao_servico"],
                    "amount": normalized["valor_total_float"],
                    "base_amount": parse_monetary_value(normalized["valor_original"]),
                    "discount": parse_monetary_value(normalized["valor_desconto"]),
                    "interest_penalty": parse_monetary_value(normalized["valor_acrescimo"]),
                    "due_date": normalized["data_vencimento"],
                    "issue_date": normalized["data_emissao"]
                },
                "payment_instructions": {
                    "barcode": normalized["linha_digitavel"],
                    "pix_key_or_payload": normalized["chave_pix"],
                    "bank_info": normalized["banco_info"],
                    "document_number": normalized["numero_documento"],
                    "our_number": normalized["nosso_numero"],
                    "payment_type": normalized["metodo_pagamento"]
                },
                "metadata": {
                    "source": "KaiExtract_LangExtract_v1",
                    "audited": True
                }
            }
        }
