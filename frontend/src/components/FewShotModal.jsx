import React, { useState, useEffect } from 'react';
import { X, Sparkles, FileText, Code2, AlertCircle, CheckCircle, Save, Check } from 'lucide-react';

export default function FewShotModal({
  isOpen,
  onClose,
  onSave,
  exampleToEdit = null
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Consumo');
  const [rawText, setRawText] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (exampleToEdit) {
      setName(exampleToEdit.name || '');
      setCategory(exampleToEdit.category || 'Consumo');
      setRawText(exampleToEdit.rawText || '');
      setJsonText(JSON.stringify(exampleToEdit.expectedJson || {}, null, 2));
    } else {
      setName('');
      setCategory('Consumo');
      setRawText('');
      setJsonText(JSON.stringify({
        tipo_documento: "Conta de Consumo",
        tipo_conta: "Consumo > Energia Elétrica",
        fornecedor_nome: "",
        fornecedor_cnpj: "",
        condominio_nome: "",
        condominio_cnpj: "",
        valor_total: "0,00",
        valor_original: "0,00",
        valor_desconto: "0,00",
        valor_acrescimo: "0,00",
        data_vencimento: "2026-10-15",
        data_emissao: "2026-10-01",
        linha_digitavel: "",
        chave_pix: ""
      }, null, 2));
    }
    setJsonError(null);
    setSavedSuccess(false);
  }, [exampleToEdit, isOpen]);

  if (!isOpen) return null;

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
      setJsonError(null);
    } catch (err) {
      setJsonError("Sintaxe JSON inválida. Verifique aspas e vírgulas.");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Por favor, forneça um nome para o modelo/fornecedor.");
      return;
    }
    if (!rawText.trim()) {
      alert("Por favor, forneça o texto original da fatura/documento.");
      return;
    }

    let parsedJson = {};
    try {
      parsedJson = JSON.parse(jsonText);
    } catch (err) {
      setJsonError("Sintaxe JSON inválida. Não é possível salvar antes de corrigir.");
      return;
    }

    const payload = {
      id: exampleToEdit ? exampleToEdit.id : `fs-${Date.now()}`,
      name: name.trim(),
      category,
      active: exampleToEdit ? exampleToEdit.active : true,
      accuracy: exampleToEdit ? exampleToEdit.accuracy : 99.0,
      rawText: rawText.trim(),
      expectedJson: parsedJson
    };

    onSave(payload);
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-4xl rounded-3xl p-6 sm:p-8 border border-kai-accent/30 bg-[#251E1A] shadow-2xl relative max-h-[90vh] flex flex-col">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-kai-support hover:text-kai-title p-1.5 rounded-xl hover:bg-kai-surface/50 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-kai-border">
          <div className="w-11 h-11 rounded-2xl bg-kai-accent/20 text-kai-accent border border-kai-accent/30 flex items-center justify-center shadow-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-serif font-bold text-kai-title">
              {exampleToEdit ? 'Editar Exemplo Few-Shot' : 'Adicionar Novo Exemplo Few-Shot'}
            </h2>
            <p className="text-xs text-kai-support">
              Configure o par de calibração: Texto Bruto da Fatura vs. JSON Esperado de Extração.
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1">
          
          {/* Metadata: Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-kai-tag uppercase tracking-wider mb-1.5">
                Nome do Modelo / Fornecedor *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Enel Distribuição SP, Copasa Água..."
                className="w-full bg-[#1C1714] border border-kai-border rounded-xl px-3.5 py-2 text-xs text-kai-title focus:border-kai-accent outline-none placeholder:text-[#58493D]"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-kai-tag uppercase tracking-wider mb-1.5">
                Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#1C1714] border border-kai-border rounded-xl px-3 py-2 text-xs text-kai-title focus:border-kai-accent outline-none cursor-pointer"
              >
                <option value="Consumo">Consumo (Energia, Água, Gás)</option>
                <option value="Impostos">Impostos (DARF, GPS, IPTU)</option>
                <option value="Serviço">Serviço (Honorários, Portaria)</option>
                <option value="Contrato">Contrato (Elevadores, Manutenção)</option>
              </select>
            </div>
          </div>

          {/* Side-by-Side Editor (Raw Text vs Expected JSON) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
            
            {/* Left: Raw TXT Input */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-kai-tag uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-kai-accent" />
                  Arquivo TXT Original (Texto Bruto)
                </span>
                <span className="text-[10px] text-kai-support font-mono">
                  {rawText.length} caracteres
                </span>
              </div>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={12}
                placeholder="Cole aqui o conteúdo textual completo da fatura de exemplo..."
                className="w-full flex-1 bg-[#181310] border border-kai-border rounded-xl p-3 text-xs font-mono text-[#D5D0CB] focus:border-kai-accent outline-none resize-none leading-relaxed selection:bg-kai-accent/30"
                required
              />
            </div>

            {/* Right: Expected JSON Schema */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-kai-tag uppercase tracking-wider flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-kai-emerald" />
                  JSON de Extração Esperado
                </span>
                <button
                  type="button"
                  onClick={handleFormatJson}
                  className="text-[10px] text-kai-accent hover:underline font-mono"
                >
                  Formatar JSON
                </button>
              </div>
              <textarea
                value={jsonText}
                onChange={(e) => {
                  setJsonText(e.target.value);
                  setJsonError(null);
                }}
                rows={12}
                placeholder="JSON com os atributos extraídos..."
                className={`w-full flex-1 bg-[#181310] border rounded-xl p-3 text-xs font-mono text-emerald-400 focus:border-kai-accent outline-none resize-none leading-relaxed ${
                  jsonError ? 'border-red-500/60' : 'border-kai-border'
                }`}
                required
              />
              {jsonError && (
                <div className="mt-1.5 text-[11px] text-red-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                  {jsonError}
                </div>
              )}
            </div>

          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-kai-border flex items-center justify-between">
            <div className="text-[11px] text-kai-support">
              💡 Exemplos calibrados com boa cobertura aumentam o grounding verbatim para 99%+.
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-transparent border border-kai-border hover:bg-kai-surface/30 text-kai-title text-xs font-semibold transition-all"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-kai-accent text-kai-accent-text hover:bg-[#EBD1B7] text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer"
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-kai-accent-text" />
                    Salvo!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 text-kai-accent-text" />
                    {exampleToEdit ? 'Atualizar Exemplo' : 'Salvar Exemplo'}
                  </>
                )}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}
