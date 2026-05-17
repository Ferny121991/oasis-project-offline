import React, { useState } from 'react';
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
}

const STEPS: TutorialStep[] = [
    {
        icon: Sparkles,
        tag: 'Bienvenida',
        title: 'Bienvenido a FlujoEclesial Studio',
        description: 'Aprende el flujo completo sin detenerte en detalles innecesarios.',
        focus: ['Preparar contenido antes del servicio', 'Proyectar con una salida limpia', 'Controlar desde celular o tablet', 'Trabajar aunque falle internet'],
        tip: 'El tour esta pensado para cabina: corto, directo y facil de seguir.',
        color: 'from-indigo-600 via-violet-600 to-fuchsia-700'
    },
    {
        icon: Library,
        tag: 'Contenido',
        title: 'Prepara canciones, textos y recursos',
        description: 'Todo comienza en el panel de contenido.',
        focus: ['YouTube para videos y musica de fondo', 'Manual para avisos, lecturas y textos libres', 'Biblia para pasajes listos para proyectar', 'Imagenes y elementos nuevos desde cero'],
        tip: 'Prepara primero, proyecta despues. Ese orden evita carreras durante el servicio.',
        color: 'from-sky-600 via-cyan-600 to-teal-700'
    },
    {
        icon: BookOpen,
        tag: 'Biblia',
        title: 'Crea lecturas biblicas en segundos',
        description: 'Busca una referencia y conviertela en diapositivas limpias.',
        focus: ['RV1960, NVI, NTV, LBLA, NIV, KJV y NKJV', 'Autocompletado de libros', 'Formato consistente para lectura publica', 'Util para predicacion, lecturas y anuncios'],
        tip: 'Usa referencias claras como Juan 3:16 o Salmos 23:1-4.',
        color: 'from-amber-600 via-orange-600 to-rose-600'
    },
    {
        icon: UploadCloud,
        tag: 'Importacion',
        title: 'Agrega PDF, PowerPoint y multimedia',
        description: 'El material externo entra al mismo flujo de presentacion.',
        focus: ['PowerPoint convertido en slides', 'PDF integrado al servicio', 'Imagenes y videos locales', 'Medios organizados junto a canciones y textos'],
        tip: 'Revisa cada archivo importado en vista previa antes de salir en vivo.',
        color: 'from-blue-700 via-indigo-700 to-violet-700'
    },
    {
        icon: Palette,
        tag: 'Diseno',
        title: 'Ajusta el estilo antes de proyectar',
        description: 'Controla la apariencia sin perder velocidad.',
        focus: ['Temas predefinidos', 'Fuentes, tamanos, sombras y colores', 'Fondos, degradados e imagenes', 'Vista previa antes de enviar'],
        tip: 'Un estilo simple y consistente casi siempre se ve mas profesional.',
        color: 'from-purple-600 via-pink-600 to-rose-600'
    },
    {
        icon: List,
        tag: 'Playlist',
        title: 'Ordena el servicio completo',
        description: 'La playlist funciona como la escaleta de cabina.',
        focus: ['Arrastra para reordenar', 'Edita titulos para claridad', 'Agrupa canciones, lecturas y avisos', 'Separa eventos usando proyectos'],
        tip: 'Nombra los elementos como los diria el equipo: Cancion 1, Lectura, Anuncios, Predica.',
        color: 'from-emerald-600 via-teal-600 to-cyan-700'
    },
    {
        icon: Layout,
        tag: 'Slides',
        title: 'Revisa cada diapositiva antes de enviarla',
        description: 'Selecciona, previsualiza y manda al vivo cuando este lista.',
        focus: ['Clic para previsualizar', 'Doble clic para enviar en vivo', 'Flechas para navegar rapido', 'PDF y PPTX entran en este flujo'],
        tip: 'La vista previa es tu ultimo filtro antes de que lo vea la audiencia.',
        color: 'from-violet-600 via-indigo-600 to-blue-700'
    },
    {
        icon: Cast,
        tag: 'En vivo',
        title: 'Controla la salida del proyector',
        description: 'Usa los botones de seguridad para transiciones limpias.',
        focus: ['Black para pantalla negra', 'Clear para ocultar texto', 'Logo para pausa visual', 'Split y Proyector para salidas especiales'],
        tip: 'Black, Clear y Logo salvan momentos cuando necesitas corregir algo rapido.',
        color: 'from-orange-600 via-amber-600 to-yellow-600'
    },
    {
        icon: MonitorSmartphone,
        tag: 'Remoto',
        title: 'Opera desde celular o tablet',
        description: 'El remoto te libera de estar pegado a la computadora.',
        focus: ['Conexion por QR o URL local', 'Cambio de slides desde el movil', 'Busqueda dentro de la playlist', 'Agregar imagenes desde el dispositivo'],
        tip: 'La computadora principal sigue abierta; el telefono solo envia comandos.',
        color: 'from-cyan-600 via-blue-600 to-indigo-700'
    },
    {
        icon: ZoomIn,
        tag: 'Zoom',
        title: 'Ajusta el encuadre desde el remoto',
        description: 'Corrige imagenes o documentos sin rehacer la diapositiva.',
        focus: ['Acercar y alejar', 'Mover el encuadre', 'Gestos tactiles compatibles', 'Reiniciar la vista original'],
        tip: 'Util cuando una imagen o documento necesita leerse mejor en pantalla grande.',
        color: 'from-fuchsia-600 via-purple-600 to-indigo-700'
    },
    {
        icon: Cloud,
        tag: 'Respaldo',
        title: 'Trabaja local y sincroniza con control',
        description: 'Prioriza estabilidad durante el evento y respalda cuando convenga.',
        focus: ['Modo local-first', 'Supabase cuando esta configurado', 'Sincronizacion manual recomendada', 'Exportar e importar .oasis.json'],
        tip: 'Antes de cambios grandes, exporta una copia del servicio.',
        color: 'from-slate-700 via-blue-700 to-cyan-700'
    },
    {
        icon: History,
        tag: 'Recuperacion',
        title: 'Corrige errores sin detener el flujo',
        description: 'Historial, proyectos y respaldo ayudan a volver al camino.',
        focus: ['Historial de acciones', 'Restauracion cuando haga falta', 'Importacion selectiva', 'Calendario y temporizador de apoyo'],
        tip: 'En vivo, resolver rapido vale mas que editar perfecto.',
        color: 'from-rose-700 via-red-700 to-orange-700'
    },
    {
        icon: Keyboard,
        tag: 'Atajos',
        title: 'Maneja la proyeccion con teclado',
        description: 'Reduce clics y gana velocidad durante el servicio.',
        focus: ['Espacio: siguiente slide', 'Flechas: navegar slides', 'B: blackout', 'C: clear', 'L: logo', 'P: proyector', 'F: pantalla completa'],
        tip: 'Practica los atajos una vez antes del servicio y el flujo se siente mucho mas natural.',
        color: 'from-zinc-700 via-slate-700 to-gray-800'
    },
    {
        icon: Play,
        tag: 'Listo',
        title: 'Comienza con confianza',
        description: 'Prepara, revisa, abre proyector, conecta remoto y opera desde la playlist.',
        focus: ['Contenido listo antes de salir en vivo', 'Vista previa antes de enviar', 'Transiciones con Black, Clear o Logo', 'Respaldo al terminar'],
        tip: 'La mejor proyeccion se siente invisible: clara, tranquila y sin distracciones.',
        color: 'from-green-600 via-emerald-600 to-teal-700'
    }
];

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isExiting, setIsExiting] = useState(false);

    const step = STEPS[currentStep];
    const Icon = step.icon;
    const isLast = currentStep === STEPS.length - 1;
    const progress = Math.round(((currentStep + 1) / STEPS.length) * 100);

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
                        <div className="mt-4 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.07] p-4 text-sm leading-relaxed text-cyan-50/90">
                            {step.tip}
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
