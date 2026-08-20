import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Dropzone from './components/Dropzone';
import GroundingViewer, { buildGroundingHtml } from './components/GroundingViewer';
import ExtractionForm from './components/ExtractionForm';
import SuccessModal from './components/SuccessModal';
import AuditModal from './components/AuditModal';
import { extractDocumentClientSide, normalizeSelectedValue } from './utils/clientExtractor';
import { Loader2, AlertCircle } from 'lucide-react';

export default function App() {
  const [fase, setFase] = useState('upload'); // 'upload' | 'processando' | 'validacao' | 'sincronizado'
  const [erpDestino, setErpDestino] = useState('superlogica'); // 'superlogica' | 'condominia' | 'universal'
  const [samples, setSamples] = useState([]);
  const [focusedField, setFocusedField] = useState(null);
  const [currentDoc, setCurrentDoc] = useState({
    docId: '',
    rawText: '',
    htmlContent: '',
    groundingSpans: [],
    dadosExtraidos: {
      tipo_documento: '',
      condominio_nome: '',
      condominio_cnpj: '',
      tipo_conta: 'Consumo > Energia Elétrica',
      fornecedor_nome: '',
      fornecedor_cnpj: '',
      valor_total: '0,00',
      valor_original: '0,00',
      valor_desconto: '0,00',
      valor_acrescimo: '0,00',
      data_vencimento: '',
      data_emissao: '',
      linha_digitavel: '',
      chave_pix: '',
      endereco_fornecedor: '',
      endereco_pagador: '',
      contato_fornecedor: '',
      juros_dia: '',
      multa_atraso: '',
      numero_documento: '',
      nosso_numero: ''
    }
  });

  const [syncPayload, setSyncPayload] = useState(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Load samples from backend on mount
  useEffect(() => {
    fetchSamples();
  }, []);

  const fetchSamples = async () => {
    try {
      const res = await fetch('/api/samples');
      if (res.ok) {
        const data = await res.json();
        setSamples(data.samples || []);
      }
    } catch (err) {
      console.warn("Backend local não disponível ainda, usando amostras estáticas:", err);
      setSamples([
        {
          id: "cpfl_energia.txt",
          title: "Cpfl Energia",
          category: "Consumo",
          content: "COMPANHIA PAULISTA DE FORÇA E LUZ - CPFL\nCNPJ: 02.838.720/0001-28\nUnidade Consumidora: CONDOMINIO EDIFICIO BELLA VISTA - CNPJ: 12.345.678/0001-90\nVencimento: 15/10/2026\nTotal a Pagar: R$ 1.450,80\nLinha Digitável: 83660000001-4 45080048100-3 15102026123-0 00012345678-9"
        },
        {
          id: "darf_impostos.txt",
          title: "Darf Impostos",
          category: "Impostos",
          content: "SECRETARIA DA RECEITA FEDERAL DO BRASIL\nMINISTÉRIO DA FAZENDA\nDOCUMENTO DE ARRECADAÇÃO DE RECEITAS FEDERAIS - DARF\nContribuinte: CONDOMINIO EDIFICIO VILA NOVA - CNPJ: 11.222.333/0001-44\nCódigo da Receita: 1708 - IRRF Retenção PJ\nPeríodo de Apuração: 31/07/2026 | Data de Vencimento: 20/08/2026\nValor do Principal: R$ 320,50\nMulta: R$ 15,00 | Juros: R$ 4,50\nTotal do Documento: R$ 340,00\nCódigo de Barras: 85890000003-2 40000179260-8 82008202611-3 22233300014-4"
        },
        {
          id: "portaria_servicos.txt",
          title: "Portaria Servicos",
          category: "Contratos",
          content: "GUARDIAN SEGURANÇA PATRIMONIAL E SERVIÇOS LTDA\nCNPJ: 18.999.888/0001-33\nFatura Mensal de Serviços Especializados de Portaria e Vigilância 24h\nTomador: CONDOMINIO RESIDENCIAL GRAN TERRACO - CNPJ: 45.666.777/0001-88\nEmissão: 28/09/2026 | Vencimento: 05/10/2026\nValor dos Serviços: R$ 8.500,00\nDesconto por Adiantamento: R$ 0,00 | Encargos: R$ 0,00\nTotal a Pagar: R$ 8.500,00\nLinha Digitável: 23793.38128 60012.345678 90001.234567 1 98760000850000\nChave PIX: financeiro@guardianseguranca.com.br"
        },
        {
          id: "sabesp_agua.txt",
          title: "Sabesp Agua",
          category: "Consumo",
          content: "COMPANHIA DE SANEAMENTO BASICO DO ESTADO DE SAO PAULO - SABESP\nCNPJ: 43.776.517/0001-80\nLigação / RGI: 02938472-10\nCliente: CONDOMINIO RESIDENCIAL PARQUE DAS FLORES - CNPJ: 22.333.444/0001-55\nPeríodo de Consumo: 01/09/2026 a 30/09/2026 | Emissão: 05/10/2026 | Vencimento: 22/10/2026\nValor da Água: R$ 1.120,50 | Valor do Esgoto: R$ 1.120,50\nValor Original: R$ 2.241,00\nDesconto Tarifário: R$ 0,00 | Acréscimos: R$ 0,00\nTotal a Pagar: R$ 2.241,00\nLinha Digitável: 82680000022-4 41000011205-1 10051020262-8 23334440001-7"
        },
        {
          id: "schindler_elevadores.txt",
          title: "Manutenção Elevadores",
          category: "Contratos",
          content: "ELEVADORES ATLAS SCHINDLER S.A.\nCNPJ: 61.065.259/0001-10\nSacado / Condomínio: Condomínio Solaris Premium - CNPJ: 33.444.555/0001-22\nData de Vencimento: 10/11/2026\nValor Líquido a Pagar: R$ 890,00\nLinha Digitável: 34191.79001 01043.510047 91020.150008 4 98150000089000\nPIX Copia e Cola: 00020126580014BR.GOV.BCB.PIX0136123e4567-e89b-12d3-a456-426614174000"
        },
        {
          id: "secovi_pe.txt",
          title: "Secovi Pe",
          category: "Serviços",
          content: `Agência/Cód. Beneficiário CNPJ/CPF - Pagador Data Emissão\nNúmero Documento Vencimento\n3211/11950-2 02819556000130 21/05/2026 9907637002 19/06/2026\nBeneficiário CNPJ/CPF - Beneficiário Valor\nSECOVI-PE -SIND EMP C VEND L ADM I ED EM COND RES 24.566.663/0001-36\n21 4,00\nAv. Republica do Libano, 251 Torre 3 sl 1209 - Pina - Recife - PE CEP : 51110-160\nApto :\nPagador EDF. AVIS LIBERTA MENSAL ASSOC. JAN/26 A MAI/26 TX/24 -2/3\nValor a pagar : R$214,00\nCódigo Descrição Complemento Documento Valor\nMENSAL JAN/26 A MAI/26 E TAXA/2024 214,00\nInstruções de Cobrança\nMENSAL JAN/26 A MAI/26 E TAXA/202 214,00 + JUROS AO DIA R$0, 07\n(0,0333%)\nACORDO - MENSAL ASSOC. JAN/26 A MAI /ZG E TAXA ASSIST ZOGA PARC.OZ/OZ\nAPOS VENCIMENTO MULTA DE R$4,Z8 (Z%)\nRECIBO DO PAGADOR Nosso Nº: 109/00IZZSZ-Z-S Formulário Eletrônico\nCARSOFT\nBanco Itau S.A. 34191.09008 00000.000000 00000.000000 0 00000000021400\nAutenticação Mecânica\nConterir os digitos verificadores que estão abaixo anivorme con os digitos a seguir Z-L-0-L\nBanco Itau S.A. 341-7 Vencimento\nLocal do Pagamento Até o vencimento, preferencialmente no Itaú. Após o vencimento, somente no Itaú.\nBeneficiário SECOVI-PE -SIND EMP C VEND L ADM I ED EM COND RES CNPJ: 24.566.663/0001-36 Agência/Código Beneficiário\nAv. Republica do Libano, 251 Torre 3 sl 1209 - Pina - Recife - PE CEP: 51110-160 Nosso Numero\nData Documento Número do Documento Espécie do Documento Aceite Data do Processamento\n21/05/2026 9907637002 DM N 21/05/2026 109/0012252-2-5\nUso do banco Carteira Espécie moeda Quantidade Valor Valor Documento\n109 R$ 214,00\nInstruções de responsabilidade do beneficiário Qualquer dúvida sobre este boleto, contate o beneficiário.\nMENSAL JAN/26 A MAI/26 E TAXA/2024 214,00 (-) Descontos/Ajustamentos\nACORDO - MENSAL ASSOC. JAN/26 A MAI/26 E TAXA ASSIST 2024 PARC. 02/02 (+) Outras Deduções\nAPOS VENCIMENTO MULTA DE R$ 4,28 (2%) (+) Moras/Multas\n+ JUROS AO DIA R$ 0,07 (0,0333%) (+) Outros Acréscimos\nSECOVI-PE (81) 2122-7600 secovi@secovi-pe.com.br (=) Valor Cobrado\nPagador 00226 EDF. AVIS LIBERTA\nR DOM SEBASTIAO LEME, 211\nGRACAS - RECIFE - PE CEP: 52011-120 CNPJ/CPF: 02.819.556/0001-30\nSacador/Avalista Código de Baixa`
        }
      ]);
    }
  };

  const handleProcessText = async (text, docTitle = "documento") => {
    setErrorMsg(null);
    setFase('processando');
    
    try {
      const formData = new FormData();
      formData.append('text', text);

      const res = await fetch('/api/extract', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        throw new Error(`Erro na extração (${res.status})`);
      }

      const data = await res.json();
      
      setCurrentDoc({
        docId: data.doc_id,
        rawText: data.raw_text,
        htmlContent: data.html_viewer_url ? await fetchHtmlView(data.html_viewer_url) : '',
        groundingSpans: data.grounding_spans || [],
        dadosExtraidos: data.dados_extraidos
      });

      setFase('validacao');
    } catch (err) {
      console.warn("API de extração offline ou indisponível, usando motor de grounding client-side:", err);
      simulateLocalExtraction(text);
    }
  };

  const handleProcessFile = async (file) => {
    setErrorMsg(null);
    setFase('processando');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/extract', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        throw new Error(`Erro no upload (${res.status})`);
      }

      const data = await res.json();
      
      setCurrentDoc({
        docId: data.doc_id,
        rawText: data.raw_text,
        htmlContent: data.html_viewer_url ? await fetchHtmlView(data.html_viewer_url) : '',
        groundingSpans: data.grounding_spans || [],
        dadosExtraidos: data.dados_extraidos
      });

      setFase('validacao');
    } catch (err) {
      console.warn("Fallback client-side para processamento de arquivo:", err);
      const reader = new FileReader();
      reader.onload = (e) => {
        simulateLocalExtraction(e.target.result);
      };
      reader.readAsText(file);
    }
  };

  const fetchHtmlView = async (url) => {
    try {
      const res = await fetch(url);
      if (res.ok) {
        return await res.text();
      }
    } catch (e) {
      console.warn("Could not load HTML visualizer directly:", e);
    }
    return '';
  };

  const simulateLocalExtraction = (text) => {
    setTimeout(() => {
      const extracted = extractDocumentClientSide(text);
      setCurrentDoc(extracted);
      setFase('validacao');
    }, 600);
  };

  const handleFieldChange = (campo, valor) => {
    setCurrentDoc(prev => ({
      ...prev,
      dadosExtraidos: {
        ...prev.dadosExtraidos,
        [campo]: valor
      }
    }));
  };

  const handleManualGrounding = ({ field, value, color, label }) => {
    setCurrentDoc(prev => {
      const normalizedValue = normalizeSelectedValue(field, value);

      const updatedDados = {
        ...prev.dadosExtraidos,
        [field]: normalizedValue
      };

      // Bidirectional alias sync
      if (field === 'endereco_fornecedor') updatedDados.fornecedor_endereco = normalizedValue;
      if (field === 'fornecedor_endereco') updatedDados.endereco_fornecedor = normalizedValue;
      if (field === 'endereco_pagador') updatedDados.condominio_endereco = normalizedValue;
      if (field === 'condominio_endereco') updatedDados.endereco_pagador = normalizedValue;
      if (field === 'contato_fornecedor') updatedDados.fornecedor_contato = normalizedValue;
      if (field === 'fornecedor_contato') updatedDados.contato_fornecedor = normalizedValue;
      if (field === 'cnpj_fornecedor') updatedDados.fornecedor_cnpj = normalizedValue;
      if (field === 'cnpj_condominio') updatedDados.condominio_cnpj = normalizedValue;

      const existingSpans = (prev.groundingSpans || []).filter(s => s.field !== field && s.field !== `grounding-${field}`);
      const newSpan = {
        field,
        label: label || field,
        color: color || '#34D399',
        matched_text: value,
        value: normalizedValue,
        manual: true
      };
      const updatedSpans = [...existingSpans, newSpan];
      const updatedHtml = buildGroundingHtml(prev.rawText, updatedSpans);

      return {
        ...prev,
        dadosExtraidos: updatedDados,
        groundingSpans: updatedSpans,
        htmlContent: updatedHtml
      };
    });

    setFocusedField(field);
  };

  const handleSync = async () => {
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          erp: erpDestino,
          data: currentDoc.dadosExtraidos
        })
      });

      let payload = null;
      if (res.ok) {
        payload = await res.json();
      } else {
        // Fallback payload representation
        payload = {
          erp: erpDestino,
          dados_sincronizados: currentDoc.dadosExtraidos
        };
      }

      setSyncPayload(payload);
      setIsSuccessModalOpen(true);
      setFase('sincronizado');
    } catch (err) {
      console.error("Erro na sincronização:", err);
      setSyncPayload({
        erp: erpDestino,
        dados_sincronizados: currentDoc.dadosExtraidos
      });
      setIsSuccessModalOpen(true);
      setFase('sincronizado');
    }
  };

  const handleReset = () => {
    setFase('upload');
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-kai-bg text-kai-body flex flex-col font-sans selection:bg-kai-accent/30 selection:text-kai-title">
      
      {/* Navbar Header */}
      <Navbar
        fase={fase}
        setFase={setFase}
        erpDestino={erpDestino}
        setErpDestino={setErpDestino}
        onOpenAudit={() => setIsAuditModalOpen(true)}
        onReset={handleReset}
        onSync={handleSync}
        hasDoc={Boolean(currentDoc)}
        samplesCount={samples.length}
      />

      {/* Error Alert */}
      {errorMsg && (
        <div className="max-w-4xl mx-auto mt-4 px-4 w-full">
          <div className="bg-red-900/20 border border-red-500/30 p-3.5 rounded-2xl flex items-center gap-3 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        </div>
      )}

      {/* Main App Body */}
      <main className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        
        {/* State 1: Upload Dropzone ("Vazio Criativo") */}
        {fase === 'upload' && (
          <Dropzone
            onProcessText={handleProcessText}
            onProcessFile={handleProcessFile}
            samples={samples}
          />
        )}

        {/* State 2: Processing Spinner */}
        {fase === 'processando' && (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center my-auto animate-fadeIn">
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-full border-4 border-kai-accent/20 border-t-kai-accent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-kai-accent animate-pulse" />
              </div>
            </div>
            <h3 className="text-xl font-serif font-bold text-kai-title mb-2">
              KaiExtract a analisar o documento...
            </h3>
            <p className="text-kai-body text-xs sm:text-sm max-w-md">
              Classificando despesa, extraindo código de barras / PIX e vinculando coordenadas de Source Grounding via Gemini 1.5 Flash.
            </p>
          </div>
        )}

        {/* State 3 & 4: Split-Screen Audit & Validation */}
        {(fase === 'validacao' || fase === 'sincronizado') && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 items-stretch animate-fadeIn">
            
            {/* Left Panel: Grounding / Raw Text Viewer */}
            <div className="h-full">
              <GroundingViewer 
                rawText={currentDoc.rawText} 
                htmlContent={currentDoc.htmlContent}
                docId={currentDoc.docId}
                groundingSpans={currentDoc.groundingSpans}
                focusedField={focusedField}
                onManualGrounding={handleManualGrounding}
                onFocusField={setFocusedField}
              />
            </div>

            {/* Right Panel: Extraction Review & Sync Form */}
            <div className="h-full">
              <ExtractionForm 
                dados={currentDoc.dadosExtraidos}
                onChange={handleFieldChange}
                onSync={handleSync}
                onReset={handleReset}
                erpDestino={erpDestino}
                onFocusField={setFocusedField}
                groundingSpans={currentDoc.groundingSpans}
              />
            </div>

          </div>
        )}

      </main>

      {/* Success Modal */}
      <SuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        erpDestino={erpDestino}
        syncPayload={syncPayload}
        dados={currentDoc.dadosExtraidos}
        onNewDoc={handleReset}
      />

      {/* Audit Modal */}
      <AuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
      />

      {/* Footer Minimalista */}
      <footer className="border-t border-[#453A31] py-3 px-8 text-center text-[11px] text-[#97918D] font-mono">
        KaiExtract Platform • @Innovox - 2026
      </footer>

    </div>
  );
}
