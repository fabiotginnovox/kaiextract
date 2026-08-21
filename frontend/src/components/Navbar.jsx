import React from 'react';
import { ArrowRight, Building2, Activity } from 'lucide-react';
import logoSvg from '../assets/KaiExtract-svg-logo.svg';

export default function Navbar({ 
  fase, 
  setFase,
  erpDestino, 
  setErpDestino, 
  onOpenAudit,
  onReset,
  onSync,
  hasDoc = false,
  samplesCount 
}) {
  return (
    <header className="border-b border-[#453A31] px-6 lg:px-10 py-3.5 flex flex-wrap gap-4 justify-between items-center bg-[#2E2621] sticky top-0 z-40">
      
      {/* Brand & Logo */}
      <div className="flex items-center gap-4">
        <img 
          src={logoSvg} 
          alt="KaiExtract" 
          className="h-8 w-auto object-contain cursor-pointer"
          onClick={onReset}
        />
      </div>

      {/* Interactive Stepper / Workflow Pipeline */}
      <nav aria-label="Fluxo de Extração" className="hidden md:flex items-center gap-2 text-xs bg-[#251E1A] p-1 rounded-lg border border-[#453A31]">
        <button 
          type="button"
          onClick={onReset}
          className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
            fase === 'upload' 
              ? 'bg-[#58493D] text-[#FFFEFD] font-medium border border-[#D5A474]/50 shadow-sm' 
              : 'text-[#97918D] hover:text-[#FFFEFD] hover:bg-[#58493D]/30'
          }`}
          title="Etapa 1: Carregar Fatura / Selecionar TXT de Exemplo"
        >
          <span>Enviar Fatura</span>
        </button>
        
        <ArrowRight className="w-3.5 h-3.5 text-[#48403A]" />
        
        <button 
          type="button"
          onClick={() => {
            if (hasDoc && setFase) setFase('validacao');
          }}
          disabled={!hasDoc}
          className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
            fase === 'processando' || fase === 'validacao' 
              ? 'bg-[#58493D] text-[#FFFEFD] font-medium border border-[#D5A474]/50 shadow-sm' 
              : hasDoc ? 'text-[#97918D] hover:text-[#FFFEFD] hover:bg-[#58493D]/30 cursor-pointer' : 'text-[#58493D] cursor-not-allowed opacity-50'
          }`}
          title="Etapa 2: Auditoria, Rastreabilidade e Validação"
        >
          <span>Auditoria & Conferência</span>
        </button>
        
        <ArrowRight className="w-3.5 h-3.5 text-[#48403A]" />
        
        <button 
          type="button"
          onClick={() => {
            if (hasDoc && onSync) onSync();
          }}
          disabled={!hasDoc}
          className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
            fase === 'sincronizado' 
              ? 'bg-[#D5A474] text-[#2D251B] font-semibold shadow-sm' 
              : hasDoc ? 'text-[#97918D] hover:text-[#FFFEFD] hover:bg-[#58493D]/30 cursor-pointer' : 'text-[#58493D] cursor-not-allowed opacity-50'
          }`}
          title="Etapa 3: Sincronização e Envio ao ERP"
        >
          <span>Sincronização ERP</span>
        </button>
      </nav>

      {/* Actions & Multi-ERP Selector */}
      <div className="flex items-center gap-3">
        {/* Nova Extração Button */}
        {fase !== 'upload' && (
          <button
            onClick={onReset}
            className="flex items-center gap-2 text-xs font-medium px-3.5 py-2 rounded-lg bg-kai-accent text-kai-bg hover:bg-[#EBD1B7] transition-all"
            title="Extrair Novo Arquivo"
          >
            <span className="font-mono">Nova Extração</span>
          </button>
        )}

        {/* Live Batch Accuracy Button */}
        <button
          onClick={onOpenAudit}
          className="flex items-center gap-2 text-xs font-medium px-3.5 py-2 rounded-lg bg-[#2E2621] hover:bg-[#58493D]/40 border border-[#453A31] text-[#FFFEFD] transition-all"
          title="Ver Auditoria de Acurácia em Lote"
        >
          <Activity className="w-3.5 h-3.5 text-[#D5A474]" />
          <span className="font-mono">Acurácia (100%)</span>
        </button>

        {/* Agnostic Multi-ERP Switcher */}
        <div className="flex items-center gap-1.5 bg-[#2E2621] p-1 rounded-lg border border-[#453A31]">
          <div className="px-2 py-0.5 flex items-center gap-1.5 text-xs text-[#97918D] border-r border-[#453A31]">
            <Building2 className="w-3.5 h-3.5 text-[#D5A474]" />
            <span className="hidden sm:inline font-mono uppercase text-[10px] tracking-wider text-[#BCB4AD]">ERP</span>
          </div>
          <select 
            value={erpDestino} 
            onChange={(e) => setErpDestino(e.target.value)}
            className="bg-[#2E2621] text-xs font-medium text-[#FFFEFD] outline-none pr-2 py-1 pl-1 cursor-pointer"
          >
            <option value="superlogica" className="bg-[#2E2621] text-[#FFFEFD]">SuperLógica</option>
            <option value="condominia" className="bg-[#2E2621] text-[#FFFEFD]">CondominIA</option>
            <option value="universal" className="bg-[#2E2621] text-[#FFFEFD]">Universal (JSON)</option>
          </select>
        </div>
      </div>

    </header>
  );
}

