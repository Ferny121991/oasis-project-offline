import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, X, Sparkles, Youtube, Edit3, BookOpen, Plus, List, Layout, Palette, Cast, ArrowRight, Check, Sliders, Eye, Music, Play } from 'lucide-react';

interface OnboardingProps {
    onComplete: () => void;
}

interface TutorialStep {
    icon: React.ElementType;
    title: string;
    description: string;
    details?: string[];
    highlightId: string | null;
    color: string;
    actionLabel: string;
}

const STEPS: TutorialStep[] = [
    {
        icon: Sparkles,
        title: '¡Bienvenido a FlujoEclesial Studio!',
        description: 'Tu plataforma profesional para proyecciones litúrgicas. Te enseñaremos cada función paso a paso.',
        details: [
            '✨ Interfaz intuitiva y moderna',
            '☁️ Sincronización automática en la nube',
            '🎨 Temas personalizables',
            '⌨️ Atajos de teclado profesionales'
        ],
        highlightId: null,
        color: 'from-indigo-600 to-purple-700',
        actionLabel: 'Comenzar Tour'
    },
    {
        icon: Youtube,
        title: 'Panel de Contenido',
        description: 'Este es tu centro de creación. Aquí agregas todo el contenido para tu servicio:',
        details: [
            '📺 YOUTUBE: Pega links de videos o música de fondo',
            '✍️ MANUAL: Escribe texto libre para anuncios o avisos',
            '📖 BIBLIA: Busca versículos (RV1960, NVI, KJV, etc.)',
            '➕ NV: Crea un elemento nuevo vacío'
        ],
        highlightId: 'control-panel',
        color: 'from-red-600 to-rose-600',
        actionLabel: 'Siguiente'
    },
    {
        icon: Sliders,
        title: 'Editor de Estilos',
        description: 'La pestaña "EDITOR" te permite personalizar el diseño visual:',
        details: [
            '🎨 15+ Temas predefinidos (elegante, moderno, navidad...)',
            '🔤 Fuentes: Montserrat, Playfair, Bebas Neue y más',
            '📐 Alineación y tamaño de texto',
            '🌈 Colores, sombras y animaciones',
            '🖼️ Fondos personalizados con imágenes'
        ],
        highlightId: 'control-panel',
        color: 'from-purple-600 to-pink-600',
        actionLabel: 'Siguiente'
    },
    {
        icon: List,
        title: 'Lista del Servicio',
        description: 'Aquí organizas todo el orden del culto. Cada elemento tiene sus propias diapositivas:',
        details: [
            '🔀 Arrastra para reordenar elementos',
            '✏️ Doble clic para editar títulos',
            '🗑️ Botón X para eliminar',
            '🔄 Botón refresh para regenerar',
            '🎵 Botón audio para música de fondo'
        ],
        highlightId: 'playlist-panel',
        color: 'from-emerald-600 to-teal-600',
        actionLabel: 'Siguiente'
    },
    {
        icon: Layout,
        title: 'Cuadrícula de Diapositivas',
        description: 'Cuando seleccionas un elemento, aquí aparecen todas sus diapositivas:',
        details: [
            '👆 Clic = Previsualizar arriba',
            '👆👆 Doble clic = Enviar EN VIVO al proyector',
            '🏷️ Cada slide muestra su etiqueta (VERSO, CORO, etc.)',
            '⬅️➡️ Usa flechas del teclado para navegar'
        ],
        highlightId: 'slide-grid',
        color: 'from-violet-600 to-purple-600',
        actionLabel: 'Siguiente'
    },
    {
        icon: Eye,
        title: 'Vista Previa',
        description: 'Aquí ves exactamente cómo se verá en el proyector antes de enviarlo:',
        details: [
            '🖥️ Vista en tiempo real de los cambios',
            '🔴 Indicador PIP (Picture-in-Picture) de lo que está EN VIVO',
            '⬅️➡️ Flechas para navegar entre slides',
            '🎚️ Ajustes rápidos de alineación y tamaño'
        ],
        highlightId: 'live-preview-panel',
        color: 'from-blue-600 to-cyan-600',
        actionLabel: 'Siguiente'
    },
    {
        icon: Cast,
        title: 'Controles de Proyección',
        description: 'Estos son tus botones de emergencia y control durante el servicio:',
        details: [
            '⬛ BLACK: Pantalla completamente negra',
            '🧹 CLEAR: Oculta el texto (fondo visible)',
            '🏛️ LOGO: Muestra solo el logo de la iglesia',
            '📐 SPLIT: Pantalla dividida (2 contenidos)',
            '📽️ PROY: Abre ventana del proyector'
        ],
        highlightId: 'live-action-controls',
        color: 'from-orange-600 to-amber-600',
        actionLabel: 'Siguiente'
    },
    {
        icon: Play,
        title: '¡Listo para Proyectar!',
        description: 'Resumen de atajos de teclado para usar como un profesional:',
        details: [
            '⎵ ESPACIO: Siguiente diapositiva',
            '← → Flechas: Navegar slides',
            'B: Activar/Desactivar Blackout',
            'C: Activar/Desactivar Clear',
            'L: Mostrar/Ocultar Logo',
            'P: Abrir/Cerrar Proyector',
            'F: Pantalla completa'
        ],
        highlightId: null,
        color: 'from-green-600 to-emerald-600',
        actionLabel: '¡Comenzar a Proyectar!'
    }
];

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isExiting, setIsExiting] = useState(false);
    const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

    const step = STEPS[currentStep];
    const Icon = step.icon;
    const isLast = currentStep === STEPS.length - 1;

    // Find and highlight the target element
    useEffect(() => {
        if (step.highlightId) {
            const element = document.getElementById(step.highlightId);
            if (element) {
                const rect = element.getBoundingClientRect();
                setHighlightRect(rect);
            } else {
                setHighlightRect(null);
            }
        } else {
            setHighlightRect(null);
        }
    }, [currentStep, step.highlightId]);

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleComplete();
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleComplete = () => {
        setIsExiting(true);
        localStorage.setItem('oasis_onboarding_complete', 'true');
        setTimeout(() => {
            onComplete();
        }, 300);
    };

    return (
        <div
            className={`fixed inset-0 z-[9999] flex items-center justify-center transition-all duration-500 ${isExiting ? 'opacity-0' : 'opacity-100'}`}
        >
            {/* Dark overlay with cutout for highlighted element */}
            <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
                <defs>
                    <mask id="spotlight-mask">
                        <rect x="0" y="0" width="100%" height="100%" fill="white" />
                        {highlightRect && (
                            <rect
                                x={highlightRect.left - 16}
                                y={highlightRect.top - 16}
                                width={highlightRect.width + 32}
                                height={highlightRect.height + 32}
                                rx="20"
                                fill="black"
                            />
                        )}
                    </mask>
                </defs>
                <rect
                    x="0" y="0" width="100%" height="100%"
                    fill="rgba(0,0,0,0.88)"
                    mask="url(#spotlight-mask)"
                />
            </svg>

            {/* Glowing border around highlighted element */}
            {highlightRect && (
                <div
                    className="absolute pointer-events-none"
                    style={{
                        zIndex: 2,
                        left: highlightRect.left - 16,
                        top: highlightRect.top - 16,
                        width: highlightRect.width + 32,
                        height: highlightRect.height + 32,
                        borderRadius: 20,
                        border: '4px solid rgba(99, 102, 241, 1)',
                        boxShadow: '0 0 50px rgba(99, 102, 241, 0.8), 0 0 100px rgba(99, 102, 241, 0.4), inset 0 0 30px rgba(99,102,241,0.1)',
                        animation: 'pulseGlow 2s infinite'
                    }}
                />
            )}

            {/* Tutorial Card - ALWAYS CENTERED */}
            <div
                className="relative z-10 w-full max-w-xl mx-4"
                style={{ zIndex: 10 }}
            >
                {/* Skip Button */}
                <button
                    onClick={handleComplete}
                    className="absolute -top-14 right-0 text-white/60 hover:text-white text-sm font-bold flex items-center gap-2 transition-all uppercase tracking-widest bg-black/40 px-4 py-2 rounded-full hover:bg-black/60"
                >
                    Saltar Tutorial <X size={16} />
                </button>

                <div className="bg-gray-900/98 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.6)]">
                    {/* Header */}
                    <div className={`relative bg-gradient-to-br ${step.color} p-6 flex flex-col items-center text-center overflow-hidden`}>
                        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />

                        <div className="relative z-10 w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-md border border-white/20 shadow-2xl">
                            <Icon size={32} className="text-white drop-shadow-lg" />
                        </div>

                        <h2 className="relative z-10 text-xl font-black text-white mb-2 tracking-tight">
                            {step.title}
                        </h2>
                        <p className="relative z-10 text-white/90 text-sm leading-relaxed">
                            {step.description}
                        </p>
                    </div>

                    {/* Details List */}
                    {step.details && (
                        <div className="px-6 py-4 bg-gray-800/50 border-b border-white/5 max-h-48 overflow-y-auto">
                            <div className="space-y-2">
                                {step.details.map((detail, idx) => (
                                    <div key={idx} className="flex items-start gap-3 text-sm text-gray-200">
                                        <span className="text-lg leading-none">{detail.split(' ')[0]}</span>
                                        <span className="text-gray-300">{detail.split(' ').slice(1).join(' ')}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Progress */}
                    <div className="flex items-center justify-between px-6 py-4 bg-gray-900/80 border-b border-white/5">
                        <div className="flex gap-1.5">
                            {STEPS.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentStep(index)}
                                    className={`h-2 rounded-full transition-all duration-300 ${index === currentStep
                                            ? 'bg-indigo-500 w-6'
                                            : index < currentStep
                                                ? 'bg-indigo-400/60 w-3'
                                                : 'bg-gray-600 w-3 hover:bg-gray-500'
                                        }`}
                                />
                            ))}
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            Paso {currentStep + 1} de {STEPS.length}
                        </span>
                    </div>

                    {/* Navigation */}
                    <div className="flex gap-3 p-5 bg-gray-900">
                        <button
                            onClick={handlePrev}
                            disabled={currentStep === 0}
                            className={`flex-1 py-3.5 rounded-xl border border-white/10 text-white/60 font-bold text-sm uppercase tracking-wide flex items-center justify-center gap-2 transition-all ${currentStep === 0 ? 'opacity-0 pointer-events-none' : 'hover:bg-white/5 hover:text-white active:scale-95'
                                }`}
                        >
                            <ChevronLeft size={18} /> Anterior
                        </button>
                        <button
                            onClick={handleNext}
                            className={`flex-[1.5] py-3.5 rounded-xl font-bold text-sm uppercase tracking-wide flex items-center justify-center gap-2 transition-all text-white bg-gradient-to-r ${step.color} shadow-xl hover:brightness-110 active:scale-95`}
                        >
                            {step.actionLabel} {isLast ? <Check size={18} /> : <ArrowRight size={18} />}
                        </button>
                    </div>
                </div>

                {/* Arrow indicator when highlighting */}
                {highlightRect && (
                    <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center text-indigo-400">
                        <span className="text-sm font-black uppercase tracking-widest mb-2 bg-indigo-600 text-white px-4 py-1 rounded-full shadow-lg">MIRA AQUÍ</span>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="animate-bounce">
                            <path d="M12 5v14M5 12l7 7 7-7" />
                        </svg>
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes pulseGlow {
                    0%, 100% { opacity: 1; box-shadow: 0 0 50px rgba(99, 102, 241, 0.8), 0 0 100px rgba(99, 102, 241, 0.4); }
                    50% { opacity: 0.8; box-shadow: 0 0 30px rgba(99, 102, 241, 0.6), 0 0 60px rgba(99, 102, 241, 0.3); }
                }
            `}} />
        </div>
    );
};

export default Onboarding;
