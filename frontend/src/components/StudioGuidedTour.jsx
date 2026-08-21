import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Cpu, 
  Layers, 
  Code2, 
  Zap, 
  BookOpen,
  CheckCircle2,
  ArrowUp,
  ArrowLeft as ArrowLeftIcon,
  ArrowRight as ArrowRightIcon,
  ArrowDown
} from 'lucide-react';

export const TOUR_STEPS = [
  {
    id: 'governance',
    targetId: 'studio-section-governance',
    stepNumber: 1,
    title: 'Painel Superior de Governança',
    badgeLabel: 'Painel de Governança & Versões',
    positionBadge: '▲ Card em destaque acima',
    directionIcon: ArrowUp,
    subtitle: 'Score de Acurácia, Gestão de Versões e Portabilidade',
    icon: Cpu,
    color: '#D5A474',
    content: [
      'Acompanhe a Acurácia Geral do Modelo (99.8%) calculada dinamicamente.',
      'Alterne entre versões de prompt ou execute um Rollback instantâneo.',
      'Salve novas versões e exporte/importe o Cérebro em arquivo .json.'
    ],
    tip: 'O Cérebro em .json contém todas as regras, modelos ativos e histórico do sistema.'
  },
  {
    id: 'fewshot',
    targetId: 'studio-section-fewshot',
    stepNumber: 2,
    title: 'Gestor de Exemplos (Few-Shot)',
    badgeLabel: 'Coluna Esquerda: Modelos Treinados',
    positionBadge: '◀ Card em destaque à esquerda',
    directionIcon: ArrowLeftIcon,
    subtitle: 'Ensine a IA com Pares de Fatura Real vs. JSON Esperado',
    icon: Layers,
    color: '#34D399',
    content: [
      '➕ Clique em "Novo Exemplo" para cadastrar novas concessionárias ou formatos de faturas.',
      '🔘 Use o interruptor Toggle para ativar ou desativar modelos do prompt em tempo real.',
      '✏️ Edite o par TXT Bruto vs JSON Esperado com validação automática de sintaxe.',
      '⚡ Clique no ícone de raio para carregar a fatura daquele modelo diretamente no Sandbox inferior.'
    ],
    tip: 'Modelos Few-Shot com boa cobertura elevam a acurácia verbatim para 99%+.'
  },
  {
    id: 'rules',
    targetId: 'studio-section-rules',
    stepNumber: 3,
    title: 'Editor & Calibrador de Regras',
    badgeLabel: 'Coluna Direita: Editor de Regras',
    positionBadge: '▶ Card em destaque à direita',
    directionIcon: ArrowRightIcon,
    subtitle: 'Injeção de Regras em Linguagem Natural & Campos Obrigatórios',
    icon: Code2,
    color: '#38BDF8',
    content: [
      '✍️ Digite regras em linguagem natural para resolver ambiguidades (ex: isolar CNPJ da concessionária vs banco emissor).',
      '⚡ Use os Atalhos Rápidos para injetar regras prontas de saneamento, multas e encargos.',
      '☑️ Configure a Obrigatoriedade de Campos para bloquear envio de faturas que estejam com dados essenciais ausentes.'
    ],
    tip: 'O contador no topo estima em tempo real a quantidade de tokens consumidos pelo prompt.'
  },
  {
    id: 'sandbox',
    targetId: 'studio-section-sandbox',
    stepNumber: 4,
    title: 'Playground Sandbox & Comparativo em Tempo Real',
    badgeLabel: 'Painel Inferior: Playground Sandbox',
    positionBadge: '▼ Card em destaque abaixo',
    directionIcon: ArrowDown,
    subtitle: 'Validação Imediata com Grounding Visual e Análise Antes x Depois',
    icon: Zap,
    color: '#F59E0B',
    content: [
      '📄 Arraste um arquivo .txt de teste ou escolha uma amostra no seletor de modelos.',
      '⚡ Clique em "Simular Extração com o Prompt Atual" para rodar a calibração com feedback imediato.',
      '🎯 Veja o Grounding Visual (realces coloridos) ancorando cada dado aos caracteres do documento.',
      '📈 Compare no painel direito o resultado Anterior vs Novo com destaque para campos calibrados.'
    ],
    tip: 'Valide quantas vezes desejar no sandbox antes de salvar uma nova versão.'
  }
];

