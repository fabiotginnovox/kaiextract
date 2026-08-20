import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Eye, FileText, CheckCircle, Sparkles, X, Palette, Tag, Check, ArrowRight, Loader2 } from 'lucide-react';

export const AVAILABLE_GROUNDING_FIELDS = [
  { field: 'linha_digitavel', label: 'Linha Digitável / Código', defaultColor: '#34D399', category: 'Pagamento' },
  { field: 'chave_pix', label: 'Chave PIX', defaultColor: '#2DD4BF', category: 'Pagamento' },
  { field: 'valor_total', label: 'Valor Total (R$)', defaultColor: '#FBBF24', category: 'Valores' },
  { field: 'data_vencimento', label: 'Data de Vencimento', defaultColor: '#F472B6', category: 'Datas' },
  { field: 'data_emissao', label: 'Data de Emissão', defaultColor: '#818CF8', category: 'Datas' },
  { field: 'fornecedor_nome', label: 'Fornecedor / Favorecido', defaultColor: '#A78BFA', category: 'Entidades' },
  { field: 'fornecedor_cnpj', label: 'CNPJ do Fornecedor', defaultColor: '#C084FC', category: 'Entidades' },
  { field: 'condominio_nome', label: 'Condomínio / Destinatário', defaultColor: '#38BDF8', category: 'Entidades' },
  { field: 'condominio_cnpj', label: 'CNPJ do Condomínio', defaultColor: '#0EA5E9', category: 'Entidades' },
  { field: 'numero_documento', label: 'Nº do Documento / Título', defaultColor: '#60A5FA', category: 'Documento' },
  { field: 'nosso_numero', label: 'Nosso Número', defaultColor: '#38BDF8', category: 'Documento' },
  { field: 'multa_atraso', label: 'Multa por Atraso', defaultColor: '#F87171', category: 'Valores' },
  { field: 'juros_dia', label: 'Juros ao Dia / Encargos', defaultColor: '#FB923C', category: 'Valores' },
  { field: 'fornecedor_endereco', label: 'Endereço Fornecedor', defaultColor: '#E879F9', category: 'Endereços' },
  { field: 'condominio_endereco', label: 'Endereço Condomínio', defaultColor: '#93C5FD', category: 'Endereços' },
  { field: 'fornecedor_contato', label: 'Contato Fornecedor', defaultColor: '#A3E635', category: 'Entidades' }
];

export const COLOR_PALETTE = [
  { name: 'Emerald', hex: '#34D399' },
  { name: 'Gold', hex: '#FBBF24' },
  { name: 'Pink', hex: '#F472B6' },
  { name: 'Indigo', hex: '#818CF8' },
  { name: 'Purple', hex: '#A78BFA' },
  { name: 'Lavender', hex: '#C084FC' },
  { name: 'Sky', hex: '#38BDF8' },
  { name: 'Cyan', hex: '#0EA5E9' },
  { name: 'Blue', hex: '#60A5FA' },
  { name: 'Coral', hex: '#F87171' },
  { name: 'Orange', hex: '#FB923C' },
  { name: 'Teal', hex: '#2DD4BF' },
  { name: 'Fuchsia', hex: '#E879F9' },
  { name: 'Lime', hex: '#84CC16' },
  { name: 'Rose', hex: '#FB7185' },
  { name: 'Amber', hex: '#F59E0B' }
];

