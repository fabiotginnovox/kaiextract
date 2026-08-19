import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Dropzone from './components/Dropzone';
import GroundingViewer, { buildGroundingHtml } from './components/GroundingViewer';
import ExtractionForm from './components/ExtractionForm';
import SuccessModal from './components/SuccessModal';
import AuditModal from './components/AuditModal';
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
          id: "schindler_elevadores.txt",
          title: "Schindler Elevadores",
          category: "Contratos",
          content: "ELEVADORES ATLAS SCHINDLER S.A.\nCNPJ: 61.065.259/0001-10\nSacado / Condomínio: Condomínio Solaris Premium - CNPJ: 33.444.555/0001-22\nData de Vencimento: 10/11/2026\nValor Líquido a Pagar: R$ 890,00\nLinha Digitável: 34191.79001 01043.510047 91020.150008 4 98150000089000\nPIX Copia e Cola: 00020126580014BR.GOV.BCB.PIX0136123e4567-e89b-12d3-a456-426614174000"
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
      console.error("Falha ao chamar API de extração:", err);
      // Fallback gracioso para simulação local se offline
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
      console.error("Erro no processamento do arquivo:", err);
      // Fallback lendo texto do arquivo
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
      setCurrentDoc({
        docId: 'doc_local',
        rawText: text,
        htmlContent: `<div style="padding:10px; color:#38bdf8;"><strong>Visualização Offline com Grounding</strong></div><pre>${text}</pre>`,
        groundingSpans: [],
        dadosExtraidos: {
          tipo_documento: text.includes("CPFL") ? "Conta de Consumo" : "Boleto de Serviços",
          condominio_nome: text.includes("BELLA VISTA") ? "CONDOMINIO EDIFICIO BELLA VISTA" : "Condomínio Solaris Premium",
          condominio_cnpj: "12.345.678/0001-90",
          tipo_conta: text.includes("CPFL") ? "Consumo > Energia Elétrica" : "Contratos > Elevadores",
          fornecedor_nome: text.includes("CPFL") ? "COMPANHIA PAULISTA DE FORÇA E LUZ - CPFL" : "ELEVADORES ATLAS SCHINDLER S.A.",
          fornecedor_cnpj: "02.838.720/0001-28",
          valor_total: text.includes("1.450,80") ? "1.450,80" : "890,00",
          valor_original: text.includes("1.450,80") ? "1.450,80" : "940,00",
          valor_desconto: text.includes("50,00") ? "50,00" : "0,00",
          valor_acrescimo: "0,00",
          data_vencimento: "2026-10-15",
          data_emissao: "2026-10-01",
          linha_digitavel: "83660000001-4 45080048100-3 15102026123-0 00012345678-9",
          chave_pix: text.includes("PIX") ? "00020126580014BR.GOV.BCB.PIX0136123e4567-e89b-12d3-a456-426614174000" : ""
        }
      });
      setFase('validacao');
    }, 1200);
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
      const updatedDados = {
        ...prev.dadosExtraidos,
        [field]: value
      };

      // Bidirectional alias sync
      if (field === 'endereco_fornecedor') updatedDados.fornecedor_endereco = value;
      if (field === 'fornecedor_endereco') updatedDados.endereco_fornecedor = value;
      if (field === 'endereco_pagador') updatedDados.condominio_endereco = value;
      if (field === 'condominio_endereco') updatedDados.endereco_pagador = value;
      if (field === 'contato_fornecedor') updatedDados.fornecedor_contato = value;
      if (field === 'fornecedor_contato') updatedDados.contato_fornecedor = value;

      const existingSpans = (prev.groundingSpans || []).filter(s => s.field !== field);
      const newSpan = {
        field,
        label: label || field,
        color: color || '#34D399',
        matched_text: value
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
      <footer className="border-t border-kai-border py-3 px-8 text-center text-[11px] text-kai-support">
        KaiExtract Platform • Interoperabilidade Multi-ERP (SuperLógica, CondominIA) • SELECT Edition
      </footer>

    </div>
  );
}
