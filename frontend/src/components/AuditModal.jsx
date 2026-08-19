import React, { useState, useEffect } from 'react';
import { X, Activity, CheckCircle, RefreshCw, Sparkles, FileText, Check } from 'lucide-react';

export default function AuditModal({ isOpen, onClose }) {
  const [auditData, setAuditData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchAudit = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit');
      if (res.ok) {
        const data = await res.json();
        setAuditData(data);
      }
    } catch (err) {
      console.error("Erro ao carregar auditoria:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAudit();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl rounded-3xl p-6 sm:p-8 border border-kai-accent/30 bg-kai-bg shadow-2xl relative max-h-[90vh] flex flex-col">
        
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-kai-support hover:text-kai-title p-1 rounded-lg hover:bg-kai-surface"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-kai-border">
          <div className="w-12 h-12 rounded-2xl bg-kai-accent/20 text-kai-accent border border-kai-accent/30 flex items-center justify-center shadow-lg">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-serif font-bold text-kai-title flex items-center gap-2">
              Auditoria de Acurácia em Lote (Demo Day)
            </h2>
            <p className="text-xs text-kai-support">Validação automatizada de consistência e acerto nos documentos padrão</p>
          </div>
        </div>

        {/* Global Metric Banner */}
        <div className="bg-[#1C1714] p-4 rounded-2xl border border-kai-border flex items-center justify-between mb-5">
          <div>
            <span className="text-[11px] text-kai-support font-semibold uppercase tracking-wider block mb-0.5">
              Score Global de Acurácia
            </span>
            <div className="text-3xl font-black text-kai-emerald flex items-center gap-2">
              {auditData ? `${auditData.global_accuracy_pct}%` : 'Carregando...'}
              <CheckCircle className="w-6 h-6 text-kai-emerald" />
            </div>
          </div>

          <button
            onClick={fetchAudit}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-transparent border border-kai-border hover:bg-kai-surface/30 text-kai-title text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-kai-accent ${loading ? 'animate-spin' : ''}`} />
            Re-executar Testes
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-auto space-y-2.5 pr-1">
          {auditData?.results?.map((item, idx) => (
            <div
              key={idx}
              className="bg-kai-surface/20 p-3.5 rounded-xl border border-kai-border flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-kai-surface/50 flex items-center justify-center text-kai-accent font-mono text-xs">
                  {idx + 1}
                </div>
                <div>
                  <div className="font-semibold text-kai-title">{item.file}</div>
                  <div className="text-[11px] text-kai-support flex items-center gap-2 mt-0.5">
                    <span>{item.data?.tipo_conta}</span>
                    <span>•</span>
                    <span className="text-kai-olive font-mono">R$ {item.data?.valor_total}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-kai-emerald/20 text-kai-emerald border border-kai-emerald/30 font-bold text-[11px]">
                  {item.score}% Acurácia
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-4 mt-4 border-t border-kai-border flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-transparent border border-kai-border hover:bg-kai-surface/30 text-kai-title text-xs font-semibold"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
}
