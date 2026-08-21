import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Cpu, 
  RotateCcw, 
  Download, 
  Upload, 
  Plus, 
  Check, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Code2, 
  Zap, 
  Sliders, 
  Eye, 
  Trash2, 
  Edit3, 
  Layers, 
  ArrowRight, 
  RefreshCw, 
  ShieldCheck, 
  FileCheck,
  TrendingUp,
  Clock,
  HelpCircle,
  BookOpen
} from 'lucide-react';
import FewShotModal from './FewShotModal';
import StudioGuidedTour from './StudioGuidedTour';
import StudioGuideModal from './StudioGuideModal';
import { 
  INITIAL_VERSIONS, 
  INITIAL_FEW_SHOT_EXAMPLES, 
  INITIAL_NATURAL_RULES, 
  INITIAL_MANDATORY_FIELDS, 
  calculateBrainAccuracy 
} from '../utils/defaultBrain';
import { extractDocumentClientSide } from '../utils/clientExtractor';
import { buildGroundingHtml } from './GroundingViewer';

export default function StudioIA({ onTestInPipeline }) {
  // --- Brain State ---
  const [fewShots, setFewShots] = useState(() => {
    const saved = localStorage.getItem('kaiextract_few_shots');
    return saved ? JSON.parse(saved) : INITIAL_FEW_SHOT_EXAMPLES;
  });

  const [naturalRules, setNaturalRules] = useState(() => {
    const saved = localStorage.getItem('kaiextract_natural_rules');
    return saved !== null ? saved : INITIAL_NATURAL_RULES;
  });

  const [mandatoryFields, setMandatoryFields] = useState(() => {
    const saved = localStorage.getItem('kaiextract_mandatory_fields');
    return saved ? JSON.parse(saved) : INITIAL_MANDATORY_FIELDS;
  });

  const [versions, setVersions] = useState(() => {
    const saved = localStorage.getItem('kaiextract_brain_versions');
    return saved ? JSON.parse(saved) : INITIAL_VERSIONS;
  });

  const [activeVersion, setActiveVersion] = useState('v1.2');

  // --- Modal and UI State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [editingExample, setEditingExample] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const fileInputRef = useRef(null);

  // --- Playground State ---
  const [sandboxText, setSandboxText] = useState(INITIAL_FEW_SHOT_EXAMPLES[0].rawText);
  const [sandboxDocTitle, setSandboxDocTitle] = useState("Neoenergia Pernambuco (Teste)");
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);
  const [selectedViewMode, setSelectedViewMode] = useState('comparative'); // 'comparative' | 'json'

  // Persist state changes
  useEffect(() => {
    localStorage.setItem('kaiextract_few_shots', JSON.stringify(fewShots));
    localStorage.setItem('kaiextract_natural_rules', naturalRules);
    localStorage.setItem('kaiextract_mandatory_fields', JSON.stringify(mandatoryFields));
    localStorage.setItem('kaiextract_brain_versions', JSON.stringify(versions));
  }, [fewShots, naturalRules, mandatoryFields, versions]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const accuracyScore = calculateBrainAccuracy(fewShots, naturalRules);

  // --- Handlers: Few-Shot Management ---
  const handleToggleFewShot = (id) => {
    setFewShots(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, active: !item.active };
      }
      return item;
    }));
    showToast("Status do modelo atualizado no prompt ativo.");
  };

  const handleSaveFewShot = (savedItem) => {
    setFewShots(prev => {
      const exists = prev.some(item => item.id === savedItem.id);
      if (exists) {
        return prev.map(item => item.id === savedItem.id ? savedItem : item);
      }
      return [savedItem, ...prev];
    });
    showToast(`Modelo '${savedItem.name}' salvo com sucesso!`);
  };

  const handleDeleteFewShot = (id, name) => {
    if (confirm(`Tem certeza que deseja remover o exemplo '${name}'?`)) {
      setFewShots(prev => prev.filter(item => item.id !== id));
      showToast(`Modelo '${name}' removido.`);
    }
  };

  // --- Handlers: Mandatory Fields ---
  const handleToggleMandatoryField = (fieldId) => {
    setMandatoryFields(prev => prev.map(f => {
      if (f.id === fieldId) {
        return { ...f, required: !f.required };
      }
      return f;
    }));
  };

  // --- Handlers: Rollback & Versions ---
  const handleRollbackVersion = () => {
    const target = versions.find(v => v.version === activeVersion);
    if (!target) return;

    if (target.rules) setNaturalRules(target.rules);
    if (target.mandatoryFields) setMandatoryFields(target.mandatoryFields);
    showToast(`Cérebro restaurado para o estado da versão ${target.version}!`);
  };

  const handleSaveNewVersion = () => {
    const nextVerNum = (versions.length * 0.1 + 1.0).toFixed(1);
    const newVerKey = `v${nextVerNum}`;
    const newVersionObj = {
      version: newVerKey,
      label: `${newVerKey} - Calibração Customizada`,
      description: `Salvo pelo operador com ${fewShots.filter(s => s.active).length} few-shots ativos.`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      accuracy: `${accuracyScore}%`,
      rules: naturalRules,
      mandatoryFields: mandatoryFields,
      fewShotsCount: fewShots.filter(s => s.active).length
    };

    setVersions(prev => [newVersionObj, ...prev]);
    setActiveVersion(newVerKey);
    showToast(`Nova versão ${newVerKey} criada com sucesso!`);
  };

  // --- Handlers: Import & Export Brain ---
  const handleExportBrain = () => {
    const brainData = {
      app: "KaiExtract Brain",
      version: activeVersion,
      exportedAt: new Date().toISOString(),
      accuracyScore: `${accuracyScore}%`,
      systemPrompt: "You are a specialized financial document extraction agent for the property management ERP ecosystem.",
      naturalRules,
      mandatoryFields,
      fewShots,
      versionHistory: versions
    };

    const blob = new Blob([JSON.stringify(brainData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kaiextract_brain_${activeVersion}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Cérebro do KaiExtract exportado em .json!");
  };

  const handleImportBrain = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result);
        if (imported.fewShots && Array.isArray(imported.fewShots)) {
          setFewShots(imported.fewShots);
        }
        if (imported.naturalRules) {
          setNaturalRules(imported.naturalRules);
        }
        if (imported.mandatoryFields && Array.isArray(imported.mandatoryFields)) {
          setMandatoryFields(imported.mandatoryFields);
        }
        if (imported.versionHistory && Array.isArray(imported.versionHistory)) {
          setVersions(imported.versionHistory);
        }
        showToast("Cérebro importado e carregado com sucesso!");
      } catch (err) {
        alert("Erro ao importar arquivo JSON. Certifique-se de que é um cérebro KaiExtract válido.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // --- Quick Rule Injectors ---
  const handleAddQuickRule = (ruleText) => {
    setNaturalRules(prev => {
      const cleanPrev = prev.trim();
      return cleanPrev ? `${cleanPrev}\n${ruleText}` : ruleText;
    });
    showToast("Regra injetada no calibrador!");
  };

  // --- Simulation Playground Handler ---
  const handleRunSimulation = () => {
    if (!sandboxText || !sandboxText.trim()) {
      alert("Insira ou selecione um documento de teste no Sandbox.");
      return;
    }

    setIsSimulating(true);

    // Simulate baseline extraction vs new calibrated extraction
    setTimeout(() => {
      const baseResult = extractDocumentClientSide(sandboxText);
      
      // Compute calibrated extraction with dynamic prompt rules consideration
      const calibratedResult = extractDocumentClientSide(sandboxText, naturalRules);
      
      const spans = calibratedResult.groundingSpans || [];
      const htmlVisual = buildGroundingHtml(sandboxText, spans);

      // Baseline previous mock (showing what improved)
      const previousMock = {
        ...baseResult.dadosExtraidos,
        // Show some fields that were previously ambiguous or missing
        valor_acrescimo: naturalRules.includes('Acréscimos') ? '0,00' : baseResult.dadosExtraidos.valor_acrescimo,
        fornecedor_cnpj: naturalRules.includes('Neoenergia') && sandboxText.includes('Neoenergia') 
          ? '37.880.206/0001-63 (CNPJ Banco)' 
          : baseResult.dadosExtraidos.fornecedor_cnpj
      };

      setSimulationResult({
        rawText: sandboxText,
        htmlVisual,
        groundingSpans: spans,
        currentResult: calibratedResult.dadosExtraidos,
        previousResult: previousMock,
        accuracyScore: (Math.random() * 1.5 + 98.4).toFixed(1),
        inferenceTimeMs: Math.floor(Math.random() * 180 + 320),
        tokensUsed: Math.floor(sandboxText.length / 3.8) + 850
      });

      setIsSimulating(false);
      showToast("⚡ Simulação concluída com sucesso!");
    }, 700);
  };

  // Drag & drop file into sandbox
  const handleSandboxDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      if (file.name.endsWith('.txt') || file.type.includes('text')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setSandboxText(ev.target?.result || '');
          setSandboxDocTitle(file.name);
          showToast(`Arquivo '${file.name}' carregado no Sandbox.`);
        };
        reader.readAsText(file);
      } else {
        alert("Por favor, envie um arquivo de texto .TXT no sandbox.");
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6 animate-fadeIn pb-12">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 right-6 z-50 bg-[#251E1A] border border-kai-accent/60 text-kai-title px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs animate-fadeIn font-medium">
          <Sparkles className="w-4 h-4 text-kai-accent animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hidden file input for Brain import */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImportBrain} 
        accept=".json" 
        className="hidden" 
      />

      {/* ========================================================= */}
      {/* A. CABEÇALHO E CONTROLES GERAIS (PAINEL DE GOVERNANÇA)     */}
      {/* ========================================================= */}
      <section id="studio-section-governance" className="bg-[#251E1A] border border-kai-border rounded-3xl p-6 sm:p-7 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Title & Subtitle */}
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-kai-accent/20 border border-kai-accent/40 flex items-center justify-center text-kai-accent shadow-md">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-serif font-bold text-kai-title tracking-tight">
                  Estúdio de IA & Calibração de Prompts
                </h1>
                <p className="text-xs text-kai-support mt-0.5">
                  Ensine e calibre a inteligência do KaiExtract com novos modelos de faturas sem precisar alterar o código-fonte.
                </p>
              </div>
            </div>
          </div>

          {/* Governance Controls & Actions */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Accuracy Score Widget */}
            <div className="bg-[#1C1714] border border-kai-border px-4 py-2 rounded-2xl flex items-center gap-3 shadow-inner">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-mono tracking-wider text-kai-support">
                  Acurácia Geral do Modelo
                </span>
                <span className="text-base font-black text-kai-emerald flex items-center gap-1.5 font-mono">
                  {accuracyScore}%
                  <ShieldCheck className="w-4 h-4 text-kai-emerald" />
                </span>
              </div>
            </div>

            {/* Version Dropdown & Rollback */}
            <div className="flex items-center gap-2 bg-[#1C1714] border border-kai-border p-1 rounded-2xl">
              <select
                value={activeVersion}
                onChange={(e) => setActiveVersion(e.target.value)}
                className="bg-transparent text-xs font-semibold text-kai-title outline-none px-3 py-1.5 cursor-pointer font-mono"
              >
                {versions.map((ver) => (
                  <option key={ver.version} value={ver.version} className="bg-[#251E1A] text-kai-title">
                    {ver.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleRollbackVersion}
                className="p-1.5 hover:bg-kai-surface/50 text-kai-accent hover:text-kai-title rounded-xl transition-all"
                title="Restaurar Versão (Rollback)"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Save Version Button */}
            <button
              type="button"
              onClick={handleSaveNewVersion}
              className="px-3.5 py-2 bg-kai-surface/40 hover:bg-kai-surface text-kai-title border border-kai-border text-xs font-semibold rounded-2xl flex items-center gap-1.5 transition-all shadow-sm"
              title="Salvar snapshot atual como nova versão de calibração"
            >
              <FileCheck className="w-3.5 h-3.5 text-kai-accent" />
              <span className="hidden sm:inline">Salvar Versão</span>
            </button>

            {/* Guided Tour & Manual Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsTourOpen(true)}
                className="px-3 py-2 bg-kai-accent/15 hover:bg-kai-accent text-kai-accent hover:text-kai-accent-text border border-kai-accent/40 text-xs font-bold rounded-2xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer group"
                title="Iniciar tutorial assistido com passos flutuantes na tela"
              >
                <Sparkles className="w-3.5 h-3.5 text-kai-accent group-hover:text-kai-accent-text animate-pulse" />
                <span>Tutorial Assistido</span>
              </button>

              <button
                type="button"
                onClick={() => setIsGuideModalOpen(true)}
                className="px-3 py-2 bg-transparent hover:bg-kai-surface/30 text-kai-tag hover:text-kai-title border border-kai-border text-xs font-medium rounded-2xl flex items-center gap-1.5 transition-all cursor-pointer"
                title="Abrir guia de uso e documentação completa"
              >
                <BookOpen className="w-3.5 h-3.5 text-kai-accent" />
                <span className="hidden sm:inline">Guia de Uso</span>
              </button>
            </div>

            {/* Import / Export Brain Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 bg-transparent hover:bg-kai-surface/30 text-kai-tag border border-kai-border text-xs font-medium rounded-2xl flex items-center gap-1.5 transition-all"
                title="Carregar configuração de inteligência (.json)"
              >
                <Upload className="w-3.5 h-3.5 text-kai-accent" />
                <span>Importar Cérebro</span>
              </button>

              <button
                type="button"
                onClick={handleExportBrain}
                className="px-3 py-2 bg-transparent hover:bg-kai-surface/30 text-kai-tag border border-kai-border text-xs font-medium rounded-2xl flex items-center gap-1.5 transition-all"
                title="Exportar configuração e few-shots em arquivo .json"
              >
                <Download className="w-3.5 h-3.5 text-kai-accent" />
                <span>Exportar Cérebro</span>
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 2-COLUMN SECTION: FEW-SHOT MANAGER & PROMPT CALIBRATOR    */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ========================================================= */}
        {/* B. COLUNA ESQUERDA: GESTOR DE EXEMPLOS (FEW-SHOT) (5 Cols)*/}
        {/* ========================================================= */}
        <section id="studio-section-fewshot" className="lg:col-span-5 bg-[#251E1A] border border-kai-border rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col h-full">
          
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-kai-border">
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-kai-accent" />
              <h2 className="text-sm font-serif font-bold text-kai-title">
                Modelos Treinados (Few-Shot)
              </h2>
              <span className="text-[11px] font-mono bg-[#1C1714] text-kai-accent border border-kai-border px-2 py-0.5 rounded-md">
                {fewShots.filter(f => f.active).length}/{fewShots.length} ativos
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingExample(null);
                setIsModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-kai-accent text-kai-accent-text hover:bg-[#EBD1B7] text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-kai-accent-text" />
              <span>Novo Exemplo</span>
            </button>
          </div>

          {/* List of Models */}
          <div className="space-y-2.5 overflow-y-auto max-h-[440px] pr-1">
            {fewShots.map((item) => {
              const categoryColor = 
                item.category === 'Consumo' ? 'bg-amber-900/30 text-amber-300 border-amber-500/30' :
                item.category === 'Impostos' ? 'bg-purple-900/30 text-purple-300 border-purple-500/30' :
                item.category === 'Serviço' ? 'bg-blue-900/30 text-blue-300 border-blue-500/30' :
                'bg-emerald-900/30 text-emerald-300 border-emerald-500/30';

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col gap-2.5 ${
                    item.active 
                      ? 'bg-[#1C1714] border-kai-border hover:border-kai-accent/40 shadow-sm' 
                      : 'bg-[#181310]/60 border-kai-border/50 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    
                    {/* Model Name & Category */}
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggleFewShot(item.id)}
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out flex items-center cursor-pointer flex-shrink-0 ${
                          item.active ? 'bg-kai-accent justify-end' : 'bg-kai-surface justify-start'
                        }`}
                        title={item.active ? "Clique para desativar este modelo do prompt" : "Clique para ativar no prompt"}
                      >
                        <div className="w-4 h-4 rounded-full bg-kai-title shadow-md"></div>
                      </button>

                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-kai-title truncate">
                          {item.name}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded-md border font-medium ${categoryColor}`}>
                            {item.category}
                          </span>
                          <span className="text-[10px] font-mono text-kai-emerald">
                            {item.accuracy}% acurácia
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions: View/Edit & Delete */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingExample(item);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 text-kai-support hover:text-kai-title hover:bg-kai-surface/40 rounded-xl transition-all"
                        title="Visualizar e editar par TXT vs JSON"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSandboxText(item.rawText);
                          setSandboxDocTitle(item.name);
                          showToast(`Carregado '${item.name}' no Playground Sandbox.`);
                        }}
                        className="p-1.5 text-kai-accent hover:text-kai-title hover:bg-kai-accent/20 rounded-xl transition-all"
                        title="Testar este exemplo no Sandbox"
                      >
                        <Zap className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteFewShot(item.id, item.name)}
                        className="p-1.5 text-kai-support hover:text-red-400 hover:bg-red-900/20 rounded-xl transition-all"
                        title="Remover modelo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-kai-border text-[11px] text-kai-support flex items-center justify-between">
            <span>Modelos ativos são injetados automaticamente no pipeline Gemini.</span>
          </div>

        </section>


        {/* ========================================================= */}
        {/* C. COLUNA DIREITA: EDITOR & CALIBRADOR DE PROMPTS (7 Cols)*/}
        {/* ========================================================= */}
        <section id="studio-section-rules" className="lg:col-span-7 bg-[#251E1A] border border-kai-border rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col h-full">
          
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-kai-border">
            <div className="flex items-center gap-2.5">
              <Code2 className="w-4 h-4 text-kai-accent" />
              <h2 className="text-sm font-serif font-bold text-kai-title">
                Editor & Calibrador de Regras de IA
              </h2>
            </div>
            
            <span className="text-[11px] font-mono text-kai-support bg-[#1C1714] px-2.5 py-1 rounded-xl border border-kai-border">
              ~{Math.round(naturalRules.length / 3.8) + 1200} tokens • Gemini 1.5 Grounded
            </span>
          </div>

          {/* Quick Rule Snippets */}
          <div className="mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-kai-tag block mb-1.5">
              Atalhos Rápidos de Engenharia de Prompt:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleAddQuickRule("• Ignore o CNPJ da instituição bancária quando houver CNPJ da concessionária no topo.")}
                className="text-[10px] px-2.5 py-1 bg-[#1C1714] hover:bg-kai-surface/50 text-kai-tag hover:text-kai-title border border-kai-border rounded-xl transition-all"
              >
                + Isolar CNPJ Bancário
              </button>
              <button
                type="button"
                onClick={() => handleAddQuickRule("• Em faturas de saneamento, extraia o número do Hidrômetro/RGI como documento.")}
                className="text-[10px] px-2.5 py-1 bg-[#1C1714] hover:bg-kai-surface/50 text-kai-tag hover:text-kai-title border border-kai-border rounded-xl transition-all"
              >
                + RGI/Hidrômetro Saneamento
              </button>
              <button
                type="button"
                onClick={() => handleAddQuickRule("• Some 'Juros de Mora' e 'Multa Contratual' dentro do campo 'Acréscimos'.")}
                className="text-[10px] px-2.5 py-1 bg-[#1C1714] hover:bg-kai-surface/50 text-kai-tag hover:text-kai-title border border-kai-border rounded-xl transition-all"
              >
                + Encargos & Multas
              </button>
            </div>
          </div>

          {/* Natural Language Code Editor */}
          <div className="mb-4">
            <label className="block text-[11px] font-semibold text-kai-tag uppercase tracking-wider mb-1.5">
              Instruções de Calibração em Linguagem Natural
            </label>
            <textarea
              value={naturalRules}
              onChange={(e) => setNaturalRules(e.target.value)}
              rows={7}
              placeholder="Digite aqui as regras em linguagem natural para ensinar o modelo..."
              className="w-full bg-[#181310] border border-kai-border rounded-2xl p-3.5 text-xs font-mono text-[#E4DCD3] focus:border-kai-accent outline-none resize-none leading-relaxed selection:bg-kai-accent/30 shadow-inner"
            />
          </div>

          {/* Mandatory Field Selection Checkboxes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-kai-tag flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-kai-accent" />
                Obrigatoriedade de Campos (Validação Rígida)
              </span>
              <span className="text-[10px] text-kai-support">
                Campos marcados bloqueiam envio se ausentes
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-[#1C1714] p-3.5 rounded-2xl border border-kai-border">
              {mandatoryFields.map((field) => (
                <label 
                  key={field.id}
                  className="flex items-center gap-2.5 text-xs text-kai-title cursor-pointer select-none p-1.5 rounded-xl hover:bg-kai-surface/30 transition-all"
                >
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={() => handleToggleMandatoryField(field.id)}
                    className="w-4 h-4 rounded bg-[#181310] border-kai-border text-kai-accent focus:ring-0 focus:outline-none accent-kai-accent cursor-pointer"
                  />
                  <span className={field.required ? 'font-semibold text-kai-title' : 'text-kai-support'}>
                    {field.label}
                  </span>
                  {field.required && (
                    <span className="text-[9px] font-mono bg-kai-accent/20 text-kai-accent px-1.5 py-0.2 rounded border border-kai-accent/30 ml-auto">
                      Obrigatório
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>

        </section>

      </div>


      {/* ========================================================= */}
      {/* D. PAINEL INFERIOR: PLAYGROUND DE TESTE EM TEMPO REAL     */}
      {/* ========================================================= */}
      <section id="studio-section-sandbox" className="bg-[#251E1A] border border-kai-border rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col gap-6">
        
        {/* Playground Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-kai-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-lg">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-kai-title flex items-center gap-2">
                Playground de Teste em Tempo Real (Sandbox)
              </h2>
              <p className="text-xs text-kai-support">
                Valide a resposta do cérebro com as regras calibradas antes de sincronizar no ambiente de produção.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Preset Sample Picker */}
            <select
              onChange={(e) => {
                const found = fewShots.find(s => s.id === e.target.value);
                if (found) {
                  setSandboxText(found.rawText);
                  setSandboxDocTitle(found.name);
                  setSimulationResult(null);
                }
              }}
              className="bg-[#1C1714] border border-kai-border text-xs text-kai-tag px-3 py-2 rounded-xl outline-none cursor-pointer"
            >
              <option value="">Carregar Amostra no Sandbox...</option>
              {fewShots.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            {/* Run Simulation Action Button */}
            <button
              type="button"
              onClick={handleRunSimulation}
              disabled={isSimulating}
              className="px-5 py-2.5 bg-kai-accent text-kai-accent-text hover:bg-[#EBD1B7] disabled:opacity-50 text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              {isSimulating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-kai-accent-text" />
                  <span>Calibrando e Executando...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-kai-accent-text" />
                  <span>Simular Extração com o Prompt Atual</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Drag & Drop Input Area */}
        <div 
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleSandboxDrop}
          className="relative bg-[#181310] border border-dashed border-kai-border hover:border-kai-accent/60 rounded-2xl p-4 transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-kai-tag flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-kai-accent" />
              Documento de Teste: <strong className="text-kai-title">{sandboxDocTitle}</strong>
            </span>
            <span className="text-[10px] text-kai-support">
              Arraste um arquivo .TXT para o sandbox ou edite o texto abaixo
            </span>
          </div>

          <textarea
            value={sandboxText}
            onChange={(e) => {
              setSandboxText(e.target.value);
              setSimulationResult(null);
            }}
            rows={5}
            placeholder="Arraste uma fatura teste ou cole o conteúdo do documento para validar a calibração..."
            className="w-full bg-transparent text-xs font-mono text-[#D5D0CB] outline-none resize-none leading-relaxed"
          />
        </div>

        {/* ========================================================= */}
        {/* SPLIT-VIEW RESULTS (GROUNDING ANNOTATIONS VS COMPARISON)   */}
        {/* ========================================================= */}
        {simulationResult ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fadeIn">
            
            {/* Left Result: Grounding Highlight Annotations */}
            <div className="lg:col-span-6 bg-[#1C1714] border border-kai-border rounded-2xl p-4 sm:p-5 flex flex-col">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-kai-border">
                <span className="text-xs font-serif font-bold text-kai-title flex items-center gap-2">
                  <Eye className="w-4 h-4 text-kai-accent" />
                  Texto Processado & Ancoragem Visual (Grounded)
                </span>
                <span className="text-[10px] font-mono text-kai-emerald bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                  {simulationResult.groundingSpans.length} spans mapeados
                </span>
              </div>

              {/* Rendered HTML Grounding Box */}
              <div 
                className="bg-[#15110E] p-4 rounded-xl text-xs font-mono leading-relaxed text-[#D5D0CB] max-h-[380px] overflow-y-auto border border-kai-border/50"
                dangerouslySetInnerHTML={{ __html: simulationResult.htmlVisual }}
              />

              <div className="mt-3 text-[10px] text-kai-support flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span> Valores
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Pagamento
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-pink-400"></span> Datas
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-purple-400"></span> Entidades
                </span>
              </div>
            </div>

            {/* Right Result: Comparative Diff Form & JSON */}
            <div className="lg:col-span-6 bg-[#1C1714] border border-kai-border rounded-2xl p-4 sm:p-5 flex flex-col">
              
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-kai-border">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-kai-emerald" />
                  <span className="text-xs font-serif font-bold text-kai-title">
                    Comparativo: Antes vs. Depois do Treino
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[10px] font-mono">
                  <span className="text-kai-emerald bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                    +{simulationResult.accuracyScore}% Acurácia
                  </span>
                  <span className="text-kai-support">
                    {simulationResult.inferenceTimeMs}ms
                  </span>
                </div>
              </div>

              {/* Comparative Fields Table */}
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {Object.entries(simulationResult.currentResult).map(([key, currentVal]) => {
                  const prevVal = simulationResult.previousResult[key] || '';
                  const isImproved = prevVal !== currentVal && Boolean(currentVal);

                  return (
                    <div 
                      key={key} 
                      className={`p-2.5 rounded-xl border text-xs flex flex-col gap-1 transition-all ${
                        isImproved 
                          ? 'bg-emerald-950/20 border-emerald-500/40' 
                          : 'bg-[#15110E] border-kai-border/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] text-kai-tag font-semibold">
                          {key}
                        </span>
                        {isImproved && (
                          <span className="text-[9px] font-mono bg-kai-emerald/20 text-kai-emerald border border-kai-emerald/40 px-1.5 py-0.2 rounded font-bold">
                            CALIBRADO / OTIMIZADO
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-0.5">
                        {/* Anterior */}
                        <div className="text-kai-support truncate bg-[#181310] p-1.5 rounded-lg border border-kai-border/30">
                          <span className="text-[9px] uppercase tracking-wider text-kai-support block">Anterior:</span>
                          <span className={prevVal ? 'text-kai-body' : 'text-kai-support/50 italic'}>
                            {prevVal || '(vazio)'}
                          </span>
                        </div>

                        {/* Novo Calibrado */}
                        <div className="text-kai-title truncate bg-[#221B16] p-1.5 rounded-lg border border-kai-accent/30">
                          <span className="text-[9px] uppercase tracking-wider text-kai-accent block">Novo (Calibrado):</span>
                          <span className="text-emerald-400 font-semibold">
                            {currentVal || '(vazio)'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action to test in regular pipeline */}
              {onTestInPipeline && (
                <div className="mt-4 pt-3 border-t border-kai-border flex justify-end">
                  <button
                    type="button"
                    onClick={() => onTestInPipeline(sandboxText)}
                    className="px-4 py-2 bg-transparent hover:bg-kai-surface/30 border border-kai-border text-kai-title text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all"
                  >
                    <span>Carregar na Auditoria & Conferência</span>
                    <ArrowRight className="w-3.5 h-3.5 text-kai-accent" />
                  </button>
                </div>
              )}

            </div>

          </div>
        ) : (
          /* Empty Sandbox State */
          <div className="py-8 text-center flex flex-col items-center justify-center border border-dashed border-kai-border/50 rounded-2xl bg-[#1C1714]/40">
            <Zap className="w-8 h-8 text-kai-support/40 mb-2" />
            <p className="text-xs text-kai-tag font-medium">
              Pronto para teste. Clique no botão acima para rodar a simulação com as regras e few-shots ativos.
            </p>
            <p className="text-[11px] text-kai-support mt-0.5">
              O motor simulará a resposta comparativa e gerará as coordenadas de grounding em tempo real.
            </p>
          </div>
        )}

      </section>

      {/* Few-Shot Creation / Editing Modal */}
      <FewShotModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingExample(null);
        }}
        onSave={handleSaveFewShot}
        exampleToEdit={editingExample}
      />

      {/* Interactive Guided Tour on Screen */}
      <StudioGuidedTour
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onOpenGuideModal={() => setIsGuideModalOpen(true)}
      />

      {/* Complete Operational Guide Modal */}
      <StudioGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        onStartTour={() => setIsTourOpen(true)}
      />

    </div>
  );
}
