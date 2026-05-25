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
        tip: 'Observa cómo el sistema resalta dinámicamente las áreas explicadas en la pantalla trasera.',
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
        <div className={`fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-[9999] w-[92%] sm:w-[440px] max-h-[85vh] flex flex-col bg-slate-900/98 border border-white/10 rounded-[28px] shadow-[0_24px_80px_rgba(0,0,0,0.85),0_0_35px_rgba(34,211,238,0.18)] overflow-hidden transition-all duration-300 ${isExiting ? 'opacity-0 translate-y-12' : 'opacity-100 translate-y-0 animate-scale-up'}`}>
            <style>{`
                @keyframes tutorialPulse {
                    0% {
                        outline-color: rgba(34, 211, 238, 0.4);
                        box-shadow: 0 0 0 0px rgba(34, 211, 238, 0.2);
                    }
                    50% {
                        outline-color: rgba(34, 211, 238, 1);
                        box-shadow: 0 0 30px 10px rgba(34, 211, 238, 0.5);
                    }
                    100% {
                        outline-color: rgba(34, 211, 238, 0.4);
                        box-shadow: 0 0 0 0px rgba(34, 211, 238, 0);
                    }
                }
                .tutorial-highlight-active {
                    position: relative !important;
                    z-index: 8000 !important;
                    animation: tutorialPulse 2s infinite ease-in-out !important;
                    outline: 5px solid #22d3ee !important;
                    outline-offset: 3px !important;
                    transition: all 0.3s ease !important;
                }
            `}</style>

            {/* Header Banner */}
            <div className={`p-5 bg-gradient-to-br ${step.color} relative shrink-0`}>
                <div className="absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
                <div className="flex items-center justify-between relative z-10">
                    <span className="bg-white/15 border border-white/20 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full text-white/90">
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

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-slate-950/20">
                <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                    {step.description}
                </p>

                <div className="space-y-2">
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Puntos Clave:</p>
                    <div className="flex flex-col gap-2">
                        {step.focus.map((item, idx) => (
                            <div key={idx} className="flex items-start gap-2 bg-white/[0.02] border border-white/5 p-2.5 rounded-xl">
                                <span className="mt-0.5 w-4 h-4 bg-indigo-500/10 border border-indigo-400/25 text-indigo-400 rounded-md flex items-center justify-center shrink-0 text-[10px]">
                                    ✓
                                </span>
                                <span className="text-[10.5px] text-slate-300 font-medium leading-tight">{item}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-cyan-950/40 border border-cyan-500/25 text-cyan-200/90 p-3.5 rounded-xl text-[10.5px] leading-relaxed shadow-inner">
                    💡 Tip: {step.tip}
                </div>
            </div>

            {/* Progress and Navigation Footer */}
            <div className="p-4 bg-slate-950/80 border-t border-white/5 shrink-0 flex flex-col gap-3">
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
                        className={`flex-[1.4] h-9 rounded-xl bg-gradient-to-r ${step.color} text-[10px] font-black uppercase tracking-wider text-white shadow-lg active:scale-95 transition-all hover:brightness-110 flex items-center justify-center gap-1.5`}
                    >
                        {isLast ? 'Entendido' : 'Siguiente'}
                        {isLast ? <Check size={12} /> : <ArrowRight size={12} />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Onboarding;
