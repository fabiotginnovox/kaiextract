/**
 * KaiExtract Brain Core & Prompt Engineering Configuration.
 * Prompts and few-shot schemas are registered in English.
 */

export const INITIAL_PROMPT_SYSTEM = `You are a specialized financial document extraction agent for the property management ERP ecosystem.
Your task is to extract structured entities from raw document text and strictly populate the attributes of the 'despesa_condominial' class.

MANDATORY EXTRACTION RULES:
1. Physical Isolation Rule: Barcode and Linha Digitavel numbers cannot be used to deduce financial amounts or CNPJs.
2. Value Grounding: Total financial amounts must be grounded in explicit billing fields ("TOTAL A PAGAR", "VALOR TOTAL", "VALOR LIQUIDO").
3. Verbatim Grounding: All extracted values must have 1:1 verbatim correspondence with text spans in the source document.
4. Specific Field Mapping: Map 'tipo_conta' strictly to categorized hierarchy (Consumo > Energia, Consumo > Agua, Impostos > Taxas, Contratos > Servicos).`;

export const INITIAL_NATURAL_RULES = `• Quando o documento for da Neoenergia, ignore o CNPJ do banco emissor e extraia apenas o CNPJ da concessionária no cabeçalho.
• Se houver campo 'Multa/Juros' ou 'Encargos', incorpore no campo 'Acréscimos'.
• Para faturas da SABESP ou companhias de saneamento, extraia o número de Ligação/RGI como 'numero_documento' caso não haja NF explícita.
• Priorize chave PIX do tipo e-mail ou Copia e Cola quando linha digitável não estiver legível ou ausente.
• Se o Sacado/Pagador contiver "EDIFICIO" ou "CONDOMINIO", capture como 'condominio_nome' e seu respectivo CNPJ.`;

export const INITIAL_MANDATORY_FIELDS = [
  { id: 'valor_total', label: 'Valor Total', required: true },
  { id: 'data_vencimento', label: 'Data de Vencimento', required: true },
  { id: 'fornecedor_cnpj', label: 'CNPJ Fornecedor/Concessionária', required: true },
  { id: 'linha_digitavel', label: 'Linha Digitável / Código de Barras', required: true },
  { id: 'condominio_nome', label: 'Condomínio / Sacado', required: false },
  { id: 'data_emissao', label: 'Data de Emissão', required: false },
  { id: 'chave_pix', label: 'Chave PIX', required: false }
];

