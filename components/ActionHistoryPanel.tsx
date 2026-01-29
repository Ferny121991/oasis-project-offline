import React, { useState, useEffect } from 'react';
import { History, Trash2, RefreshCw, ChevronDown, ChevronUp, X } from 'lucide-react';
import { actionHistoryService, ActionHistoryEntry } from '../services/realtimeService';
import { supabase } from '../services/supabaseClient';

interface ActionHistoryPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const ActionHistoryPanel: React.FC<ActionHistoryPanelProps> = ({ isOpen, onClose }) => {
    const [history, setHistory] = useState<ActionHistoryEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                setUserId(session.user.id);
            }
        });
    }, []);

    useEffect(() => {
        if (isOpen && userId) {
            loadHistory();
        }
    }, [isOpen, userId]);

    const loadHistory = async () => {
        if (!userId) return;
        setIsLoading(true);
        const entries = await actionHistoryService.getHistory(userId, 100);
        setHistory(entries);
        setIsLoading(false);
    };

    const handleClearHistory = async () => {
        if (!userId) return;
        if (confirm('¿Estás seguro de que quieres eliminar todo el historial?')) {
            await actionHistoryService.clearHistory(userId);
            setHistory([]);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        // Less than 1 minute
        if (diff < 60000) {
            return 'Hace un momento';
        }
        // Less than 1 hour
        if (diff < 3600000) {
            const mins = Math.floor(diff / 60000);
            return `Hace ${mins} min`;
        }
        // Less than 24 hours
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `Hace ${hours}h`;
        }
        // Otherwise show date
        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getActionIcon = (type: string) => {
        switch (type) {
            case 'song_added': return '🎵';
            case 'song_removed': return '🗑️';
            case 'project_created': return '📁';
            case 'project_opened': return '📂';
            case 'slide_changed': return '📄';
            case 'theme_changed': return '🎨';
            case 'live_started': return '🔴';
            case 'live_stopped': return '⏹️';
            default: return '📋';
        }
    };

    const getActionColor = (type: string) => {
        switch (type) {
            case 'song_added':
            case 'project_created':
                return 'text-green-400';
            case 'song_removed':
                return 'text-red-400';
            case 'live_started':
                return 'text-red-500';
            case 'live_stopped':
                return 'text-gray-400';
            case 'theme_changed':
                return 'text-purple-400';
            default:
                return 'text-indigo-400';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[80vh] shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-800 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                            <History size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Historial de Acciones</h2>
                            <p className="text-xs text-gray-500">Últimas {history.length} actividades</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={loadHistory}
                            disabled={isLoading}
                            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                            title="Actualizar"
                        >
                            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                        <button
                            onClick={handleClearHistory}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Limpiar historial"
                        >
                            <Trash2 size={18} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <RefreshCw size={32} className="text-indigo-500 animate-spin" />
                        </div>
                    ) : history.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <History size={48} className="text-gray-700 mb-4" />
                            <p className="text-gray-500 text-sm">No hay actividad registrada</p>
                            <p className="text-gray-600 text-xs mt-1">Las acciones que realices aparecerán aquí</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {history.map((entry) => (
                                <div
                                    key={entry.id}
                                    className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden transition-all hover:border-gray-600"
                                >
                                    <button
                                        onClick={() => setExpanded(expanded === entry.id ? null : entry.id || null)}
                                        className="w-full flex items-center gap-3 p-3 text-left"
                                    >
                                        <span className="text-lg">{getActionIcon(entry.action_type)}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-medium truncate ${getActionColor(entry.action_type)}`}>
                                                {entry.description}
                                            </p>
                                            <p className="text-[10px] text-gray-500">
                                                {formatDate(entry.created_at || '')}
                                            </p>
                                        </div>
                                        {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                                            expanded === entry.id ? (
                                                <ChevronUp size={16} className="text-gray-500" />
                                            ) : (
                                                <ChevronDown size={16} className="text-gray-500" />
                                            )
                                        )}
                                    </button>

                                    {/* Expanded Details */}
                                    {expanded === entry.id && entry.metadata && Object.keys(entry.metadata).length > 0 && (
                                        <div className="px-3 pb-3 pt-0">
                                            <div className="bg-gray-900 rounded-lg p-2 text-xs font-mono text-gray-400">
                                                <pre className="whitespace-pre-wrap break-all">
                                                    {JSON.stringify(entry.metadata, null, 2)}
                                                </pre>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Info */}
                <div className="p-3 border-t border-gray-800 shrink-0">
                    <p className="text-[10px] text-gray-600 text-center">
                        💡 El historial se sincroniza con la nube automáticamente
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ActionHistoryPanel;
