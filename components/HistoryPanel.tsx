import React from 'react';
import { HistoryEntry, Theme } from '../types';
import { Clock, RotateCcw, X, Palette, Type } from 'lucide-react';

interface HistoryPanelProps {
    history: HistoryEntry[];
    onRestore: (entry: HistoryEntry) => void;
    onClose: () => void;
    isOpen: boolean;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, onRestore, onClose, isOpen }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end">
            <div className="w-80 h-full bg-gray-900 border-l border-gray-800 shadow-2xl flex flex-col animate-slide-in-right">
                {/* Header */}
                <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/95 backdrop-blur z-10">
                    <div className="flex items-center gap-2 text-indigo-400">
                        <Clock size={18} />
                        <h2 className="font-bold text-sm uppercase tracking-wider">Historial</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {history.length === 0 ? (
                        <div className="text-center py-10 text-gray-500 text-xs italic">
                            No hay cambios recientes
                        </div>
                    ) : (
                        history.map((entry, i) => (
                            <div key={entry.id} className="group relative">
                                {/* Timeline Line */}
                                {i < history.length - 1 && (
                                    <div className="absolute left-[11px] top-7 bottom-0 w-px bg-gray-800 group-hover:bg-gray-700 transition-colors -mb-3" />
                                )}

                                <div className="flex gap-3">
                                    <div className="mt-1 w-6 h-6 rounded-full bg-indigo-900/30 border border-indigo-500/30 flex items-center justify-center shrink-0 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-500 transition-all">
                                        <span className="text-[10px] font-bold">{history.length - i}</span>
                                    </div>

                                    <div className="flex-1 bg-gray-800/50 hover:bg-gray-800 rounded-lg p-3 border border-gray-700/50 hover:border-gray-600 transition-all group-hover:shadow-lg">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] text-gray-400 font-medium">
                                                {new Date(entry.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap gap-1 mb-3">
                                            {/* Visual Tags describing the theme state */}
                                            <span className="px-1.5 py-0.5 rounded bg-gray-700/50 text-[9px] text-gray-300 flex items-center gap-1">
                                                <Type size={10} /> {entry.data.fontFamily.split(',')[0].replace(/['"]/g, '')}
                                            </span>
                                            {entry.data.background && (
                                                <span className="px-1.5 py-0.5 rounded bg-gray-700/50 text-[9px] text-gray-300 flex items-center gap-1">
                                                    <Palette size={10} /> Fondo
                                                </span>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => onRestore(entry)}
                                            className="w-full py-1.5 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded text-xs font-bold uppercase transition-all flex items-center justify-center gap-2"
                                        >
                                            <RotateCcw size={12} />
                                            Restaurar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default HistoryPanel;
