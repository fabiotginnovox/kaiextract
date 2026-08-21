"""
KaiExtract Prompts & Few-Shot Examples Module.
Prompts and few-shot data specifications are registered in English.
"""

prompt_kai_extract = """
You are a specialized financial document extraction agent for the SELECT property management ERP.
Your task is to extract structured entities from raw document text and strictly populate the attributes of the 'despesa_condominial' class.

MANDATORY RESTRICTION RULES FOR ABSOLUTE DATA INTEGRITY:

1. MUTUAL EXCLUSION RULES (BARCODE / LINHA DIGITÁVEL vs. FINANCIAL FIELDS):
   - Definition: A 'linha_digitavel' or 'codigo_barras' is a continuous long numerical sequence (typically 44 to 48 digits, possibly segmented by dots, spaces, or dashes).
   - Physical Isolation Rule: Once a text span is identified as part of the 'linha_digitavel' or 'codigo_barras', NO character, number, fraction, or substring from that sequence may be used to populate any other attribute (such as 'valor_total', 'cnpj_fornecedor', 'nosso_numero', or 'data_vencimento').
   - Prohibition of Value Fractions: It is STRICTLY FORBIDDEN to extract values like "0,00", "0.00", or any internal numerical substring located inside a barcode sequence to populate 'valor_total'.

2. SPECIFIC ATTRIBUTE RULES:
   A. Total Value ('valor_total'):
      - The total financial amount must ONLY be extracted from explicit billing fields (preceded by terms such as "VALOR TOTAL", "TOTAL A PAGAR", "TOTAL", "VALOR COBRADO", "VALOR DO DOCUMENTO", "VALOR LÍQUIDO A PAGAR").
      - NEVER use numbers extracted from strings containing "LINHA DIGITÁVEL", "CÓD. BARRAS", "CÓDIGO DE BARRAS", or "AUTENTICAÇÃO MECÂNICA" to populate this field.
      - If the document does not contain an explicit total value outside the barcode, return this field as null/empty. Never guess or slice other numerical sequences.
   B. Linha Digitável / Barcode ('linha_digitavel'):
      - Extract the complete and continuous sequence of the barcode or linha digitável.
      - Do not truncate or remove segments of the sequence.
   C. Condominium / Payer ('condominio_nome' / 'condominio_destinatario'):
      - Extract the condominium name ONLY if explicitly written in the document (associated with "NOME DO CLIENTE", "CONDOMÍNIO", "PAGO POR", "SACADO", "PAGADOR").
      - NEVER deduce, guess, or hallucinate fictitious condominium names (such as "Condomínio Edifício Geral") if not printed verbatim in the text. If absent, return null/empty.
   D. Mandatory Classification in 'tipo_conta':
      - "Consumo > Energia Elétrica" (e.g., CPFL, Enel, Light, Neoenergia)
      - "Consumo > Água e Esgoto" (e.g., Sabesp, Sanepar, Copasa)
      - "Consumo > Gás" (e.g., Comgás, Ultragaz)
      - "Contratos > Elevadores" (e.g., Atlas Schindler, Otis)
      - "Contratos > Segurança e Portaria"
      - "Impostos > Taxas e Tributos" (e.g., DARF, GPS)
      - "Serviços > Honorários e Outros"

3. VERBATIM AND EXACT SOURCE GROUNDING:
   - All extractions must have exact 1:1 verbatim character correspondence with the source text.
   - If an extracted datum cannot be mapped back to a real character index within the raw TXT file, the extraction is invalid.
"""

