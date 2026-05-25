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
    ZoomIn,
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
        title: 'Bienvenido a FlujoEclesial Studio',
        description: 'Aprende a operar la proyección eclesial como un profesional con este tour interactivo. La cabina ahora tiene más espacio y máxima seguridad.',
        focus: [
            'Panel central de diapositivas expandible',
            'Suite tipográfica para el texto del Logo',
            'Prevención de borrados en auto-guardado',
            'Historial de auditoría en tiempo real sin duplicados'
        ],
        tip: 'Observa cómo el sistema resalta dinámicamente las áreas explicadas en la interfaz.',
        color: 'from-indigo-600 via-violet-600 to-fuchsia-700'
    },
    {
        icon: Library,
        tag: 'Editor & Logo',
        title: 'Diseño en Acordeón y Suite del Logo',
        description: 'En el panel izquierdo editas las canciones y creas logos espectaculares con textos completamente estilizados.',
        focus: [
            'Secciones colapsables en acordeón',
            'Suite tipográfica completa para el logo',
            'Tamaño inteligente auto-escalable en cqh',
            'Gradientes, bordes y sombras premium'
        ],
        tip: 'Haz clic en las secciones del logo en el panel de la izquierda para expandirlas de forma ultra-organizada.',
        color: 'from-sky-600 via-cyan-600 to-teal-700',
        selector: '#control-panel'
    },
    {
        icon: Layout,
        tag: 'Mesa Central',
        title: 'Workspace Ultra-Espacioso',
        description: 'La playlist central ahora es ultra-flexible. Puedes ocultar los paneles laterales para concentrarte en el servicio.',
        focus: [
            'Tirador izquierdo: oculta el Editor',
            'Tirador derecho: oculta la Proyección',
            'Espacio central expandido al 100% de ancho',
            'Transición premium y fluida de 300ms'
        ],
        tip: 'Haz clic en las flechas flotantes de los bordes para deslizar y colapsar los paneles en tiempo real.',
        color: 'from-emerald-600 via-teal-600 to-cyan-700',
        selector: '#playlist-panel'
    },
    {
        icon: Cast,
        tag: 'En vivo',
        title: 'Proyección y Vista Previa',
        description: 'El panel derecho te muestra en tiempo real la proyección que ve la congregación y el monitor secundario.',
        focus: [
            'Visualización del proyector en vivo',
            'Monitor activo y sincronización de ventanas',
            'Control de escala y encuadre responsivo',
            'Previsualización de animaciones premium'
        ],
        tip: 'Puedes colapsar este panel con el tirador derecho cuando no estés operando el vivo directamente.',
        color: 'from-violet-600 via-indigo-600 to-blue-700',
        selector: '#live-preview-panel'
    },
    {
        icon: Play,
        tag: 'Seguridad',
        title: 'Acciones del Vivo (Estilo ProPresenter)',
        description: 'Los botones de seguridad inferiores te otorgan control total e inmediato sobre la proyección ante cualquier imprevisto.',
        focus: [
            'Blackout: envía la pantalla a negro absoluto',
            'Clear Text: oculta letras manteniendo el fondo',
            'Show Logo: proyecta el logo con texto estilizado',
            'Split Screen: divide la pantalla para traducción o lectura'
        ],
        tip: 'Puedes presionar F9 (Black), F10 (Clear), F12 (Logo) en tu teclado para activarlos instantáneamente.',
        color: 'from-orange-600 via-amber-600 to-yellow-600',
        selector: '#live-action-controls'
    },
    {
        icon: Cloud,
        tag: 'Filtro Cloud',
        title: 'Seguridad Antiborrados en la Nube',
        description: 'Supabase mantiene tus datos a salvo. El sistema te protege contra eliminaciones locales accidentales.',
        focus: [
            'Detección fina a nivel de diapositivas/archivos',
            'Aviso de borrados en auto-guardado automático',
            'Advertencia de seguridad en sincronización manual',
            'Freno del sync para evitar pérdidas irreversibles'
        ],
        tip: 'Si eliminas un archivo por error y guardas, la modal de advertencia te avisará qué diapositiva exacta se perderá.',
        color: 'from-slate-700 via-blue-700 to-cyan-700'
    },
    {
        icon: History,
        tag: 'Auditoría',
        title: 'Historial Deduplicado & Atajos',
        description: 'Sigue cada movimiento realizado en cabina y navega a la velocidad de la luz mediante el teclado.',
        focus: [
            'Historial libre de registros duplicados',
            'Atajos rápidos: Espacio (Sig) y Flechas (Nav)',
            'Filtrado instantáneo por categorías',
            'Exportación de auditoría completa a texto'
        ],
        tip: 'Accede al historial en el menú superior para ver quién y cuándo realizó cualquier modificación.',
        color: 'from-rose-700 via-red-700 to-orange-700'
    }
];

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isExiting, setIsExiting] = useState(false);

    const step = STEPS[currentStep];
    const Icon = step.icon;
    const isLast = currentStep === STEPS.length - 1;
    const progress = Math.round(((currentStep + 1) / STEPS.length) * 100);

    // Dynamic spotlight highlighting
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
        <div className={`fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 p-3 sm:p-5 backdrop-blur-md transition-opacity duration-300 ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
            <style>{`
                @keyframes tutorialPulse {
                    0% {
                        box-shadow: 0 0 0 0px rgba(34, 211, 238, 0.4);
                        border-color: rgba(34, 211, 238, 0.4);
                    }
                    50% {
                        box-shadow: 0 0 25px 8px rgba(34, 211, 238, 0.8);
                        border-color: rgba(34, 211, 238, 1);
                    }
                    100% {
                        box-shadow: 0 0 0 0px rgba(34, 211, 238, 0);
                        border-color: rgba(34, 211, 238, 0.4);
                    }
                }
                .tutorial-highlight-active {
                    position: relative !important;
                    z-index: 9998 !important;
                    animation: tutorialPulse 2.2s infinite ease-in-out !important;
                    outline: 4px solid #22d3ee !important;
                    outline-offset: 2px !important;
                    transition: all 0.3s ease !important;
                }
            `}</style>
            <section className="grid w-full max-w-5xl overflow-hidden rounded-[1.4rem] border border-white/10 bg-slate-950 shadow-[0_30px_100px_rgba(0,0,0,0.65)] lg:grid-cols-[330px_minmax(0,1fr)]">
                <aside className={`relative flex flex-col justify-between overflow-hidden bg-gradient-to-br ${step.color} p-5 sm:p-7 lg:min-h-[560px]`}>
                    <div className="absolute -right-16 -bottom-16 h-56 w-56 rounded-full bg-white/15 blur-3xl" />
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-white/85">
                            <span>{step.tag}</span>
                            <span>•</span>
                            <span>Paso {currentStep + 1} de {STEPS.length}</span>
                        </div>
                        <div className="mt-5 grid h-16 w-16 place-items-center rounded-2xl border border-white/25 bg-white/15 shadow-2xl">
                            <Icon size={34} className="text-white" />
                        </div>
                        <h2 className="mt-5 max-w-sm text-2xl font-black leading-tight text-white sm:text-3xl lg:max-w-[280px]">
                            {step.title}
                        </h2>
                        <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/88 lg:max-w-[280px]">
                            {step.description}
                        </p>
                    </div>
                    <div className="relative z-10 mt-5">
                        <div className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-white/80">{progress}% completado</div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-white/20">
                            <div className="h-full rounded-full bg-white transition-all duration-300" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                </aside>

                <main className="flex min-h-0 flex-col bg-gradient-to-b from-slate-900 to-slate-950 lg:min-h-[560px]">
                    <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-slate-900/80 px-5 py-4 sm:px-6">
                        <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Guia rapida de operacion</span>
                        <button onClick={handleComplete} className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-300 hover:bg-white/10 hover:text-white">
                            Saltar <X size={14} className="ml-1 inline" />
                        </button>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
                        <p className="mb-4 text-base leading-relaxed text-slate-200 sm:text-lg">Puntos clave de este paso:</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {step.focus.map((item, index) => (
                                <div key={index} className="flex min-h-[68px] items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-3 text-sm leading-relaxed text-slate-300">
                                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-indigo-400/15 text-indigo-200">
                                        <Check size={14} />
                                    </span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.07] p-4 text-sm leading-relaxed text-cyan-50/90 font-semibold shadow-inner">
                            💡 Tip: {step.tip}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 border-t border-white/10 bg-slate-950 px-5 py-4 sm:px-6">
                        {STEPS.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentStep(index)}
                                aria-label={`Ir al paso ${index + 1}`}
                                className={`h-2 rounded-full transition-all ${index === currentStep ? 'w-8 bg-indigo-400' : index < currentStep ? 'w-4 bg-indigo-400/60' : 'w-3 bg-slate-600 hover:bg-slate-500'}`}
                            />
                        ))}
                    </div>

                    <div className="flex gap-3 bg-slate-950 px-5 pb-5 sm:px-6">
                        <button
                            onClick={handlePrev}
                            disabled={currentStep === 0}
                            className={`h-12 flex-1 rounded-2xl border border-white/10 bg-white/[0.045] text-sm font-black uppercase tracking-wide text-slate-300 transition-all hover:bg-white/10 hover:text-white ${currentStep === 0 ? 'invisible' : ''}`}
                        >
                            <ChevronLeft size={17} className="mr-1 inline" /> Anterior
                        </button>
                        <button
                            onClick={handleNext}
                            className={`h-12 flex-[1.35] rounded-2xl bg-gradient-to-r ${step.color} text-sm font-black uppercase tracking-wide text-white shadow-xl transition-all hover:brightness-110 active:scale-[0.99]`}
                        >
                            {isLast ? 'Comenzar' : 'Siguiente'} {isLast ? <Check size={17} className="ml-1 inline" /> : <ArrowRight size={17} className="ml-1 inline" />}
                        </button>
                    </div>
                </main>
            </section>
        </div>
    );
};

export default Onboarding;
