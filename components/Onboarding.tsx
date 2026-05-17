import React, { useState, useEffect } from 'react';
import {
    ArrowRight,
    BookOpen,
    CalendarDays,
    Cast,
    Check,
    ChevronLeft,
    Clock,
    Cloud,
    FileJson,
    FileText,
    History,
    Keyboard,
    Layout,
    Library,
    List,
    MonitorSmartphone,
    Palette,
    Play,
    ShieldCheck,
    Sliders,
    Sparkles,
    UploadCloud,
    Wand2,
    X,
    Youtube,
    ZoomIn
} from 'lucide-react';

interface OnboardingProps {
    onComplete: () => void;
}

interface TutorialStep {
    icon: React.ElementType;
    eyebrow: string;
    title: string;
    description: string;
    details: string[];
    tip?: string;
    highlightId: string | null;
    color: string;
    actionLabel: string;
}

const STEPS: TutorialStep[] = [
    {
        icon: Sparkles,
        eyebrow: 'Bienvenida',
        title: 'Bienvenido a FlujoEclesial Studio',
        description: 'Un recorrido rapido para dominar la preparacion, proyeccion y control del servicio desde el primer uso.',
        details: [
            'Interfaz moderna para operar sin distracciones',
            'Modo local-first para trabajar incluso sin internet',
            'Control remoto movil para manejar la pantalla en vivo',
            'Herramientas profesionales para Biblia, multimedia, temas y presentaciones'
        ],
        tip: 'Puedes saltar el tutorial cuando quieras y volver a activar la ayuda desde la configuracion si la necesitas.',
        highlightId: null,
        color: 'from-indigo-600 via-violet-600 to-fuchsia-700',
        actionLabel: 'Comenzar tour'
    },
    {
        icon: Library,
        eyebrow: 'Contenido',
        title: 'Crea y prepara todo desde el panel principal',
        description: 'El panel de contenido es el punto de partida para agregar canciones, textos, lecturas biblicas, videos e imagenes.',
        details: [
            'YouTube: busca o pega enlaces para videos y musica de fondo',
            'Manual: escribe avisos, oraciones, lecturas o cualquier texto libre',
            'Biblia: busca pasajes por libro, capitulo, versiculo y version',
            'Imagenes: sube recursos visuales para enviarlos al proyector',
            'Nuevo elemento: crea bloques vacios cuando quieras preparar algo desde cero'
        ],
        tip: 'Prepara el contenido antes del servicio para que durante la proyeccion solo tengas que seleccionar y enviar.',
        highlightId: 'control-panel',
        color: 'from-sky-600 via-cyan-600 to-teal-600',
        actionLabel: 'Ver editor'
    },
    {
        icon: BookOpen,
        eyebrow: 'Biblia',
        title: 'Busca pasajes biblicos listos para proyectar',
        description: 'El modulo de Biblia esta pensado para crear diapositivas limpias a partir de una referencia biblica.',
        details: [
            'Versiones disponibles: Reina Valera 1960, NVI, NTV, LBLA, NIV, KJV y NKJV',
            'Autocompletado de libros para evitar errores al escribir',
            'Generacion de slides con formato consistente para lectura congregacional',
            'Ideal para lecturas responsivas, predicaciones y anuncios de referencia'
        ],
        tip: 'Usa referencias especificas como Juan 3:16 o Salmos 23:1-4 para obtener resultados mas precisos.',
        highlightId: 'control-panel',
        color: 'from-amber-600 via-orange-600 to-rose-600',
        actionLabel: 'Siguiente'
    },
    {
        icon: UploadCloud,
        eyebrow: 'Importacion',
        title: 'Agrega PDF, PowerPoint, imagenes y videos',
        description: 'Las funciones nuevas permiten llevar material externo directamente al flujo de presentacion.',
        details: [
            'Importa presentaciones PowerPoint (.pptx) para convertirlas en diapositivas',
            'Carga PDF para usarlos dentro del servicio o presentacion',
            'Sube imagenes y videos locales para eventos sin conexion',
            'Los medios pesados se manejan mejor mediante almacenamiento local optimizado',
            'Puedes organizar el material importado junto con canciones y textos'
        ],
        tip: 'Antes de un evento, abre cada archivo importado una vez para confirmar que se ve correctamente en la vista previa.',
        highlightId: 'control-panel',
        color: 'from-blue-700 via-indigo-700 to-violet-700',
        actionLabel: 'Continuar'
    },
    {
        icon: Sliders,
        eyebrow: 'Diseno',
        title: 'Personaliza la apariencia de cada proyeccion',
        description: 'El editor permite ajustar el estilo visual antes de enviar contenido en vivo.',
        details: [
            'Temas predefinidos para estilos modernos, elegantes y especiales',
            'Fuentes, tamanos, alineacion, sombras, colores y espaciado',
            'Fondos solidos, degradados, imagenes y animaciones de ambiente',
            'Editor de texto enriquecido para resaltar palabras o frases importantes',
            'Vista previa inmediata para validar cambios antes de proyectar'
        ],
        tip: 'Mantener pocos estilos por servicio ayuda a que la pantalla se vea profesional y facil de leer.',
        highlightId: 'control-panel',
        color: 'from-purple-600 via-pink-600 to-rose-600',
        actionLabel: 'Ver lista'
    },
    {
        icon: List,
        eyebrow: 'Orden del servicio',
        title: 'Organiza la playlist como una escaleta completa',
        description: 'La lista del servicio funciona como el orden operativo de todo lo que se proyectara.',
        details: [
            'Arrastra elementos para reordenar el servicio en segundos',
            'Edita titulos para mantener la lista clara para el operador',
            'Agrupa canciones, lecturas, avisos, videos y presentaciones',
            'Activa musica de fondo cuando un elemento lo requiera',
            'Usa proyectos para separar servicios, eventos o reuniones diferentes'
        ],
        tip: 'Nombra cada elemento como lo diria el equipo en cabina: Cancion 1, Lectura, Anuncios, Predica, Ofrenda.',
        highlightId: 'playlist-panel',
        color: 'from-emerald-600 via-teal-600 to-cyan-700',
        actionLabel: 'Ver slides'
    },
    {
        icon: Layout,
        eyebrow: 'Diapositivas',
        title: 'Trabaja cada elemento slide por slide',
        description: 'Cuando seleccionas un elemento, puedes revisar sus diapositivas antes de enviarlas al proyector.',
        details: [
            'Clic: previsualiza la diapositiva seleccionada',
            'Doble clic: envia la diapositiva en vivo al proyector',
            'Flechas del teclado: navega rapidamente entre slides',
            'Etiquetas como verso, coro o lectura ayudan a identificar cada parte',
            'Los PDF y PowerPoint importados tambien entran en este flujo de slides'
        ],
        tip: 'Usa la vista previa como filtro final antes de mandar algo a la pantalla principal.',
        highlightId: 'slide-grid',
        color: 'from-violet-600 via-indigo-600 to-blue-700',
        actionLabel: 'Vista previa'
    },
    {
        icon: Cast,
        eyebrow: 'En vivo',
        title: 'Controla lo que ve la audiencia',
        description: 'Los controles de proyeccion estan pensados para operar rapido durante momentos sensibles del servicio.',
        details: [
            'Black: apaga la salida visual con pantalla negra',
            'Clear: oculta texto manteniendo el fondo disponible',
            'Logo: muestra solo la identidad visual de la iglesia',
            'Split: divide la pantalla para mostrar dos contenidos',
            'Proyector: abre la ventana dedicada para la pantalla secundaria'
        ],
        tip: 'Black, Clear y Logo son tus botones de seguridad durante transiciones, errores o momentos de pausa.',
        highlightId: 'live-action-controls',
        color: 'from-orange-600 via-amber-600 to-yellow-600',
        actionLabel: 'Control movil'
    },
    {
        icon: MonitorSmartphone,
        eyebrow: 'Remoto movil',
        title: 'Maneja el servicio desde un celular o tablet',
        description: 'El control remoto permite operar el proyector sin estar pegado a la computadora principal.',
        details: [
            'Conecta el dispositivo movil mediante QR o URL local',
            'Cambia slides, activa contenido y revisa la playlist desde el telefono',
            'Busca elementos del servicio sin interrumpir la pantalla principal',
            'Agrega imagenes desde el movil cuando sea necesario',
            'Cambia entre control, playlist, proyectos y agregar contenido'
        ],
        tip: 'Mantén el presentador principal abierto; el movil envia comandos, pero la computadora sigue siendo el centro de control.',
        highlightId: null,
        color: 'from-cyan-600 via-blue-600 to-indigo-700',
        actionLabel: 'Ver zoom'
    },
    {
        icon: ZoomIn,
        eyebrow: 'Zoom remoto',
        title: 'Ajusta imagenes y diapositivas en pantalla completa',
        description: 'Las herramientas nuevas de zoom ayudan a encuadrar contenido visual directamente desde el remoto.',
        details: [
            'Acerca o aleja imagenes proyectadas sin rehacer la diapositiva',
            'Mueve el encuadre horizontal o verticalmente desde el panel movil',
            'Usa gestos tactiles para paneo y zoom en dispositivos compatibles',
            'Reinicia el encuadre para volver rapidamente a la vista original',
            'Util para imagenes, documentos y detalles que necesitan verse mas grandes'
        ],
        tip: 'Si una imagen no llena bien la pantalla, ajustala desde el remoto antes de que la audiencia pierda el foco.',
        highlightId: null,
        color: 'from-fuchsia-600 via-purple-600 to-indigo-700',
        actionLabel: 'Herramientas'
    },
    {
        icon: Cloud,
        eyebrow: 'Sincronizacion',
        title: 'Trabaja localmente y sincroniza cuando convenga',
        description: 'Oasis prioriza estabilidad local y permite sincronizacion cloud para respaldo o trabajo entre equipos.',
        details: [
            'Modo local-first para no depender de internet durante el evento',
            'Sincronizacion con Supabase cuando esta configurado',
            'Modo manual recomendado para controlar cuando se suben cambios',
            'Exportacion e importacion para respaldar playlists, temas y proyectos',
            'Los archivos .oasis.json facilitan mover configuraciones entre equipos'
        ],
        tip: 'Antes de cambios grandes, exporta una copia del servicio. Es una forma sencilla de tener un punto de retorno.',
        highlightId: null,
        color: 'from-slate-700 via-blue-700 to-cyan-700',
        actionLabel: 'Seguridad'
    },
    {
        icon: History,
        eyebrow: 'Recuperacion',
        title: 'Corrige errores sin detener el servicio',
        description: 'Las herramientas de historial y restauracion ayudan a recuperarse rapido si algo cambia por accidente.',
        details: [
            'Historial de acciones para revisar cambios recientes',
            'Restauracion de elementos cuando sea necesario volver atras',
            'Importacion selectiva para mezclar o reemplazar datos con control',
            'Proyectos separados para mantener cada evento ordenado',
            'Calendario y temporizador para planificar y apoyar la operacion en vivo'
        ],
        tip: 'Durante un evento, resolver rapido vale mas que editar perfecto. Usa historial, clear o logo para ganar tiempo.',
        highlightId: null,
        color: 'from-rose-700 via-red-700 to-orange-700',
        actionLabel: 'Atajos'
    },
    {
        icon: Keyboard,
        eyebrow: 'Atajos',
        title: 'Opera como un presentador profesional',
        description: 'Los atajos reducen clics y hacen que la operacion en vivo sea mas fluida.',
        details: [
            'Espacio: siguiente diapositiva',
            'Flechas izquierda/derecha: navegar entre slides',
            'B: activar o desactivar blackout',
            'C: activar o desactivar clear',
            'L: mostrar u ocultar logo',
            'P: abrir o cerrar proyector',
            'F: pantalla completa'
        ],
        tip: 'Practica los atajos antes del servicio. Cuando ya estan en memoria, el flujo se siente mucho mas natural.',
        highlightId: null,
        color: 'from-zinc-700 via-slate-700 to-gray-800',
        actionLabel: 'Finalizar'
    },
    {
        icon: Play,
        eyebrow: 'Listo',
        title: 'Ya puedes comenzar a proyectar',
        description: 'El flujo recomendado es preparar, revisar, abrir proyector, conectar remoto y operar desde la playlist.',
        details: [
            'Prepara todo el contenido antes de salir en vivo',
            'Revisa la vista previa antes de enviar al proyector',
            'Usa Black, Clear o Logo para transiciones limpias',
            'Controla slides y zoom desde el remoto movil',
            'Exporta respaldo al terminar si hiciste cambios importantes'
        ],
        tip: 'La mejor proyeccion es la que se siente invisible: contenido claro, transiciones limpias y operador tranquilo.',
        highlightId: null,
        color: 'from-green-600 via-emerald-600 to-teal-700',
        actionLabel: 'Comenzar a usar'
    }
];

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isExiting, setIsExiting] = useState(false);
    const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

    const step = STEPS[currentStep];
    const Icon = step.icon;
    const isLast = currentStep === STEPS.length - 1;

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
                    fill="rgba(0,0,0,0.9)"
                    mask="url(#spotlight-mask)"
                />
            </svg>

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

            <div className="relative z-10 w-full max-w-3xl mx-4" style={{ zIndex: 10 }}>
                <button
                    onClick={handleComplete}
                    className="absolute -top-14 right-0 text-white/65 hover:text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition-all uppercase tracking-widest bg-black/45 px-4 py-2 rounded-full hover:bg-black/70"
                >
                    Saltar tutorial <X size={16} />
                </button>

                <div className="bg-slate-950/98 backdrop-blur-xl rounded-[2rem] border border-white/10 overflow-hidden shadow-[0_0_90px_rgba(0,0,0,0.7)]">
                    <div className={`relative bg-gradient-to-br ${step.color} px-6 sm:px-10 py-8 flex flex-col items-center text-center overflow-hidden`}>
                        <div className="absolute top-0 right-0 w-56 h-56 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                        <div className="absolute bottom-0 left-0 w-40 h-40 bg-black/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />
                        <div className="absolute inset-x-0 bottom-0 h-px bg-white/25" />

                        <div className="relative z-10 mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-white/85 backdrop-blur-md">
                            <span>{step.eyebrow}</span>
                            <span className="h-1 w-1 rounded-full bg-white/70" />
                            <span>Paso {currentStep + 1} de {STEPS.length}</span>
                        </div>

                        <div className="relative z-10 w-20 h-20 bg-white/15 rounded-3xl flex items-center justify-center mb-5 backdrop-blur-md border border-white/25 shadow-2xl">
                            <Icon size={40} className="text-white drop-shadow-lg" />
                        </div>

                        <h2 className="relative z-10 text-2xl sm:text-3xl font-black text-white mb-3 tracking-tight leading-tight">
                            {step.title}
                        </h2>
                        <p className="relative z-10 text-white/92 text-base sm:text-lg leading-relaxed max-w-2xl">
                            {step.description}
                        </p>
                    </div>

                    <div className="px-6 sm:px-8 py-6 bg-slate-900/70 border-b border-white/5 max-h-[42vh] overflow-y-auto">
                        <div className="grid gap-3 sm:grid-cols-2">
                            {step.details.map((detail, idx) => (
                                <div key={idx} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.035] p-3.5 text-sm text-slate-200">
                                    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-400/15 text-indigo-200">
                                        <Check size={13} />
                                    </span>
                                    <span className="leading-relaxed text-slate-300">{detail}</span>
                                </div>
                            ))}
                        </div>

                        {step.tip && (
                            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.055] p-4 text-sm text-cyan-50">
                                <Wand2 size={18} className="mt-0.5 shrink-0 text-cyan-200" />
                                <p className="leading-relaxed text-cyan-50/90">{step.tip}</p>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between gap-5 px-6 sm:px-8 py-4 bg-slate-950/90 border-b border-white/5">
                        <div className="flex flex-wrap gap-1.5">
                            {STEPS.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentStep(index)}
                                    aria-label={`Ir al paso ${index + 1}`}
                                    className={`h-2 rounded-full transition-all duration-300 ${index === currentStep
                                        ? 'bg-indigo-400 w-8'
                                        : index < currentStep
                                            ? 'bg-indigo-400/55 w-4'
                                            : 'bg-slate-600 w-3 hover:bg-slate-500'
                                        }`}
                                />
                            ))}
                        </div>
                        <span className="hidden sm:inline text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                            {Math.round(((currentStep + 1) / STEPS.length) * 100)}% completado
                        </span>
                    </div>

                    <div className="flex gap-3 p-5 bg-slate-950">
                        <button
                            onClick={handlePrev}
                            disabled={currentStep === 0}
                            className={`flex-1 py-3.5 rounded-2xl border border-white/10 text-white/65 font-bold text-sm uppercase tracking-wide flex items-center justify-center gap-2 transition-all ${currentStep === 0 ? 'opacity-0 pointer-events-none' : 'hover:bg-white/5 hover:text-white active:scale-95'
                                }`}
                        >
                            <ChevronLeft size={18} /> Anterior
                        </button>
                        <button
                            onClick={handleNext}
                            className={`flex-[1.6] py-3.5 rounded-2xl font-bold text-sm uppercase tracking-wide flex items-center justify-center gap-2 transition-all text-white bg-gradient-to-r ${step.color} shadow-xl hover:brightness-110 active:scale-95`}
                        >
                            {step.actionLabel} {isLast ? <Check size={18} /> : <ArrowRight size={18} />}
                        </button>
                    </div>
                </div>

                {highlightRect && (
                    <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center text-indigo-300">
                        <span className="text-xs font-black uppercase tracking-widest mb-2 bg-indigo-600 text-white px-4 py-1.5 rounded-full shadow-lg">Mira aqui</span>
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
