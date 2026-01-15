import React, { useState, useEffect, useCallback } from 'react';
import { Timer, Play, Pause, RotateCcw, Clock, ChevronUp, ChevronDown, X, Bell } from 'lucide-react';

interface TimerWidgetProps {
    onClose?: () => void;
    isCompact?: boolean;
}

type TimerMode = 'stopwatch' | 'countdown';

const TimerWidget: React.FC<TimerWidgetProps> = ({ onClose, isCompact = false }) => {
    const [mode, setMode] = useState<TimerMode>('stopwatch');
    const [time, setTime] = useState(0); // in seconds
    const [isRunning, setIsRunning] = useState(false);
    const [countdownStart, setCountdownStart] = useState(300); // 5 minutes default
    const [showAlert, setShowAlert] = useState(false);

    // Countdown presets in seconds
    const PRESETS = [
        { label: '1 min', value: 60 },
        { label: '3 min', value: 180 },
        { label: '5 min', value: 300 },
        { label: '10 min', value: 600 },
        { label: '15 min', value: 900 },
        { label: '30 min', value: 1800 },
    ];

    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | null = null;

        if (isRunning) {
            interval = setInterval(() => {
                setTime(prev => {
                    if (mode === 'countdown') {
                        if (prev <= 1) {
                            setIsRunning(false);
                            setShowAlert(true);
                            // Play alert sound if available
                            try {
                                const audio = new Audio('/alert.mp3');
                                audio.play().catch(() => { });
                            } catch { }
                            return 0;
                        }
                        return prev - 1;
                    }
                    return prev + 1;
                });
            }, 1000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isRunning, mode]);

    const formatTime = (seconds: number): string => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hrs > 0) {
            return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleReset = () => {
        setIsRunning(false);
        setTime(mode === 'countdown' ? countdownStart : 0);
        setShowAlert(false);
    };

    const handleModeSwitch = (newMode: TimerMode) => {
        setMode(newMode);
        setIsRunning(false);
        setTime(newMode === 'countdown' ? countdownStart : 0);
    };

    const adjustCountdown = (delta: number) => {
        const newValue = Math.max(60, Math.min(7200, countdownStart + delta));
        setCountdownStart(newValue);
        if (!isRunning) setTime(newValue);
    };

    const selectPreset = (value: number) => {
        setCountdownStart(value);
        setTime(value);
        setIsRunning(false);
    };

    // Compact mode for PIP display
    if (isCompact) {
        return (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${isRunning ? 'bg-red-600/80' : 'bg-gray-800/80'} backdrop-blur-sm`}>
                <Timer size={14} className="text-white" />
                <span className="font-mono text-sm font-bold text-white">{formatTime(time)}</span>
            </div>
        );
    }

    return (
        <div className="bg-gray-900 rounded-2xl border border-gray-700 overflow-hidden shadow-2xl w-72">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-900 to-purple-900 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white font-bold">
                    <Timer size={18} />
                    <span>Temporizador</span>
                </div>
                {onClose && (
                    <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                )}
            </div>

            {/* Mode Toggle */}
            <div className="flex bg-gray-800 p-1 m-3 rounded-lg">
                <button
                    onClick={() => handleModeSwitch('stopwatch')}
                    className={`flex-1 py-2 rounded-md text-xs font-bold uppercase transition-all flex items-center justify-center gap-1 ${mode === 'stopwatch' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
                        }`}
                >
                    <Clock size={14} /> Cronómetro
                </button>
                <button
                    onClick={() => handleModeSwitch('countdown')}
                    className={`flex-1 py-2 rounded-md text-xs font-bold uppercase transition-all flex items-center justify-center gap-1 ${mode === 'countdown' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
                        }`}
                >
                    <Bell size={14} /> Cuenta Atrás
                </button>
            </div>

            {/* Time Display */}
            <div className={`text-center py-6 ${showAlert ? 'animate-pulse' : ''}`}>
                <div className={`font-mono text-5xl font-black ${showAlert ? 'text-red-500' :
                        time < 60 && mode === 'countdown' && isRunning ? 'text-yellow-400' : 'text-white'
                    }`}>
                    {formatTime(time)}
                </div>
                {showAlert && (
                    <div className="text-red-400 text-sm font-bold mt-2 animate-bounce">
                        ¡Tiempo terminado!
                    </div>
                )}
            </div>

            {/* Countdown Presets */}
            {mode === 'countdown' && !isRunning && (
                <div className="px-3 pb-3">
                    <div className="grid grid-cols-3 gap-2">
                        {PRESETS.map(preset => (
                            <button
                                key={preset.value}
                                onClick={() => selectPreset(preset.value)}
                                className={`py-1.5 rounded-lg text-xs font-bold transition-all ${countdownStart === preset.value
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                                    }`}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>

                    {/* Custom Adjust */}
                    <div className="flex items-center justify-center gap-4 mt-3">
                        <button
                            onClick={() => adjustCountdown(-60)}
                            className="p-2 rounded-full bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-all"
                        >
                            <ChevronDown size={18} />
                        </button>
                        <span className="text-gray-400 text-sm font-mono">{formatTime(countdownStart)}</span>
                        <button
                            onClick={() => adjustCountdown(60)}
                            className="p-2 rounded-full bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-all"
                        >
                            <ChevronUp size={18} />
                        </button>
                    </div>
                </div>
            )}

            {/* Controls */}
            <div className="flex gap-2 p-3 border-t border-gray-800">
                <button
                    onClick={handleReset}
                    className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white font-bold flex items-center justify-center gap-2 transition-all"
                >
                    <RotateCcw size={16} /> Reset
                </button>
                <button
                    onClick={() => {
                        setShowAlert(false);
                        setIsRunning(prev => !prev);
                    }}
                    className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${isRunning
                            ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
                            : 'bg-green-600 hover:bg-green-500 text-white'
                        }`}
                >
                    {isRunning ? <><Pause size={16} /> Pausar</> : <><Play size={16} /> Iniciar</>}
                </button>
            </div>
        </div>
    );
};

export default TimerWidget;