export function findOcrFuzzyMatch(srcText, target) {
  if (!srcText || !target || String(target).trim().length < 2) return null;
  const tgt = String(target).trim();

  // 1. Direct search
  const exactIdx = srcText.indexOf(tgt);
  if (exactIdx !== -1) {
    return { start: exactIdx, end: exactIdx + tgt.length, matched_text: tgt };
  }

  // 2. Case-insensitive exact
  const lowerText = srcText.toLowerCase();
  const lowerTgt = tgt.toLowerCase();
  const lowerIdx = lowerText.indexOf(lowerTgt);
  if (lowerIdx !== -1) {
    return { start: lowerIdx, end: lowerIdx + tgt.length, matched_text: srcText.substring(lowerIdx, lowerIdx + tgt.length) };
  }

  // 3. OCR tolerant regex (handles 2<->Z, 5<->S, 0<->O, 1<->L, spaces, commas/dots)
  let pattern = '';
  for (let i = 0; i < tgt.length; i++) {
    const ch = tgt[i];
    if (/[0oO]/i.test(ch)) pattern += '[0oOD]';
    else if (/[2zZ]/i.test(ch)) pattern += '[2zZ]';
    else if (/[5sS]/i.test(ch)) pattern += '[5sS]';
    else if (/[1lLiI]/i.test(ch)) pattern += '[1lLiI|]';
    else if (/[8bB]/i.test(ch)) pattern += '[8bB]';
    else if (/\s/.test(ch)) pattern += '\\s*';
    else if (/[,.]/.test(ch)) pattern += '[,.]';
    else if (ch === '$') pattern += '\\$?';
    else if (/[()]/.test(ch)) pattern += '\\' + ch + '?';
    else if (ch === '%') pattern += '[%zZ]?';
    else if (/[a-zA-Z0-9]/.test(ch)) pattern += ch;
    else pattern += '\\' + ch;
  }

  try {
    const regex = new RegExp(pattern, 'i');
    const match = regex.exec(srcText);
    if (match) {
      return {
        start: match.index,
        end: match.index + match[0].length,
        matched_text: match[0]
      };
    }
  } catch (e) {
    // Ignore compilation errors
  }

  // 4. Field-specific heuristics (e.g. Multa / Juros)
  if (/multa/i.test(tgt)) {
    const m = /(?:APOS\s+VENCIMENTO\s+)?MULTA[^\n\r]+/i.exec(srcText);
    if (m) {
      return { start: m.index, end: m.index + m[0].length, matched_text: m[0] };
    }
  }

  if (/juros/i.test(tgt)) {
    const m = /\+?\s*JUROS[^\n\r]+/i.exec(srcText);
    if (m) {
      return { start: m.index, end: m.index + m[0].length, matched_text: m[0] };
    }
  }

  return null;
}

export function buildGroundingHtml(text, spans = []) {
  if (!text) return '';
  if (!spans || spans.length === 0) {
    return text.replace(/\n/g, '<br/>');
  }

  // 1. Prioritize manual spans, then longer substrings
  const manualSpans = spans.filter(s => s.manual);
  const autoSpans = spans.filter(s => !s.manual);

  const orderedCandidateSpans = [
    ...manualSpans.sort((a, b) => (b.matched_text || '').length - (a.matched_text || '').length),
    ...autoSpans.sort((a, b) => (b.matched_text || '').length - (a.matched_text || '').length)
  ];

  const acceptedSpans = [];

  orderedCandidateSpans.forEach(s => {
    const matchStr = s.matched_text || s.value || '';
    if (!matchStr || String(matchStr).trim().length < 1) return;

    let matchRes = null;
    if (s.start !== undefined && s.end !== undefined && text.substring(s.start, s.end) === matchStr) {
      matchRes = { start: s.start, end: s.end, matched_text: matchStr };
    } else {
      matchRes = findOcrFuzzyMatch(text, matchStr);
    }

    if (matchRes) {
      const { start, end, matched_text } = matchRes;
      
      if (s.manual) {
        for (let i = acceptedSpans.length - 1; i >= 0; i--) {
          const acc = acceptedSpans[i];
          if (start < acc.end && end > acc.start) {
            acceptedSpans.splice(i, 1);
          }
        }
        acceptedSpans.push({
          ...s,
          start,
          end,
          matched_text: matched_text || text.substring(start, end)
        });
      } else {
        const hasOverlap = acceptedSpans.some(acc => (start < acc.end && end > acc.start));
        if (!hasOverlap) {
          acceptedSpans.push({
            ...s,
            start,
            end,
            matched_text: matched_text || text.substring(start, end)
          });
        }
      }
    }
  });

  acceptedSpans.sort((a, b) => a.start - b.start);

  const parts = [];
  let lastIdx = 0;

  acceptedSpans.forEach(s => {
    if (s.start >= lastIdx) {
      parts.push(text.substring(lastIdx, s.start));
      const token = text.substring(s.start, s.end);
      const color = s.color || '#34D399';
      const label = s.label || s.field;
      const field = s.field;
      
      const badge = `<mark id="grounding-${field}" class="kai-highlight" style="position:relative; background-color: ${color}26; border-bottom: 2.5px solid ${color}; color: #FFFEFD; padding: 2px 4px; border-radius: 4px; cursor: pointer; box-shadow: 0 0 10px ${color}33;" title="${label}: ${field}"><span class="blink-dot" style="display:none; position:absolute; left:-6px; top:-6px; width:8px; height:8px; background-color:#84cc16; border-radius:50%; box-shadow:0 0 8px #84cc16;"></span><strong>${token}</strong> <span style="font-size: 10px; background: ${color}; color: #1D1714; padding: 1px 5px; border-radius: 3px; font-weight: 700; margin-left: 3px;">${label}</span></mark>`;
      parts.push(badge);
      lastIdx = s.end;
    }
  });

  parts.push(text.substring(lastIdx));
  return parts.join('').replace(/\n/g, '<br/>');
}

