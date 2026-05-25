import React, { useState, useEffect, useCallback } from 'react';
import {
    ArrowRight,
    Check,
    ChevronLeft,
    Cloud,
    Layout,
    List,
    MonitorSmartphone,
    Palette,
    Play,
    Sparkles,
    X,
    BookOpen,
    Cast,
    Library,
    Info,
    Eye
} from 'lucide-react';

interface OnboardingProps {
    onComplete: () => void;
}

interface TutorialStep {
    icon: React.ElementType;
    tag: string;
    title: string;
    description: string;
    focus: {
        label: string;
        detail: string;
    }[];
    tip: string;
    color: string;
    accentColor: string;
    selector?: string;
}

const STEPS: TutorialStep[] = [
    {
        icon: Sparkles,
        tag: 'Bienvenida',
        title: '¡Bienvenido a OASIS Studio!',
        description: 'Este tour te guiará paso a paso por cada sección de la cabina de proyección. Al terminar, sabrás exactamente cómo buscar canciones, crear diapositivas, controlar el vivo y sincronizar con la nube.',
        focus: [
            {
                label: 'Panel Izquierdo → Editor de Contenido',
                detail: 'Aquí buscas canciones, escribes textos manuales y consultas la Biblia. Es tu centro de creación.'
            },
            {
                label: 'Panel Central → Playlist / Escaleta',
                detail: 'Muestra todas las canciones del servicio en orden. Cada canción tiene sus diapositivas en miniatura.'
            },
            {
                label: 'Panel Derecho → Proyección en Vivo',
                detail: 'Aquí ves la vista previa de lo que el proyector muestra. Incluye los botones BLACK, CLEAR y LOGO.'
            },
            {
                label: 'Barra Superior → Controles Generales',
                detail: 'Contiene el nombre del proyecto, botón de sincronización, temporizador, pantalla completa y más.'
            }
        ],
        tip: 'Lee cada punto y márcalo como entendido ✓. Al completar todos los puntos, el botón "Siguiente" se iluminará para avanzar.',
        color: 'from-indigo-600 via-violet-600 to-fuchsia-700',
        accentColor: '#818cf8'
    },
    {
        icon: Library,
        tag: 'Paso 1: Buscar Canciones',
        title: 'Búsqueda de Canciones y Letras',
        description: 'El panel izquierdo tiene un campo de texto donde puedes escribir el nombre de cualquier canción cristiana. Al presionar Enter o el botón AGREGAR, se buscan las letras automáticamente.',
        focus: [
            {
                label: '📝 Campo de búsqueda superior',
                detail: 'Escribe el título de la canción, ej: "Way Maker", "Reckless Love". Presiona Enter para buscar.'
            },
            {
                label: '📋 Resultados de búsqueda',
                detail: 'Aparecen debajo del campo. Haz clic en cualquier resultado para agregarlo a la playlist del servicio.'
            },
            {
                label: '⚙️ Selector de Origen (Manual / Biblia / NV)',
                detail: 'Arriba del campo hay botones para cambiar entre modo canción, texto manual, o citas bíblicas.'
            },
            {
                label: '📖 Densidad de Texto',
                detail: 'Controla cuántas líneas aparecen por diapositiva: Impacto (pocas), Clásico (normal), Estrofa (completa), Full.'
            }
        ],
        tip: 'Escribe solo unas letras del título — el buscador es inteligente y encuentra canciones con coincidencias parciales.',
        color: 'from-sky-600 via-cyan-600 to-teal-700',
        accentColor: '#22d3ee',
        selector: '#control-panel'
    },
    {
        icon: BookOpen,
        tag: 'Paso 2: Biblia',
        title: 'Pasajes Bíblicos al Instante',
        description: 'Cambia el selector de origen a "Biblia" y escribe cualquier referencia bíblica. El sistema genera diapositivas con el texto del pasaje automáticamente.',
        focus: [
            {
                label: '🔘 Botón "Biblia" en Selector de Origen',
                detail: 'Haz clic en el botón naranja "Biblia" para activar el modo de citas bíblicas.'
            },
            {
                label: '📖 Formato de referencia',
                detail: 'Escribe: "Juan 3:16", "Salmos 23", "Romanos 8:28-39". El autocompletado sugiere libros al escribir.'
            },
            {
                label: '🌍 Selector de versión bíblica',
                detail: 'Puedes elegir entre RVR1960, NVI, NTV, LBLA, KJV, NKJV y NIV. Cada versión genera texto diferente.'
            },
            {
                label: '➕ Botón AGREGAR A LISTA',
                detail: 'Después de escribir la referencia, presiona el botón verde para agregar las diapositivas a la playlist.'
            }
        ],
        tip: 'Puedes agregar rangos de versículos (ej: "Génesis 1:1-5") y se dividirán automáticamente en varias diapositivas.',
        color: 'from-amber-600 via-orange-600 to-rose-600',
        accentColor: '#f59e0b',
        selector: '#control-panel'
    },
    {
        icon: Palette,
        tag: 'Paso 3: Temas y Logo',
        title: 'Personaliza Fondos y Logo',
        description: 'Las pestañas "Tema" y "Logo" en el panel izquierdo te permiten cambiar los fondos, colores y el logotipo que aparece en la proyección.',
        focus: [
            {
                label: '🎨 Pestaña "Tema" → Fondos',
                detail: 'Cambia el fondo de las diapositivas: imagen, color sólido o degradado. Pega URLs de imágenes o sube archivos.'
            },
            {
                label: '✏️ Pestaña "Tema" → Tipografía',
                detail: 'Cambia la fuente, tamaño, color del texto, sombras y efectos de contorno para todas las diapositivas.'
            },
            {
                label: '🖼️ Pestaña "Logo" → Imagen de bienvenida',
                detail: 'Sube el logo de tu iglesia. Se muestra con el botón SHOW LOGO durante las transiciones.'
            },
            {
                label: '💎 Pestaña "Logo" → Estilos del logo',
                detail: 'Agrega texto al logo, gradientes, sombras neón y bordes. El texto escala automáticamente.'
            }
        ],
        tip: 'Los temas se guardan por canción. Puedes tener un fondo diferente para cada elemento de la playlist.',
        color: 'from-purple-600 via-pink-600 to-rose-600',
        accentColor: '#d946ef',
        selector: '#control-panel'
    },
    {
        icon: List,
        tag: 'Paso 4: Playlist',
        title: 'Escaleta del Servicio (Centro)',
        description: 'El panel central es tu timeline. Aquí ves todas las canciones del servicio en orden, con sus miniaturas de diapositivas. Es el corazón de la cabina.',
        focus: [
            {
                label: '🎵 Lista de canciones / elementos',
                detail: 'Cada canción aparece como una tarjeta. Haz clic para expandirla y ver sus diapositivas en miniatura.'
            },
            {
                label: '↕️ Reordenar con Drag & Drop',
                detail: 'Arrastra las canciones hacia arriba o abajo para cambiar el orden del servicio.'
            },
            {
                label: '🏷️ Divisores de sección con colores',
                detail: 'Inserta divisores entre secciones (Alabanza, Anuncios, Ofrenda) usando colores diferentes.'
            },
            {
                label: '⚡ Acciones por elemento',
                detail: 'Cada canción tiene botones para: duplicar, actualizar letra, borrar, y cambiar el tema individual.'
            }
        ],
        tip: 'Doble clic en una miniatura envía esa diapositiva directo al proyector. Un solo clic la selecciona para editar.',
        color: 'from-emerald-600 via-teal-600 to-cyan-700',
        accentColor: '#34d399',
        selector: '#playlist-panel'
    },
    {
        icon: BookOpen,
        tag: 'Paso 5: Reflow Editor',
        title: 'Edición en Bloque de Texto',
        description: 'El botón "Reflow Editor" en la barra superior del panel central te permite editar toda la letra de la canción de corrido, como si fuera un documento de Word.',
        focus: [
            {
                label: '📝 Botón "Reflow Editor" en la barra superior',
                detail: 'Está en la barra de herramientas del panel central, junto al selector de vista de grilla.'
            },
            {
                label: '✂️ Editor de texto completo',
                detail: 'Todo el texto de la canción aparece de corrido. Puedes editar, copiar, pegar libremente.'
            },
            {
                label: '➖ Insertar divisores de diapositiva',
                detail: 'Haz clic en el botón de divisor para crear un corte que genera una nueva diapositiva en ese punto.'
            },
            {
                label: '🔄 Cambios en tiempo real',
                detail: 'Cada cambio se refleja instantáneamente en las miniaturas de la playlist. No necesitas guardar manualmente.'
            }
        ],
        tip: 'Perfecto para corregir errores ortográficos rápidos o reorganizar estrofas y coros de la canción.',
        color: 'from-amber-500 via-orange-500 to-red-600',
        accentColor: '#fb923c',
        selector: '#playlist-panel'
    },
    {
        icon: Play,
        tag: 'Paso 6: Proyectar en Vivo',
        title: 'Enviar Diapositivas al Proyector',
        description: 'El panel derecho es tu vista de proyección. Aquí ves exactamente lo que se muestra en el proyector o pantalla externa.',
        focus: [
            {
                label: '👆 Un Clic = Seleccionar para editar',
                detail: 'Haz un solo clic en una miniatura de la playlist para seleccionarla y editarla en el panel izquierdo.'
            },
            {
                label: '👆👆 Doble Clic = Enviar al vivo',
                detail: 'Haz doble clic (o presiona Enter) en cualquier miniatura para enviarla directamente al proyector.'
            },
            {
                label: '⬇️ Barra de miniaturas del vivo',
                detail: 'Debajo de la proyección hay una tira de miniaturas. Clic en cualquiera cambia la diapositiva en el proyector.'
            },
            {
                label: '⌨️ Atajos de teclado',
                detail: 'Espacio = siguiente slide, Flechas ← → = navegar, F5 = pantalla completa del proyector.'
            }
        ],
        tip: 'Usa la BARRA ESPACIADORA para avanzar la canción al ritmo de la alabanza sin necesidad de usar el mouse.',
        color: 'from-violet-600 via-indigo-600 to-blue-700',
        accentColor: '#818cf8',
        selector: '#live-preview-panel'
    },
    {
        icon: Cast,
        tag: 'Paso 7: Botones del Vivo',
        title: 'Controles de Emergencia',
        description: 'Debajo de la proyección hay 4 botones de acción inmediata. Son tus controles de emergencia para situaciones en vivo.',
        focus: [
            {
                label: '⬛ BLACK (F9 o ESC)',
                detail: 'Apaga completamente la pantalla del proyector. Todo se pone negro. Úsalo durante oraciones o imprevistos.'
            },
            {
                label: '🔤 CLEAR TEXT (F10)',
                detail: 'Oculta solo el texto pero mantiene la imagen de fondo. Ideal para transiciones entre estrofas.'
            },
            {
                label: '🖼️ SHOW LOGO (F12)',
                detail: 'Muestra el logotipo de la iglesia. Perfecto para antes del servicio o durante los anuncios.'
            },
            {
                label: '📐 SPLIT SCREEN',
                detail: 'Divide la pantalla para traducciones bilingües o soporte multi-idioma en congregaciones diversas.'
            }
        ],
        tip: 'Memoriza F9 (Black), F10 (Clear) y F12 (Logo). En una emergencia, estos atajos son más rápidos que el mouse.',
        color: 'from-orange-600 via-amber-600 to-yellow-600',
        accentColor: '#f59e0b',
        selector: '#live-action-controls'
    },
    {
        icon: Layout,
        tag: 'Paso 8: Workspace',
        title: 'Ocultar Paneles (Espacio Extra)',
        description: 'Si tienes una pantalla pequeña, puedes ocultar los paneles laterales para dar más espacio a la playlist central.',
        focus: [
            {
                label: '◀ Tirador izquierdo',
                detail: 'Un botón con flecha "<" al borde del panel izquierdo. Haz clic para ocultar el Editor.'
            },
            {
                label: '▶ Tirador derecho',
                detail: 'Un botón con flecha ">" al borde del panel derecho. Haz clic para ocultar la Proyección.'
            },
            {
                label: '📐 Playlist al 100%',
                detail: 'Con ambos paneles ocultos, la playlist central ocupa toda la pantalla para ver más miniaturas.'
            },
            {
                label: '🔁 Reabrir paneles',
                detail: 'Haz clic en las flechas flotantes de color cian que aparecen en los bordes para reabrir los paneles.'
            }
        ],
        tip: 'En laptops de 13-14 pulgadas, ocultar un panel te da mucho más espacio de trabajo en la playlist.',
        color: 'from-teal-600 via-emerald-600 to-emerald-700',
        accentColor: '#2dd4bf',
        selector: '#playlist-panel'
    },
    {
        icon: Cloud,
        tag: 'Paso 9: Nube',
        title: 'Sincronización y Protección',
        description: 'Tu trabajo se guarda automáticamente en la nube (Supabase). Si accidentalmente borras algo, el sistema te protege con un filtro inteligente.',
        focus: [
            {
                label: '💾 Guardar Manual',
                detail: 'Botón en la barra superior del panel central. Haz clic para forzar un guardado inmediato a la nube.'
            },
            {
                label: '🔄 Auto-Sync (cada 5s)',
                detail: 'El sistema sube cambios automáticamente. Un indicador verde confirma que todo está sincronizado.'
            },
            {
                label: '🛡️ Filtro Anti-Borrado',
                detail: 'Si borras canciones o diapositivas, aparece una modal que te pregunta si realmente quieres eliminarlas de la nube.'
            },
            {
                label: '📊 Modal de confirmación',
                detail: 'La modal te lista exactamente qué se va a borrar. Puedes aceptar o cancelar para restaurar lo eliminado.'
            }
        ],
        tip: 'Si el auto-guardado muestra una modal, no entres en pánico. Lee lo que dice y decide si realmente quieres borrar esos elementos.',
        color: 'from-slate-700 via-blue-700 to-cyan-700',
        accentColor: '#60a5fa',
        selector: '#playlist-panel'
    },
    {
        icon: MonitorSmartphone,
        tag: 'Paso 10: Control Remoto',
        title: 'Control desde el Celular',
        description: 'Conecta cualquier teléfono o tablet para controlar la proyección de forma remota. Perfecto para que el predicador avance sus propios slides.',
        focus: [
            {
                label: '📱 Botón "Móvil" en la barra superior',
                detail: 'Haz clic en "Móvil" para abrir un panel con un código QR.'
            },
            {
                label: '📷 Escanear QR con la cámara',
                detail: 'Apunta la cámara del celular al QR y se abrirá una página de control remoto en el navegador móvil.'
            },
            {
                label: '👆 Control de diapositivas remoto',
                detail: 'Desde el celular puedes avanzar, retroceder y seleccionar diapositivas sin tocar la computadora.'
            },
            {
                label: '🔍 Buscador móvil',
                detail: 'El control remoto incluye un buscador para agregar canciones y pasajes bíblicos desde el celular.'
            }
        ],
        tip: 'El predicador puede avanzar los slides de su prédica desde el altar usando su propio teléfono.',
        color: 'from-cyan-600 via-blue-600 to-indigo-700',
        accentColor: '#38bdf8',
        selector: '#playlist-panel'
    }
];

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isExiting, setIsExiting] = useState(false);
    const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
    const [arrowDirection, setArrowDirection] = useState<'left' | 'right' | 'top' | 'bottom' | 'none'>('none');
    
    // Per-step checklist state
    const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
    
    // Track which steps have been fully completed
    const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

    const step = STEPS[currentStep];
    const Icon = step.icon;
    const isLast = currentStep === STEPS.length - 1;
    const progress = Math.round(((currentStep + 1) / STEPS.length) * 100);

    const checkedCount = checkedItems.size;
    const totalChecks = step.focus.length;
    const isStepFullyChecked = checkedCount === totalChecks;

    // When all items in a step are checked, mark the step as completed
    useEffect(() => {
        if (isStepFullyChecked) {
            setCompletedSteps(prev => {
                const next = new Set(prev);
                next.add(currentStep);
                return next;
            });
        }
    }, [isStepFullyChecked, currentStep]);

    // Reset checklist on step change (only if not previously completed)
    useEffect(() => {
        if (completedSteps.has(currentStep)) {
            // Re-check all items for completed steps
            const allChecks = new Set<number>();
            step.focus.forEach((_, idx) => allChecks.add(idx));
            setCheckedItems(allChecks);
        } else {
            setCheckedItems(new Set());
        }
    }, [currentStep]);

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

    // Mark all checks at once
    const handleMarkAllChecks = () => {
        if (isStepFullyChecked) {
            setCheckedItems(new Set());
        } else {
            const allChecks = new Set<number>();
            step.focus.forEach((_, idx) => allChecks.add(idx));
            setCheckedItems(allChecks);
        }
    };

    const updatePosition = useCallback(() => {
        const selector = step.selector;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        if (!selector || windowWidth < 768) {
            setTooltipStyle({
                position: 'fixed',
                top: windowWidth < 768 ? 'auto' : '50%',
                bottom: windowWidth < 768 ? '1rem' : 'auto',
                left: '50%',
                transform: windowWidth < 768 ? 'translateX(-50%)' : 'translate(-50%, -50%)',
                width: '94%',
                maxWidth: '460px',
                maxHeight: 'min(600px, 88vh)',
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
            setTooltipStyle({
                position: 'fixed',
                bottom: '1.5rem',
                right: '1.5rem',
                width: '440px',
                maxHeight: 'min(600px, 88vh)',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 8500,
                transition: 'all 0.3s ease-out'
            });
            setArrowDirection('none');
            return;
        }

        const rect = element.getBoundingClientRect();
        const spaceRight = windowWidth - rect.right;
        const spaceLeft = rect.left;

        let style: React.CSSProperties = {
            position: 'fixed',
            width: '440px',
            maxHeight: 'min(600px, 88vh)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 8500,
            transition: 'all 0.3s ease-out'
        };

        if (spaceRight > 460) {
            style.left = `${rect.right + 20}px`;
            style.top = `${Math.max(20, Math.min(rect.top + (rect.height - 420) / 2, windowHeight - 520))}px`;
            setArrowDirection('left');
        } else if (spaceLeft > 460) {
            style.left = `${rect.left - 460}px`;
            style.top = `${Math.max(20, Math.min(rect.top + (rect.height - 420) / 2, windowHeight - 520))}px`;
            setArrowDirection('right');
        } else {
            style.top = '50%';
            style.left = '50%';
            style.transform = 'translate(-50%, -50%)';
            style.width = '92%';
            style.maxWidth = '460px';
            setArrowDirection('none');
        }

        setTooltipStyle(style);
    }, [step.selector]);

    // Spotlight highlight
    useEffect(() => {
        const selector = step.selector;
        if (!selector) return;
        
        const element = document.querySelector(selector);
        if (element) {
            element.classList.add('tutorial-highlight-active');
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
        const timer = setTimeout(updatePosition, 150);
        
        return () => {
            window.removeEventListener('resize', updatePosition);
            clearTimeout(timer);
        };
    }, [currentStep, updatePosition]);

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

    const completedCount = completedSteps.size;
    const totalSteps = STEPS.length;

    return (
        <>
            {/* Backdrop */}
            <div className={`fixed inset-0 bg-slate-950/88 backdrop-blur-[3px] z-[7000] pointer-events-auto transition-opacity duration-300 ${isExiting ? 'opacity-0' : 'opacity-100'}`} />

            <style>{`
                @keyframes tutorialPulse {
                    0% {
                        outline-color: rgba(34, 211, 238, 0.4);
                        box-shadow: 0 0 0 0px rgba(34, 211, 238, 0.2);
                    }
                    50% {
                        outline-color: rgba(34, 211, 238, 1);
                        box-shadow: 0 0 40px 14px rgba(34, 211, 238, 0.5);
                    }
                    100% {
                        outline-color: rgba(34, 211, 238, 0.4);
                        box-shadow: 0 0 0 0px rgba(34, 211, 238, 0);
                    }
                }
                @keyframes subtleBounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-3px); }
                }
                @keyframes slideInFromRight {
                    from { opacity: 0; transform: translateX(16px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                .animate-bounce-subtle {
                    animation: subtleBounce 2s infinite ease-in-out;
                }
                .animate-slide-in {
                    animation: slideInFromRight 0.3s ease-out forwards;
                }
                .tutorial-highlight-active {
                    position: relative !important;
                    z-index: 8000 !important;
                    animation: tutorialPulse 2s infinite ease-in-out !important;
                    outline: 5px solid #22d3ee !important;
                    outline-offset: 4px !important;
                    background-color: rgba(15, 23, 42, 0.97) !important;
                    transition: all 0.3s ease !important;
                    border-radius: 12px;
                }
                .onboarding-scrollbar::-webkit-scrollbar { width: 4px; }
                .onboarding-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .onboarding-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 99px; }
                .onboarding-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
            `}</style>

            {/* Guided Tutorial Card */}
            <div
                style={tooltipStyle}
                className={`flex flex-col bg-[#0c1221] border border-white/[0.12] rounded-[24px] shadow-[0_30px_100px_rgba(0,0,0,0.95),0_0_40px_rgba(99,102,241,0.12)] overflow-hidden transition-all duration-300 ${isExiting ? 'opacity-0 scale-95 translate-y-8' : 'opacity-100 scale-100 translate-y-0'}`}
            >
                {/* Arrows */}
                {arrowDirection === 'left' && (
                    <div className="absolute left-[-10px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-r-[10px] border-r-[#0c1221] z-[8501]" />
                )}
                {arrowDirection === 'right' && (
                    <div className="absolute right-[-10px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-l-[10px] border-l-[#0c1221] z-[8501]" />
                )}

                {/* ═══════ HEADER ═══════ */}
                <div className={`px-5 pt-4 pb-3 bg-gradient-to-br ${step.color} relative shrink-0 overflow-hidden`}>
                    <div className="absolute -right-12 -bottom-12 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
                    <div className="absolute left-0 bottom-0 right-0 h-px bg-white/10" />
                    
                    {/* Top bar */}
                    <div className="flex items-center justify-between relative z-10 mb-3">
                        <div className="flex items-center gap-2">
                            <span className="bg-white/20 border border-white/25 text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full text-white/90">
                                {step.tag}
                            </span>
                            <span className="text-[9px] text-white/50 font-bold">
                                {currentStep + 1}/{STEPS.length}
                            </span>
                        </div>
                        <button 
                            onClick={handleComplete} 
                            className="text-white/50 hover:text-white transition-colors hover:bg-white/10 rounded-lg p-1"
                            title="Saltar tutorial"
                        >
                            <X size={14} />
                        </button>
                    </div>
                    
                    {/* Title */}
                    <div className="flex items-center gap-3 relative z-10">
                        <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0 shadow-lg">
                            <Icon size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-[13px] font-black text-white leading-tight">{step.title}</h3>
                        </div>
                    </div>
                </div>

                {/* ═══════ STEP NAVIGATION DOTS ═══════ */}
                <div className="px-4 py-2 bg-slate-950/60 border-b border-white/5 flex items-center gap-1 shrink-0 overflow-x-auto">
                    {STEPS.map((s, idx) => {
                        const isCompleted = completedSteps.has(idx);
                        const isCurrent = idx === currentStep;
                        const StepIcon = s.icon;
                        return (
                            <button
                                key={idx}
                                onClick={() => setCurrentStep(idx)}
                                className={`relative flex items-center justify-center shrink-0 transition-all duration-200 rounded-lg ${
                                    isCurrent 
                                        ? 'w-8 h-8 border-2 shadow-lg' 
                                        : 'w-6 h-6 border hover:scale-110'
                                } ${
                                    isCompleted 
                                        ? isCurrent
                                            ? 'bg-emerald-500/30 border-emerald-400/80'
                                            : 'bg-emerald-500/15 border-emerald-500/40'
                                        : isCurrent
                                            ? 'bg-white/10 border-white/40'
                                            : 'bg-white/[0.03] border-white/10 hover:border-white/25'
                                }`}
                                title={`${s.tag}${isCompleted ? ' ✓' : ''}`}
                                style={isCurrent ? { borderColor: step.accentColor + '80' } : {}}
                            >
                                {isCompleted ? (
                                    <Check size={isCurrent ? 14 : 10} className="text-emerald-400" />
                                ) : (
                                    <StepIcon size={isCurrent ? 14 : 10} className={isCurrent ? 'text-white' : 'text-slate-500'} />
                                )}
                            </button>
                        );
                    })}
                    <div className="ml-auto text-[9px] font-bold text-slate-500 shrink-0 pl-2">
                        {completedCount}/{totalSteps}
                    </div>
                </div>

                {/* ═══════ CONTENT BODY ═══════ */}
                <div className="flex-1 overflow-y-auto onboarding-scrollbar bg-[#0a0f1a]">
                    {/* Description */}
                    <div className="px-5 pt-4 pb-3">
                        <p className="text-[11.5px] text-slate-300 leading-[1.7] font-medium">
                            {step.description}
                        </p>
                    </div>

                    {/* Checklist Header */}
                    <div className="px-5 pb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Eye size={11} className="text-slate-500" />
                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">
                                Puntos a revisar
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleMarkAllChecks}
                                className="text-[8px] font-bold text-slate-500 hover:text-cyan-400 transition-colors uppercase tracking-wider"
                            >
                                {isStepFullyChecked ? 'Desmarcar' : 'Marcar todos'}
                            </button>
                            <span 
                                className="text-[9px] font-black px-2 py-0.5 rounded-full border transition-all"
                                style={{
                                    color: isStepFullyChecked ? '#34d399' : step.accentColor,
                                    borderColor: isStepFullyChecked ? 'rgba(52,211,153,0.3)' : step.accentColor + '30',
                                    backgroundColor: isStepFullyChecked ? 'rgba(52,211,153,0.08)' : step.accentColor + '10'
                                }}
                            >
                                {checkedCount}/{totalChecks}
                            </span>
                        </div>
                    </div>

                    {/* Checklist Items */}
                    <div className="px-4 pb-3 flex flex-col gap-1.5">
                        {step.focus.map((item, idx) => {
                            const isChecked = checkedItems.has(idx);
                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleToggleCheck(idx)}
                                    className={`animate-slide-in w-full text-left rounded-xl border transition-all duration-200 ${
                                        isChecked 
                                            ? 'bg-emerald-950/20 border-emerald-500/25' 
                                            : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/10'
                                    }`}
                                    style={{ animationDelay: `${idx * 60}ms` }}
                                >
                                    <div className="flex items-start gap-3 p-3">
                                        {/* Checkbox */}
                                        <div className={`mt-0.5 w-[18px] h-[18px] rounded-md flex items-center justify-center shrink-0 border-2 transition-all duration-200 ${
                                            isChecked 
                                                ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.3)]' 
                                                : 'border-slate-600 bg-slate-900/80 hover:border-slate-400'
                                        }`}>
                                            {isChecked && <Check size={11} className="text-white" strokeWidth={3} />}
                                        </div>
                                        
                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <span className={`text-[11px] font-bold block leading-tight transition-all duration-200 ${
                                                isChecked ? 'text-emerald-300/80' : 'text-slate-200'
                                            }`}>
                                                {item.label}
                                            </span>
                                            <span className={`text-[10px] mt-1 block leading-relaxed transition-all duration-200 ${
                                                isChecked ? 'text-slate-500' : 'text-slate-400'
                                            }`}>
                                                {item.detail}
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Tip Box */}
                    <div className="px-5 pb-4">
                        <div className="bg-cyan-950/30 border border-cyan-500/20 text-cyan-200/90 px-4 py-3 rounded-xl text-[10.5px] leading-relaxed flex gap-2.5">
                            <Info size={14} className="text-cyan-400 shrink-0 mt-0.5" />
                            <span>{step.tip}</span>
                        </div>
                    </div>
                </div>

                {/* ═══════ FOOTER ═══════ */}
                <div className="px-4 py-3 bg-slate-950/90 border-t border-white/[0.06] shrink-0 flex flex-col gap-2.5">
                    {/* Progress bar */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div 
                                className="h-full rounded-full transition-all duration-500 ease-out"
                                style={{ 
                                    width: `${progress}%`,
                                    background: `linear-gradient(90deg, ${step.accentColor}, ${step.accentColor}88)`
                                }}
                            />
                        </div>
                        <span className="text-[9px] font-bold text-slate-500 shrink-0 w-8 text-right">{progress}%</span>
                    </div>

                    {/* Navigation */}
                    <div className="flex gap-2">
                        <button
                            onClick={handlePrev}
                            className={`h-10 px-4 rounded-xl border border-white/10 bg-white/[0.03] text-[10px] font-black uppercase tracking-wider text-slate-400 transition-all hover:bg-white/[0.08] hover:text-white flex items-center gap-1.5 ${currentStep === 0 ? 'invisible' : ''}`}
                        >
                            <ChevronLeft size={12} />
                            Atrás
                        </button>
                        <button
                            onClick={handleNext}
                            className={`flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-wider text-white shadow-lg active:scale-[0.97] transition-all flex items-center justify-center gap-1.5 ${
                                isStepFullyChecked 
                                    ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(52,211,153,0.25)] animate-bounce-subtle' 
                                    : `bg-gradient-to-r ${step.color} hover:brightness-110`
                            }`}
                        >
                            {isLast ? (
                                <>
                                    <Check size={13} />
                                    ¡Entendido! Comenzar
                                </>
                            ) : isStepFullyChecked ? (
                                <>
                                    Siguiente Paso
                                    <ArrowRight size={13} />
                                </>
                            ) : (
                                <>
                                    Siguiente
                                    <ArrowRight size={13} />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Onboarding;
