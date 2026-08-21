import React, { useState } from 'react';
import { FileText, ExternalLink, Download, Eye, Sparkles, ZoomIn, ZoomOut } from 'lucide-react';

export default function PdfViewer({ pdfUrl, docId, viewerHeight = 540 }) {
  const [zoom, setZoom] = useState(100);

  const handleOpenNewTab = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  const handleDownload = () => {
    if (pdfUrl) {
      const a = document.createElement('a');
      a.href = pdfUrl;
      a.download = `${docId || 'fatura'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div className="bg-[#2E2621] rounded-2xl p-5 flex flex-col h-full border border-[#453A31] relative">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-[#453A31]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-base font-normal text-[#FFFEFD]">
              Documento PDF Original
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#D5A474]/20 text-[#D5A474] border border-[#D5A474]/40">
              PDF Nativo
            </span>
          </div>
          <p className="text-xs text-[#BCB4AD] font-mono">
            Documento original enviado com camada de texto extraída
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenNewTab}
            title="Abrir PDF em nova aba"
            className="p-1.5 rounded-lg bg-[#1D1714] hover:bg-[#58493D] text-[#BCB4AD] hover:text-[#FFFEFD] border border-[#453A31] transition-colors flex items-center gap-1 text-xs font-mono"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Nova Aba</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            title="Baixar arquivo PDF"
            className="p-1.5 rounded-lg bg-[#1D1714] hover:bg-[#58493D] text-[#BCB4AD] hover:text-[#FFFEFD] border border-[#453A31] transition-colors flex items-center gap-1 text-xs font-mono"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* PDF View Container */}
      <div 
        style={{ height: `${viewerHeight}px`, minHeight: '260px' }}
        className="w-full bg-[#1D1714] rounded-xl border border-[#453A31] overflow-hidden relative flex-none shadow-inner"
      >
        {pdfUrl ? (
          <iframe
            src={`${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1`}
            title="Visualizador do PDF Original"
            className="w-full h-full border-0 rounded-xl"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-[#97918D]">
            <FileText className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-xs font-mono">Nenhum arquivo PDF carregado para visualização.</p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-3 border-t border-[#453A31] flex items-center justify-between text-[11px] text-[#BCB4AD] font-mono">
        <span>Visualização original do emissor</span>
        <span className="text-[#D5A474]">Coluna 1 • PDF Source</span>
      </div>

    </div>
  );
}
