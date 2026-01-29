import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TextSegment, AnimationType } from '../types';
import { Type, Palette, Bold, Italic, Underline, Sparkles, X, Check, ChevronDown, RotateCcw, Minus, Plus, ALargeSmall, MoveHorizontal, RotateCw } from 'lucide-react';

interface RichTextEditorProps {
    segments: TextSegment[];
    onUpdateSegments: (segments: TextSegment[]) => void;
    onTextChange?: (text: string) => void;
    globalColor?: string;
    globalFontSize?: string;
    globalFontFamily?: string;
    className?: string;
}

// Colores predefinidos para selección rápida - EXPANDIDOS
const QUICK_COLORS = [
    // Row 1: Básicos
    '#ffffff', '#000000', '#808080', '#c0c0c0',
    // Row 2: Primarios brillantes
    '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#00ffff', '#ff00ff',
    // Row 3: Pasteles y cálidos
    '#fbbf24', '#fb923c', '#ef4444', '#f472b6', '#e879f9', '#a78bfa',
    // Row 4: Fríos y naturales
    '#60a5fa', '#38bdf8', '#2dd4bf', '#34d399', '#a3e635', '#facc15'
];

// Gradientes predefinidos
const GRADIENTS = [
    { label: '🌅', value: 'linear-gradient(90deg, #f59e0b, #ef4444)' },
    { label: '🌊', value: 'linear-gradient(90deg, #06b6d4, #3b82f6)' },
    { label: '🌸', value: 'linear-gradient(90deg, #ec4899, #8b5cf6)' },
    { label: '🌿', value: 'linear-gradient(90deg, #22c55e, #eab308)' },
    { label: '🔥', value: 'linear-gradient(90deg, #ef4444, #f97316, #eab308)' },
    { label: '🌈', value: 'linear-gradient(90deg, #ef4444, #f97316, #eab308, #22c55e, #3b82f6, #8b5cf6)' },
    { label: '💜', value: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899)' },
    { label: '🌙', value: 'linear-gradient(90deg, #1e3a8a, #7c3aed)' },
];

const FONT_SIZES = [
    { label: 'XS', value: 'text-2xl', percent: 50 },
    { label: 'S', value: 'text-4xl', percent: 75 },
    { label: 'M', value: 'text-6xl', percent: 100 },
    { label: 'L', value: 'text-8xl', percent: 150 },
    { label: 'XL', value: 'text-9xl', percent: 200 },
    { label: '2XL', value: 'text-[10rem]', percent: 300 },
];

// Convertir texto plano a segmentos (una palabra por segmento)
export const textToSegments = (text: string): TextSegment[] => {
    if (!text.trim()) return [];

    // Separar por espacios manteniendo los espacios como parte de la estructura
    const words = text.split(/(\s+)/);
    return words.map((word, index) => ({
        id: `seg_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 5)}`,
        text: word
    }));
};

// Convertir segmentos a texto plano
export const segmentsToText = (segments: TextSegment[]): string => {
    return segments.map(s => s.text).join('');
};