export const INITIAL_FEW_SHOT_EXAMPLES = [
  {
    id: "fs-neoenergia",
    name: "Neoenergia Pernambuco",
    category: "Consumo",
    active: true,
    accuracy: 99.2,
    rawText: `Neoenergia
Pernambuco
neoenergia.com/pernambuco | Ligue grátis 0800 281 22 36 ou 116
NOME DO CLIENTE:
EDIFICIO AVIS LIBERTAS
CNPJ 02.819.556/0001-30
ENDERECO:
RUA DOM SEBASTIAO LEME 171 EDIFICIO AVIS LIBERTAS
GRAÇAS RECIFE
52011-160 RECIFE PE
REF: MES/ANO
MAI/2026
TOTAL A PAGAR
R$ 9.024,54
VENCIMENTO
10/07/2026
CODIGO DA INSTALAÇÃO
2941129
NOTA FISCAL Nº415197365-SERIE 000/DATA DE EMISSÃO
10/06/2026
Chave de Acesso:
2626 0600 0000 0000 0000 5500 0000 4151 9736 5007`,
    expectedJson: {
      tipo_documento: "Conta de Consumo",
      tipo_conta: "Consumo > Energia Elétrica",
      fornecedor_nome: "Neoenergia Pernambuco",
      fornecedor_cnpj: "10.835.932/0001-08",
      condominio_nome: "EDIFICIO AVIS LIBERTAS",
      condominio_cnpj: "02.819.556/0001-30",
      valor_total: "9.024,54",
      valor_original: "9.024,54",
      valor_desconto: "0,00",
      valor_acrescimo: "0,00",
      data_vencimento: "2026-07-10",
      data_emissao: "2026-06-10",
      numero_documento: "415197365",
      codigo_instalacao: "2941129",
      chave_acesso: "2626 0600 0000 0000 0000 5500 0000 4151 9736 5007"
    }
  },
  {
    id: "fs-cpfl",
    name: "CPFL Paulista",
    category: "Consumo",
    active: true,
    accuracy: 98.8,
    rawText: `COMPANHIA PAULISTA DE FORÇA E LUZ - CPFL
CNPJ: 02.838.720/0001-28
Unidade Consumidora: CONDOMINIO EDIFICIO BELLA VISTA - CNPJ: 12.345.678/0001-90
Vencimento: 15/10/2026
Total a Pagar: R$ 1.450,80
Linha Digitável: 83660000001-4 45080048100-3 15102026123-0 00012345678-9`,
    expectedJson: {
      tipo_documento: "Conta de Consumo",
      tipo_conta: "Consumo > Energia Elétrica",
      fornecedor_nome: "COMPANHIA PAULISTA DE FORÇA E LUZ - CPFL",
      fornecedor_cnpj: "02.838.720/0001-28",
      condominio_nome: "CONDOMINIO EDIFICIO BELLA VISTA",
      condominio_cnpj: "12.345.678/0001-90",
      valor_total: "1.450,80",
      valor_original: "1.450,80",
      valor_desconto: "0,00",
      valor_acrescimo: "0,00",
      data_vencimento: "2026-10-15",
      linha_digitavel: "83660000001-4 45080048100-3 15102026123-0 00012345678-9"
    }
  },
  {
    id: "fs-sabesp",
    name: "Sabesp Água e Esgoto",
    category: "Consumo",
    active: true,
    accuracy: 98.5,
    rawText: `COMPANHIA DE SANEAMENTO BASICO DO ESTADO DE SAO PAULO - SABESP
CNPJ: 43.776.517/0001-80
Ligação / RGI: 02938472-10
Cliente: CONDOMINIO RESIDENCIAL PARQUE DAS FLORES - CNPJ: 22.333.444/0001-55
Período de Consumo: 01/09/2026 a 30/09/2026 | Emissão: 05/10/2026 | Vencimento: 22/10/2026
Valor da Água: R$ 1.120,50 | Valor do Esgoto: R$ 1.120,50
Valor Original: R$ 2.241,00
Desconto Tarifário: R$ 0,00 | Acréscimos: R$ 0,00
Total a Pagar: R$ 2.241,00
Linha Digitável: 82680000022-4 41000011205-1 10051020262-8 23334440001-7`,
    expectedJson: {
      tipo_documento: "Conta de Consumo",
      tipo_conta: "Consumo > Água e Esgoto",
      fornecedor_nome: "COMPANHIA DE SANEAMENTO BASICO DO ESTADO DE SAO PAULO - SABESP",
      fornecedor_cnpj: "43.776.517/0001-80",
      condominio_nome: "CONDOMINIO RESIDENCIAL PARQUE DAS FLORES",
      condominio_cnpj: "22.333.444/0001-55",
      valor_total: "2.241,00",
      valor_original: "2.241,00",
      valor_desconto: "0,00",
      valor_acrescimo: "0,00",
      data_vencimento: "2026-10-22",
      data_emissao: "2026-10-05",
      numero_documento: "02938472-10",
      linha_digitavel: "82680000022-4 41000011205-1 10051020262-8 23334440001-7"
    }
  },
  {
    id: "fs-darf",
    name: "DARF / Impostos Federais",
    category: "Impostos",
    active: true,
    accuracy: 97.9,
    rawText: `SECRETARIA DA RECEITA FEDERAL DO BRASIL
MINISTÉRIO DA FAZENDA
DOCUMENTO DE ARRECADAÇÃO DE RECEITAS FEDERAIS - DARF
Contribuinte: CONDOMINIO EDIFICIO VILA NOVA - CNPJ: 11.222.333/0001-44
Código da Receita: 1708 - IRRF Retenção PJ
Período de Apuração: 31/07/2026 | Data de Vencimento: 20/08/2026
Valor do Principal: R$ 320,50
Multa: R$ 15,00 | Juros: R$ 4,50
Total do Documento: R$ 340,00
Código de Barras: 85890000003-2 40000179260-8 82008202611-3 22233300014-4`,
    expectedJson: {
      tipo_documento: "DARF",
      tipo_conta: "Impostos > Taxas e Tributos",
      fornecedor_nome: "SECRETARIA DA RECEITA FEDERAL DO BRASIL",
      fornecedor_cnpj: "00.394.460/0058-87",
      condominio_nome: "CONDOMINIO EDIFICIO VILA NOVA",
      condominio_cnpj: "11.222.333/0001-44",
      valor_total: "340,00",
      valor_original: "320,50",
      valor_desconto: "0,00",
      valor_acrescimo: "19,50",
      multa_atraso: "R$ 15,00",
      juros_dia: "R$ 4,50",
      data_vencimento: "2026-08-20",
      data_emissao: "2026-07-31",
      linha_digitavel: "85890000003-2 40000179260-8 82008202611-3 22233300014-4"
    }
  },
  {
    id: "fs-boletos",
    name: "Boletos de Serviços / Manutenção",
    category: "Serviço",
    active: true,
    accuracy: 98.1,
    rawText: `ELEVADORES ATLAS SCHINDLER S.A.
CNPJ: 61.065.259/0001-10
Sacado / Condomínio: Condomínio Solaris Premium - CNPJ: 33.444.555/0001-22
Data de Vencimento: 10/11/2026
Valor Líquido a Pagar: R$ 890,00
Linha Digitável: 34191.79001 01043.510047 91020.150008 4 98150000089000
PIX Copia e Cola: 00020126580014BR.GOV.BCB.PIX0136123e4567-e89b-12d3-a456-426614174000`,
    expectedJson: {
      tipo_documento: "Boleto",
      tipo_conta: "Contratos > Elevadores",
      fornecedor_nome: "ELEVADORES ATLAS SCHINDLER S.A.",
      fornecedor_cnpj: "61.065.259/0001-10",
      condominio_nome: "Condomínio Solaris Premium",
      condominio_cnpj: "33.444.555/0001-22",
      valor_total: "890,00",
      valor_original: "890,00",
      valor_desconto: "0,00",
      valor_acrescimo: "0,00",
      data_vencimento: "2026-11-10",
      linha_digitavel: "34191.79001 01043.510047 91020.150008 4 98150000089000",
      chave_pix: "00020126580014BR.GOV.BCB.PIX0136123e4567-e89b-12d3-a456-426614174000"
    }
  }
];

