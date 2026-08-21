import React, { useState } from 'react';
import { Upload, FileText, Clipboard, Sparkles } from 'lucide-react';

export default function Dropzone({ onProcessText, onProcessFile, samples = [] }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isTextMode, setIsTextMode] = useState(false);
  const [pastedText, setPastedText] = useState('');

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files[0] || e.target.files[0];
    if (file) {
      onProcessFile(file);
    }
  };

  const handleSelectSample = (sample) => {
    onProcessText(sample.content, sample.title);
  };

  return (
    <div className="flex flex-col items-center justify-center max-w-4xl mx-auto w-full my-auto py-4">
      
      {/* Main Upload Box */}
      {!isTextMode ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`w-full border rounded-2xl p-10 sm:p-14 flex flex-col items-center justify-center text-center transition-all duration-200 bg-[#2E2621] ${
            isDragging 
              ? 'border-[#D5A474] bg-[#2E2621]' 
              : 'border-[#453A31] hover:border-[#58493D]'
          }`}
        >
          <input 
            type="file" 
            id="fileInput" 
            accept=".txt,.pdf,text/plain,application/pdf" 
            onChange={handleDrop} 
            className="hidden" 
          />
          
          <label htmlFor="fileInput" className="cursor-pointer flex flex-col items-center w-full">
            <div className="w-16 h-16 rounded-xl bg-[#2E2621] border border-[#453A31] flex items-center justify-center text-[#D5A474] mb-5">
              <Upload className="w-7 h-7" />
            </div>

            <h3 className="font-serif text-xl font-normal text-[#FFFEFD] mb-2 flex items-center gap-1.5 flex-wrap justify-center">
              Solte seu arquivo 
              <span className="font-mono text-sm uppercase px-2 py-0.5 border border-[#453A31] rounded text-[#BCB4AD]">.TXT</span>
              <span>ou</span>
              <span className="font-mono text-sm uppercase px-2 py-0.5 border border-[#453A31] rounded text-[#BCB4AD]">.PDF</span>
              aqui
            </h3>
            <p className="text-[#97918D] text-xs sm:text-sm max-w-md mb-6">
              Contas de concessionárias (CPFL, Sabesp, Neoenergia), contratos ou guias de tributos (.TXT ou .PDF editável).
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="kai-btn-primary px-6 py-2.5 rounded-lg text-xs font-semibold cursor-pointer">
                Subir Arquivo
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsTextMode(true);
                }}
                className="px-4 py-2.5 rounded-lg bg-transparent hover:bg-[#58493D]/30 text-[#FFFEFD] font-medium text-xs border border-[#453A31] transition-all flex items-center gap-2"
              >
                <Clipboard className="w-4 h-4 text-[#D5A474]" />
                <span>Colar Texto da Fatura</span>
              </button>
            </div>
          </label>
        </div>
      ) : (
        /* Text Paste Mode */
        <div className="w-full bg-[#2E2621] rounded-2xl p-6 sm:p-8 border border-[#453A31]">
          <div className="flex justify-between items-center mb-3">
            <label className="text-sm font-medium text-[#FFFEFD] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#D5A474]" />
              Cole o texto bruto da fatura ou mensagem:
            </label>
            <button
              onClick={() => setIsTextMode(false)}
              className="text-xs text-[#97918D] hover:text-[#FFFEFD] underline"
            >
              Voltar ao upload de arquivo
            </button>
          </div>
          <textarea
            rows={7}
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Exemplo: CPFL ENERGIA - Vencimento 15/10/2026 - Total R$ 1.450,80..."
            className="w-full bg-[#2E2621] border border-[#453A31] rounded-lg p-4 text-xs font-mono text-[#FFFEFD] placeholder-[#97918D]/50 focus:border-[#D5A474] outline-none resize-none leading-relaxed"
          />
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => setIsTextMode(false)}
              className="px-4 py-2 rounded-lg bg-transparent border border-[#453A31] text-[#97918D] text-xs hover:text-[#FFFEFD]"
            >
              Cancelar
            </button>
            <button
              disabled={!pastedText.trim()}
              onClick={() => onProcessText(pastedText, "Texto Colado")}
              className="kai-btn-primary px-6 py-2 rounded-lg disabled:opacity-50 text-xs flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Processar com KaiExtract</span>
            </button>
          </div>
        </div>
      )}

      {/* Demo Samples Carousel / Shortcuts */}
      {samples.length > 0 && (
        <div className="mt-8 w-full">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="font-mono text-[11px] uppercase tracking-widest text-[#BCB4AD] flex items-center gap-1.5">
              Documentos de Teste (1-Clique):
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {samples.map((sample) => (
              <button
                key={sample.id}
                onClick={() => handleSelectSample(sample)}
                className="bg-[#2E2621] p-3.5 rounded-xl text-left border border-[#453A31] hover:border-[#58493D] group flex flex-col justify-between transition-all"
              >
                <div>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-[#BCB4AD] px-1.5 py-0.5 rounded bg-[#58493D]/40 border border-[#453A31] inline-block mb-2">
                    {sample.category}
                  </span>
                  <p className="font-serif text-sm font-normal text-[#FFFEFD] group-hover:text-[#D5A474] transition-colors line-clamp-1">
                    {sample.title?.replace(/Schindler/i, 'Manutenção')}
                  </p>
                </div>
                <span className="text-[11px] text-[#97918D] mt-3 flex items-center gap-1 group-hover:text-[#FFFEFD]">
                  Auditar &rarr;
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
