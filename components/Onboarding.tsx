import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, X, Sparkles, Music, BookOpen, Monitor, Palette, Play, ArrowRight, Check } from 'lucide-react';

interface OnboardingProps {
    onComplete: () => void;
}

const STEPS = [
    {
        icon: Sparkles,
        title: '¡Bienvenido a Oasis Project!',
        description: 'Tu nuevo centro de control para presentaciones en la iglesia. Vamos a darte un tour rápido.',
        highlight: null,
        color: 'from-indigo-600 to-purple-600'
    },
    {
        icon: Music,
        title: 'Panel de Contenido',
        description: 'Aquí puedes buscar canciones, versículos bíblicos o pegar texto manualmente. La IA te ayudará a formatear todo automáticamente.',
        highlight: 'control-panel',
        color: 'from-pink-600 to-rose-600'
    },
    {
        icon: BookOpen,
        title: 'Tu Playlist',
        description: 'Todos tus cantos y versículos aparecen aquí. Puedes arrastrar para reordenar, editar títulos y eliminar elementos.',
        highlight: 'playlist',
        color: 'from-green-600 to-emerald-600'
    },
    {
        icon: Monitor,
        title: 'Vista Previa',
        description: 'Aquí ves cómo se verá tu contenido. Los cambios de diseño se muestran aquí antes de aplicarlos.',
        highlight: 'preview',
        color: 'from-blue-600 to-cyan-600'
    },
    {
        icon: Palette,
        title: 'Temas y Estilos',
        description: 'Cambia colores, fuentes, animaciones y más. Tenemos 15 temas predefinidos para diferentes ocasiones.',
        highlight: 'theme-tab',
        color: 'from-orange-600 to-amber-600'
    },
    {
        icon: Play,
        title: '¡En Vivo!',
        description: 'Haz doble clic en cualquier diapositiva o usa el botón "EN VIVO" para proyectar. Presiona "P" para abrir el proyector.',
        highlight: 'live-button',
        color: 'from-red-600 to-rose-600'
    }
];

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isExiting, setIsExiting] = useState(false);

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

    const handleSkip = () => {
        handleComplete();
    };

    const step = STEPS[currentStep];
    const Icon = step.icon;
    const isLast = currentStep === STEPS.length - 1;

    return (
        <div
            className={`fixed inset-0 z-[9999] flex items-center justify-center transition-all duration-300 ${isExiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

            {/* Card */}
            <div className="relative z-10 w-full max-w-lg mx-4">
                {/* Skip Button */}
                <button
                    onClick={handleSkip}
                    className="absolute -top-12 right-0 text-gray-400 hover:text-white text-sm flex items-center gap-1 transition-colors"
                >
                    Saltar Tour <X size={16} />
                </button>

                <div className="bg-gray-900 rounded-3xl border border-gray-700 overflow-hidden shadow-2xl">
                    {/* Header with Icon */}
                    <div className={`bg-gradient-to-r ${step.color} p-8 flex flex-col items-center text-center`}>
                        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
                            <Icon size={40} className="text-white" />
                        </div>
                        <h2 className="text-2xl font-black text-white mb-2">{step.title}</h2>
                        <p className="text-white/80 text-sm max-w-sm">{step.description}</p>
                    </div>

                    {/* Progress Dots */}
                    <div className="flex justify-center gap-2 py-4 bg-gray-800">
                        {STEPS.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentStep(index)}
                                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${index === currentStep
                                        ? 'bg-indigo-500 w-8'
                                        : index < currentStep
                                            ? 'bg-indigo-400'
                                            : 'bg-gray-600'
                                    }`}
                            />
                        ))}
                    </div>

                    {/* Navigation */}
                    <div className="flex gap-3 p-4 bg-gray-900 border-t border-gray-800">
                        <button
                            onClick={handlePrev}
                            disabled={currentStep === 0}
                            className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-400 font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-800 hover:text-white"
                        >
                            <ChevronLeft size={18} /> Anterior
                        </button>
                        <button
                            onClick={handleNext}
                            className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${isLast
                                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-400 hover:to-emerald-400'
                                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500'
                                }`}
                        >
                            {isLast ? (
                                <>¡Comenzar! <Check size={18} /></>
                            ) : (
                                <>Siguiente <ChevronRight size={18} /></>
                            )}
                        </button>
                    </div>
                </div>

                {/* Step Counter */}
                <div className="text-center mt-4 text-gray-500 text-sm">
                    Paso {currentStep + 1} de {STEPS.length}
                </div>
            </div>
        </div>
    );
};

export default Onboarding;