# Few-shot examples in Python dictionary/object format compatible with LangExtract
few_shot_examples = [
    {
        "text": (
            "COMPANHIA PAULISTA DE FORÇA E LUZ - CPFL\n"
            "CNPJ: 02.838.720/0001-28\n"
            "Endereço Fornecedor: Rua Exemplo, 123 - Centro - Campinas/SP\n"
            "Unidade Consumidora: CONDOMINIO EDIFICIO BELLA VISTA - CNPJ: 12.345.678/0001-90\n"
            "Endereço Pagador: Av. Principal, 456 - Bela Vista - São Paulo/SP\n"
            "Nota Fiscal Nº: 987654321\n"
            "Vencimento: 15/10/2026 | Emissão: 01/10/2026\n"
            "Referência: Outubro/2026\n"
            "Valor do Fornecimento: R$ 1.450,80 | Desconto Pontualidade: R$ 0,00 | Acréscimos: R$ 0,00\n"
            "Total a Pagar: R$ 1.450,80\n"
            "Linha Digitável: 83660000001-4 45080048100-3 15102026123-0 00012345678-9\n"
            "Contato: 0800 010 1010"
        ),
        "extractions": [
            {
                "extraction_class": "despesa_condominial",
                "extraction_text": "1.450,80",
                "attributes": {
                    "tipo_documento": "Conta de Consumo",
                    "numero_documento": "987654321",
                    "condominio_nome": "CONDOMINIO EDIFICIO BELLA VISTA",
                    "condominio_cnpj": "12.345.678/0001-90",
                    "endereco_pagador": "Av. Principal, 456 - Bela Vista - São Paulo/SP",
                    "tipo_conta": "Consumo > Energia Elétrica",
                    "fornecedor_nome": "COMPANHIA PAULISTA DE FORÇA E LUZ - CPFL",
                    "fornecedor_cnpj": "02.838.720/0001-28",
                    "endereco_fornecedor": "Rua Exemplo, 123 - Centro - Campinas/SP",
                    "contato_fornecedor": "0800 010 1010",
                    "descricao_servico": "Outubro/2026",
                    "valor_total": "1.450,80",
                    "valor_original": "1.450,80",
                    "valor_desconto": "0,00",
                    "valor_acrescimo": "0,00",
                    "juros_dia": "",
                    "multa_atraso": "",
                    "data_vencimento": "2026-10-15",
                    "data_emissao": "2026-10-01",
                    "linha_digitavel": "83660000001-4 45080048100-3 15102026123-0 00012345678-9",
                    "chave_pix": "",
                    "nosso_numero": "",
                    "agencia_codigo": ""
                }
            }
        ]
    },
    {
        "text": (
            "SECRETARIA DA RECEITA FEDERAL DO BRASIL\n"
            "DOCUMENTO DE ARRECADAÇÃO DE RECEITAS FEDERAIS - DARF\n"
            "Contribuinte: CONDOMINIO EDIFICIO VILA NOVA - CNPJ: 11.222.333/0001-44\n"
            "Código da Receita: 1708 (IRRF - Serviços Prestados por PJ)\n"
            "Período de Apuração: 31/07/2026 | Data de Vencimento: 20/08/2026\n"
            "Valor do Principal: R$ 320,50 | Multa: R$ 15,00 | Juros: R$ 4,50\n"
            "Valor Total do Documento: R$ 340,00\n"
            "Código de Barras / Linha: 85890000003-2 40000179260-8 82008202611-3 22233300014-4"
        ),
        "extractions": [
            {
                "extraction_class": "despesa_condominial",
                "extraction_text": "340,00",
                "attributes": {
                    "tipo_documento": "DARF",
                    "numero_documento": "",
                    "condominio_nome": "CONDOMINIO EDIFICIO VILA NOVA",
                    "condominio_cnpj": "11.222.333/0001-44",
                    "endereco_pagador": "",
                    "tipo_conta": "Impostos > Taxas e Tributos",
                    "fornecedor_nome": "SECRETARIA DA RECEITA FEDERAL DO BRASIL",
                    "fornecedor_cnpj": "00.394.460/0058-87",
                    "endereco_fornecedor": "",
                    "contato_fornecedor": "",
                    "descricao_servico": "1708 (IRRF - Serviços Prestados por PJ) / Período: 31/07/2026",
                    "valor_total": "340,00",
                    "valor_original": "320,50",
                    "valor_desconto": "0,00",
                    "valor_acrescimo": "19,50",
                    "juros_dia": "R$ 4,50",
                    "multa_atraso": "R$ 15,00",
                    "data_vencimento": "2026-08-20",
                    "data_emissao": "2026-07-31",
                    "linha_digitavel": "85890000003-2 40000179260-8 82008202611-3 22233300014-4",
                    "chave_pix": "",
                    "nosso_numero": "",
                    "agencia_codigo": ""
                }
            }
        ]
    },
    {
        "text": (
            "Após o vencimento 28/02/2026 Vencimento\n"
            "Cora Sociedade de Crédito Direto\n"
            "CNPJ 37.880.206/0001-63\n"
            "| 403-9 | 40390.00007 15551.751017 74578.909017 1 15030000008375\n"
            "Local de Pagamento Vencimento\n"
            "Pagável em qualquer agência bancária 10/07/2026\n"
            "Beneficiário CPF/CNPJ do Beneficiário Agência/Código do Beneficiário\n"
            "Hecol Saude Ambiental 15.551.751/0001-73 0001\n"
            "Data do Documento Nr. do Documento Espécie Doc Aceite Nosso Número\n"
            "28/02/2026 174578909 DV N 155517510174578909\n"
            "Uso do Banco Carteira Espécie Moeda Quantidade Moeda (x) Valor (=) Valor do Documento\n"
            "01 R$ 83,75\n"
            "Após o vencimento, aplicar multa de R$ 1,68"
        ),
        "extractions": [
            {
                "extraction_class": "despesa_condominial",
                "extraction_text": "83,75",
                "attributes": {
                    "tipo_documento": "Boleto",
                    "numero_documento": "174578909",
                    "condominio_nome": "",
                    "condominio_cnpj": "",
                    "endereco_pagador": "",
                    "tipo_conta": "Serviços > Manutenção/Obras",
                    "fornecedor_nome": "Hecol Saude Ambiental",
                    "fornecedor_cnpj": "15.551.751/0001-73",
                    "endereco_fornecedor": "",
                    "contato_fornecedor": "",
                    "descricao_servico": "",
                    "valor_total": "83,75",
                    "valor_original": "83,75",
                    "valor_desconto": "0,00",
                    "valor_acrescimo": "0,00",
                    "juros_dia": "",
                    "multa_atraso": "R$ 1,68",
                    "data_vencimento": "2026-07-10",
                    "data_emissao": "2026-02-28",
                    "linha_digitavel": "40390.00007 15551.751017 74578.909017 1 15030000008375",
                    "chave_pix": "",
                    "nosso_numero": "155517510174578909",
                    "agencia_codigo": "0001"
                }
            }
        ]
    }
]