const RichTextEditor: React.FC<RichTextEditorProps> = ({
    segments,
    onUpdateSegments,
    onTextChange,
    globalColor = '#ffffff',
    globalFontSize = 'text-6xl',
    globalFontFamily = 'Montserrat, sans-serif',
    className = ''
}) => {
    const [selectedSegmentIds, setSelectedSegmentIds] = useState<Set<string>>(new Set());
    const [showToolbar, setShowToolbar] = useState(false);
    const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Sincronizar editText cuando segments cambian
    useEffect(() => {
        if (!isEditing) {
            setEditText(segmentsToText(segments));
        }
    }, [segments, isEditing]);

    // Click en un segmento para seleccionarlo
    const handleSegmentClick = (segmentId: string, e: React.MouseEvent) => {
        e.stopPropagation();

        if (e.shiftKey) {
            // Multi-selección
            setSelectedSegmentIds(prev => {
                const newSet = new Set(prev);
                if (newSet.has(segmentId)) {
                    newSet.delete(segmentId);
                } else {
                    newSet.add(segmentId);
                }
                return newSet;
            });
        } else {
            // Selección simple
            setSelectedSegmentIds(new Set([segmentId]));
        }

        // Posicionar toolbar
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (containerRect) {
            setToolbarPosition({
                x: rect.left - containerRect.left + rect.width / 2,
                y: rect.top - containerRect.top - 10
            });
        }
        setShowToolbar(true);
    };

    // Deseleccionar al hacer click fuera
    const handleContainerClick = () => {
        if (selectedSegmentIds.size > 0) {
            setSelectedSegmentIds(new Set());
            setShowToolbar(false);
        }
    };

    // Aplicar estilo a segmentos seleccionados
    const applyStyle = useCallback((styleUpdate: Partial<TextSegment>) => {
        if (selectedSegmentIds.size === 0) return;

        const newSegments = segments.map(seg =>
            selectedSegmentIds.has(seg.id) ? { ...seg, ...styleUpdate } : seg
        );
        onUpdateSegments(newSegments);
    }, [segments, selectedSegmentIds, onUpdateSegments]);

    // Cambiar a modo edición de texto
    const handleDoubleClick = () => {
        setIsEditing(true);
        setShowToolbar(false);
        setSelectedSegmentIds(new Set());
        setTimeout(() => textareaRef.current?.focus(), 50);
    };

    // Guardar cambios de texto
    const handleSaveText = () => {
        const newSegments = textToSegments(editText);
        onUpdateSegments(newSegments);
        setIsEditing(false);
    };

    // Cancelar edición
    const handleCancelEdit = () => {
        setEditText(segmentsToText(segments));
        setIsEditing(false);
    };

    // Resetear estilos de segmentos seleccionados
    const resetStyles = () => {
        applyStyle({
            color: undefined,
            fontSize: undefined,
            fontWeight: undefined,
            gradient: undefined,
            italic: undefined,
            underline: undefined,
            shadowColor: undefined,
            shadowBlur: undefined
        });
    };

    if (isEditing) {
        return (
            <div className={`relative ${className}`}>
                <textarea
                    ref={textareaRef}
                    value={editText}
                    onChange={(e) => {
                        setEditText(e.target.value);
                        onTextChange?.(e.target.value);
                    }}
                    className="w-full h-40 bg-gray-800 rounded-xl px-4 py-3 text-white text-sm border border-indigo-500 focus:border-indigo-400 outline-none resize-none"
                    placeholder="Escribe tu texto aquí..."
                />
                <div className="absolute bottom-3 right-3 flex gap-2">
                    <button
                        onClick={handleCancelEdit}
                        className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all"
                        title="Cancelar"
                    >
                        <X size={16} />
                    </button>
                    <button
                        onClick={handleSaveText}
                        className="p-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-all"
                        title="Guardar"
                    >
                        <Check size={16} />
                    </button>
                </div>
                <p className="text-[10px] text-gray-500 mt-2">
                    💡 Después de guardar, haz clic en las palabras para editarlas individualmente
                </p>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={`relative ${className}`}
            onClick={handleContainerClick}
        >
            {/* Área de texto visual con segmentos */}
            <div
                className="min-h-[120px] bg-gray-800 rounded-xl px-4 py-3 border border-gray-600/50 cursor-text flex flex-wrap gap-1 items-start content-start"
                onDoubleClick={handleDoubleClick}
            >
                {segments.length === 0 ? (
                    <span className="text-gray-500 text-sm italic">
                        Doble clic para escribir texto...
                    </span>
                ) : (
                    segments.map((segment) => {
                        const isSelected = selectedSegmentIds.has(segment.id);
                        const isSpace = segment.text.trim() === '';

                        if (isSpace) {
                            return <span key={segment.id} className="whitespace-pre">{segment.text}</span>;
                        }

                        return (
                            <span
                                key={segment.id}
                                onClick={(e) => handleSegmentClick(segment.id, e)}
                                className={`
                  px-1 py-0.5 rounded cursor-pointer transition-all select-none
                  ${isSelected
                                        ? 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-gray-800 scale-105'
                                        : 'hover:bg-white/10'}
                `}
                                style={{
                                    color: segment.color || globalColor,
                                    fontFamily: segment.fontFamily || globalFontFamily,
                                    fontWeight: segment.fontWeight || 'inherit',
                                    fontStyle: segment.italic ? 'italic' : 'normal',
                                    textDecoration: segment.underline ? 'underline' : 'none',
                                    background: segment.gradient || 'transparent',
                                    WebkitBackgroundClip: segment.gradient ? 'text' : undefined,
                                    WebkitTextFillColor: segment.gradient ? 'transparent' : undefined,
                                    textShadow: segment.shadowColor
                                        ? `0 0 ${segment.shadowBlur || 10}px ${segment.shadowColor}`
                                        : undefined,
                                    letterSpacing: segment.letterSpacing ? `${segment.letterSpacing}em` : undefined,
                                    transform: segment.rotation ? `rotate(${segment.rotation}deg)` : undefined,
                                    display: segment.rotation ? 'inline-block' : undefined,
                                    scale: segment.scale ? segment.scale.toString() : undefined
                                }}
                            >
                                {segment.text}
                            </span>
                        );
                    })
                )}
            </div>

            {/* Hint + Stats */}
            <div className="flex items-center justify-between mt-2">
                <p className="text-[10px] text-gray-500">
                    👆 Clic en palabra • Shift+Clic multi-selección • Doble clic editar todo
                </p>
                <div className="flex gap-3 text-[10px] text-gray-500">
                    <span>{segments.filter(s => s.text.trim()).length} palabras</span>
                    <span>{segmentsToText(segments).length} chars</span>
                </div>
            </div>

            {/* Floating Toolbar */}
            {showToolbar && selectedSegmentIds.size > 0 && (
                <div
                    className="absolute z-50 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-3 animate-fade-in max-w-[320px]"
                    style={{
                        left: `${Math.max(160, Math.min(toolbarPosition.x, 160))}px`,
                        top: `${toolbarPosition.y}px`,
                        transform: 'translate(-50%, -100%)'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex flex-col gap-2">
                        {/* Título */}
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider text-center border-b border-gray-700 pb-2 flex items-center justify-between">
                            <span>Estilo ({selectedSegmentIds.size})</span>
                            <button onClick={() => setShowToolbar(false)} className="hover:text-white">
                                <X size={12} />
                            </button>
                        </div>

                        {/* Colores rápidos - Grid más compacto */}
                        <div className="grid grid-cols-8 gap-1">
                            {QUICK_COLORS.map((color) => {
                                const firstSelected = segments.find(s => selectedSegmentIds.has(s.id));
                                const isActive = firstSelected?.color === color && !firstSelected?.gradient;
                                return (
                                    <button
                                        key={color}
                                        onClick={() => applyStyle({
                                            color: isActive ? undefined : color,
                                            gradient: undefined
                                        })}
                                        className={`w-5 h-5 rounded border transition-all hover:scale-110 ${isActive ? 'border-white ring-2 ring-white/50' : 'border-gray-600 hover:border-white'}`}
                                        style={{ backgroundColor: color }}
                                        title={color}
                                    />
                                );
                            })}
                        </div>

                        {/* Color personalizado */}
                        <div className="flex items-center gap-2">
                            <Palette size={12} className="text-gray-400" />
                            <input
                                type="color"
                                className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                                onChange={(e) => applyStyle({ color: e.target.value, gradient: undefined })}
                                title="Color personalizado"
                            />
                            <span className="text-[9px] text-gray-500">Custom</span>
                        </div>

                        {/* Gradientes */}
                        <div className="flex gap-1 flex-wrap">
                            {GRADIENTS.map((grad, i) => {
                                const firstSelected = segments.find(s => selectedSegmentIds.has(s.id));
                                const isActive = firstSelected?.gradient === grad.value;
                                return (
                                    <button
                                        key={i}
                                        onClick={() => applyStyle({
                                            gradient: isActive ? undefined : grad.value,
                                            color: undefined
                                        })}
                                        className={`w-7 h-7 rounded text-sm hover:scale-110 transition-all border ${isActive ? 'border-white ring-2 ring-white/50' : 'border-gray-700'}`}
                                        style={{ background: grad.value }}
                                        title={grad.label}
                                    >
                                        {grad.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Tamaño numérico con slider */}
                        <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-2">
                            <ALargeSmall size={14} className="text-gray-400" />
                            <input
                                type="range"
                                min="50"
                                max="300"
                                step="10"
                                defaultValue="100"
                                className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                onChange={(e) => {
                                    const percent = parseInt(e.target.value);
                                    const closest = FONT_SIZES.reduce((prev, curr) =>
                                        Math.abs(curr.percent - percent) < Math.abs(prev.percent - percent) ? curr : prev
                                    );
                                    applyStyle({ fontSize: closest.value, customFontSize: percent });
                                }}
                            />
                            <span className="text-[10px] text-white font-mono w-8">
                                {segments.find(s => selectedSegmentIds.has(s.id))?.customFontSize || 100}%
                            </span>
                        </div>

                        {/* Estilos de texto - Primera fila */}
                        <div className="flex gap-1 justify-center">
                            <button
                                onClick={() => {
                                    const firstSelected = segments.find(s => selectedSegmentIds.has(s.id));
                                    applyStyle({ fontWeight: firstSelected?.fontWeight === 'bold' ? undefined : 'bold' });
                                }}
                                className={`p-1.5 rounded transition-all ${segments.find(s => selectedSegmentIds.has(s.id))?.fontWeight === 'bold' ? 'bg-indigo-600' : 'bg-gray-800 hover:bg-indigo-600'}`}
                                title="Negrita"
                            >
                                <Bold size={12} />
                            </button>
                            <button
                                onClick={() => {
                                    const firstSelected = segments.find(s => selectedSegmentIds.has(s.id));
                                    applyStyle({ italic: !firstSelected?.italic });
                                }}
                                className={`p-1.5 rounded transition-all ${segments.find(s => selectedSegmentIds.has(s.id))?.italic ? 'bg-indigo-600' : 'bg-gray-800 hover:bg-indigo-600'}`}
                                title="Cursiva"
                            >
                                <Italic size={12} />
                            </button>
                            <button
                                onClick={() => {
                                    const firstSelected = segments.find(s => selectedSegmentIds.has(s.id));
                                    applyStyle({ underline: !firstSelected?.underline });
                                }}
                                className={`p-1.5 rounded transition-all ${segments.find(s => selectedSegmentIds.has(s.id))?.underline ? 'bg-indigo-600' : 'bg-gray-800 hover:bg-indigo-600'}`}
                                title="Subrayado"
                            >
                                <Underline size={12} />
                            </button>

                            {/* Separador */}
                            <div className="w-px bg-gray-700 mx-1" />

                            {/* Glow con colores - con toggle */}
                            <button
                                onClick={() => {
                                    const first = segments.find(s => selectedSegmentIds.has(s.id));
                                    const isActive = first?.shadowColor === '#fbbf24';
                                    applyStyle({ shadowColor: isActive ? undefined : '#fbbf24', shadowBlur: isActive ? undefined : 15 });
                                }}
                                className={`p-1.5 rounded transition-all ${segments.find(s => selectedSegmentIds.has(s.id))?.shadowColor === '#fbbf24' ? 'bg-amber-600 ring-2 ring-amber-400/50' : 'bg-gray-800 hover:bg-amber-600'} text-amber-400`}
                                title="Glow Amarillo"
                            >
                                ✨
                            </button>
                            <button
                                onClick={() => {
                                    const first = segments.find(s => selectedSegmentIds.has(s.id));
                                    const isActive = first?.shadowColor === '#60a5fa';
                                    applyStyle({ shadowColor: isActive ? undefined : '#60a5fa', shadowBlur: isActive ? undefined : 15 });
                                }}
                                className={`p-1.5 rounded transition-all ${segments.find(s => selectedSegmentIds.has(s.id))?.shadowColor === '#60a5fa' ? 'bg-blue-600 ring-2 ring-blue-400/50' : 'bg-gray-800 hover:bg-blue-600'} text-blue-400`}
                                title="Glow Azul"
                            >
                                💎
                            </button>
                            <button
                                onClick={() => {
                                    const first = segments.find(s => selectedSegmentIds.has(s.id));
                                    const isActive = first?.shadowColor === '#f472b6';
                                    applyStyle({ shadowColor: isActive ? undefined : '#f472b6', shadowBlur: isActive ? undefined : 15 });
                                }}
                                className={`p-1.5 rounded transition-all ${segments.find(s => selectedSegmentIds.has(s.id))?.shadowColor === '#f472b6' ? 'bg-pink-600 ring-2 ring-pink-400/50' : 'bg-gray-800 hover:bg-pink-600'} text-pink-400`}
                                title="Glow Rosa"
                            >
                                💗
                            </button>
                        </div>

                        {/* Espaciado y Rotación */}
                        <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-2">
                            <MoveHorizontal size={12} className="text-gray-400" />
                            <span className="text-[9px] text-gray-400 w-12">Espacio</span>
                            <button
                                onClick={() => {
                                    const first = segments.find(s => selectedSegmentIds.has(s.id));
                                    applyStyle({ letterSpacing: Math.max(-0.1, (first?.letterSpacing || 0) - 0.05) });
                                }}
                                className="p-1 bg-gray-700 hover:bg-gray-600 rounded"
                            >
                                <Minus size={10} />
                            </button>
                            <span className="text-[10px] text-white font-mono w-10 text-center">
                                {(segments.find(s => selectedSegmentIds.has(s.id))?.letterSpacing || 0).toFixed(2)}em
                            </span>
                            <button
                                onClick={() => {
                                    const first = segments.find(s => selectedSegmentIds.has(s.id));
                                    applyStyle({ letterSpacing: Math.min(1, (first?.letterSpacing || 0) + 0.05) });
                                }}
                                className="p-1 bg-gray-700 hover:bg-gray-600 rounded"
                            >
                                <Plus size={10} />
                            </button>
                        </div>

                        {/* Rotación */}
                        <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-2">
                            <RotateCw size={12} className="text-gray-400" />
                            <span className="text-[9px] text-gray-400 w-12">Rotar</span>
                            <button
                                onClick={() => {
                                    const first = segments.find(s => selectedSegmentIds.has(s.id));
                                    applyStyle({ rotation: ((first?.rotation || 0) - 5 + 360) % 360 });
                                }}
                                className="p-1 bg-gray-700 hover:bg-gray-600 rounded"
                            >
                                <Minus size={10} />
                            </button>
                            <span className="text-[10px] text-white font-mono w-10 text-center">
                                {segments.find(s => selectedSegmentIds.has(s.id))?.rotation || 0}°
                            </span>
                            <button
                                onClick={() => {
                                    const first = segments.find(s => selectedSegmentIds.has(s.id));
                                    applyStyle({ rotation: ((first?.rotation || 0) + 5) % 360 });
                                }}
                                className="p-1 bg-gray-700 hover:bg-gray-600 rounded"
                            >
                                <Plus size={10} />
                            </button>
                        </div>

                        {/* Reset */}
                        <button
                            onClick={resetStyles}
                            className="w-full py-1 text-[9px] font-bold text-gray-400 hover:text-white bg-gray-800 hover:bg-red-900/50 rounded transition-all flex items-center justify-center gap-1"
                        >
                            <RotateCcw size={10} /> Resetear Todo
                        </button>
                    </div>

                    {/* Arrow */}
                    <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full">
                        <div className="w-3 h-3 bg-gray-900 border-r border-b border-gray-700 rotate-45 -mt-1.5"></div>
                    </div>
                </div>
            )}

            <style>{`
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, -100%) scale(0.95); }
          to { opacity: 1; transform: translate(-50%, -100%) scale(1); }
        }
      `}</style>
        </div>
    );
};

export default RichTextEditor;
