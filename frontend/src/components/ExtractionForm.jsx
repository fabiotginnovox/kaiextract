import React, { useState, useMemo, useRef } from 'react';
import { 
  Building2, 
  Tag, 
  UserCheck, 
  DollarSign, 
  Calendar, 
  Barcode, 
  QrCode, 
  Copy, 
  Check, 
  Send, 
  RotateCcw,
  MapPin,
  Percent,
  FileText,
  Sparkles,
  RefreshCw,
  X,
  MessageSquare,
  Loader2
} from 'lucide-react';

const CATEGORIAS_PADRAO = [
  "Consumo > Energia Elétrica",
  "Consumo > Água e Esgoto",
  "Consumo > Gás",
  "Consumo > Telecomunicações",
  "Contratos > Elevadores",
  "Contratos > Segurança e Portaria",
  "Contratos > Manutenção Predial",
  "Impostos > IPTU",
  "Impostos > Taxas e Tributos",
  "Serviços > Manutenção/Obras",
  "Serviços > Honorários e Outros"
];

export const GROUNDING_CONFIG = {
  condominio: {
    color: '#38BDF8', // Sky / Cyan
    bg: 'rgba(56, 189, 248, 0.15)',
    glow: 'rgba(56, 189, 248, 0.25)',
  },
  fornecedor: {
    color: '#A78BFA', // Purple / Violet
    bg: 'rgba(167, 139, 250, 0.15)',
    glow: 'rgba(167, 139, 250, 0.25)',
  },
  fornecedor_cnpj: {
    color: '#A78BFA', // Purple / Violet
    bg: 'rgba(167, 139, 250, 0.12)',
    glow: 'rgba(167, 139, 250, 0.2)',
  },
  endereco: {
    color: '#C084FC', // Lavender
    bg: 'rgba(192, 132, 252, 0.15)',
    glow: 'rgba(192, 132, 252, 0.25)',
  },
  valor: {
    color: '#FBBF24', // Amber / Gold / Yellow
    bg: 'rgba(251, 191, 36, 0.15)',
    glow: 'rgba(251, 191, 36, 0.25)',
  },
  vencimento: {
    color: '#F472B6', // Pink / Magenta
    bg: 'rgba(244, 114, 182, 0.15)',
    glow: 'rgba(244, 114, 182, 0.25)',
  },
  emissao: {
    color: '#818CF8', // Indigo
    bg: 'rgba(129, 140, 248, 0.15)',
    glow: 'rgba(129, 140, 248, 0.25)',
  },
  num_doc: {
    color: '#60A5FA', // Sky / Blue
    bg: 'rgba(96, 165, 250, 0.15)',
    glow: 'rgba(96, 165, 250, 0.25)',
  },
  protocolo_autorizacao: {
    color: '#60A5FA', // Sky / Blue
    bg: 'rgba(96, 165, 250, 0.15)',
    glow: 'rgba(96, 165, 250, 0.25)',
  },
  chave_acesso: {
    color: '#38BDF8', // Cyan / Sky
    bg: 'rgba(56, 189, 248, 0.15)',
    glow: 'rgba(56, 189, 248, 0.25)',
  },
  codigo_instalacao: {
    color: '#A78BFA', // Purple
    bg: 'rgba(167, 139, 250, 0.15)',
    glow: 'rgba(167, 139, 250, 0.25)',
  },
  nosso_numero: {
    color: '#38BDF8', // Sky
    bg: 'rgba(56, 189, 248, 0.15)',
    glow: 'rgba(56, 189, 248, 0.25)',
  },
  condominio_cnpj: {
    color: '#0EA5E9', // Cyan
    bg: 'rgba(14, 165, 233, 0.15)',
    glow: 'rgba(14, 165, 233, 0.25)',
  },
  juros: {
    color: '#FB923C', // Orange
    bg: 'rgba(251, 146, 60, 0.15)',
    glow: 'rgba(251, 146, 60, 0.25)',
  },
  multa: {
    color: '#F87171', // Coral / Red
    bg: 'rgba(248, 113, 113, 0.15)',
    glow: 'rgba(248, 113, 113, 0.25)',
  },
  linha: {
    color: '#34D399', // Emerald
    bg: 'rgba(52, 211, 153, 0.15)',
    glow: 'rgba(52, 211, 153, 0.25)',
  },
  pix: {
    color: '#2DD4BF', // Teal
    bg: 'rgba(45, 212, 191, 0.15)',
    glow: 'rgba(45, 212, 191, 0.25)',
  }
};

