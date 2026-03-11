import React, { useState } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Eye,
    EyeOff,
    Eraser,
    Image as ImageIcon,
    List,
    Folder,
    Monitor,
    Smartphone,
    Search,
    Type,
    Music,
    AlertCircle,
    PlayCircle
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
            <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500 bg-[#080d08] min-h-screen">
                <Smartphone size={48} className="mb-4 opacity-20" />
                <p className="text-sm font-medium">Esperando conexión...</p>
                <p className="text-xs opacity-60 mt-2">Asegúrate de que el presentador esté activo.</p>
            </div>
        );
    }

    const filteredPlaylist = liveState.playlist?.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const activeItem = liveState.playlist?.find(p => p.id === liveState.liveItemId);
    const hasLiveItem = !!liveState.liveItemId;

    return (
        <div className="flex flex-col h-[100dvh] w-full bg-[#080d08] text-slate-100 overflow-hidden font-sans antialiased selection:bg-[#0df20d]/30">
            {/* Top App Bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#080d08]/80 backdrop-blur-md border-b border-[#0df20d]/10 shrink-0 z-50">
                <button
                    onClick={() => setActiveTab('playlist')}
                    className="p-2 -ml-2 text-slate-300 hover:text-[#0df20d] transition-colors rounded-full hover:bg-[#0df20d]/10 flex items-center justify-center">
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-sm font-bold text-center flex-1 mx-4 truncate text-slate-100">
                    {activeItem ? activeItem.title : (liveState.currentProjectName || 'Control Remoto')}
                </h1>

                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full border ${isConnected ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                    <span className={`text-[10px] font-bold tracking-wider ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
                        {isConnected ? (hasLiveItem ? 'EN VIVO' : 'ONLINE') : 'OFFLINE'}
                    </span>
                </div>
            </div>

            <main className="flex-1 overflow-y-auto pb-6 relative custom-scrollbar">
                {activeTab === 'control' && (
                    <div className="animate-fade-in w-full max-w-md mx-auto">
                        {/* Live Preview Area */}
                        <div className="p-4">
                            <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.3)] border border-[#0df20d]/20 bg-slate-900/50 flex flex-col justify-end p-5"
                                style={{ background: 'radial-gradient(circle at center top, rgba(13,242,13,0.15) 0%, rgba(10,18,10,1) 80%)' }}>
                                <div className="absolute top-3 left-3 bg-[#0df20d]/20 backdrop-blur-sm border border-[#0df20d]/30 px-2 py-1 rounded text-[10px] font-bold text-[#0df20d] uppercase tracking-wide shadow-sm">
                                    {hasLiveItem ? 'Current Output' : 'Preview'}
                                </div>

                                <p className="text-white text-xl md:text-2xl font-bold leading-tight drop-shadow-md text-center italic line-clamp-3">
                                    {hasLiveItem
                                        ? (liveState.activeItemSlides?.[liveState.liveSlideIndex]?.content.replace(/<[^>]*>?/gm, '') || '')
                                        : 'Selecciona un item para comenzar'}
                                </p>
                            </div>
                        </div>

                        {/* Quick Actions Toolbar */}
                        <div className="px-4 pb-4">
                            <div className="flex justify-around items-center rounded-lg p-2 border border-slate-700/50"
                                style={{ background: 'rgba(18, 26, 18, 0.7)', backdropFilter: 'blur(12px)' }}>
                                <button
                                    onClick={() => sendCommand('blackout')}
                                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all w-20 ${liveState.isPreviewHidden ? 'text-[#0df20d] bg-[#0df20d]/10' : 'text-slate-400 hover:bg-[#0df20d]/10 hover:text-[#0df20d]'}`}>
                                    {liveState.isPreviewHidden ? <EyeOff size={24} /> : <Eye size={24} />}
                                    <span className="text-[9px] font-medium uppercase tracking-wider">Blackout</span>
                                </button>
                                <div className="w-px h-8 bg-slate-700/50"></div>
                                <button
                                    onClick={() => sendCommand('clear')}
                                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all w-20 ${liveState.isTextHidden ? 'text-[#0df20d] bg-[#0df20d]/10' : 'text-slate-400 hover:bg-[#0df20d]/10 hover:text-[#0df20d]'}`}>
                                    <Eraser size={24} />
                                    <span className="text-[9px] font-medium uppercase tracking-wider">Clear Text</span>
                                </button>
                                <div className="w-px h-8 bg-slate-700/50"></div>
                                <button
                                    onClick={() => sendCommand('logo')}
                                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all w-20 ${liveState.isLogoActive ? 'text-[#0df20d] bg-[#0df20d]/10' : 'text-slate-400 hover:bg-[#0df20d]/10 hover:text-[#0df20d]'}`}>
                                    <ImageIcon size={24} />
                                    <span className="text-[9px] font-medium uppercase tracking-wider">Show Logo</span>
                                </button>
                            </div>
                        </div>

                        {/* Navigation controls array */}
                        <div className="px-4 pb-4 flex gap-3">
                            <button
                                onClick={() => sendCommand('prev')}
                                className="flex-1 bg-[#121a12] active:bg-[#1a261a] border border-slate-800 py-3 rounded-xl flex items-center justify-center gap-2 text-slate-300 transition-colors shadow-sm"
                            >
                                <ChevronLeft size={20} /> <span className="text-xs font-bold uppercase tracking-wider">Anterior</span>
                            </button>
                            <button
                                onClick={() => sendCommand('next')}
                                className="flex-1 bg-[#121a12] active:bg-[#1a261a] border border-slate-800 py-3 rounded-xl flex items-center justify-center gap-2 text-slate-300 transition-colors shadow-sm"
                            >
                                <span className="text-xs font-bold uppercase tracking-wider">Siguiente</span> <ChevronRight size={20} />
                            </button>
                        </div>

                        {/* Slides List */}
                        {hasLiveItem && (
                            <div className="px-4 space-y-3 pb-8">
                                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">Setlist Slides</h2>

                                {liveState.activeItemSlides?.map((slide, i) => {
                                    const isLive = i === liveState.liveSlideIndex;
                                    const previewText = slide.content.replace(/<[^>]*>?/gm, '');

                                    return (
                                        <div
                                            key={i}
                                            onClick={() => sendCommand('jump_to_slide', { index: i })}
                                            className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all ${isLive ? 'bg-[#0df20d]/10 border-2 border-[#0df20d] shadow-[0_0_15px_rgba(13,242,13,0.15)] relative overflow-hidden group' : 'bg-white/5 border border-slate-700/50 active:bg-slate-800/60 opacity-90'}`}
                                        >
                                            {isLive && <div className="absolute inset-0 bg-gradient-to-r from-[#0df20d]/5 to-transparent opacity-50"></div>}

                                            <div className={`relative w-20 aspect-video rounded-lg overflow-hidden shrink-0 flex items-center justify-center ${isLive ? 'border border-[#0df20d]/30 bg-[#121a12]' : 'bg-[#121a12] border border-slate-700'}`}>
                                                {slide.type === 'video' ? <Monitor size={16} className="text-slate-500" /> : <Type size={16} className={isLive ? 'text-[#0df20d]/80' : 'text-slate-600'} />}
                                            </div>

                                            <div className="flex-1 min-w-0 py-1 z-10">
                                                <div className="flex items-center justify-between mb-1">
                                                    {isLive ? (
                                                        <span className="text-[9px] font-bold text-[#0df20d] bg-[#0df20d]/20 px-1.5 py-0.5 rounded uppercase tracking-wide">Live</span>
                                                    ) : (
                                                        <span className="text-[9px] font-semibold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded uppercase">{slide.type}</span>
                                                    )}
                                                    <span className="text-[10px] text-slate-400 font-medium">Slide {i + 1}</span>
                                                </div>
                                                <p className={`text-xs md:text-sm font-medium truncate ${isLive ? 'text-slate-100' : 'text-slate-300'}`}>
                                                    {previewText || <span className="italic text-slate-500">Vacío</span>}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'playlist' && (
                    <div className="animate-fade-in w-full max-w-md mx-auto h-full flex flex-col">
                        <div className="flex items-center justify-between px-6 pt-4 pb-2">
                            <h2 className="text-slate-100 text-lg font-bold leading-tight flex-1 text-center tracking-tight">Library</h2>
                        </div>

                        <div className="px-4 py-3">
                            <label className="flex flex-col min-w-40 h-11 w-full relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10">
                                    <Search size={18} />
                                </div>
                                <input
                                    className="flex w-full flex-1 rounded-xl text-slate-100 border-none placeholder:text-slate-500 pl-10 pr-4 text-sm font-normal focus:outline-none focus:ring-1 focus:ring-[#0df20d]/50"
                                    placeholder="Buscar canciones o items..."
                                    style={{ background: 'rgba(18, 26, 18, 0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.05)' }}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </label>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-6 pb-20">
                            {/* Playlists Menu */}
                            <section>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-slate-100 text-md font-bold tracking-tight">Active Presentation</h3>
                                    {liveState.liveItemId && (
                                        <button
                                            onClick={() => sendCommand('stop_live')}
                                            className="text-red-400 text-[10px] uppercase font-bold flex items-center gap-1">
                                            <AlertCircle size={12} /> Stop Live
                                        </button>
                                    )}
                                </div>
                                <div className="flex flex-col gap-3">
                                    {filteredPlaylist.map((item) => {
                                        const isLive = liveState.liveItemId === item.id;
                                        return (
                                            <div
                                                key={item.id}
                                                onClick={() => sendCommand('jump_to_item', { itemId: item.id, makeLive: true })}
                                                className="flex items-center p-3 rounded-xl border border-[#1c2e1c] cursor-pointer transition-colors active:bg-[#1a261a]"
                                                style={{ background: isLive ? 'rgba(13,242,13,0.05)' : 'rgba(18, 26, 18, 0.7)', backdropFilter: 'blur(12px)', borderColor: isLive ? 'rgba(13,242,13,0.3)' : 'rgba(255, 255, 255, 0.05)' }}
                                            >
                                                <div className={`size-10 rounded-lg flex items-center justify-center mr-4 shrink-0 transition-colors ${isLive ? 'bg-[#0df20d]/10 text-[#0df20d]' : 'bg-[#0a120a] text-slate-400'}`}>
                                                    {item.type === 'song' ? <Music size={18} /> : item.type === 'bible' ? <Type size={18} /> : <List size={18} />}
                                                </div>
                                                <div className="flex-1 min-w-0 pr-2">
                                                    <p className={`text-sm font-bold truncate ${isLive ? 'text-slate-100' : 'text-slate-300'}`}>{item.title}</p>
                                                    <p className="text-xs text-slate-500">{item.slides?.length || 0} Slides • {item.type.toUpperCase()}</p>
                                                </div>
                                                {isLive ? (
                                                    <div className="size-2 bg-[#0df20d] rounded-full animate-pulse shadow-[0_0_8px_#0df20d]"></div>
                                                ) : (
                                                    <PlayCircle size={18} className="text-slate-600 opacity-50 transition-opacity group-hover:opacity-100" />
                                                )}
                                            </div>
                                        );
                                    })}

                                    {filteredPlaylist.length === 0 && (
                                        <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl">
                                            <p className="text-slate-500 text-sm">No items found</p>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>
                    </div>
                )}

                {activeTab === 'projects' && (
                    <div className="animate-fade-in w-full max-w-md mx-auto h-full flex flex-col p-4">
                        <div className="flex flex-col gap-4">
                            <h3 className="text-slate-100 text-md font-bold tracking-tight mb-2">Mis Proyectos (Sets)</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {liveState.projects?.map((project) => (
                                    <div
                                        key={project.id}
                                        onClick={() => sendCommand('change_project', { projectId: project.id })}
                                        className="flex flex-col gap-2 cursor-pointer group"
                                    >
                                        <div className="relative aspect-square rounded-xl overflow-hidden border transition-all shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
                                            style={{ background: liveState.currentProjectName === project.name ? 'rgba(13,242,13,0.05)' : 'rgba(18, 26, 18, 0.7)', backdropFilter: 'blur(12px)', borderColor: liveState.currentProjectName === project.name ? 'rgba(13,242,13,0.3)' : 'rgba(255, 255, 255, 0.05)' }}>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Folder size={40} className={liveState.currentProjectName === project.name ? 'text-[#0df20d]' : 'text-slate-500 group-hover:scale-105 transition-transform'} />
                                            </div>
                                        </div>
                                        <div>
                                            <p className={`text-sm font-bold truncate ${liveState.currentProjectName === project.name ? 'text-[#0df20d]' : 'text-slate-200'}`}>{project.name}</p>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Proyecto Guardado</p>
                                        </div>
                                    </div>
                                ))}
                                {(!liveState.projects || liveState.projects.length === 0) && (
                                    <p className="text-slate-500 text-xs col-span-2 text-center py-4">No projects available</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Bottom Navigation Bar */}
            <div className="border-t border-[#1c2e1c] px-6 pb-6 pt-3 flex items-center justify-between shrink-0"
                style={{ background: 'rgba(18, 26, 18, 0.85)', backdropFilter: 'blur(12px)' }}>
                <button
                    onClick={() => setActiveTab('control')}
                    className={`flex flex-col items-center gap-1 ${activeTab === 'control' ? 'text-[#0df20d]' : 'text-slate-500'}`}
                >
                    <Monitor size={22} className={activeTab === 'control' ? 'fill-[#0df20d]/20' : ''} />
                    <p className={`text-[10px] ${activeTab === 'control' ? 'font-bold' : 'font-medium'}`}>Remote</p>
                </button>

                <button
                    onClick={() => setActiveTab('playlist')}
                    className={`flex flex-col items-center gap-1 ${activeTab === 'playlist' ? 'text-[#0df20d]' : 'text-slate-500'}`}
                >
                    <List size={22} className={activeTab === 'playlist' ? 'fill-[#0df20d]/20' : ''} />
                    <p className={`text-[10px] ${activeTab === 'playlist' ? 'font-bold' : 'font-medium'}`}>Library</p>
                </button>

                <button
                    onClick={() => setActiveTab('projects')}
                    className={`flex flex-col items-center gap-1 ${activeTab === 'projects' ? 'text-[#0df20d]' : 'text-slate-500'}`}
                >
                    <Folder size={22} className={activeTab === 'projects' ? 'fill-[#0df20d]/20' : ''} />
                    <p className={`text-[10px] ${activeTab === 'projects' ? 'font-bold' : 'font-medium'}`}>Stage</p>
                </button>
            </div>
            {/* iOS Home Indicator spacer element equivalent */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-700/50 rounded-full z-50"></div>
        </div>
    );
};

export default RemoteControlPanel;
