import React, { useState, useEffect } from 'react';
import { History, Trash2, RefreshCw, ChevronDown, ChevronUp, X, Search, Download, AlertCircle, Check } from 'lucide-react';
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
    
    // New Feature States
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'songs' | 'projects' | 'live' | 'sync'>('all');
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

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
        const entries = await actionHistoryService.getHistory(userId, 150); // Increased limit to 150
        setHistory(entries);
        setIsLoading(false);
    };

    const triggerLocalToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const handleClearHistory = async () => {
        if (!userId) return;
        await actionHistoryService.clearHistory(userId);
        setHistory([]);
        setShowClearConfirm(false);
        triggerLocalToast("Historial borrado exitosamente");
    };

    const handleExportHistory = () => {
        if (history.length === 0) {
            triggerLocalToast("No hay registros para exportar");
            return;
        }

        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `flujoeclesial-historial-auditoria-${timestamp}.txt`;
            
            let fileContent = `=== HISTORIAL DE AUDITORIA - FLUJOECLESIAL STUDIO ===\n`;
            fileContent += `Generado el: ${new Date().toLocaleString()}\n`;
            fileContent += `Total de registros: ${history.length}\n`;
            fileContent += `====================================================\n\n`;

            history.forEach((entry, idx) => {
                const date = new Date(entry.created_at || '').toLocaleString();
                fileContent += `[${idx + 1}] Fecha: ${date}\n`;
                fileContent += `    Tipo: ${entry.action_type}\n`;
                fileContent += `    Acción: ${entry.description}\n`;
                if (entry.metadata && Object.keys(entry.metadata).length > 0) {
                    fileContent += `    Detalles: ${JSON.stringify(entry.metadata)}\n`;
                }
                fileContent += `----------------------------------------------------\n`;
            });

            const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            triggerLocalToast("Historial exportado con éxito");
        } catch (e) {
            console.error("Export error", e);
            triggerLocalToast("Error al exportar historial");
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        if (diff < 60000) return 'Hace un momento';
        if (diff < 3600000) {
            const mins = Math.floor(diff / 60000);
            return `Hace ${mins} min`;
        }
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `Hace ${hours}h`;
        }
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
            case 'cloud_sync_started': return '🔄';
            case 'cloud_sync_saved': return '💾';
            default: return '📋';
        }
    };

    const getActionColor = (type: string) => {
        switch (type) {
            case 'song_added':
            case 'project_created':
                return 'text-emerald-400';
            case 'song_removed':
                return 'text-rose-400';
            case 'live_started':
                return 'text-rose-500';
            case 'live_stopped':
                return 'text-slate-400';
            case 'theme_changed':
                return 'text-fuchsia-400';
            case 'cloud_sync_started':
            case 'cloud_sync_saved':
                return 'text-cyan-400';
            default:
                return 'text-indigo-400';
        }
    };

    // Filters and Categorizes actions dynamically
    const filteredHistory = history.filter((entry) => {
        // 1. Text Search matching
        const matchesText = 
            entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            entry.action_type.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (!matchesText) return false;

        // 2. Category Filter matching
        if (activeFilter === 'all') return true;
        if (activeFilter === 'songs') return entry.action_type.includes('song');
        if (activeFilter === 'projects') return entry.action_type.includes('project');
        if (activeFilter === 'live') return entry.action_type.includes('live') || entry.action_type.includes('slide');
        if (activeFilter === 'sync') return entry.action_type.includes('sync');

        return true;
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
            <div className="bg-slate-900/95 border border-white/10 rounded-[28px] w-full max-w-lg max-h-[82vh] shadow-[0_24px_60px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col relative animate-scale-up">
                
                {/* Local Toast Indicator */}
                {toastMessage && (
                    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[10002] bg-emerald-950/90 border border-emerald-500/30 text-emerald-300 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-2xl backdrop-blur">
                        <Check size={14} className="text-emerald-400" />
                        {toastMessage}
                    </div>
                )}

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/5 shrink-0 bg-slate-950/30">
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-400/20 text-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-950/30">
                            <History size={18} />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-white uppercase tracking-wider">Historial de Auditoría</h2>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                                {isLoading ? 'Cargando registros...' : `${filteredHistory.length} acciones filtradas`}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={loadHistory}
                            disabled={isLoading}
                            className="p-2 text-slate-400 hover:text-white hover:bg-white/[0.04] rounded-xl transition-all active:scale-90"
                            title="Actualizar"
                        >
                            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                        <button
                            onClick={handleExportHistory}
                            className="p-2 text-slate-400 hover:text-white hover:bg-white/[0.04] rounded-xl transition-all active:scale-90"
                            title="Exportar auditoría"
                        >
                            <Download size={16} />
                        </button>
                        <button
                            onClick={() => setShowClearConfirm(true)}
                            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all active:scale-90"
                            title="Limpiar historial"
                        >
                            <Trash2 size={16} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-white hover:bg-white/[0.04] rounded-xl transition-all active:scale-90"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Search & Quick Filters Bar */}
                <div className="px-5 py-3 border-b border-white/5 bg-slate-950/10 space-y-3 shrink-0">
                    {/* Search Bar */}
                    <div className="relative">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar en el historial de actividades..."
                            className="w-full bg-slate-950/80 border border-white/10 focus:border-indigo-500/60 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-600 outline-none transition-all focus:ring-2 focus:ring-indigo-500/15"
                        />
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs">
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    {/* Filter Pills */}
                    <div className="flex flex-wrap gap-1.5 pb-0.5">
                        {[
                            { id: 'all', label: 'Todos', icon: '📋' },
                            { id: 'songs', label: 'Canciones', icon: '🎵' },
                            { id: 'projects', label: 'Proyectos', icon: '📁' },
                            { id: 'live', label: 'En Vivo', icon: '🔴' },
                            { id: 'sync', label: 'Nube', icon: '🔄' }
                        ].map((filter) => (
                            <button
                                key={filter.id}
                                onClick={() => setActiveFilter(filter.id as any)}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                    activeFilter === filter.id 
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/15 border border-indigo-400/20' 
                                        : 'bg-white/[0.03] border border-white/5 text-slate-400 hover:text-white hover:bg-white/[0.06]'
                                }`}
                            >
                                <span>{filter.icon}</span>
                                <span>{filter.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 bg-slate-950/5">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <RefreshCw size={28} className="text-indigo-500 animate-spin" />
                        </div>
                    ) : filteredHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-16 h-16 rounded-full bg-slate-800/20 flex items-center justify-center border border-white/5 mb-4">
                                <History size={26} className="text-slate-600" />
                            </div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Sin actividad registrada</p>
                            <p className="text-slate-600 text-[10px] mt-1 font-medium">Las acciones de auditoría que coincidan aparecerán aquí</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredHistory.map((entry) => (
                                <div
                                    key={entry.id}
                                    className={`bg-[#0d1424]/40 border rounded-2xl overflow-hidden transition-all duration-200 ${
                                        expanded === entry.id ? 'border-white/10 bg-[#0d1424]/75 shadow-lg' : 'border-white/5 hover:border-white/10'
                                    }`}
                                >
                                    <button
                                        onClick={() => setExpanded(expanded === entry.id ? null : entry.id || null)}
                                        className="w-full flex items-center gap-3.5 p-3.5 text-left active:scale-[0.99] transition-transform"
                                    >
                                        <span className="text-base select-none shrink-0">{getActionIcon(entry.action_type)}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-xs font-bold leading-normal truncate ${getActionColor(entry.action_type)}`}>
                                                {entry.description}
                                            </p>
                                            <p className="text-[9px] text-slate-500 font-bold tracking-tight mt-0.5">
                                                {formatDate(entry.created_at || '')}
                                            </p>
                                        </div>
                                        {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                                            <div className="p-1 rounded-lg bg-white/[0.03] text-slate-500 hover:text-white transition-all shrink-0">
                                                {expanded === entry.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            </div>
                                        )}
                                    </button>

                                    {/* Expanded Details - Stylized metadata view */}
                                    {expanded === entry.id && entry.metadata && Object.keys(entry.metadata).length > 0 && (
                                        <div className="px-4 pb-4 pt-1">
                                            <div className="bg-black/35 border border-white/5 rounded-xl p-3 text-[10px] font-mono text-slate-400 space-y-1.5 shadow-inner">
                                                <div className="text-[9px] text-slate-600 font-black uppercase tracking-wider border-b border-white/5 pb-1">Metadatos de la acción:</div>
                                                <div className="grid grid-cols-1 gap-1.5 pt-0.5 max-h-32 overflow-y-auto no-scrollbar">
                                                    {Object.entries(entry.metadata).map(([key, val]) => (
                                                        <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-0.5">
                                                            <span className="text-indigo-400 font-bold shrink-0">{key}:</span>
                                                            <span className="text-slate-300 font-medium break-all text-right sm:max-w-[70%]">
                                                                {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Info */}
                <div className="p-3 bg-slate-950/40 border-t border-white/5 shrink-0">
                    <p className="text-[9px] text-slate-600 font-bold uppercase tracking-wider text-center flex items-center justify-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full shadow-[0_0_6px_#06b6d4] animate-pulse"></span>
                        Auditoría en tiempo real sincronizada en la nube
                    </p>
                </div>

                {/* ── Premium Clear Confirmation Inner Modal ── */}
                {showClearConfirm && (
                    <div className="absolute inset-0 z-[10001] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
                        <div className="bg-slate-900 border border-white/10 rounded-[22px] max-w-sm w-full p-5 shadow-2xl space-y-4 animate-scale-up">
                            <div className="flex items-center gap-3 text-rose-400">
                                <div className="p-2 bg-rose-500/10 rounded-xl text-rose-400 shrink-0">
                                    <AlertCircle size={20} className="animate-pulse" />
                                </div>
                                <h3 className="text-white font-black text-sm uppercase tracking-wider">¿Borrar Historial?</h3>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed font-medium">
                                Esta acción eliminará de forma irreversible todos los registros de auditoría de este dispositivo y de la nube. ¿Estás seguro de proceder?
                            </p>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setShowClearConfirm(false)}
                                    className="flex-1 py-2 px-3 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.04] text-[10px] font-black uppercase tracking-wider transition-all"
                                >
                                    No, mantener
                                </button>
                                <button
                                    onClick={handleClearHistory}
                                    className="flex-1 py-2 px-3 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 text-white font-black text-[10px] uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-red-600/25 hover:from-red-500 hover:to-rose-500"
                                >
                                    Sí, borrar todo
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActionHistoryPanel;