export const GroundingColorContext = React.createContext({});

/**
 * MarkedField Component
 * Renders an input field where extracted/grounded values display an inline marker
 * with bottom highlight line and glowing background in the exact matching grounding color,
 * preserving high contrast (WCAG AAA compliant text) and full editability.
 */
function MarkedField({
  label,
  value,
  onChange,
  config,
  placeholder = '',
  rightElement = null,
  isDate = false,
  fullWidthPill = false,
  className = '',
  inputClassName = '',
  onFocusField = null,
  fieldName = '',
  customConfig = null
}) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);
  const spanColorMap = React.useContext(GroundingColorContext);

  const activeConfig = (fieldName && spanColorMap && spanColorMap[fieldName]) || customConfig || config;

  // Date formatting for Brazilian standard DD/MM/YYYY
  const displayValue = useMemo(() => {
    if (!value) return '';
    if (isDate && /^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
      const [y, m, d] = String(value).split('-');
      return `${d}/${m}/${y}`;
    }
    return String(value);
  }, [value, isDate]);

  const handleChange = (e) => {
    const rawVal = e.target.value;
    if (isDate && /^\d{2}\/\d{2}\/\d{4}$/.test(rawVal)) {
      const [d, m, y] = rawVal.split('/');
      onChange(`${y}-${m}-${d}`);
    } else {
      onChange(rawVal);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (onFocusField && fieldName) {
      onFocusField(fieldName);
    }
  };

  const handleClick = () => {
    inputRef.current?.focus();
    if (onFocusField && fieldName) {
      onFocusField(fieldName);
    }
  };

  const hasContent = Boolean(displayValue && displayValue.trim() && displayValue !== '/');
  const isMarked = Boolean(activeConfig && hasContent);

  return (
    <div className={`flex flex-col ${className}`} onClick={handleClick}>
      {label && (
        <div className="flex justify-between items-center mb-1">
          <label className="font-mono text-[10px] uppercase tracking-wider text-[#BCB4AD] cursor-pointer">
            {label}
          </label>
          {rightElement}
        </div>
      )}

      <div
        className={`w-full bg-[#2E2621] border rounded-lg p-1.5 transition-all min-h-[38px] flex items-center cursor-text ${
          isFocused
            ? 'border-[#D5A474] ring-1 ring-[#D5A474]/20'
            : 'border-[#453A31] hover:border-[#58493D]'
        }`}
      >
        {isMarked ? (
          <div
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.focus();
              if (onFocusField && fieldName) onFocusField(fieldName);
            }}
            className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-mono font-medium transition-all ${
              fullWidthPill ? 'w-full' : 'max-w-full'
            }`}
            style={{
              backgroundColor: activeConfig.bg,
              borderColor: `${activeConfig.color}66`,
              borderBottom: `2.5px solid ${activeConfig.color}`,
              boxShadow: `0 2px 8px ${activeConfig.glow}`,
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={displayValue}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              className={`bg-transparent outline-none text-[#FFFEFD] placeholder-[#97918D]/50 font-mono text-xs ${
                fullWidthPill ? 'w-full' : ''
              } ${inputClassName}`}
              style={{
                color: '#FFFEFD',
                caretColor: activeConfig.color,
                minWidth: '4ch',
                width: fullWidthPill ? '100%' : `${Math.max(displayValue.length + 1, 4)}ch`,
                maxWidth: '100%'
              }}
            />
          </div>
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={displayValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            className={`w-full bg-transparent px-2 text-[#FFFEFD] font-mono text-xs outline-none placeholder-[#97918D]/50 ${inputClassName}`}
          />
        )}
      </div>
    </div>
  );
}

