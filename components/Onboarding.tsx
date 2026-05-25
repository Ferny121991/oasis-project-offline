import React, { useState, useEffect } from 'react';
import {
    ArrowRight,
    Check,
    ChevronLeft,
    Cloud,
    Keyboard,
    Layout,
    List,
    MonitorSmartphone,
    Palette,
    Play,
    Sparkles,
    UploadCloud,
    X,
    BookOpen,
    Cast,
    History,
    Library
} from 'lucide-react';

interface OnboardingProps {
    onComplete: () => void;
}

interface TutorialStep {
    icon: React.ElementType;
    tag: string;
    title: string;
    description: string;
    focus: string[];
    tip: string;
    color: string;
    selector?: string; // HTML Selector to spotlight highlight
}

const STEPS: TutorialStep[] = [
    {
        icon: Sparkles,
        tag: 'Bienvenida',
        title: 'Cabina Profesional FlujoEclesial Studio',
        description: 'Bienvenido al tour interactivo de la cabina moderna. Hemos diseñado una interfaz inspirada en ProPresenter para brindarte el máximo espacio de trabajo, fluidez en vivo y seguridad de datos.',
        focus: [
            'Tres columnas integradas: Editor (Izq.), Playlist central y Proyección (Der.)',
            'Workspace expansible para ocultar los paneles laterales y liberar espacio',
            'Sincronización multi-ventana ultra-rápida y control remoto móvil',
            'Historial de auditoría completo y protección activa contra borrados'
        ],
        tip: 'Usa este tutorial para comprender cada botón y flujo del sistema. El panel activo se iluminará con un halo cian brillante.',
        color: 'from-indigo-600 via-violet-600 to-fuchsia-700'
    },
    {
        icon: Library,
        tag: 'Búsqueda e Importación',
        title: 'Biblioteca de Contenido y Biblia',
        description: 'Prepara las canciones, lecturas bíblicas y avisos antes del servicio. Todo entra al flujo de trabajo desde el panel de contenido.',
        focus: [
            'Buscador general: Escribe títulos o letras para cargar canciones en un clic',
            'Pasajes Bíblicos: Escribe referencias (ej: Juan 3:16) y obtén diapositivas al instante',
            'Selección de versiones de la Biblia: RV1960, NVI, NTV, LBLA, KJV y más',
            'Importador multimedia: Arrastra imágenes, canciones locales o videos'
        ],
        tip: 'Usa referencias directas con el capítulo y versículo. El autocompletado te guiará al escribir los libros.',
        color: 'from-sky-600 via-cyan-600 to-teal-700',
        selector: '#control-panel'
    },
    {
        icon: Palette,
        tag: 'Diseñador de Logo',
        title: 'Suite Tipográfica y Logo del Proyector',
        description: 'La pestaña "Logo" te permite crear un logotipo estilizado para proyectar durante las transiciones o pausas del servicio.',
        focus: [
            'Acordeón colapsable: Cuatro áreas de diseño ordenadas y limpias',
            'Soporte completo de texto: Agrega letras y personaliza fuentes',
            'Estilizado premium: Gradientes, sombras neon y bordes de contorno',
            'Escala inteligente cqh: El texto escala de forma perfecta en cualquier tamaño'
        ],
        tip: 'El botón "SHOW LOGO" de la derecha proyectará este logo con todos los estilos que configures aquí.',
        color: 'from-purple-600 via-pink-600 to-rose-600',
        selector: '#control-panel'
    },
    {
        icon: BookOpen,
        tag: 'Reflow Editor',
        title: 'Edición en Bloque (Reflow Editor)',
        description: 'El Reflow Editor te permite editar la letra de toda la canción de corrido, como si fuera un documento de Word, sin tener que abrir cada slide por separado.',
        focus: [
            'Botón "Reflow Editor" en la barra de rejilla del panel central',
            'Edita todo el texto corrido de forma ágil y fluida',
            'Inserta divisores con un solo clic para crear nuevas diapositivas',
            'Los cambios se actualizan instantáneamente en las miniaturas'
        ],
        tip: 'Ideal para corregir errores ortográficos rápidos dictados por el director de alabanza durante el ensayo.',
        color: 'from-amber-600 via-orange-600 to-rose-600',
        selector: '#playlist-panel'
    },
    {
        icon: List,
        tag: 'Escaleta del Servicio',
        title: 'Mesa Central y Playlist Interactiva',
        description: 'La playlist central funciona como el timeline o escaleta de cabina. Aquí ordenas cronológicamente el servicio.',
        focus: [
            'Reordenación táctil y drag-and-drop de canciones y avisos',
            'Divisores visuales de sección: Asigna colores rápidos (Naranja, Verde, etc.)',
            'Acciones por elemento: Duplicar elementos, actualizar y borrar',
            'Duplicar y reordenar diapositivas individuales dentro de cada canción'
        ],
        tip: 'Usa los divisores de colores para separar momentos del servicio: Alabanza, Anuncios, Ofrenda, Mensaje.',
        color: 'from-emerald-600 via-teal-600 to-cyan-700',
        selector: '#playlist-panel'
    },
    {
        icon: Layout,
        tag: 'Workspace',
        title: 'Tiradores de Ocultación de Paneles',
        description: 'Para pantallas de laptop o cabinas compactas, puedes ocultar los paneles laterales para ampliar al máximo la mesa de diapositivas central.',
        focus: [
            'Tirador izquierdo (Flecha <): Desliza y oculta el Editor / Logo',
            'Tirador derecho (Flecha >): Desliza y oculta el panel de Proyección',
            'Expansión al 100% de la pantalla para el panel central de slides',
            'Transiciones ultra-fluidas CSS de 300ms de ancho y opacidad'
        ],
        tip: 'Haz clic en el tirador para ocultar un panel; vuelve a hacer clic en la flecha cian flotante para reabrirlo.',
        color: 'from-teal-600 via-emerald-600 to-emerald-700',
        selector: '#playlist-panel'
    },
    {
        icon: Play,
        tag: 'Vista Previa',
        title: 'Operación del Vivo y Miniaturas',
        description: 'Aprende a navegar y lanzar diapositivas en vivo con total confianza, usando el doble filtro de seguridad.',
        focus: [
            'Un Clic: Selecciona y edita el elemento en el panel central de diapositivas',
            'Doble Clic (o Enter): Envía la diapositiva directamente al vivo',
            'Barra inferior de diapositivas del vivo: Navega con un solo clic',
            'Atajos del teclado: Espacio para siguiente diapositiva, Flechas para navegar'
        ],
        tip: 'Usa la barra espaciadora en tu teclado para avanzar la canción al ritmo de la alabanza sin usar el mouse.',
        color: 'from-violet-600 via-indigo-600 to-blue-700',
        selector: '#live-preview-panel'
    },
    {
        icon: Cast,
        tag: 'Acciones de Seguridad',
        title: 'Botones del Vivo (ProPresenter-Style)',
        description: 'La barra inferior derecha del vivo contiene los botones de acción inmediata ante cualquier imprevisto durante la proyección.',
        focus: [
            'BLACK (Blackout) [F9 o ESC]: Apaga por completo la pantalla del proyector',
            'CLEAR TEXT [F10]: Oculta la letra manteniendo el fondo de imagen o video',
            'SHOW LOGO [F12]: Proyecta el logotipo de la iglesia estilizado',
            'SPLIT SCREEN: Divide la pantalla para traducciones o soporte multi-idioma'
        ],
        tip: 'Aprende los atajos de teclado F9, F10, F12. Te salvarán de errores en vivo al instante.',
        color: 'from-orange-600 via-amber-600 to-yellow-600',
        selector: '#live-action-controls'
    },
    {
        icon: Cloud,
        tag: 'Sincronización Nube',
        title: 'Filtro Anti-Borrado y Guardado Seguro',
        description: 'La sincronización con la nube en Supabase incluye un filtro de seguridad inteligente que te previene de pérdidas irreversibles de archivos.',
        focus: [
            'Sincronización Manual: Botón "Guardar manual" en el menú superior',
            'Auto-Guardado (Auto-Sync): Sube los cambios automáticamente cada 5 segundos',
            'Filtro de seguridad: Frena la subida si detecta diapositivas o proyectos eliminados',
            'Modal detallada: Te enumera exactamente qué archivo o elemento se va a borrar'
        ],
        tip: 'Si el auto-guardado se frena por una modal, puedes aceptar la eliminación en la nube o cancelar para restaurar.',
        color: 'from-slate-700 via-blue-700 to-cyan-700',
        selector: '#playlist-panel'
    },
    {
        icon: MonitorSmartphone,
        tag: 'Control Móvil',
        title: 'QR y Aplicación Móvil de Altar',
        description: 'El botón "Móvil" abre un panel con un código QR que te permite enlazar cualquier celular o tablet para controlar la proyección a distancia.',
        focus: [
            'Conexión local instantánea escaneando el código QR con la cámara',
            'Control remoto de diapositivas desde el altar por parte del predicador',
            'Buscador móvil: Agrega canciones y pasajes desde el celular',
            'Subir fotos directamente desde el móvil a la playlist principal'
        ],
        tip: 'El predicador puede avanzar los slides de su prédica a su propio ritmo usando su teléfono inteligente.',
        color: 'from-cyan-600 via-blue-600 to-indigo-700',
        selector: '#playlist-panel'
    }
];

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isExiting, setIsExiting] = useState(false);
    const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
    const [arrowDirection, setArrowDirection] = useState<'left' | 'right' | 'top' | 'bottom' | 'none'>('none');
    
    // Interactive Checklist state
    const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

    const step = STEPS[currentStep];
    const Icon = step.icon;
    const isLast = currentStep === STEPS.length - 1;
    const progress = Math.round(((currentStep + 1) / STEPS.length) * 100);

    // Dynamic checks progress
    const checkedCount = checkedItems.size;
    const totalChecks = step.focus.length;
    const isStepFullyChecked = checkedCount === totalChecks;

    // Reset checklist on step change
    useEffect(() => {
        setCheckedItems(new Set());
    }, [currentStep]);

    // Handle check toggle
    const handleToggleCheck = (idx: number) => {
        setCheckedItems(prev => {
            const next = new Set(prev);
            if (next.has(idx)) {
                next.delete(idx);
            } else {
                next.add(idx);
            }
            return next;
        });
    };

    // Calculate position relative to highlighted element
    const updatePosition = () => {
        const selector = step.selector;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        // If no selector or if screen is mobile, center the modal at the bottom
        if (!selector || windowWidth < 768) {
            setTooltipStyle({
                position: 'fixed',
                top: windowWidth < 768 ? 'auto' : '50%',
                bottom: windowWidth < 768 ? '1rem' : 'auto',
                left: '50%',
                transform: windowWidth < 768 ? 'translateX(-50%)' : 'translate(-50%, -50%)',
                width: '94%',
                maxWidth: '430px',
                maxHeight: 'min(580px, 86vh)',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 8500,
                transition: 'all 0.3s ease-out'
            });
            setArrowDirection('none');
            return;
        }

        const element = document.querySelector(selector);
        if (!element) {
            // Fallback to bottom right
            setTooltipStyle({
                position: 'fixed',
                bottom: '1.5rem',
                right: '1.5rem',
                width: '420px',
                maxHeight: 'min(580px, 85vh)',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 8500,
                transition: 'all 0.3s ease-out'
            });
            setArrowDirection('none');
            return;
        }

        const rect = element.getBoundingClientRect();

        // Calculate available space
        const spaceRight = windowWidth - rect.right;
        const spaceLeft = rect.left;
        const spaceBottom = windowHeight - rect.bottom;
        const spaceTop = rect.top;

        let style: React.CSSProperties = {
            position: 'fixed',
            width: '420px',
            maxHeight: 'min(580px, 85vh)', // ALWAYS restrict height so it fits on screen
            display: 'flex',
            flexDirection: 'column',
            zIndex: 8500,
            transition: 'all 0.3s ease-out'
        };

        // Decide where to position the card relative to the highlighted element
        if (spaceRight > 440) {
            // Right side of the element
            style.left = `${rect.right + 20}px`;
            style.top = `${Math.max(20, Math.min(rect.top + (rect.height - 400) / 2, windowHeight - 480))}px`;
            setArrowDirection('left');
        } else if (spaceLeft > 440) {
            // Left side of the element
            style.left = `${rect.left - 440}px`;
            style.top = `${Math.max(20, Math.min(rect.top + (rect.height - 400) / 2, windowHeight - 480))}px`;
            setArrowDirection('right');
        } else if (spaceBottom > 420) {
            // Below the element
            style.left = `${Math.max(20, Math.min(rect.left + (rect.width - 420) / 2, windowWidth - 440))}px`;
            style.top = `${rect.bottom + 20}px`;
            setArrowDirection('top');
        } else if (spaceTop > 420) {
            // Above the element
            style.left = `${Math.max(20, Math.min(rect.left + (rect.width - 420) / 2, windowWidth - 440))}px`;
            style.top = `${rect.top - 420}px`;
            setArrowDirection('bottom');
        } else {
            // Center modal on screen if there is absolutely no space
            style.top = '50%';
            style.left = '50%';
            style.transform = 'translate(-50%, -50%)';
            style.width = '92%';
            style.maxWidth = '440px';
            setArrowDirection('none');
        }

        setTooltipStyle(style);
    };

    // Handle spotlight scroll and active class
    useEffect(() => {
        const selector = step.selector;
        if (!selector) return;
        
        const element = document.querySelector(selector);
        if (element) {
            element.classList.add('tutorial-highlight-active');
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        return () => {
            if (element) {
                element.classList.remove('tutorial-highlight-active');
            }
        };
    }, [currentStep, step.selector]);

    // Position updates
    useEffect(() => {
        updatePosition();
        window.addEventListener('resize', updatePosition);
        
        // Timeout to handle panel dimensions correctly
        const timer = setTimeout(updatePosition, 150);
        
        return () => {
            window.removeEventListener('resize', updatePosition);
            clearTimeout(timer);
        };
    }, [currentStep]);

    const handleNext = () => {
        if (isLast) {
            handleComplete();
            return;
        }
        setCurrentStep(prev => prev + 1);
    };

    const handlePrev = () => {
        if (currentStep > 0) setCurrentStep(prev => prev - 1);
    };

    const handleComplete = () => {
        setIsExiting(true);
        localStorage.setItem('oasis_onboarding_complete', 'true');
        setTimeout(onComplete, 250);
    };

    return (
        <>
            {/* Backdrop Dimming Overlay */}
            <div className={`fixed inset-0 bg-slate-950/85 backdrop-blur-[2px] z-[7000] pointer-events-auto transition-opacity duration-300 ${isExiting ? 'opacity-0' : 'opacity-100'}`} />

            <style>{`
                @keyframes tutorialPulse {
                    0% {
                        outline-color: rgba(34, 211, 238, 0.4);
                        box-shadow: 0 0 0 0px rgba(34, 211, 238, 0.2);
                    }
                    50% {
                        outline-color: rgba(34, 211, 238, 1);
                        box-shadow: 0 0 35px 12px rgba(34, 211, 238, 0.6);
                    }
                    100% {
                        outline-color: rgba(34, 211, 238, 0.4);
                        box-shadow: 0 0 0 0px rgba(34, 211, 238, 0);
                    }
                }
                @keyframes subtleBounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-4px); }
                }
                .animate-bounce-subtle {
                    animation: subtleBounce 2s infinite ease-in-out;
                }
                .tutorial-highlight-active {
                    position: relative !important;
                    z-index: 8000 !important;
                    animation: tutorialPulse 2s infinite ease-in-out !important;
                    outline: 6px solid #22d3ee !important;
                    outline-offset: 4px !important;
                    background-color: rgba(15, 23, 42, 0.95) !important;
                    transition: all 0.3s ease !important;
                    border-radius: 12px;
                }
            `}</style>

            {/* Guided Tutorial Tooltip Card */}
            <div
                style={tooltipStyle}
                className={`flex flex-col bg-slate-900 border border-white/15 rounded-[28px] shadow-[0_24px_80px_rgba(0,0,0,0.9),0_0_35px_rgba(34,211,238,0.18)] overflow-visible transition-all duration-300 ${isExiting ? 'opacity-0 scale-95 translate-y-8' : 'opacity-100 scale-100 translate-y-0 animate-scale-up'}`}
            >
                {/* Arrow pointer styling */}
                {arrowDirection === 'left' && (
                    <div className="absolute left-[-10px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-r-[10px] border-r-slate-900 filter drop-shadow-[-2px_0_1px_rgba(255,255,255,0.15)] z-[8501]" />
                )}
                {arrowDirection === 'right' && (
                    <div className="absolute right-[-10px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-l-[10px] border-l-slate-900 filter drop-shadow-[2px_0_1px_rgba(255,255,255,0.15)] z-[8501]" />
                )}
                {arrowDirection === 'top' && (
                    <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[10px] border-b-slate-900 filter drop-shadow-[0_-2px_1px_rgba(255,255,255,0.15)] z-[8501]" />
                )}
                {arrowDirection === 'bottom' && (
                    <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-slate-900 filter drop-shadow-[0_2px_1px_rgba(255,255,255,0.15)] z-[8501]" />
                )}

                {/* Header Banner */}
                <div className={`p-5 bg-gradient-to-br ${step.color} relative shrink-0 rounded-t-[27px] overflow-hidden`}>
                    <div className="absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
                    <div className="flex items-center justify-between relative z-10">
                        <span className="bg-white/20 border border-white/30 text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full text-white">
                            {step.tag} • Paso {currentStep + 1} de {STEPS.length}
                        </span>
                        <button 
                            onClick={handleComplete} 
                            className="text-white/60 hover:text-white transition-colors"
                            title="Saltar tutorial"
                        >
                            <X size={16} />
                        </button>
                    </div>
                    <div className="flex items-center gap-3 mt-3 relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0 shadow-lg">
                            <Icon size={20} className="text-white" />
                        </div>
                        <h3 className="text-sm font-black text-white uppercase tracking-wide leading-tight">{step.title}</h3>
                    </div>
                </div>

                {/* Content Body - Pure Flex-1 with scrollbar */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-slate-950/20">
                    <p className="text-[11px] text-slate-300 leading-relaxed font-semibold">
                        {step.description}
                    </p>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Puntos Clave:</p>
                            <span className="text-[9px] text-cyan-400 font-bold bg-cyan-950/60 px-2 py-0.5 border border-cyan-800/30 rounded-full">
                                {checkedCount} de {totalChecks} completados
                            </span>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                            {step.focus.map((item, idx) => {
                                const isChecked = checkedItems.has(idx);
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleToggleCheck(idx)}
                                        className={`w-full text-left flex items-start gap-3 p-2.5 rounded-xl border transition-all duration-200 ${
                                            isChecked 
                                                ? 'bg-cyan-950/20 border-cyan-500/35 shadow-[0_0_12px_rgba(34,211,238,0.06)]' 
                                                : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10'
                                        }`}
                                    >
                                        <div className={`mt-0.5 w-4 h-4 rounded-md flex items-center justify-center shrink-0 text-[10px] font-black border transition-all duration-200 ${
                                            isChecked 
                                                ? 'bg-cyan-500 border-cyan-400 text-slate-950' 
                                                : 'border-slate-700 bg-slate-900/60 text-transparent hover:border-cyan-500/50'
                                        }`}>
                                            ✓
                                        </div>
                                        <span className={`text-[10.5px] font-medium leading-tight transition-all duration-200 ${
                                            isChecked 
                                                ? 'text-slate-400 line-through decoration-cyan-500/30' 
                                                : 'text-slate-200'
                                        }`}>
                                            {item}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-cyan-950/40 border border-cyan-500/25 text-cyan-200/90 p-3.5 rounded-xl text-[10.5px] leading-relaxed shadow-inner">
                        💡 Tip: {step.tip}
                    </div>
                </div>

                {/* Progress and Navigation Footer */}
                <div className="p-4 bg-slate-950/80 border-t border-white/5 rounded-b-[27px] shrink-0 flex flex-col gap-3">
                    {/* Progress bar */}
                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-slate-500">
                        <span>{progress}% completado</span>
                        <div className="flex gap-1">
                            {STEPS.map((_, idx) => (
                                <button 
                                    key={idx}
                                    onClick={() => setCurrentStep(idx)}
                                    className={`h-1.5 rounded-full transition-all ${idx === currentStep ? 'w-4 bg-indigo-400' : idx < currentStep ? 'w-2 bg-indigo-400/50' : 'w-1 bg-slate-700'}`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={handlePrev}
                            className={`flex-1 h-9 rounded-xl border border-white/10 bg-white/[0.04] text-[10px] font-black uppercase tracking-wider text-slate-300 transition-all hover:bg-white/10 hover:text-white ${currentStep === 0 ? 'invisible' : ''}`}
                        >
                            Anterior
                        </button>
                        <button
                            onClick={handleNext}
                            className={`flex-[1.4] h-9 rounded-xl text-[10px] font-black uppercase tracking-wider text-white shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5 ${
                                isStepFullyChecked 
                                    ? 'bg-cyan-400 text-slate-950 shadow-[0_0_15px_#22d3ee] brightness-125 animate-bounce-subtle' 
                                    : `bg-gradient-to-r ${step.color} hover:brightness-110`
                            }`}
                        >
                            {isLast ? 'Entendido' : 'Siguiente'}
                            {isLast ? <Check size={12} /> : <ArrowRight size={12} />}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Onboarding;
