import React, { useState } from 'react';
import { CheckCircle2, Copy, Check, X, Download, ExternalLink, ArrowRight } from 'lucide-react';

export default function SuccessModal({ isOpen, onClose, erpDestino, syncPayload, dados, onNewDoc }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(syncPayload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(syncPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kaiextract_${erpDestino}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const erpTitle = erpDestino === 'superlogica' ? 'SuperLógica Condomínio' : (erpDestino === 'condominia' ? 'CondominIA' : 'ERP Universal');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-xl rounded-3xl p-6 sm:p-8 bg-kai-bg border border-kai-border shadow-2xl relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-kai-support hover:text-kai-title p-1 rounded-lg hover:bg-kai-surface"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Success Icon & Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-kai-emerald/20 text-kai-emerald border border-kai-emerald/30 flex items-center justify-center mb-3 shadow-lg">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h2 className="text-xl font-serif font-normal text-kai-title mb-1">
            Despesa Sincronizada com Sucesso!
          </h2>
          <p className="text-kai-body text-xs sm:text-sm max-w-md">
            Os dados de <strong className="text-kai-title">R$ {dados.valor_total}</strong> foram formatados e integrados para o ecossistema <span className="text-kai-accent font-semibold">{erpTitle}</span>.
          </p>
        </div>

        {/* Payload Preview */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2 px-1 text-xs">
            <span className="font-mono text-kai-tag uppercase tracking-wider text-[10px]">
              Payload de Integração ({erpTitle}):
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyJson}
                className="text-kai-accent hover:text-kai-title flex items-center gap-1 text-[11px]"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-kai-emerald" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado!' : 'Copiar JSON'}
              </button>
              <button
                onClick={handleDownloadJson}
                className="text-kai-support hover:text-kai-title flex items-center gap-1 text-[11px]"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar
              </button>
            </div>
          </div>

          <pre className="bg-[#1C1714] p-3.5 rounded-xl text-[11px] font-mono text-kai-title border border-kai-border max-h-48 overflow-auto leading-relaxed">
            {JSON.stringify(syncPayload, null, 2)}
          </pre>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-transparent border border-kai-border hover:bg-kai-surface/30 text-kai-support hover:text-kai-title text-xs"
          >
            Fechar
          </button>
          <button
            onClick={() => {
              onClose();
              onNewDoc();
            }}
            className="kai-btn-primary px-6 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
          >
            <span>Processar Próximo Documento</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