export default function ExtractionForm({ 
  dados, 
  onChange, 
  onSync, 
  onReset, 
  erpDestino,
  onFocusField,
  groundingSpans = [],
  onReExtract = null,
  isReExtracting = false
}) {
  const [copiedField, setCopiedField] = useState(null);
  const [showAdvancedAmounts, setShowAdvancedAmounts] = useState(false);
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
  const [isReExtractModalOpen, setIsReExtractModalOpen] = useState(false);
  const [userHintText, setUserHintText] = useState('');

  const handleCopy = (field, value) => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getErpLabel = () => {
    if (erpDestino === 'superlogica') return 'SuperLógica Condomínio';
    if (erpDestino === 'condominia') return 'CondominIA Core';
    return 'Universal Hub (JSON/CSV)';
  };

  const spanColorMap = useMemo(() => {
    const map = {};
    (groundingSpans || []).forEach(s => {
      if (s.field && s.color) {
        const conf = {
          color: s.color,
          bg: `${s.color}26`,
          glow: `${s.color}40`
        };
        map[s.field] = conf;
        if (s.field === 'fornecedor_endereco') map['endereco_fornecedor'] = conf;
        if (s.field === 'endereco_fornecedor') map['fornecedor_endereco'] = conf;
        if (s.field === 'condominio_endereco') map['endereco_pagador'] = conf;
        if (s.field === 'endereco_pagador') map['condominio_endereco'] = conf;
        if (s.field === 'fornecedor_contato') map['contato_fornecedor'] = conf;
        if (s.field === 'contato_fornecedor') map['fornecedor_contato'] = conf;
      }
    });
    return map;
  }, [groundingSpans]);

  // Has enriched fields extracted
  const hasExtraDetails = Boolean(
    dados.endereco_fornecedor || 
    dados.endereco_pagador || 
    dados.contato_fornecedor || 
    dados.juros_dia || 
    dados.multa_atraso || 
    dados.numero_documento ||
    dados.data_emissao
  );

  return (
    <GroundingColorContext.Provider value={spanColorMap}>
      <div className="bg-[#2E2621] rounded-2xl p-5 flex flex-col justify-between h-full border border-[#453A31] overflow-y-auto max-h-[85vh] relative">
      
      {/* Organic Scanning / Re-extracting Loader Overlay */}
      {isReExtracting && (
        <div className="absolute inset-0 z-40 bg-[#2E2621]/90 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
          <div className="relative mb-4">
            <div className="w-16 h-16 rounded-full border-4 border-[#D5A474]/20 border-t-[#D5A474] animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-[#D5A474] animate-pulse" />
            </div>
          </div>
          <h4 className="font-serif text-base font-medium text-[#FFFEFD] mb-1">
            Re-rastreando documento com IA...
          </h4>
          <p className="text-xs text-[#BCB4AD] max-w-xs font-mono">
            Aplicando sua dica de contexto e recalculando ancoragens no LangExtract / Gemini.
          </p>
        </div>
      )}

      <div>
        {/* Header with Title & Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-[#453A31]">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-[#BCB4AD] flex items-center gap-2">
              Validação & Conferência
              {dados.tipo_documento && (
                <span className="px-2 py-0.5 rounded bg-[#D5A474]/20 text-[#D5A474] font-semibold">
                  {dados.tipo_documento}
                </span>
              )}
            </div>
            <h3 className="font-serif text-base font-normal text-[#FFFEFD]">
              Dados Estruturados
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {onReExtract && (
              <button
                type="button"
                onClick={() => setIsReExtractModalOpen(true)}
                disabled={isReExtracting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#58493D]/60 hover:bg-[#58493D] border border-[#D5A474]/40 hover:border-[#D5A474] text-[#FFFEFD] hover:text-[#D5A474] font-medium text-xs transition-all shadow-sm group disabled:opacity-50"
                title="Forneça uma dica ou instrução para re-extrair o documento com o LangExtract"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#D5A474] group-hover:rotate-12 transition-transform" />
                <span>Rastrear novamente</span>
              </button>
            )}

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#2E2621] border border-[#453A31] text-xs">
              <span className="font-mono text-[10px] uppercase text-[#97918D]">Destino:</span>
              <span className="font-medium text-[#D5A474]">{getErpLabel()}</span>
            </div>
          </div>
        </div>

        {/* Form Grid */}
        <div className="space-y-3.5 text-xs">
          
          {/* Row 1: Condomínio & Categoria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <MarkedField
              label="Condomínio / Destinatário"
              value={dados.condominio_nome || ''}
              onChange={(val) => onChange('condominio_nome', val)}
              placeholder="Nome do Condomínio"
              config={GROUNDING_CONFIG.condominio} 
              onFocusField={onFocusField} 
              fieldName="condominio_nome"
            />

            <div>
              <label className="font-mono text-[10px] uppercase tracking-wider text-[#BCB4AD] block mb-1">
                Classificação (Plano de Contas)
              </label>
              <div className="w-full bg-[#2E2621] border border-[#453A31] rounded-lg px-3 py-2">
                <select
                  value={dados.tipo_conta || CATEGORIAS_PADRAO[0]}
                  onChange={(e) => onChange('tipo_conta', e.target.value)}
                  className="w-full bg-transparent text-[#D5A474] font-medium outline-none cursor-pointer"
                >
                  {CATEGORIAS_PADRAO.map((cat) => (
                    <option key={cat} value={cat} className="bg-[#2E2621] text-[#FFFEFD]">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {(dados.condominio_cnpj || showAdditionalDetails) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <MarkedField
                label="CNPJ do Condomínio (Pagador)"
                value={dados.condominio_cnpj || ''}
                onChange={(val) => onChange('condominio_cnpj', val)}
                placeholder="00.000.000/0000-00"
                config={dados.condominio_cnpj ? GROUNDING_CONFIG.condominio_cnpj : null}
                onFocusField={onFocusField}
                fieldName="condominio_cnpj"
              />
            </div>
          )}

          {/* Row 2: Fornecedor & CNPJ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <MarkedField
              label="Fornecedor / Favorecido"
              value={dados.fornecedor_nome || ''}
              onChange={(val) => onChange('fornecedor_nome', val)}
              placeholder="Razão Social / Nome Fantasia"
              config={GROUNDING_CONFIG.fornecedor}
              onFocusField={onFocusField}
              fieldName="fornecedor_nome"
            />

            <MarkedField
              label="CNPJ do Fornecedor"
              value={dados.fornecedor_cnpj || ''}
              onChange={(val) => onChange('fornecedor_cnpj', val)}
              placeholder="00.000.000/0000-00"
              config={dados.fornecedor_cnpj ? GROUNDING_CONFIG.fornecedor_cnpj : null}
              onFocusField={onFocusField}
              fieldName="fornecedor_cnpj"
            />
          </div>

          {/* Row 2.5: Endereços e Contato */}
          {(dados.fornecedor_endereco || dados.endereco_fornecedor || dados.condominio_endereco || dados.endereco_pagador || dados.fornecedor_contato || dados.contato_fornecedor || showAdditionalDetails) && (
            <>
              {(dados.fornecedor_endereco || dados.endereco_fornecedor || showAdditionalDetails) && (
                <MarkedField
                  label="Endereço do Fornecedor"
                  value={dados.fornecedor_endereco || dados.endereco_fornecedor || ''}
                  onChange={(val) => onChange('fornecedor_endereco', val)}
                  placeholder="Endereço do favorecido"
                  config={(dados.fornecedor_endereco || dados.endereco_fornecedor) ? GROUNDING_CONFIG.endereco : null}
                  fullWidthPill={true}
                  onFocusField={onFocusField}
                  fieldName="fornecedor_endereco"
                />
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-3.5">
                <MarkedField
                  label="Endereço do Condomínio (Pagador)"
                  value={dados.condominio_endereco || dados.endereco_pagador || ''}
                  onChange={(val) => onChange('condominio_endereco', val)}
                  placeholder="Endereço de cobrança"
                  config={(dados.condominio_endereco || dados.endereco_pagador) ? GROUNDING_CONFIG.endereco : null}
                  onFocusField={onFocusField}
                  fieldName="condominio_endereco"
                />
                
                <MarkedField
                  label="Contato do Fornecedor"
                  value={dados.fornecedor_contato || dados.contato_fornecedor || ''}
                  onChange={(val) => onChange('fornecedor_contato', val)}
                  placeholder="E-mail ou Telefone"
                  config={(dados.fornecedor_contato || dados.contato_fornecedor) ? GROUNDING_CONFIG.fornecedor : null}
                  onFocusField={onFocusField}
                  fieldName="fornecedor_contato"
                />
              </div>
            </>
          )}

          {/* Row 3: Valores Principais e Vencimento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <MarkedField
              label="Valor Total (R$)"
              value={dados.valor_total || ''}
              onChange={(val) => onChange('valor_total', val)}
              placeholder="0,00"
              config={GROUNDING_CONFIG.valor}
              onFocusField={onFocusField}
              fieldName="valor_total"
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowAdvancedAmounts(!showAdvancedAmounts)}
                  className="text-[10px] text-[#D5A474] hover:underline normal-case"
                >
                  {showAdvancedAmounts ? 'Ocultar Detalhes' : '+ Descontos/Acréscimos'}
                </button>
              }
            />

            <MarkedField
              label="Data de Vencimento"
              value={dados.data_vencimento || ''}
              onChange={(val) => onChange('data_vencimento', val)}
              placeholder="DD/MM/AAAA"
              isDate={true}
              config={GROUNDING_CONFIG.vencimento}
              onFocusField={onFocusField}
              fieldName="data_vencimento"
            />
          </div>

          {/* Row 3.5: Emissão, Número do Documento e Nosso Número / Protocolo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <MarkedField
              label="Data de Emissão"
              value={dados.data_emissao || ''}
              onChange={(val) => onChange('data_emissao', val)}
              placeholder="DD/MM/AAAA"
              isDate={true}
              config={dados.data_emissao ? GROUNDING_CONFIG.emissao : null}
              onFocusField={onFocusField}
              fieldName="data_emissao"
            />

            <MarkedField
              label="Nº do Documento / NF-e"
              value={dados.numero_documento || ''}
              onChange={(val) => onChange('numero_documento', val)}
              placeholder="Ex: 9907637002 ou NF-e"
              config={dados.numero_documento ? GROUNDING_CONFIG.num_doc : null}
              onFocusField={onFocusField}
              fieldName="numero_documento"
            />

            <MarkedField
              label={dados.protocolo_autorizacao ? "Protocolo de Autorização" : "Nosso Número"}
              value={dados.protocolo_autorizacao || dados.nosso_numero || ''}
              onChange={(val) => onChange(dados.protocolo_autorizacao ? 'protocolo_autorizacao' : 'nosso_numero', val)}
              placeholder="Ex: 3262600023218287 ou Nosso Nº"
              config={(dados.protocolo_autorizacao || dados.nosso_numero) ? GROUNDING_CONFIG.protocolo_autorizacao : null}
              onFocusField={onFocusField}
              fieldName={dados.protocolo_autorizacao ? "protocolo_autorizacao" : "nosso_numero"}
            />
          </div>

          {/* Row 3.6: Chave de Acesso / Código da Instalação (se presentes) */}
          {(dados.chave_acesso || dados.codigo_instalacao) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {dados.codigo_instalacao && (
                <MarkedField
                  label="Código da Instalação"
                  value={dados.codigo_instalacao || ''}
                  onChange={(val) => onChange('codigo_instalacao', val)}
                  placeholder="Ex: 2941129"
                  config={GROUNDING_CONFIG.codigo_instalacao}
                  onFocusField={onFocusField}
                  fieldName="codigo_instalacao"
                />
              )}

              {dados.chave_acesso && (
                <div className={dados.codigo_instalacao ? "sm:col-span-2" : "sm:col-span-3"}>
                  <MarkedField
                    label="Chave de Acesso NF-e (54 Dígitos)"
                    value={dados.chave_acesso || ''}
                    onChange={(val) => onChange('chave_acesso', val)}
                    placeholder="Chave de Acesso da Nota Fiscal Eletrônica"
                    config={GROUNDING_CONFIG.chave_acesso}
                    fullWidthPill={true}
                    onFocusField={onFocusField}
                    fieldName="chave_acesso"
                  />
                </div>
              )}
            </div>
          )}

          {/* Row 3.8: Encargos (Juros ao dia e Multa por atraso) */}
          {(dados.juros_dia || dados.multa_atraso || showAdditionalDetails) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <MarkedField
                label="Juros ao Dia / Encargos"
                value={dados.juros_dia || ''}
                onChange={(val) => onChange('juros_dia', val)}
                placeholder="Ex: R$ 0,07 (0,0333%)"
                config={dados.juros_dia ? GROUNDING_CONFIG.juros : null}
                onFocusField={onFocusField}
                fieldName="juros_dia"
              />

              <MarkedField
                label="Multa por Atraso"
                value={dados.multa_atraso || ''}
                onChange={(val) => onChange('multa_atraso', val)}
                placeholder="Ex: R$ 4,28 (2%)"
                config={dados.multa_atraso ? GROUNDING_CONFIG.multa : null}
                onFocusField={onFocusField}
                fieldName="multa_atraso"
              />
            </div>
          )}

          {/* Advanced Amount Fields (Descontos e Acréscimos) */}
          {showAdvancedAmounts && (
            <div className="p-3 rounded-lg bg-[#2E2621] border border-[#453A31] grid grid-cols-3 gap-2 text-[11px]">
              <div>
                <span className="font-mono text-[10px] uppercase text-[#97918D] block mb-1">Original:</span>
                <input
                  type="text"
                  value={dados.valor_original || dados.valor_total || ''}
                  onChange={(e) => onChange('valor_original', e.target.value)}
                  className="w-full bg-[#2E2621] border border-[#453A31] rounded p-1.5 font-mono text-[#FFFEFD]"
                />
              </div>
              <div>
                <span className="font-mono text-[10px] uppercase text-[#97918D] block mb-1">Descontos:</span>
                <input
                  type="text"
                  value={dados.valor_desconto || '0,00'}
                  onChange={(e) => onChange('valor_desconto', e.target.value)}
                  className="w-full bg-[#2E2621] border border-[#453A31] rounded p-1.5 font-mono text-[#FFFEFD]"
                />
              </div>
              <div>
                <span className="font-mono text-[10px] uppercase text-[#97918D] block mb-1">Acréscimos:</span>
                <input
                  type="text"
                  value={dados.valor_acrescimo || '0,00'}
                  onChange={(e) => onChange('valor_acrescimo', e.target.value)}
                  className="w-full bg-[#2E2621] border border-[#453A31] rounded p-1.5 font-mono text-[#FFFEFD]"
                />
              </div>
            </div>
          )}

          {/* Row 4: Linha Digitável */}
          <MarkedField
            label="Linha Digitável / Código de Barras"
            value={dados.linha_digitavel || ''}
            onChange={(val) => onChange('linha_digitavel', val)}
            placeholder="Linha digitável de 47 ou 48 dígitos"
            config={dados.linha_digitavel ? GROUNDING_CONFIG.linha : null}
            fullWidthPill={true}
            onFocusField={onFocusField}
            fieldName="linha_digitavel"
            rightElement={
              dados.linha_digitavel ? (
                <button
                  type="button"
                  onClick={() => handleCopy('linha', dados.linha_digitavel)}
                  className="text-[10px] text-[#D5A474] hover:underline flex items-center gap-1 font-mono"
                >
                  {copiedField === 'linha' ? (
                    <>
                      <Check className="w-3 h-3 text-[#169467]" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copiar
                    </>
                  )}
                </button>
              ) : null
            }
          />

          {/* Row 5: PIX Copia e Cola */}
          {dados.chave_pix && (
            <MarkedField
              label="PIX Copia e Cola / Chave"
              value={dados.chave_pix || ''}
              onChange={(val) => onChange('chave_pix', val)}
              placeholder="Chave ou código PIX"
              config={GROUNDING_CONFIG.pix}
              fullWidthPill={true}
              onFocusField={onFocusField}
              fieldName="chave_pix"
              rightElement={
                <button
                  type="button"
                  onClick={() => handleCopy('pix', dados.chave_pix)}
                  className="text-[10px] text-[#D5A474] hover:underline flex items-center gap-1 font-mono"
                >
                  {copiedField === 'pix' ? (
                    <>
                      <Check className="w-3 h-3 text-[#169467]" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copiar PIX
                    </>
                  )}
                </button>
              }
            />
          )}

        </div>
      </div>

      {/* Action Buttons Footer */}
      <div className="pt-4 mt-4 border-t border-[#453A31] flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-[#97918D] hover:text-[#FFFEFD] flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#453A31] transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Novo Documento</span>
        </button>

        <button
          type="button"
          onClick={onSync}
          className="kai-btn-primary px-6 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
          <span>Sincronizar com {erpDestino === 'superlogica' ? 'SuperLógica' : (erpDestino === 'condominia' ? 'CondominIA' : 'ERP Universal')}</span>
        </button>
      </div>

      {/* Re-extract Feedback Modal */}
      {isReExtractModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#2E2621] border border-[#58493D] rounded-2xl p-6 max-w-lg w-full shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsReExtractModalOpen(false)}
              className="absolute top-4 right-4 text-[#97918D] hover:text-[#FFFEFD] p-1 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-[#58493D]/60 border border-[#D5A474]/40 text-[#D5A474]">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-base font-semibold text-[#FFFEFD]">
                  Rastrear novamente com IA
                </h3>
                <p className="text-[11px] text-[#BCB4AD] font-mono">
                  Feedback Loop • Calibração determinística no LangExtract / Gemini
                </p>
              </div>
            </div>

            <p className="text-xs text-[#BCB4AD] my-3 leading-relaxed">
              Escreva uma dica ou instrução em linguagem natural para orientar o modelo a refinar a extração e as coordenadas de Grounding deste documento:
            </p>

            <textarea
              value={userHintText}
              onChange={(e) => setUserHintText(e.target.value)}
              placeholder="Ex: O nome do condomínio é EDIFICIO AVIS LIBERTAS. Não confunda o condomínio com o número da Nota Fiscal."
              rows={3}
              className="w-full bg-[#1F1915] border border-[#453A31] focus:border-[#D5A474] rounded-xl p-3 text-xs text-[#FFFEFD] font-mono outline-none resize-none placeholder-[#97918D]/50 transition-colors"
            />

            {/* Quick suggestion chips */}
            <div className="mt-3">
              <span className="text-[10px] font-mono uppercase text-[#97918D] block mb-1.5">
                Dicas Prontas (clique para preencher):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "O nome do condomínio é EDIFICIO AVIS LIBERTAS",
                  "Não confunda o condomínio com a Nota Fiscal",
                  "O fornecedor correto é Neoenergia",
                  "O CNPJ do pagador é 02.819.556/0001-30"
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setUserHintText(chip)}
                    className="text-[10px] px-2.5 py-1 rounded-md bg-[#3A302A] hover:bg-[#58493D] text-[#BCB4AD] hover:text-[#FFFEFD] border border-[#453A31] transition-colors"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[#453A31]">
              <button
                type="button"
                onClick={() => setIsReExtractModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs text-[#97918D] hover:text-[#FFFEFD] border border-[#453A31] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsReExtractModalOpen(false);
                  if (onReExtract) onReExtract(userHintText);
                }}
                disabled={isReExtracting}
                className="kai-btn-primary px-5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Confirmar e Re-rastrear</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  </GroundingColorContext.Provider>
);
}