export default function GroundingViewer({ 
  rawText, 
  htmlContent, 
  docId, 
  groundingSpans = [], 
  focusedField,
  onManualGrounding,
  onFocusField,
  onReExtract,
  isReExtracting = false
}) {
  const [activeTab, setActiveTab] = useState("grounding");
  const [selectedText, setSelectedText] = useState('');
  const [popoverPos, setPopoverPos] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [feedbackToast, setFeedbackToast] = useState(null);
  const [viewerHeight, setViewerHeight] = useState(480);
  const [isDraggingResize, setIsDraggingResize] = useState(false);
  const [isReExtractModalOpen, setIsReExtractModalOpen] = useState(false);
  const [userHintText, setUserHintText] = useState('');
  const containerRef = useRef(null);
  const popoverRef = useRef(null);
  const isResizingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(480);

  const usedColors = new Set(groundingSpans.map(s => (s.color || '').toUpperCase()));

  // Derived live HTML from groundingSpans and rawText for instant highlight feedback
  const displayHtml = useMemo(() => {
    if (rawText && groundingSpans && groundingSpans.length > 0) {
      return buildGroundingHtml(rawText, groundingSpans);
    }
    if (htmlContent) {
      return htmlContent.replace(/<!DOCTYPE html>[\s\S]*?<div class="container">/i, '').replace(/<\/div>[\s\S]*?<\/html>/i, '');
    }
    return buildGroundingHtml(rawText, []);
  }, [rawText, groundingSpans, htmlContent]);

  // Robust Custom Drag-to-Resize Handler
  const handleResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    isResizingRef.current = true;
    setIsDraggingResize(true);
    startYRef.current = e.clientY;
    startHeightRef.current = viewerHeight;

    const handleMouseMove = (moveEvent) => {
      if (!isResizingRef.current) return;
      const deltaY = moveEvent.clientY - startYRef.current;
      const newH = Math.max(280, Math.min(1200, startHeightRef.current + deltaY));
      setViewerHeight(newH);
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      setIsDraggingResize(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const resolveTargetElement = (field) => {
    if (!field) return null;
    let el = document.getElementById(`grounding-${field}`);
    if (el) return el;

    const aliases = {
      fornecedor_endereco: ['fornecedor_endereco', 'endereco_fornecedor', 'endereco'],
      endereco_fornecedor: ['fornecedor_endereco', 'endereco_fornecedor', 'endereco'],
      condominio_endereco: ['condominio_endereco', 'endereco_pagador', 'endereco_condominio'],
      endereco_pagador: ['condominio_endereco', 'endereco_pagador', 'endereco_condominio'],
      fornecedor_contato: ['fornecedor_contato', 'contato_fornecedor', 'contato'],
      contato_fornecedor: ['fornecedor_contato', 'contato_fornecedor', 'contato'],
      fornecedor_nome: ['fornecedor_nome', 'fornecedor'],
      condominio_nome: ['condominio_nome', 'condominio'],
      fornecedor_cnpj: ['fornecedor_cnpj', 'cnpj_fornecedor'],
      condominio_cnpj: ['condominio_cnpj', 'cnpj_condominio'],
      valor_total: ['valor_total', 'valor'],
      data_vencimento: ['data_vencimento', 'vencimento'],
      data_emissao: ['data_emissao', 'emissao'],
      numero_documento: ['numero_documento', 'num_doc'],
      multa_atraso: ['multa_atraso', 'multa'],
      juros_dia: ['juros_dia', 'juros'],
      linha_digitavel: ['linha_digitavel', 'linha'],
      chave_pix: ['chave_pix', 'pix']
    };

    const candList = aliases[field] || [field];
    for (const cand of candList) {
      el = document.getElementById(`grounding-${cand}`);
      if (el) return el;
      el = document.querySelector(`.kai-html-renderer mark[id*="${cand}"]`);
      if (el) return el;
      el = document.querySelector(`.kai-html-renderer mark[title*="${cand}"]`);
      if (el) return el;
    }
    return null;
  };

  const highlightAndScroll = (field) => {
    const marks = document.querySelectorAll('.kai-html-renderer mark');
    marks.forEach(m => {
      m.classList.remove('active-scroll');
      const dot = m.querySelector('.blink-dot');
      if (dot) dot.classList.remove('active');
    });

    const target = resolveTargetElement(field);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.add('active-scroll');
      const dot = target.querySelector('.blink-dot');
      if (dot) dot.classList.add('active');
    }
  };

  useEffect(() => {
    if (focusedField) {
      if (activeTab === 'grounding') {
        const timer = setTimeout(() => {
          highlightAndScroll(focusedField);
        }, 60);
        return () => clearTimeout(timer);
      }
    }
  }, [focusedField]);

  const handleSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      return;
    }

    const text = selection.toString().trim();
    if (text.length >= 1) {
      try {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const containerRect = containerRef.current?.getBoundingClientRect();

        if (containerRect) {
          const top = rect.bottom - containerRect.top + 10;
          const left = Math.max(10, Math.min(rect.left - containerRect.left, containerRect.width - 320));

          setSelectedText(text);
          setPopoverPos({ top, left });
          setSelectedColor(null);
          setSearchFilter('');
        }
      } catch (e) {
        console.warn('Error reading selection range:', e);
      }
    }
  };

  const closePopover = () => {
    setPopoverPos(null);
    setSelectedText('');
    setSelectedColor(null);
    if (window.getSelection) {
      window.getSelection().removeAllRanges();
    }
  };

  const handleAssignField = (fieldObj) => {
    if (!selectedText || !onManualGrounding) return;

    const assignedColor = selectedColor || fieldObj.defaultColor;

    onManualGrounding({
      field: fieldObj.field,
      value: selectedText,
      color: assignedColor,
      label: fieldObj.label
    });

    setFeedbackToast(`✨ "${fieldObj.label}" vinculado e enviado à coluna direita!`);
    setTimeout(() => setFeedbackToast(null), 3000);

    setActiveTab('grounding');
    closePopover();
  };

  const handleContainerClick = (e) => {
    const mark = e.target.closest('mark.kai-highlight');
    if (mark && mark.id) {
      const fieldId = mark.id.replace('grounding-', '');
      if (onFocusField) {
        onFocusField(fieldId);
      }
    }
  };

  const filteredFields = AVAILABLE_GROUNDING_FIELDS.filter(f => 
    f.label.toLowerCase().includes(searchFilter.toLowerCase()) ||
    f.category.toLowerCase().includes(searchFilter.toLowerCase()) ||
    f.field.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="bg-[#2E2621] rounded-2xl p-5 flex flex-col h-full border border-[#453A31] relative">
      
      {feedbackToast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-[#58493D] border border-[#D5A474] text-[#FFFEFD] text-xs font-mono shadow-2xl flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-[#D5A474]" />
          <span>{feedbackToast}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-[#453A31]">
        <div>
          <h3 className="font-serif text-base font-normal text-[#FFFEFD]">
            Rastreabilidade da fonte
          </h3>
        </div>

        <div className="flex items-center gap-1 bg-[#2E2621] p-1 rounded-lg border border-[#453A31] text-xs">
          <button
            onClick={() => setActiveTab('grounding')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'grounding'
                ? 'bg-[#58493D] text-[#FFFEFD] font-semibold shadow-sm'
                : 'text-[#97918D] hover:text-[#FFFEFD]'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Destaques</span>
          </button>
          
          <button
            onClick={() => setActiveTab('raw')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'raw'
                ? 'bg-[#58493D] text-[#FFFEFD] font-semibold shadow-sm'
                : 'text-[#97918D] hover:text-[#FFFEFD]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Texto Original</span>
          </button>
        </div>
      </div>

      <div className="mb-2 px-1 text-[11px] text-[#97918D] flex items-center justify-between">
        <span>💡 {activeTab === 'grounding' ? 'Selecione texto para vincular ou clique nos destaques' : 'Visualizando texto OCR cru sem formatação'}</span>
        <span className="text-[10px] text-[#D5A474]">↔ Arraste a borda/canto inferior para redimensionar ({viewerHeight}px)</span>
      </div>

      {/* Main Resizable Container Box */}
      <div 
        ref={containerRef}
        onMouseUp={handleSelection}
        onClick={handleContainerClick}
        style={{ height: `${viewerHeight}px` }}
        className={`overflow-auto rounded-xl bg-[#251E1A] border ${isDraggingResize ? 'border-[#D5A474]' : 'border-[#453A31]'} p-4 font-mono text-xs text-[#FFFEFD] leading-relaxed relative select-text transition-colors`}
      >
        {activeTab === 'grounding' ? (
          <div>
            {displayHtml ? (
              <div 
                className="kai-html-renderer cursor-text"
                dangerouslySetInnerHTML={{ 
                  __html: displayHtml
                }} 
              />
            ) : (
              <pre className="whitespace-pre-wrap text-[#999592]">{rawText}</pre>
            )}
          </div>
        ) : (
          <pre className="whitespace-pre-wrap font-mono text-[#FFFEFD]/90 cursor-text select-text leading-relaxed font-normal">{rawText}</pre>
        )}

        {/* Floating Assignment Popover */}
        {popoverPos && selectedText && (
          <div 
            ref={popoverRef}
            style={{ 
              top: `${popoverPos.top}px`, 
              left: `${popoverPos.left}px` 
            }}
            className="absolute z-50 w-80 bg-[#251E1A] border border-[#D5A474]/50 rounded-xl p-3 shadow-2xl animate-fadeIn backdrop-blur-md"
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#453A31]">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#FFFEFD]">
                <Tag className="w-3.5 h-3.5 text-[#D5A474]" />
                <span>Vincular Texto Selecionado</span>
              </div>
              <button 
                onClick={closePopover}
                className="p-1 text-[#97918D] hover:text-[#FFFEFD] rounded-md transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mb-2.5 p-2 rounded bg-[#1D1714] border border-[#453A31] text-[11px] text-[#D5A474] font-mono break-all line-clamp-2">
              "{selectedText}"
            </div>

            <div className="mb-2.5">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#BCB4AD] mb-1.5 flex items-center justify-between">
                <span>Cor do Destaque:</span>
                {selectedColor && (
                  <button 
                    onClick={() => setSelectedColor(null)}
                    className="text-[9px] text-[#D5A474] hover:underline"
                  >
                    Usar padrão do campo
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 p-1.5 bg-[#1D1714] rounded-lg border border-[#453A31]">
                {COLOR_PALETTE.map((c) => {
                  const isUsed = usedColors.has(c.hex.toUpperCase());
                  const isSelected = selectedColor === c.hex;
                  return (
                    <button
                      key={c.hex}
                      type="button"
                      title={`${c.name} ${isUsed ? '(Já em uso)' : '(Disponível)'}`}
                      onClick={() => setSelectedColor(c.hex)}
                      className={`w-4 h-4 rounded-full transition-transform flex items-center justify-center ${
                        isSelected ? 'scale-125 ring-2 ring-[#FFFEFD]' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 text-[#000000]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-2">
              <input
                type="text"
                placeholder="Filtrar campos (ex: código, valor, data)..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-[#1D1714] border border-[#453A31] rounded-lg px-2.5 py-1 text-xs text-[#FFFEFD] placeholder-[#97918D]/60 outline-none focus:border-[#D5A474]"
              />
            </div>

            <div className="max-h-44 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {filteredFields.map((f) => {
                const activeColor = selectedColor || f.defaultColor;
                return (
                  <button
                    key={f.field}
                    type="button"
                    onClick={() => handleAssignField(f)}
                    className="w-full text-left p-1.5 rounded-lg bg-[#2E2621] hover:bg-[#58493D]/60 border border-[#453A31] hover:border-[#D5A474]/60 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span 
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: activeColor }}
                      />
                      <span className="text-[11px] font-medium text-[#FFFEFD] group-hover:text-[#D5A474] truncate">
                        {f.label}
                      </span>
                    </div>
                    <ArrowRight className="w-3 h-3 text-[#97918D] group-hover:text-[#D5A474] shrink-0" />
                  </button>
                );
              })}
            </div>

          </div>
        )}
      </div>

      {/* Interactive Bottom Drag Bar & Corner Handle */}
      <div 
        onMouseDown={handleResizeStart}
        className="w-full py-1.5 flex items-center justify-center cursor-ns-resize group select-none hover:bg-[#58493D]/30 rounded-b-lg transition-colors -mt-1 relative"
        title="Clique e arraste para redimensionar verticalmente"
      >
        <div className="w-16 h-1 rounded-full bg-[#58493D] group-hover:bg-[#D5A474] transition-colors" />
        
        {/* Corner Grip Icon */}
        <div className="absolute right-1 bottom-1 text-[#97918D] group-hover:text-[#D5A474] transition-colors cursor-se-resize">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M10 2L2 10M10 6L6 10M10 10L10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[#453A31] flex flex-wrap items-center justify-between gap-3 text-[11px]">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[#BCB4AD] mr-1">Campos Mapeados:</span>
          {groundingSpans && groundingSpans.length > 0 ? (
            Array.from(new Set(groundingSpans.map(s => JSON.stringify({ field: s.field, label: s.label, color: s.color })))).map((str) => {
              const item = JSON.parse(str);
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => highlightAndScroll(item.field || item.label)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] font-medium transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  style={{
                    backgroundColor: `${item.color}26`,
                    color: item.color,
                    borderColor: `${item.color}66`,
                    borderWidth: '1px',
                    borderBottomWidth: '2px',
                    borderBottomColor: item.color
                  }}
                >
                  {item.label}
                </button>
              );
            })
          ) : (
            <>
              <button onClick={() => highlightAndScroll('condominio_nome')} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]/40 border-b-2 border-b-[#38bdf8] font-mono text-[10px] font-medium hover:scale-105 cursor-pointer">
                Condomínio
              </button>
              <button onClick={() => highlightAndScroll('fornecedor_nome')} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/40 border-b-2 border-b-[#a78bfa] font-mono text-[10px] font-medium hover:scale-105 cursor-pointer">
                Fornecedor
              </button>
              <button onClick={() => highlightAndScroll('valor_total')} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#fbbf24]/15 text-[#fbbf24] border border-[#fbbf24]/40 border-b-2 border-b-[#fbbf24] font-mono text-[10px] font-medium hover:scale-105 cursor-pointer">
                Valor Total
              </button>
              <button onClick={() => highlightAndScroll('data_vencimento')} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#f472b6]/15 text-[#f472b6] border border-[#f472b6]/40 border-b-2 border-b-[#f472b6] font-mono text-[10px] font-medium hover:scale-105 cursor-pointer">
                Vencimento
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {onReExtract && (
            <button
              type="button"
              onClick={() => setIsReExtractModalOpen(true)}
              disabled={isReExtracting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#58493D] hover:bg-[#6e5b4c] border border-[#D5A474] text-[#FFFEFD] hover:text-[#D5A474] font-medium text-xs transition-all shadow-md group disabled:opacity-50 cursor-pointer active:scale-95"
              title="Re-extrair documento fornecendo uma instrução adicional para a IA"
            >
              {isReExtracting ? (
                <Loader2 className="w-3.5 h-3.5 text-[#D5A474] animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-[#D5A474] group-hover:rotate-12 transition-transform" />
              )}
              <span className="font-sans font-semibold">{isReExtracting ? 'Re-rastreando...' : 'Rastrear novamente'}</span>
            </button>
          )}

          <div className="text-[#BCB4AD] flex items-center gap-1 font-mono text-[11px] px-2 py-1 bg-[#2E2621] rounded-lg border border-[#453A31]">
            <CheckCircle className="w-3.5 h-3.5 text-[#169467]" />
            <span>Auditado</span>
          </div>
        </div>
      </div>

      {/* Re-extract Feedback Modal on Left Column */}
      {isReExtractModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#2E2621] border border-[#58493D] rounded-2xl p-6 max-w-lg w-full shadow-2xl relative text-left">
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
  );
}
