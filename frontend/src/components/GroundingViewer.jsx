import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Eye, FileText, CheckCircle, Sparkles, X, Palette, Tag, Check, ArrowRight, Loader2 } from 'lucide-react';

export const AVAILABLE_GROUNDING_FIELDS = [
  { field: 'linha_digitavel', label: 'Linha Digitável / Código', defaultColor: '#34D399', category: 'Pagamento' },
  { field: 'chave_pix', label: 'Chave PIX', defaultColor: '#14B8A6', category: 'Pagamento' },
  { field: 'valor_total', label: 'Valor Total (R$)', defaultColor: '#FBBF24', category: 'Valores' },
  { field: 'valor_desconto', label: 'Valor Desconto (R$)', defaultColor: '#10B981', category: 'Valores' },
  { field: 'data_vencimento', label: 'Data de Vencimento', defaultColor: '#F472B6', category: 'Datas' },
  { field: 'data_emissao', label: 'Data de Emissão', defaultColor: '#818CF8', category: 'Datas' },
  { field: 'proxima_leitura', label: 'Próxima Leitura', defaultColor: '#2DD4BF', category: 'Datas' },
  { field: 'leitura_atual', label: 'Leitura Atual', defaultColor: '#A3E635', category: 'Datas' },
  { field: 'leitura_anterior', label: 'Leitura Anterior', defaultColor: '#D946EF', category: 'Datas' },
  { field: 'numero_medidor', label: 'Nº Medidor', defaultColor: '#F43F5E', category: 'Documento' },
  { field: 'fornecedor_nome', label: 'Fornecedor / Favorecido', defaultColor: '#A78BFA', category: 'Entidades' },
  { field: 'fornecedor_cnpj', label: 'CNPJ do Fornecedor', defaultColor: '#C084FC', category: 'Entidades' },
  { field: 'condominio_nome', label: 'Condomínio / Destinatário', defaultColor: '#38BDF8', category: 'Entidades' },
  { field: 'condominio_cnpj', label: 'CNPJ do Condomínio', defaultColor: '#06B6D4', category: 'Entidades' },
  { field: 'numero_documento', label: 'Nº do Documento / NF-e', defaultColor: '#60A5FA', category: 'Documento' },
  { field: 'protocolo_autorizacao', label: 'Protocolo de Autorização', defaultColor: '#EC4899', category: 'Documento' },
  { field: 'chave_acesso', label: 'Chave de Acesso NF-e', defaultColor: '#0284C7', category: 'Documento' },
  { field: 'codigo_instalacao', label: 'Código da Instalação', defaultColor: '#9333EA', category: 'Documento' },
  { field: 'nosso_numero', label: 'Nosso Número', defaultColor: '#4F46E5', category: 'Documento' },
  { field: 'multa_atraso', label: 'Multa por Atraso', defaultColor: '#FB7185', category: 'Valores' },
  { field: 'juros_dia', label: 'Juros ao Dia / Encargos', defaultColor: '#FB923C', category: 'Valores' },
  { field: 'fornecedor_endereco', label: 'Endereço Fornecedor', defaultColor: '#E879F9', category: 'Endereços' },
  { field: 'condominio_endereco', label: 'Endereço Condomínio', defaultColor: '#93C5FD', category: 'Endereços' },
  { field: 'fornecedor_contato', label: 'Contato Fornecedor', defaultColor: '#84CC16', category: 'Entidades' }
];