export default function StudioGuidedTour({
  isOpen,
  onClose,
  onOpenGuideModal
}) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  });

  const currentStep = TOUR_STEPS[currentStepIndex];

  // Compute bounding box for spotlight cutout & scroll smoothly
  const updateTargetRect = () => {
    if (!isOpen) return;
    const el = document.getElementById(currentStep.targetId);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom,
        right: rect.right
      });
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const targetEl = document.getElementById(currentStep.targetId);
    if (targetEl) {
      if (currentStep.id === 'governance') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (currentStep.id === 'sandbox') {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
      } else {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setTimeout(updateTargetRect, 240);
    }

    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      updateTargetRect();
    };
    const handleScroll = () => updateTargetRect();

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, { passive: true });

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, currentStepIndex]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  // --- Dynamic Morphing & Spatial Placement Calculation ---
  const isWide = windowSize.width >= 1024;
  const isHorizontalLayout = currentStep.id === 'governance' || currentStep.id === 'sandbox' || !isWide;

  const getDynamicModalStyle = () => {
    if (!targetRect) {
      return {
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(92vw, 640px)',
        zIndex: 50
      };
    }

    const pad = 16;

    // Passo 1: Logo abaixo do card de governança (Horizontal)
    if (currentStep.id === 'governance') {
      const topPos = targetRect.bottom + pad;
      return {
        position: 'fixed',
        top: `${Math.min(topPos, windowSize.height - 200)}px`,
        left: `${targetRect.left}px`,
        width: `${targetRect.width}px`,
        zIndex: 50
      };
    }

    // Passo 2 (Few-Shot na esquerda): Posicionado AO LADO DIREITO do card
    if (currentStep.id === 'fewshot') {
      if (isWide) {
        const leftPos = targetRect.right + pad;
        const widthAvail = windowSize.width - leftPos - pad * 2;
        return {
          position: 'fixed',
          top: `${targetRect.top}px`,
          left: `${leftPos}px`,
          width: `${Math.min(widthAvail, 680)}px`,
          maxHeight: `${Math.max(targetRect.height, 420)}px`,
          zIndex: 50
        };
      } else {
        return {
          position: 'fixed',
          bottom: '16px',
          left: `${targetRect.left}px`,
          width: `${targetRect.width}px`,
          zIndex: 50
        };
      }
    }

    // Passo 3 (Regras na direita): Posicionado AO LADO ESQUERDO do card
    if (currentStep.id === 'rules') {
      if (isWide) {
        const widthAvail = targetRect.left - pad * 2;
        const modalW = Math.min(widthAvail, 580);
        const leftPos = targetRect.left - modalW - pad;
        return {
          position: 'fixed',
          top: `${targetRect.top}px`,
          left: `${Math.max(leftPos, pad)}px`,
          width: `${modalW}px`,
          maxHeight: `${Math.max(targetRect.height, 420)}px`,
          zIndex: 50
        };
      } else {
        return {
          position: 'fixed',
          bottom: '16px',
          left: `${targetRect.left}px`,
          width: `${targetRect.width}px`,
          zIndex: 50
        };
      }
    }

    // Passo 4: Logo ACIMA do card de Sandbox (Horizontal)
    if (currentStep.id === 'sandbox') {
      return {
        position: 'fixed',
        bottom: `${Math.max(windowSize.height - targetRect.top + pad, 20)}px`,
        left: `${targetRect.left}px`,
        width: `${targetRect.width}px`,
        zIndex: 50
      };
    }

    return {
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'min(92vw, 640px)',
      zIndex: 50
    };
  };

  const StepIcon = currentStep.icon;
  const DirectionIcon = currentStep.directionIcon;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none transition-all">
      
      {/* ========================================================================= */}
      {/* 1. SPOTLIGHT CUTOUT (100% Visibilidade no card ativo + 85% Escuro ao redor)*/}
      {/* ========================================================================= */}
      {targetRect && (
        <div 
          className="fixed transition-all duration-300 ease-out pointer-events-none rounded-3xl"
          style={{
            top: `${Math.max(targetRect.top - 8, 4)}px`,
            left: `${Math.max(targetRect.left - 8, 4)}px`,
            width: `${targetRect.width + 16}px`,
            height: `${targetRect.height + 16}px`,
            boxShadow: '0 0 0 9999px rgba(18, 14, 12, 0.85), 0 0 25px rgba(0, 0, 0, 0.5)',
            border: `2px solid ${currentStep.color}55`,
            zIndex: 48
          }}
        >
          {/* Target Spotlight Beacon Badge */}
          <div 
            className="absolute -top-3.5 left-6 px-3 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase shadow-xl flex items-center gap-1.5 backdrop-blur-md"
            style={{ 
              backgroundColor: `${currentStep.color}cc`, 
              color: '#1C1714',
              border: `1px solid ${currentStep.color}`
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#1C1714] animate-ping" />
            <span>📍 Em Foco: {currentStep.badgeLabel}</span>
          </div>
        </div>
      )}

      {/* Backdrop fallback when target rect is not yet ready */}
      {!targetRect && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm pointer-events-auto" />
      )}

      {/* ========================================================================= */}
      {/* 2. DYNAMICALLY MORPHING MODAL (Se molda ao lado ou acima/abaixo do card)  */}
      {/* ========================================================================= */}
      <div 
        className="pointer-events-auto transition-all duration-300 ease-out"
        style={getDynamicModalStyle()}
      >
        <div 
          className={`rounded-2xl sm:rounded-3xl p-5 sm:p-6 border-2 bg-[#221B17] backdrop-blur-md shadow-2xl flex text-kai-title transition-all ${
            isHorizontalLayout 
              ? 'flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4' 
              : 'flex-col gap-4.5'
          }`}
          style={{ 
            borderColor: currentStep.color,
            boxShadow: `0 25px 60px -15px rgba(0, 0, 0, 0.95), 0 0 35px ${currentStep.color}35`
          }}
        >
          
          {/* Horizontal Layout (Passo 1 & 4) */}
          {isHorizontalLayout ? (
            <>
              {/* Left Column in Horizontal Mode */}
              <div className="flex items-center gap-3 lg:w-[32%] flex-shrink-0 border-b lg:border-b-0 lg:border-r border-kai-border pb-3 lg:pb-0 lg:pr-4">
                <div 
                  className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg border flex-shrink-0"
                  style={{ 
                    backgroundColor: `${currentStep.color}20`, 
                    borderColor: `${currentStep.color}50`,
                    color: currentStep.color 
                  }}
                >
                  <StepIcon className="w-5 h-5" />
                </div>
                
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-kai-support font-semibold">
                      Passo {currentStep.stepNumber} de {TOUR_STEPS.length}
                    </span>
                    <span 
                      className="text-[9px] font-mono px-1.5 py-0.2 rounded border flex items-center gap-1 font-bold"
                      style={{ 
                        borderColor: `${currentStep.color}70`, 
                        color: currentStep.color,
                        backgroundColor: `${currentStep.color}15`
                      }}
                    >
                      <DirectionIcon className="w-2.5 h-2.5 animate-bounce" />
                      <span>{currentStep.positionBadge}</span>
                    </span>
                  </div>
                  <h3 className="text-sm font-serif font-bold text-kai-title truncate">
                    {currentStep.title}
                  </h3>
                  <p className="text-[11px] text-kai-accent truncate">
                    {currentStep.subtitle}
                  </p>
                </div>
              </div>

              {/* Center Column in Horizontal Mode */}
              <div className="flex-1 min-w-0 flex flex-col justify-center space-y-1.5 text-xs text-kai-title/95 px-1 lg:px-2">
                {currentStep.content.map((point, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <div 
                      className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: `${currentStep.color}25`, color: currentStep.color }}
                    >
                      <Check className="w-2 h-2" />
                    </div>
                    <span className="leading-tight text-[11px] sm:text-xs text-kai-title/90">{point}</span>
                  </div>
                ))}
              </div>

              {/* Right Column in Horizontal Mode */}
              <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-2.5 flex-shrink-0 border-t lg:border-t-0 lg:border-l border-kai-border pt-3 lg:pt-0 lg:pl-4">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {TOUR_STEPS.map((step, idx) => (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => setCurrentStepIndex(idx)}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${
                          idx === currentStepIndex ? 'w-5 bg-kai-accent' : 'w-1.5 bg-kai-surface hover:bg-kai-support'
                        }`}
                        title={`Ir para Passo ${idx + 1}`}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onOpenGuideModal) onOpenGuideModal();
                    }}
                    className="text-[11px] text-kai-support hover:text-kai-accent underline flex items-center gap-1 cursor-pointer ml-2"
                  >
                    <BookOpen className="w-3 h-3" />
                    <span className="hidden sm:inline">Manual</span>
                  </button>

                  <button
                    onClick={onClose}
                    className="text-kai-support hover:text-kai-title p-1 rounded-lg hover:bg-kai-surface/50 transition-all cursor-pointer ml-1"
                    title="Encerrar (ESC)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={currentStepIndex === 0}
                    className="px-3 py-1.5 rounded-xl border border-kai-border text-kai-title disabled:opacity-30 hover:bg-kai-surface/40 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Anterior</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-4 py-1.5 rounded-xl bg-kai-accent text-kai-accent-text hover:bg-[#EBD1B7] text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                  >
                    {currentStepIndex === TOUR_STEPS.length - 1 ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-kai-accent-text" />
                        <span>Concluir</span>
                      </>
                    ) : (
                      <>
                        <span>Próximo</span>
                        <ArrowRight className="w-3.5 h-3.5 text-kai-accent-text" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Vertical Card Layout (Passo 2 & 3 - Ao lado do card ativo) */
            <>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-kai-border">
                <div className="flex items-center gap-2.5">
                  <div 
                    className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg border flex-shrink-0"
                    style={{ 
                      backgroundColor: `${currentStep.color}20`, 
                      borderColor: `${currentStep.color}50`,
                      color: currentStep.color 
                    }}
                  >
                    <StepIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-kai-support font-semibold block">
                      Passo {currentStep.stepNumber} de {TOUR_STEPS.length} • Tutorial Assistido
                    </span>
                    <h3 className="text-sm sm:text-base font-serif font-bold text-kai-title">
                      {currentStep.title}
                    </h3>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="text-kai-support hover:text-kai-title p-1.5 rounded-xl hover:bg-kai-surface/50 transition-all cursor-pointer"
                  title="Encerrar tutorial assistido (ESC)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Subtitle & Direction Badge */}
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-kai-accent">
                  {currentStep.subtitle}
                </span>
                <span 
                  className="text-[10px] font-mono px-2 py-0.5 rounded-md border flex items-center gap-1 font-bold flex-shrink-0 shadow-sm"
                  style={{ 
                    borderColor: `${currentStep.color}70`, 
                    color: currentStep.color,
                    backgroundColor: `${currentStep.color}15`
                  }}
                >
                  <DirectionIcon className="w-3 h-3 animate-bounce" />
                  <span>{currentStep.positionBadge}</span>
                </span>
              </div>

              {/* Content Points */}
              <div className="space-y-2.5 text-xs text-kai-title/95">
                {currentStep.content.map((point, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <div 
                      className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: `${currentStep.color}25`, color: currentStep.color }}
                    >
                      <Check className="w-2.5 h-2.5" />
                    </div>
                    <span className="leading-relaxed">{point}</span>
                  </div>
                ))}
              </div>

              {/* Tip Box */}
              <div className="bg-[#181310] p-3 rounded-2xl border border-kai-border/70 flex items-start gap-2 text-[11px] text-kai-support">
                <Sparkles className="w-3.5 h-3.5 text-kai-accent flex-shrink-0 mt-0.5" />
                <span><strong>Dica:</strong> {currentStep.tip}</span>
              </div>

              {/* Footer Controls */}
              <div className="pt-3 border-t border-kai-border flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  {TOUR_STEPS.map((step, idx) => (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => setCurrentStepIndex(idx)}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        idx === currentStepIndex ? 'w-6 bg-kai-accent' : 'w-2 bg-kai-surface hover:bg-kai-support'
                      }`}
                      title={`Ir para Passo ${idx + 1}`}
                    />
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onOpenGuideModal) onOpenGuideModal();
                    }}
                    className="ml-2 text-[11px] text-kai-support hover:text-kai-accent underline flex items-center gap-1 cursor-pointer"
                  >
                    <BookOpen className="w-3 h-3" />
                    <span>Manual</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={currentStepIndex === 0}
                    className="px-3 py-1.5 rounded-xl border border-kai-border text-kai-title disabled:opacity-30 hover:bg-kai-surface/40 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Anterior</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-4 py-1.5 rounded-xl bg-kai-accent text-kai-accent-text hover:bg-[#EBD1B7] text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                  >
                    {currentStepIndex === TOUR_STEPS.length - 1 ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-kai-accent-text" />
                        <span>Concluir</span>
                      </>
                    ) : (
                      <>
                        <span>Próximo</span>
                        <ArrowRight className="w-3.5 h-3.5 text-kai-accent-text" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

        </div>
      </div>

    </div>
  );
}
