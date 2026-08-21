import React, { useState } from 'react';
import { 
  X, 
  BookOpen, 
  Sparkles, 
  Layers, 
  Code2, 
  Zap, 
  ShieldCheck, 
  CheckCircle, 
  ArrowRight, 
  Download, 
  Sliders, 
  FileText,
  Play
} from 'lucide-react';

export default function StudioGuideModal({ isOpen, onClose, onStartTour }) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-4xl rounded-3xl p-6 sm:p-8 border border-kai-accent/30 bg-[#251E1A] shadow-2xl relative max-h-[90vh] flex flex-col">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-kai-support hover:text-kai-title p-1.5 rounded-xl hover:bg-kai-surface/50 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-5 border-b border-kai-border">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-kai-accent/20 text-kai-accent border border-kai-accent/30 flex items-center justify-center shadow-lg">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-kai-title">
                Manual & Guia de Uso: Estúdio de IA
              </h2>
              <p className="text-xs text-kai-support">
                Ambiente No-Code de calibração, engenharia de prompt e governança do KaiExtract.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              if (onStartTour) onStartTour();
            }}
            className="px-4 py-2 rounded-xl bg-kai-accent text-kai-accent-text hover:bg-[#EBD1B7] text-xs font-bold flex items-center gap-2 shadow-md transition-all self-start sm:self-auto cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current text-kai-accent-text" />
            <span>Iniciar Tour Assistido na Tela</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 border-b border-kai-border/60 text-xs scrollbar-thin">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'bg-kai-accent text-kai-accent-text font-bold shadow-sm'
                : 'text-kai-support hover:text-kai-title hover:bg-kai-surface/40'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Visão Geral</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fewshot')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'fewshot'
                ? 'bg-kai-accent text-kai-accent-text font-bold shadow-sm'
                : 'text-kai-support hover:text-kai-title hover:bg-kai-surface/40'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>1. Gestor Few-Shot</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'rules'
                ? 'bg-kai-accent text-kai-accent-text font-bold shadow-sm'
                : 'text-kai-support hover:text-kai-title hover:bg-kai-surface/40'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>2. Regras & Campos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sandbox')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'sandbox'
                ? 'bg-kai-accent text-kai-accent-text font-bold shadow-sm'
                : 'text-kai-support hover:text-kai-title hover:bg-kai-surface/40'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>3. Playground Sandbox</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('governance')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'governance'
                ? 'bg-kai-accent text-kai-accent-text font-bold shadow-sm'
                : 'text-kai-support hover:text-kai-title hover:bg-kai-surface/40'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>4. Governança & Cérebro</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-4 text-xs text-kai-title leading-relaxed">
          
          {/* Tab: Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-[#1C1714] p-4 rounded-2xl border border-kai-border">
                <h3 className="text-sm font-serif font-bold text-kai-accent mb-1.5">
                  Por que usar o Estúdio de IA?
                </h3>
                <p className="text-kai-body">
                  No mercado condominial brasileiro, novos layouts de faturas (concessionárias de água, energia, boletos bancários com PIX e DARFs) surgem constantemente. O Estúdio de IA permite calibrar a extração em minutos através de <strong>exemplos reais (Few-Shot)</strong> e <strong>regras em linguagem natural</strong>, sem precisar alterar código.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#181310] p-3.5 rounded-xl border border-kai-border">
                  <div className="flex items-center gap-2 text-kai-emerald font-semibold mb-1">
                    <CheckCircle className="w-4 h-4" />
                    <span>Calibração sem Código</span>
                  </div>
                  <p className="text-[11px] text-kai-support">
                    Ensine novos padrões e regras diretamente pela interface com feedback visual imediato.
                  </p>
                </div>

                <div className="bg-[#181310] p-3.5 rounded-xl border border-kai-border">
                  <div className="flex items-center gap-2 text-kai-accent font-semibold mb-1">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Source Grounding Rígido</span>
                  </div>
                  <p className="text-[11px] text-kai-support">
                    Garante que 100% dos dados extraídos sejam ancorados exatamente nos caracteres do documento original.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Few-Shot */}
          {activeTab === 'fewshot' && (
            <div className="space-y-3.5 animate-fadeIn">
              <h3 className="text-sm font-serif font-bold text-kai-accent">
                Como ensinar a IA com Exemplos Few-Shot
              </h3>
              <p className="text-kai-body">
                Modelos Few-Shot são o coração do aprendizado em poucas etapas do Gemini 1.5. Eles ensinam pelo exemplo perfeito:
              </p>

              <div className="space-y-2">
                <div className="bg-[#1C1714] p-3 rounded-xl border border-kai-border flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-kai-accent/20 text-kai-accent font-mono font-bold flex items-center justify-center flex-shrink-0 text-xs">
                    1
                  </span>
                  <div>
                    <strong className="text-kai-title">Clique em `+ Novo Exemplo`:</strong> Informe o nome do fornecedor (ex: Enel, Sabesp) e a categoria correspondente.
                  </div>
                </div>

                <div className="bg-[#1C1714] p-3 rounded-xl border border-kai-border flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-kai-accent/20 text-kai-accent font-mono font-bold flex items-center justify-center flex-shrink-0 text-xs">
                    2
                  </span>
                  <div>
                    <strong className="text-kai-title">Defina o Par (TXT vs JSON):</strong> Cole o texto bruto da fatura no painel esquerdo e o JSON com os campos esperados no painel direito.
                  </div>
                </div>

                <div className="bg-[#1C1714] p-3 rounded-xl border border-kai-border flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-kai-accent/20 text-kai-accent font-mono font-bold flex items-center justify-center flex-shrink-0 text-xs">
                    3
                  </span>
                  <div>
                    <strong className="text-kai-title">Controle por Toggle:</strong> Ative ou desative exemplos a qualquer momento sem deletá-los. Modelos ativos são injetados no prompt automaticamente.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Rules */}
          {activeTab === 'rules' && (
            <div className="space-y-3.5 animate-fadeIn">
              <h3 className="text-sm font-serif font-bold text-kai-accent">
                Calibração com Regras em Linguagem Natural
              </h3>
              <p className="text-kai-body">
                Use a área de texto estilizada para ditar regras explícitas que resolvem casos de borda e ambiguidades:
              </p>

              <div className="bg-[#181310] p-3.5 rounded-xl border border-kai-border font-mono text-[11px] text-[#D5D0CB] space-y-1">
                <div className="text-kai-accent font-semibold mb-1">Exemplos Práticos:</div>
                <div>• Quando o documento for da Neoenergia, ignore o CNPJ do banco emissor e extraia o da concessionária.</div>
                <div>• Se houver campo 'Multa/Juros' ou 'Encargos', incorpore no campo 'Acréscimos'.</div>
                <div>• Para faturas da SABESP, capture a Ligação/RGI como 'numero_documento'.</div>
              </div>

              <div className="bg-[#1C1714] p-3.5 rounded-xl border border-kai-border">
                <strong className="text-kai-title block mb-1">Obrigatoriedade de Campos (Validação Rígida):</strong>
                <p className="text-kai-body text-[11px]">
                  Marque os campos que não podem faltar (ex: Valor Total, Vencimento, CNPJ). Se um campo obrigatório não estiver presente no documento, o sistema alertará o operador antes da sincronização.
                </p>
              </div>
            </div>
          )}

          {/* Tab: Sandbox */}
          {activeTab === 'sandbox' && (
            <div className="space-y-3.5 animate-fadeIn">
              <h3 className="text-sm font-serif font-bold text-kai-accent">
                Playground de Teste em Tempo Real (Sandbox)
              </h3>
              <p className="text-kai-body">
                Teste e comprove a eficácia das suas regras antes de colocar o modelo em produção:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#1C1714] p-3.5 rounded-xl border border-kai-border">
                  <span className="font-semibold text-kai-accent block mb-1">1. Visualização de Grounding</span>
                  <p className="text-[11px] text-kai-support">
                    O painel esquerdo realça em cores as palavras exatas encontradas no documento original (amarelo para valores, verde para pagamentos, rosa para datas).
                  </p>
                </div>

                <div className="bg-[#1C1714] p-3.5 rounded-xl border border-kai-border">
                  <span className="font-semibold text-kai-emerald block mb-1">2. Comparativo Antes x Depois</span>
                  <p className="text-[11px] text-kai-support">
                    O painel direito compara os dados extraídos antes e depois da sua calibração, destacando com a tag `CALIBRADO` os campos que tiveram ganho de acurácia.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Governance */}
          {activeTab === 'governance' && (
            <div className="space-y-3.5 animate-fadeIn">
              <h3 className="text-sm font-serif font-bold text-kai-accent">
                Governança, Versões & Exportação do Cérebro
              </h3>
              <p className="text-kai-body">
                Mantenha controle total sobre a inteligência do KaiExtract:
              </p>

              <div className="space-y-2 text-[11px]">
                <div className="bg-[#1C1714] p-3 rounded-xl border border-kai-border">
                  <strong className="text-kai-title">Salvar Versão:</strong> Salva o estado atual (regras, campos e few-shots ativos) criando um novo ponto de restauração no histórico.
                </div>
                <div className="bg-[#1C1714] p-3 rounded-xl border border-kai-border">
                  <strong className="text-kai-title">Rollback (Restaurar Versão):</strong> Caso uma nova regra cause inconsistências, volte instantaneamente para uma versão anterior (ex: `v1.1 - Stable`).
                </div>
                <div className="bg-[#1C1714] p-3 rounded-xl border border-kai-border">
                  <strong className="text-kai-title">Exportar & Importar (.json):</strong> Baixe o arquivo do Cérebro para backup ou carregue configurações prontas compartilhadas pela equipe.
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="pt-4 mt-4 border-t border-kai-border flex items-center justify-between">
          <span className="text-[11px] text-kai-support">
            KaiExtract Studio • Versão de Calibração v1.2
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-kai-surface/50 hover:bg-kai-surface text-kai-title text-xs font-semibold border border-kai-border transition-all cursor-pointer"
          >
            Fechar Manual
          </button>
        </div>

      </div>
    </div>
  );
}