export const COLOR_PALETTE = [
  { name: 'Sky', hex: '#38BDF8' },
  { name: 'Gold', hex: '#FBBF24' },
  { name: 'Pink', hex: '#F472B6' },
  { name: 'Indigo', hex: '#818CF8' },
  { name: 'Purple', hex: '#A78BFA' },
  { name: 'Lavender', hex: '#C084FC' },
  { name: 'Cyan', hex: '#06B6D4' },
  { name: 'Light Blue', hex: '#93C5FD' },
  { name: 'Lime', hex: '#84CC16' },
  { name: 'Chartreuse', hex: '#A3E635' },
  { name: 'Magenta', hex: '#D946EF' },
  { name: 'Fuchsia', hex: '#E879F9' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Mint', hex: '#34D399' },
  { name: 'Teal', hex: '#2DD4BF' },
  { name: 'Aqua', hex: '#14B8A6' },
  { name: 'Rose', hex: '#FB7185' },
  { name: 'Ruby', hex: '#F43F5E' },
  { name: 'Orange', hex: '#FB923C' },
  { name: 'Amber', hex: '#F59E0B' },
  { name: 'Blue', hex: '#60A5FA' },
  { name: 'Ocean', hex: '#0284C7' },
  { name: 'Deep Violet', hex: '#9333EA' },
  { name: 'Deep Indigo', hex: '#4F46E5' }
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

  // 2.5 Digit Sequence Search with Optional Whitespaces (for Chave de Acesso, Linha Digitável, Protocolos)
  const digitsOnly = tgt.replace(/\D/g, '');
  if (digitsOnly.length >= 14) {
    try {
      const digitPattern = digitsOnly.split('').join('\\s*');
      const regexDig = new RegExp(digitPattern, 'i');
      const mDig = regexDig.exec(srcText);
      if (mDig) {
        return {
          start: mDig.index,
          end: mDig.index + mDig[0].length,
          matched_text: mDig[0]
        };
      }
    } catch (e) {}
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
  isReExtracting = false,
  editedFields = {}
}) {
  const [activeTab, setActiveTab] = useState("grounding");
  const [selectedText, setSelectedText] = useState('');
  const [popoverPos, setPopoverPos] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [feedbackToast, setFeedbackToast] = useState(null);
  const [viewerHeight, setViewerHeight] = useState(() => {
    if (typeof window !== 'undefined') {
      return Math.min(Math.max(window.innerHeight - 340, 480), 750);
    }
    return 540;
  });
  const [isDraggingResize, setIsDraggingResize] = useState(false);
  const [isReExtractModalOpen, setIsReExtractModalOpen] = useState(false);
  const [userHintText, setUserHintText] = useState('');
  const containerRef = useRef(null);
  const popoverRef = useRef(null);
  const isResizingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(540);

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
      const newH = Math.max(260, Math.min(2200, startHeightRef.current + deltaY));
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

    document.body.style.cursor = 'se-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const resolveTargetElement = (field) => {
    if (!field) return null;
    const rawKey = String(field).trim();
    let el = document.getElementById(`grounding-${rawKey}`);
    if (el) return el;

    const normKey = rawKey.toLowerCase().replace(/[\s_-]+/g, '');

    const aliases = {
      fornecedor_endereco: ['fornecedor_endereco', 'endereco_fornecedor', 'endereco', 'end_fornecedor'],
      endereco_fornecedor: ['fornecedor_endereco', 'endereco_fornecedor', 'endereco', 'end_fornecedor'],
      condominio_endereco: ['condominio_endereco', 'endereco_pagador', 'endereco_condominio', 'end_condominio'],
      endereco_pagador: ['condominio_endereco', 'endereco_pagador', 'endereco_condominio', 'end_condominio'],
      fornecedor_contato: ['fornecedor_contato', 'contato_fornecedor', 'contato', 'telefone', 'telefone_ligacao_gratuita'],
      contato_fornecedor: ['fornecedor_contato', 'contato_fornecedor', 'contato', 'telefone', 'telefone_ligacao_gratuita'],
      telefone_ligacao_gratuita: ['fornecedor_contato', 'contato_fornecedor', 'contato', 'telefone', 'telefone_ligacao_gratuita'],
      fornecedor_nome: ['fornecedor_nome', 'fornecedor'],
      condominio_nome: ['condominio_nome', 'condominio'],
      fornecedor_cnpj: ['fornecedor_cnpj', 'cnpj_fornecedor'],
      condominio_cnpj: ['condominio_cnpj', 'cnpj_condominio'],
      valor_total: ['valor_total', 'valor'],
      data_vencimento: ['data_vencimento', 'vencimento'],
      data_emissao: ['data_emissao', 'emissao'],
      numero_documento: ['numero_documento', 'num_doc', 'protocolo'],
      multa_atraso: ['multa_atraso', 'multa'],
      juros_dia: ['juros_dia', 'juros'],
      linha_digitavel: ['linha_digitavel', 'linha'],
      chave_pix: ['chave_pix', 'pix'],
      proxima_leitura: ['proxima_leitura', 'leitura'],
      leitura_atual: ['leitura_atual'],
      leitura_anterior: ['leitura_anterior'],
      numero_medidor: ['numero_medidor', 'medidor'],
      codigo_instalacao: ['codigo_instalacao', 'instalacao'],
      chave_acesso: ['chave_acesso'],
      nosso_numero: ['nosso_numero']
    };

    const candList = [...(aliases[rawKey] || [rawKey])];
    if (normKey.includes('telefone') || normKey.includes('contato') || normKey.includes('fone') || normKey.includes('gratuita')) {
      candList.push('fornecedor_contato', 'contato_fornecedor', 'contato', 'telefone', 'telefone_ligacao_gratuita');
    }
    if (normKey.includes('leitura')) {
      candList.push('proxima_leitura', 'leitura_atual', 'leitura_anterior');
    }
    if (normKey.includes('medidor')) {
      candList.push('numero_medidor');
    }
    if (normKey.includes('chave')) {
      candList.push('chave_acesso', 'chave_pix');
    }
    if (normKey.includes('protocolo')) {
      candList.push('protocolo_autorizacao', 'protocolo');
    }
    if (normKey.includes('instalacao')) {
      candList.push('codigo_instalacao');
    }
    if (normKey.includes('condominio')) {
      candList.push('condominio_nome', 'condominio_cnpj', 'condominio_endereco');
    }
    if (normKey.includes('fornecedor')) {
      candList.push('fornecedor_nome', 'fornecedor_cnpj', 'fornecedor_endereco', 'fornecedor_contato');
    }

    for (const cand of candList) {
      el = document.getElementById(`grounding-${cand}`);
      if (el) return el;
      el = document.querySelector(`.kai-html-renderer mark[id*="${cand}"]`);
      if (el) return el;
      el = document.querySelector(`.kai-html-renderer mark[title*="${cand}"]`);
      if (el) return el;
    }

    // Check all marks in renderer matching normalized field or title
    const allMarks = document.querySelectorAll('.kai-html-renderer mark');
    for (const mark of allMarks) {
      const markIdNorm = (mark.id || '').replace('grounding-', '').toLowerCase().replace(/[\s_-]+/g, '');
      const markTitleNorm = (mark.getAttribute('title') || '').toLowerCase().replace(/[\s_-]+/g, '');
      if (markIdNorm && (markIdNorm === normKey || normKey.includes(markIdNorm) || markIdNorm.includes(normKey))) {
        return mark;
      }
      if (markTitleNorm && (markTitleNorm === normKey || normKey.includes(markTitleNorm) || markTitleNorm.includes(normKey))) {
        return mark;
      }
    }

    // Fallback: check matching span from groundingSpans
    const matchedSpan = (groundingSpans || []).find(s => {
      const sNorm = (s.field || '').toLowerCase().replace(/[\s_-]+/g, '');
      const lNorm = (s.label || '').toLowerCase().replace(/[\s_-]+/g, '');
      return sNorm === normKey || lNorm === normKey || sNorm.includes(normKey) || normKey.includes(sNorm);
    });
    if (matchedSpan && matchedSpan.field) {
      el = document.getElementById(`grounding-${matchedSpan.field}`);
      if (el) return el;
      el = document.querySelector(`.kai-html-renderer mark[id*="${matchedSpan.field}"]`);
      if (el) return el;
    }

    return null;
  };

  const highlightAndScroll = (field) => {
    if (!field) return;
    const rawKey = typeof field === 'object' ? field.field : field;
    if (!rawKey) return;

    const marks = document.querySelectorAll('.kai-html-renderer mark');
    marks.forEach(m => {
      m.classList.remove('active-scroll');
      const dot = m.querySelector('.blink-dot');
      if (dot) {
        dot.classList.remove('active');
        dot.classList.remove('edited');
      }
    });

    const target = resolveTargetElement(rawKey);
    if (target) {
      // 1. Direct container scroll (accurate & guaranteed across all browsers)
      if (containerRef.current) {
        const container = containerRef.current;
        const targetRect = target.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const relativeTop = targetRect.top - containerRect.top + container.scrollTop;
        const targetScrollTop = relativeTop - (container.clientHeight / 2) + (targetRect.height / 2);
        container.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: 'smooth'
        });
      }
      
      // 2. Also call native scrollIntoView
      try {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (e) {}

      target.classList.add('active-scroll');
      const dot = target.querySelector('.blink-dot');
      if (dot) {
        dot.classList.add('active');
        const isFieldEdited = Boolean(
          editedFields && (
            editedFields[rawKey] ||
            editedFields[rawKey.toLowerCase()] ||
            (target.id && editedFields[target.id.replace('grounding-', '')])
          )
        );
        if (isFieldEdited) {
          dot.classList.add('edited');
        } else {
          dot.classList.remove('edited');
        }
      }
    }
  };

  useEffect(() => {
    if (focusedField) {
      const fieldName = typeof focusedField === 'object' ? focusedField.field : focusedField;
      if (activeTab === 'grounding') {
        const timer = setTimeout(() => {
          highlightAndScroll(fieldName);
        }, 30);
        return () => clearTimeout(timer);
      }
    }
  }, [focusedField, editedFields, activeTab]);

  const handleSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      return;
    }

    const text = selection.toString().trim();
    if (text.length >= 1 && containerRef.current) {
      try {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const container = containerRef.current;
        const containerRect = container.getBoundingClientRect();

        // Calculate exact content position considering container.scrollTop and container.scrollLeft
        const relativeTop = rect.bottom - containerRect.top + container.scrollTop + 8;
        const relativeLeft = Math.max(10, Math.min(rect.left - containerRect.left + container.scrollLeft, containerRect.width - 340));

        // If selection is near the bottom of the container viewport, position the popover above the line
        const spaceBelow = containerRect.bottom - rect.bottom;
        let finalTop = relativeTop;
        if (spaceBelow < 280 && (rect.top - containerRect.top) > 260) {
          finalTop = rect.top - containerRect.top + container.scrollTop - 290;
        }

        setSelectedText(text);
        setPopoverPos({ top: Math.max(10, finalTop), left: relativeLeft });
        setSelectedColor(null);
        setSearchFilter('');
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

  useEffect(() => {
    const handleDocumentMouseDown = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.toString().trim()) {
          closePopover();
        }
      }
    };

    if (popoverPos) {
      document.addEventListener('mousedown', handleDocumentMouseDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleDocumentMouseDown);
    };
  }, [popoverPos]);

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
            Auditoria Visual & Documento
          </h3>
          <p className="text-xs text-[#BCB4AD] font-mono">
            {groundingSpans?.length || 0} entidades ancoradas • Clique em qualquer trecho ou tag para focar no formulário
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-[#1D1714] p-0.5 rounded-lg border border-[#453A31]">
            <button
              type="button"
              onClick={() => setActiveTab("grounding")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === "grounding" 
                  ? "bg-[#D5A474] text-[#1D1714] font-semibold shadow-sm" 
                  : "text-[#97918D] hover:text-[#FFFEFD]"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Grounding</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("raw")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === "raw" 
                  ? "bg-[#D5A474] text-[#1D1714] font-semibold shadow-sm" 
                  : "text-[#97918D] hover:text-[#FFFEFD]"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Texto Puro</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main OCR Content Container */}
      <div 
        ref={containerRef}
        style={{ 
          height: `${viewerHeight}px`,
          maxHeight: `${viewerHeight}px`,
          minHeight: '260px'
        }}
        onClick={handleContainerClick}
        onMouseUp={handleSelection}
        className="w-full overflow-y-auto overflow-x-auto bg-[#1D1714] rounded-xl p-4 border border-[#453A31] text-xs font-mono text-[#FFFEFD] leading-relaxed select-text transition-[border-color] relative flex-none shadow-inner custom-scrollbar"
      >
        {activeTab === 'grounding' ? (
          <div className="kai-html-renderer">
            {displayHtml ? (
              <div 
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
                      className={`w-5 h-5 rounded-full transition-transform ${
                        isSelected ? 'scale-125 ring-2 ring-white ring-offset-1 ring-offset-[#1D1714]' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    />
                  );
                })}
              </div>
            </div>

            <div className="mb-2">
              <input
                type="text"
                placeholder="Buscar campo (ex: multa, pix)..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-[#1D1714] border border-[#453A31] rounded-lg px-2.5 py-1 text-xs text-[#FFFEFD] placeholder-[#97918D]/60 outline-none focus:border-[#D5A474]"
              />
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {filteredFields.map((fieldObj) => {
                const assignedColor = selectedColor || fieldObj.defaultColor;
                return (
                  <button
                    key={fieldObj.field}
                    onClick={() => handleAssignField(fieldObj)}
                    className="w-full flex items-center justify-between p-1.5 rounded-lg bg-[#1D1714]/60 hover:bg-[#58493D]/50 border border-[#453A31]/50 hover:border-[#D5A474]/50 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div 
                        className="w-2.5 h-2.5 rounded-full shrink-0" 
                        style={{ backgroundColor: assignedColor }}
                      />
                      <span className="text-xs text-[#FFFEFD] font-medium truncate">
                        {fieldObj.label}
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
        className={`w-full py-2 flex items-center justify-between px-3 cursor-ns-resize group select-none hover:bg-[#58493D]/40 rounded-b-xl transition-all mt-1 relative border-t border-[#453A31]/60 ${
          isDraggingResize ? 'bg-[#58493D]/70 ring-1 ring-[#D5A474]' : ''
        }`}
        title="Clique e arraste para redimensionar verticalmente"
      >
        <span className="text-[10px] font-mono text-[#97918D] group-hover:text-[#D5A474] flex items-center gap-1 select-none">
          ↕ Altura: {viewerHeight}px
        </span>

        <div className="w-16 h-1 rounded-full bg-[#58493D] group-hover:bg-[#D5A474] transition-colors" />
        
        {/* Corner Grip Icon */}
        <div 
          onMouseDown={handleResizeStart}
          className="text-[#97918D] group-hover:text-[#D5A474] hover:scale-125 transition-all cursor-se-resize flex items-center justify-center p-1 rounded hover:bg-[#58493D]"
          title="Arraste pelo canto inferior direito para redimensionar"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 2L2 12M12 6L6 12M12 10L10 12" />
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
                  onClick={() => {
                    highlightAndScroll(item.field || item.label);
                    if (onFocusField) onFocusField(item.field || item.label);
                  }}
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
              <button 
                onClick={() => {
                  highlightAndScroll('condominio_nome');
                  if (onFocusField) onFocusField('condominio_nome');
                }} 
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]/40 border-b-2 border-b-[#38bdf8] font-mono text-[10px] font-medium hover:scale-105 cursor-pointer"
              >
                Condomínio
              </button>
              <button 
                onClick={() => {
                  highlightAndScroll('fornecedor_nome');
                  if (onFocusField) onFocusField('fornecedor_nome');
                }} 
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/40 border-b-2 border-b-[#a78bfa] font-mono text-[10px] font-medium hover:scale-105 cursor-pointer"
              >
                Fornecedor
              </button>
              <button 
                onClick={() => {
                  highlightAndScroll('valor_total');
                  if (onFocusField) onFocusField('valor_total');
                }} 
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#fbbf24]/15 text-[#fbbf24] border border-[#fbbf24]/40 border-b-2 border-b-[#fbbf24] font-mono text-[10px] font-medium hover:scale-105 cursor-pointer"
              >
                Valor Total
              </button>
              <button 
                onClick={() => {
                  highlightAndScroll('data_vencimento');
                  if (onFocusField) onFocusField('data_vencimento');
                }} 
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#f472b6]/15 text-[#f472b6] border border-[#f472b6]/40 border-b-2 border-b-[#f472b6] font-mono text-[10px] font-medium hover:scale-105 cursor-pointer"
              >
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
