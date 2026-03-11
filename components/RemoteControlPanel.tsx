import React, { useState } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Eye,
    EyeOff,
    Eraser,
    Image as ImageIcon,
    Play,
    Pause,
    List,
    Folder,
    Monitor,
    Smartphone,
    Search,
    Type,
    Music,
    AlertCircle
} from 'lucide-react';
import { LiveState } from '../services/realtimeService';

interface RemoteControlPanelProps {
    liveState: LiveState | null;
    sendCommand: (command: string, data?: any) => Promise<void>;
    isConnected: boolean;
}

const RemoteControlPanel: React.FC<RemoteControlPanelProps> = ({ liveState, sendCommand, isConnected }) => {
    const [activeTab, setActiveTab] = useState<'control' | 'playlist' | 'projects'>('control');
    const [searchQuery, setSearchQuery] = useState('');

    if (!liveState) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center text-gray-500">
                <Smartphone size={48} className="mb-4 opacity-20" />
                <p className="text-sm">Esperando conexión con el servidor...</p>
            </div>
        );
    }

    const filteredPlaylist = liveState.playlist?.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    return (
        <div className="flex flex-col h-full max-h-[80vh] bg-gray-950 text-gray-100 overflow-hidden rounded-2xl border border-gray-800 shadow-2xl">
            {/* Header */}
            <div className="px-5 py-4 bg-gray-900/80 backdrop-blur-md border-b border-gray-800 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-600'}`}></div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        {isConnected ? 'Conectado' : 'Desconectado'}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-indigo-600/30 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/30">
                        {liveState.currentProjectName || 'Sin Proyecto'}
                    </span>
                </div>
            </div>

            {/* View Tabs */}
            <div className="flex border-b border-gray-800 bg-gray-900/40">
                <button
                    onClick={() => setActiveTab('control')}
                    className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'control' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    <Monitor size={14} /> Control
                </button>
                <button
                    onClick={() => setActiveTab('playlist')}
                    className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'playlist' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    <List size={14} /> Lista
                </button>
                <button
                    onClick={() => setActiveTab('projects')}
                    className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'projects' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    <Folder size={14} /> Proyectos
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {activeTab === 'control' && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Current Item Preview */}
                        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-4 border border-gray-700 shadow-inner overflow-hidden relative group">
                            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Monitor size={48} />
                            </div>
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Transmitiendo</span>
                                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${liveState.liveItemId ? 'bg-red-500/20 text-red-500' : 'bg-gray-700 text-gray-500'}`}>
                                    <div className={`w-1 h-1 rounded-full ${liveState.liveItemId ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></div>
                                    <span className="text-[8px] font-black uppercase">{liveState.liveItemId ? 'En Vivo' : 'Off'}</span>
                                </div>
                            </div>
                            <div className="min-h-[80px] flex flex-col items-center justify-center text-center">
                                {liveState.liveItemId ? (
                                    <>
                                        <h3 className="text-sm font-bold text-white mb-2 line-clamp-1">{liveState.playlist?.find(p => p.id === liveState.liveItemId)?.title}</h3>
                                        <div className="bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/5 text-xs text-indigo-200 line-clamp-2 italic">
                                            "{liveState.activeItemSlides?.[liveState.liveSlideIndex]?.content.replace(/<[^>]*>?/gm, '').split('\n')[0] || 'Sin texto'}"
                                        </div>
                                    </>
                                ) : (
                                    <span className="text-gray-600 text-xs italic">Ningún item seleccionado</span>
                                )}
                            </div>
                            <div className="mt-4 flex justify-center">
                                <div className="flex gap-1">
                                    {liveState.activeItemSlides?.map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => sendCommand('jump_to_slide', { index: i })}
                                            className={`h-6 rounded-full transition-all group relative flex items-center justify-center ${i === liveState.liveSlideIndex ? 'w-6 bg-indigo-500' : 'w-4 bg-gray-700 hover:bg-gray-600'}`}
                                            title={`Ir a slide ${i + 1}`}
                                        >
                                            <span className="text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity absolute">{i + 1}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Navigation Controls */}
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => sendCommand('prev')}
                                className="group relative flex flex-col items-center justify-center bg-gray-900 hover:bg-gray-800 active:scale-95 border border-gray-800 hover:border-indigo-500/50 py-8 rounded-3xl transition-all shadow-lg overflow-hidden"
                            >
                                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <ChevronLeft size={42} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                                <span className="text-[10px] font-black uppercase text-gray-500 mt-2 tracking-widest">Anterior</span>
                            </button>
                            <button
                                onClick={() => sendCommand('next')}
                                className="group relative flex flex-col items-center justify-center bg-gray-900 hover:bg-gray-800 active:scale-95 border border-gray-800 hover:border-indigo-500/50 py-8 rounded-3xl transition-all shadow-lg overflow-hidden"
                            >
                                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <ChevronRight size={42} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                                <span className="text-[10px] font-black uppercase text-gray-500 mt-2 tracking-widest">Siguiente</span>
                            </button>
                        </div>

                        {/* Visibility Toggles */}
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                onClick={() => sendCommand('blackout')}
                                className={`flex flex-col items-center justify-center p-5 rounded-2xl border transition-all ${liveState.isPreviewHidden ? 'bg-red-600 border-red-400 shadow-lg shadow-red-900/20 text-white' : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-gray-300'}`}
                            >
                                {liveState.isPreviewHidden ? <EyeOff size={24} /> : <Eye size={24} />}
                                <span className="text-[9px] font-bold mt-2">BLACKOUT</span>
                            </button>
                            <button
                                onClick={() => sendCommand('clear')}
                                className={`flex flex-col items-center justify-center p-5 rounded-2xl border transition-all ${liveState.isTextHidden ? 'bg-orange-600 border-orange-400 shadow-lg shadow-orange-900/20 text-white' : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-gray-300'}`}
                            >
                                <Eraser size={24} />
                                <span className="text-[9px] font-bold mt-2">LIMPIAR</span>
                            </button>
                            <button
                                onClick={() => sendCommand('logo')}
                                className={`flex flex-col items-center justify-center p-5 rounded-2xl border transition-all ${liveState.isLogoActive ? 'bg-blue-600 border-blue-400 shadow-lg shadow-blue-900/20 text-white' : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-gray-300'}`}
                            >
                                <ImageIcon size={24} />
                                <span className="text-[9px] font-bold mt-2">LOGO</span>
                            </button>
                        </div>

                        {/* Audio Controls */}
                        {liveState.backgroundAudioTitle && (
                            <div className="bg-indigo-900/20 rounded-2xl border border-indigo-500/20 p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="p-2 bg-indigo-600 rounded-lg text-white">
                                        <Music size={18} />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-tight">Audio</p>
                                        <p className="text-xs text-white font-bold truncate">{liveState.backgroundAudioTitle}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => sendCommand('toggle_audio')}
                                    className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-500 transition-colors"
                                >
                                    {liveState.isAudioPlaying ? <Pause size={20} /> : <Play size={20} />}
                                </button>
                            </div>
                        )}

                        <button
                            onClick={() => sendCommand('stop_live')}
                            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gray-900 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white font-bold transition-all"
                        >
                            <AlertCircle size={18} /> Detener Transmisión
                        </button>
                    </div>
                )}

                {activeTab === 'playlist' && (
                    <div className="space-y-4 animate-slide-up">
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar en la lista..."
                                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-10 py-3 text-sm focus:border-indigo-500 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            {filteredPlaylist.map((item, index) => (
                                <button
                                    key={item.id}
                                    onClick={() => sendCommand('jump_to_item', { itemId: item.id, makeLive: true })}
                                    className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left group ${liveState.liveItemId === item.id ? 'bg-indigo-600 border-indigo-400 shadow-lg shadow-indigo-900/20' : 'bg-gray-900 border-gray-800 hover:border-gray-700'}`}
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${liveState.liveItemId === item.id ? 'bg-white/20' : 'bg-gray-800 text-gray-500 group-hover:text-indigo-400 transition-colors'}`}>
                                        {item.type === 'song' ? <Music size={16} /> : item.type === 'bible' ? <Type size={16} /> : <List size={16} />}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className={`text-sm font-bold truncate ${liveState.liveItemId === item.id ? 'text-white' : 'text-gray-300'}`}>{item.title}</p>
                                        <p className={`text-[10px] ${liveState.liveItemId === item.id ? 'text-indigo-200' : 'text-gray-500'}`}>{item.type.toUpperCase()}</p>
                                    </div>
                                    {liveState.liveItemId === item.id && (
                                        <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                                    )}
                                </button>
                            ))}
                            {filteredPlaylist.length === 0 && (
                                <p className="text-center text-gray-600 py-10 italic">No se encontraron items.</p>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'projects' && (
                    <div className="space-y-3 animate-slide-up">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-2">Mis Proyectos</p>
                        {liveState.projects?.map((project) => (
                            <button
                                key={project.id}
                                onClick={() => sendCommand('change_project', { projectId: project.id })}
                                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left ${liveState.currentProjectName === project.name ? 'bg-indigo-600 border-indigo-400 shadow-lg shadow-indigo-900/20' : 'bg-gray-900 border-gray-800 hover:border-gray-700'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${liveState.currentProjectName === project.name ? 'bg-white/20' : 'bg-gray-800 text-gray-500'}`}>
                                        <Folder size={18} />
                                    </div>
                                    <span className={`text-sm font-bold ${liveState.currentProjectName === project.name ? 'text-white' : 'text-gray-300'}`}>{project.name}</span>
                                </div>
                                {liveState.currentProjectName === project.name && <CheckIcon size={16} className="text-white" />}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Status Footer */}
            <div className="px-5 py-3 bg-gray-900 border-t border-gray-800 flex items-center justify-center text-[10px] text-gray-500 gap-4">
                <span className="flex items-center gap-1"><Smartphone size={10} /> v2.4 Remote</span>
                <span className="flex items-center gap-1 opacity-50">|</span>
                <span>Oasis Sync Service</span>
            </div>
        </div>
    );
};

const CheckIcon = ({ size, className }: { size?: number, className?: string }) => (
    <svg
        width={size || 24}
        height={size || 24}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

export default RemoteControlPanel;