export const INITIAL_VERSIONS = [
  {
    version: "v1.2",
    label: "v1.2 - Atual (Ativo)",
    description: "Injeção de regras de acréscimo/multas e desacoplamento de CNPJs bancários.",
    timestamp: "2026-08-21 10:30",
    accuracy: "98.4%",
    rules: INITIAL_NATURAL_RULES,
    mandatoryFields: INITIAL_MANDATORY_FIELDS,
    fewShotsCount: 5
  },
  {
    version: "v1.1",
    label: "v1.1 - Stable",
    description: "Suporte completo para Sabesp, DARFs e boletos com chave PIX.",
    timestamp: "2026-08-15 14:20",
    accuracy: "96.7%",
    rules: `• Quando o documento for da Neoenergia, extraia o CNPJ da concessionária.
• Para faturas da SABESP, extraia a ligação como identificador.`,
    mandatoryFields: INITIAL_MANDATORY_FIELDS,
    fewShotsCount: 4
  },
  {
    version: "v1.0",
    label: "v1.0 - Base",
    description: "Modelo zero-shot inicial com regras rígidas de isolamento de código de barras.",
    timestamp: "2026-08-01 09:00",
    accuracy: "93.1%",
    rules: `• Extrair despesas condominiais com 100% de grounded spans verbatim.`,
    mandatoryFields: INITIAL_MANDATORY_FIELDS.slice(0, 4),
    fewShotsCount: 2
  }
];

export function calculateBrainAccuracy(fewShots = [], rules = "") {
  const activeShots = fewShots.filter(s => s.active);
  if (activeShots.length === 0) return 88.5;
  const baseAvg = activeShots.reduce((acc, curr) => acc + (curr.accuracy || 95), 0) / activeShots.length;
  const ruleBonus = Math.min(rules.split('\n').filter(r => r.trim()).length * 0.4, 2.0);
  const total = Math.min(baseAvg + ruleBonus, 99.8);
  return Number(total.toFixed(1));
}
