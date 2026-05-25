import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PresentationItem, Slide, Theme } from '../types';
import { Music, FileText, Sparkles, Tag, Plus, Check, Play, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

interface ReflowEditorProps {
  item: PresentationItem;
  onUpdateSlides: (itemId: string, newSlides: Slide[]) => void;
  activeSlideIndex: number;
  onSlideClick: (index: number) => void;
  onSlideDoubleClick: (index: number) => void;
  liveSlideIndex: number;
  isLiveActive: boolean;
}

export const ReflowEditor: React.FC<ReflowEditorProps> = ({
  item,
  onUpdateSlides,
  activeSlideIndex,
  onSlideClick,
  onSlideDoubleClick,
  liveSlideIndex,
  isLiveActive,
}) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineCounterRef = useRef<HTMLDivElement>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  
  // Historial de Deshacer / Rehacer local
  const [textHistory, setTextHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUpdatingHistory = useRef(false);

  // Registrar cambios en el historial (con debounce de 800ms)
  const lastSavedText = useRef('');
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  const pushToHistory = (newVal: string) => {
    if (isUpdatingHistory.current) return;
    
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    
    setIsSaving(true);
    saveTimeout.current = setTimeout(() => {
      setIsSaving(false);
      
      if (newVal !== lastSavedText.current) {
        setTextHistory(prev => {
          const next = prev.slice(0, historyIndex + 1);
          return [...next, newVal];
        });
        setHistoryIndex(prev => prev + 1);
        lastSavedText.current = newVal;
      }
    }, 800);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      isUpdatingHistory.current = true;
      const prevVal = textHistory[historyIndex - 1];
      setHistoryIndex(prev => prev - 1);
      setText(prevVal);
      handleTextChangeWithoutHistory(prevVal);
      setTimeout(() => { isUpdatingHistory.current = false; }, 50);
    }
  };

  const handleRedo = () => {
    if (historyIndex < textHistory.length - 1) {
      isUpdatingHistory.current = true;
      const nextVal = textHistory[historyIndex + 1];
      setHistoryIndex(prev => prev + 1);
      setText(nextVal);
      handleTextChangeWithoutHistory(nextVal);
      setTimeout(() => { isUpdatingHistory.current = false; }, 50);
    }
  };

  // Convert current slides to text when the active item changes or slides are modified externally
  const slidesText = useMemo(() => {
    return item.slides.map(slide => {
      const header = slide.label ? `[${slide.label}]\n` : '';
      return `${header}${slide.content}`;
    }).join('\n\n');
  }, [item.id]); // Recalculate only when the active item itself changes

  // Sync internal text state with outer state when item changes
  useEffect(() => {
    setText(slidesText);
    setTextHistory([slidesText]);
    setHistoryIndex(0);
    lastSavedText.current = slidesText;
  }, [slidesText]);

  // Sync scrolling of line counter gutter and textarea
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineCounterRef.current) {
      lineCounterRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  // Generate line numbers array based on how many lines are in the textarea
  const lineNumbers = useMemo(() => {
    const lines = text.split('\n');
    return Array.from({ length: Math.max(lines.length, 1) }, (_, i) => i + 1);
  }, [text]);

  const handleTextChangeWithoutHistory = (newVal: string) => {
    // Split text into blocks by double newlines (ignoring leading/trailing spaces)
    const blocks = newVal.split(/\n\s*\n/);
    const parsedSlides = blocks.map((block, idx) => {
      const lines = block.split('\n');
      let label = '';
      const contentLines = [...lines];

      // Check if the first line starts/ends with square brackets, representing the slide type/label
      if (lines[0] && lines[0].trim().startsWith('[') && lines[0].trim().endsWith(']')) {
        label = lines[0].trim().slice(1, -1).trim();
        contentLines.shift(); // Remove the label header from text content
      }

      const content = contentLines.join('\n').trim();
      const originalSlide = item.slides[idx];

      if (originalSlide) {
        return {
          ...originalSlide,
          label: label || originalSlide.label || '',
          content,
          segments: originalSlide.content === content ? originalSlide.segments : undefined,
        };
      } else {
        return {
          id: `slide_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'text' as const,
          label,
          content,
        };
      }
    });

    onUpdateSlides(item.id, parsedSlides);
  };

  // Parse text back into slides and trigger the update callback
  const handleTextChange = (newVal: string) => {
    // Detección de auto-etiquetado inteligente en tiempo real al escribir (AI Tagging al escribir)
    let val = newVal;
    const keywordPattern = /(?:^|\n)(verso|coro|puente|intro|instrumental|verse|chorus|bridge)(\n|$)/gi;
    const updatedVal = val.replace(keywordPattern, (match, keyword, newline) => {
      const capitalized = keyword.charAt(0).toUpperCase() + keyword.slice(1).toLowerCase();
      const isStart = match.startsWith('\n') ? '\n' : '';
      return `${isStart}[${capitalized}]${newline}`;
    });

    if (updatedVal !== val) {
      val = updatedVal;
    }

    setText(val);
    handleTextChangeWithoutHistory(val);
    pushToHistory(val);
  };

  // Insert a tag at current cursor position
  const insertTag = (tagName: string) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const beforeText = text.substring(0, start);
    const afterText = text.substring(end);
    
    // Add extra newlines if needed for structure
    const needsPrefixNewline = start > 0 && text.charAt(start - 1) !== '\n';
    const tag = `[${tagName}]\n`;
    const newText = beforeText + (needsPrefixNewline ? '\n' : '') + tag + afterText;
    
    handleTextChange(newText);
    
    // Focus back and set selection
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + (needsPrefixNewline ? 1 : 0) + tag.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 50);
  };

  const toggleAllCaps = () => {
    const uppercaseText = text.toUpperCase();
    handleTextChange(uppercaseText);
  };

  const stripChords = () => {
    const lines = text.split('\n');
    const cleanedLines = lines.filter(line => {
      const words = line.trim().split(/\s+/);
      if (words.length === 0 || line.trim() === '') return true;
      if (line.trim().startsWith('[') && line.trim().endsWith(']')) return true;

      // Evaluar si todos los tokens coinciden con notas musicales estándar / acordes
      const isAllChords = words.every(word => {
        return /^[A-G][b#]?(?:maj|min|m|sus|dim|aug|add|maj7|min7|m7|7|9|add9|sus4|sus2)?(?:\/[A-G][b#]?)?$/i.test(word);
      });

      return !isAllChords;
    });
    handleTextChange(cleanedLines.join('\n'));
  };

  const autoCorrectSpelling = () => {
    let corrected = text;
    const replacements = [
      { search: /\bdios\b/gi, replace: 'Dios' },
      { search: /\bjesucristo\b/gi, replace: 'Jesucristo' },
      { search: /\bjesús\b/gi, replace: 'Jesús' },
      { search: /\bjesus\b/gi, replace: 'Jesús' },
      { search: /\bespiritu santo\b/gi, replace: 'Espíritu Santo' },
      { search: /\bespíritu santo\b/gi, replace: 'Espíritu Santo' },
      { search: /\bespiritu\b/gi, replace: 'Espíritu' },
      { search: /\bseñor\b/gi, replace: 'Señor' },
      { search: /\bjehová\b/gi, replace: 'Jehová' },
      { search: /\bjehova\b/gi, replace: 'Jehová' },
      { search: /\bamén\b/gi, replace: 'Amén' },
      { search: /\bamen\b/gi, replace: 'Amén' },
    ];
    replacements.forEach(r => {
      corrected = corrected.replace(r.search, r.replace);
    });
    handleTextChange(corrected);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl + 1: Verso
    if (e.ctrlKey && e.key === '1') {
      e.preventDefault();
      insertTag('Verso');
    }
    // Ctrl + 2: Coro
    if (e.ctrlKey && e.key === '2') {
      e.preventDefault();
      insertTag('Coro');
    }
    // Ctrl + 3: Puente
    if (e.ctrlKey && e.key === '3') {
      e.preventDefault();
      insertTag('Puente');
    }
    // Ctrl + 4: Instrumental
    if (e.ctrlKey && e.key === '4') {
      e.preventDefault();
      insertTag('Instrumental');
    }
    // Ctrl + 5: En Blanco
    if (e.ctrlKey && e.key === '5') {
      e.preventDefault();
      insertTag('En Blanco');
    }
  };

  // Pre-calculate styling tokens based on item theme
  const slideStyles = (slideTheme: Theme) => {
    const isGradient = slideTheme.background.includes('gradient');
    const isImage = slideTheme.background.includes('url(') || slideTheme.background.startsWith('http') || slideTheme.background.startsWith('data:');
    
    let backgroundStyle: React.CSSProperties = {};
    if (isGradient) {
      backgroundStyle.background = slideTheme.background;
    } else if (isImage) {
      backgroundStyle.backgroundImage = slideTheme.background.includes('url(') ? slideTheme.background : `url(${slideTheme.background})`;
      backgroundStyle.backgroundSize = 'cover';
      backgroundStyle.backgroundPosition = 'center';
    } else {
      backgroundStyle.backgroundColor = slideTheme.background || '#0f172a';
    }

    return backgroundStyle;
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#060a13] text-white">
      {/* Reflow Header Info */}
      <div className="px-5 py-3.5 bg-[#0a101b]/90 border-b border-white/10 flex items-center justify-between shrink-0 gap-4 flex-wrap animate-in fade-in duration-300">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="text-cyan-400 w-4 h-4 animate-pulse" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Reflow Editor Inteligente</span>
          </div>

          {/* Autosave Indicator Led */}
          <div className="hidden sm:block">
            {isSaving ? (
              <div className="flex items-center gap-1.5 text-cyan-400 text-[10px] font-black uppercase tracking-wide bg-cyan-950/40 border border-cyan-800/30 px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping" /> Sincronizando...
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-black uppercase tracking-wide bg-emerald-950/40 border border-emerald-800/30 px-2.5 py-0.5 rounded-full animate-in fade-in">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> ✓ Sincronizado
              </div>
            )}
          </div>
        </div>

        {/* Local Undo/Redo & Focus Mode controls */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-slate-950/50 border border-white/5 rounded-lg p-0.5 shadow-inner">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className={`px-2 py-1 text-xs rounded transition-all font-bold ${historyIndex <= 0 ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:text-white hover:bg-white/5 active:scale-90'}`}
              title="Deshacer cambio (Ctrl + Z local)"
            >
              ↩ Deshacer
            </button>
            <div className="w-[1px] h-3.5 bg-white/10" />
            <button
              onClick={handleRedo}
              disabled={historyIndex >= textHistory.length - 1}
              className={`px-2 py-1 text-xs rounded transition-all font-bold ${historyIndex >= textHistory.length - 1 ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:text-white hover:bg-white/5 active:scale-90'}`}
              title="Rehacer cambio"
            >
              Rehacer ↪
            </button>
          </div>

          <button
            onClick={() => setIsFocusMode(!isFocusMode)}
            className={`px-3 py-1.5 rounded-lg border transition-all text-xs font-black shadow flex items-center gap-1.5 active:scale-95 ${
              isFocusMode 
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-extrabold animate-pulse' 
                : 'bg-slate-800/60 border-white/10 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {isFocusMode ? '📺 Salir de Enfoque' : '📺 Modo Enfoque'}
          </button>

          <div className="hidden lg:block text-[10px] text-slate-400 italic bg-white/5 border border-white/10 px-3 py-1.5 rounded-full shadow-inner">
            Separa cada diapositiva dejando una línea en blanco
          </div>
        </div>
      </div>

      {/* Reflow Layout: Split screen */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* LEFT COLUMN: Text Editor */}
        <div 
          className={`border-r border-white/10 flex flex-col min-h-0 bg-[#080d17] transition-all duration-300 ${
            isFocusMode ? 'w-full lg:w-full border-none ring-2 ring-cyan-500/20 shadow-2xl shadow-cyan-950/20' : 'w-full lg:w-[45%]'
          }`}
        >
          {/* Quick Insertion & Smart Actions Bar */}
          <div className="p-3 bg-[#0a111e]/90 border-b border-white/10 flex flex-col gap-2 shrink-0">
            {/* Tags Insertion Row */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => insertTag('Verso')}
                className="px-2.5 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600 hover:text-white transition-all text-[11px] font-black flex items-center gap-1 shadow active:scale-95 animate-in fade-in duration-300"
                title="Atajo: Ctrl + 1"
              >
                <Tag size={10} /> + Verso
              </button>
              <button
                onClick={() => insertTag('Coro')}
                className="px-2.5 py-1.5 rounded-lg bg-pink-600/20 border border-pink-500/30 text-pink-300 hover:bg-pink-600 hover:text-white transition-all text-[11px] font-black flex items-center gap-1 shadow active:scale-95 animate-in fade-in duration-300"
                title="Atajo: Ctrl + 2"
              >
                <Tag size={10} /> + Coro
              </button>
              <button
                onClick={() => insertTag('Puente')}
                className="px-2.5 py-1.5 rounded-lg bg-cyan-600/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-600 hover:text-white transition-all text-[11px] font-black flex items-center gap-1 shadow active:scale-95 animate-in fade-in duration-300"
                title="Atajo: Ctrl + 3"
              >
                <Tag size={10} /> + Puente
              </button>
              <button
                onClick={() => insertTag('Instrumental')}
                className="px-2.5 py-1.5 rounded-lg bg-amber-600/20 border border-amber-500/30 text-amber-300 hover:bg-amber-600 hover:text-white transition-all text-[11px] font-black flex items-center gap-1 shadow active:scale-95 animate-in fade-in duration-300"
                title="Atajo: Ctrl + 4"
              >
                <Tag size={10} /> + Instrumental
              </button>
              <button
                onClick={() => insertTag('En Blanco')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-700/30 border border-slate-600/30 text-slate-300 hover:bg-slate-600 hover:text-white transition-all text-[11px] font-black flex items-center gap-1 shadow active:scale-95 animate-in fade-in duration-300"
                title="Atajo: Ctrl + 5 (Inserta pausa de texto)"
              >
                <Plus size={10} /> + En Blanco
              </button>
            </div>

            {/* Smart Actions Row */}
            <div className="flex flex-wrap gap-2 border-t border-white/5 pt-2">
              <button
                onClick={toggleAllCaps}
                className="px-2.5 py-1 rounded bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 hover:bg-cyan-500 hover:text-slate-950 transition-all text-[10px] font-black flex items-center gap-1 active:scale-95 shadow-sm"
                title="Convertir todas las letras a MAYÚSCULAS"
              >
                A/A MAYÚSCULAS
              </button>
              <button
                onClick={stripChords}
                className="px-2.5 py-1 rounded bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500 hover:text-white transition-all text-[10px] font-black flex items-center gap-1 active:scale-95 shadow-sm"
                title="Elimina líneas que contengan acordes de guitarra (C, D, E, F...)"
              >
                🎸 Limpiar Acordes
              </button>
              <button
                onClick={autoCorrectSpelling}
                className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 transition-all text-[10px] font-black flex items-center gap-1 active:scale-95 shadow-sm"
                title="Autocorregir 'dios' -> 'Dios', etc."
              >
                <Sparkles size={10} /> Auto-Corregir
              </button>
            </div>
          </div>

          {/* Textarea Workspace with Line Numbers */}
          <div className="flex-1 flex min-h-0 relative overflow-hidden font-mono text-sm leading-relaxed">
            {/* Line Number Gutter with physical slide dividers */}
            <div
              ref={lineCounterRef}
              className="w-12 bg-slate-950/60 text-slate-600 text-right pr-2 py-4 border-r border-white/5 select-none overflow-hidden scrollbar-hide text-xs"
            >
              {lineNumbers.map(line => {
                const lineContent = text.split('\n')[line - 1];
                const isEmptyLine = lineContent === '' || lineContent === undefined;
                return (
                  <div key={line} className="h-[24px] flex items-center justify-end relative">
                    {isEmptyLine ? (
                      <span className="text-[10px] text-cyan-500/40 font-bold select-none pr-1 absolute right-0 animate-pulse">⎼⎼</span>
                    ) : (
                      line
                    )}
                  </div>
                );
              })}
            </div>

            {/* Main Textarea */}
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              onScroll={handleScroll}
              onKeyDown={handleKeyDown}
              placeholder="[Verso]\nEscribe la letra de tu canción aquí..."
              className="flex-1 h-full bg-transparent text-slate-100 p-4 outline-none resize-none border-none overflow-y-auto caret-cyan-400 text-xs sm:text-sm font-mono scrollbar-thin scrollbar-thumb-white/10"
              style={{ lineHeight: '24px' }}
            />
          </div>
        </div>

        {/* RIGHT COLUMN: Realtime Live Grid Preview */}
        {!isFocusMode && (
          <div className="flex-1 flex flex-col min-h-0 bg-[#050812] animate-in fade-in duration-300">
            <div className="px-5 py-3 border-b border-white/5 bg-[#070b14] flex items-center justify-between shrink-0">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Visualización de Diapositivas en Vivo</span>
              <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md font-bold">{item.slides.length} diapositivas</span>
            </div>

            {/* Rejilla de Diapositivas */}
            <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-5 content-start">
              {item.slides.map((slide, idx) => {
                const isActive = activeSlideIndex === idx;
                const isLive = isLiveActive && liveSlideIndex === idx;
                const customBackground = slideStyles(item.theme);
                
                // Contar líneas del contenido
                const lineCount = slide.content.split('\n').filter(l => l.trim() !== '').length;
                const hasTooManyLines = lineCount > 4;

                return (
                  <div
                    key={slide.id}
                    onClick={() => onSlideClick(idx)}
                    onDoubleClick={() => onSlideDoubleClick(idx)}
                    className={`aspect-video rounded-xl overflow-hidden border-2 cursor-pointer transition-all duration-300 relative group shadow-lg ${
                      isActive 
                        ? 'border-cyan-400 ring-4 ring-cyan-500/20 scale-[1.02] shadow-cyan-500/10' 
                        : isLive 
                          ? 'border-red-500 ring-4 ring-red-500/25 shadow-red-500/10'
                          : 'border-white/10 hover:border-slate-500 hover:scale-[1.01]'
                    }`}
                    style={customBackground}
                  >
                    {/* Glassmorphic Indicator Bar */}
                    <div className="absolute top-2 left-2 right-2 flex justify-between items-center z-20 gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-black bg-black/60 backdrop-blur-md border border-white/10 text-slate-300 px-2 py-0.5 rounded shadow">
                          #{idx + 1}
                        </span>
                        {hasTooManyLines && (
                          <span 
                            className="text-[8px] bg-amber-500/95 border border-amber-400/20 text-slate-950 font-black px-1.5 py-0.5 rounded shadow animate-pulse"
                            title="¡Diapositiva muy larga! Se recomienda un máximo de 4 líneas para facilitar la lectura rápida."
                          >
                            ⚠️ {lineCount}L
                          </span>
                        )}
                      </div>
                      {slide.label && (
                        <span className="text-[9px] font-black bg-indigo-600/90 backdrop-blur-md text-white px-2 py-0.5 rounded shadow flex items-center gap-1 uppercase tracking-wide">
                          <Tag size={8} /> {slide.label}
                        </span>
                      )}
                      {isLive && (
                        <span className="text-[8px] font-black bg-red-600 text-white px-1.5 py-0.5 rounded animate-pulse shadow-md">
                          LIVE
                        </span>
                      )}
                    </div>

                    {/* Text Centering Box styled similarly to LiveScreen */}
                    <div 
                      className="absolute inset-0 p-4 flex flex-col justify-center select-none"
                      style={{
                        fontFamily: item.theme.fontFamily || 'Inter',
                        color: item.theme.textColor || '#ffffff',
                        textAlign: item.theme.alignment === 'center' ? 'center' : item.theme.alignment === 'right' ? 'right' : 'left',
                        fontSize: '9px', // Scaled down for mini preview
                        fontWeight: item.theme.fontWeight || 'normal',
                        lineHeight: item.theme.lineHeight || 1.3,
                      }}
                    >
                      <div className="line-clamp-4 whitespace-pre-wrap font-sans text-center text-[10px] drop-shadow-md leading-normal">
                        {slide.content || <span className="text-slate-600 italic">Vacio</span>}
                      </div>
                    </div>

                    {/* Hover Quick Play Button */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-[1px] z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSlideDoubleClick(idx);
                        }}
                        className="p-3 bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-full shadow-lg shadow-cyan-400/20 transform hover:scale-110 active:scale-90 transition-all"
                        title="Proyectar en Vivo"
                      >
                        <Play size={16} fill="currentColor" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
