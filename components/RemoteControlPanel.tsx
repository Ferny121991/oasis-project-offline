import React, { useMemo, useState } from 'react';
import {
    AlertCircle,
    BookOpen,
    ChevronLeft,
    ChevronRight,
    Eye,
    EyeOff,
    Folder,
    Image as ImageIcon,
    LayoutGrid,
    List,
    Monitor,
    Music,
    PlayCircle,
    Radio,
    Search,
    Smartphone,
    Sparkles,
    Square,
    Type,
    Video,
    X
} from 'lucide-react';
import { LiveState } from '../services/realtimeService';

interface RemoteControlPanelProps {
    liveState: LiveState | null;
    sendCommand: (command: string, data?: any) => Promise<void>;
    isConnected: boolean;
    onClose?: () => void;
}

type RemoteTab = 'control' | 'playlist' | 'projects' | 'add';

const stripHtml = (value?: string) => (value || '').replace(/<[^>]*>?/gm, '').trim();

const RemoteControlPanel: React.FC<RemoteControlPanelProps> = ({ liveState, sendCommand, isConnected, onClose }) => {
    const [activeTab, setActiveTab] = useState<RemoteTab>('control');
    const [searchQuery, setSearchQuery] = useState('');
    const [songQuery, setSongQuery] = useState('');
    const [bibleQuery, setBibleQuery] = useState('');
    const [bibleVersion, setBibleVersion] = useState('RVR1960');

    const activeItem = liveState?.playlist?.find(p => p.id === liveState.liveItemId);
    const currentSlide = liveState?.activeItemSlides?.[liveState.liveSlideIndex];
    const hasLiveItem = !!liveState?.liveItemId;

    const filteredPlaylist = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return (liveState?.playlist || []).filter(item => item.title.toLowerCase().includes(query));
    }, [liveState?.playlist, searchQuery]);

    const connectionLabel = isConnected ? (hasLiveItem ? 'EN VIVO' : 'ONLINE') : 'RECONECTANDO';

    if (!liveState) {
        return (
            <div className="min-h-[100dvh] bg-[#070b16] text-white flex items-center justify-center p-6">
                <div className="w-full max-w-sm text-center rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/15 border border-indigo-400/20 mx-auto mb-5 flex items-center justify-center text-indigo-300">
                        <Smartphone size={32} />
                    </div>
                    <h1 className="text-xl font-black">Conectando control</h1>
                    <p className="text-sm text-slate-400 mt-2">Mantén abierta la pantalla principal del presentador para recibir comandos.</p>
                    <div className="mt-6 h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full w-1/2 bg-indigo-500 animate-pulse rounded-full" />
                    </div>
                </div>
            </div>
        );
    }

    const renderSlideBackdrop = () => {
        if (!currentSlide) return null;
        if (currentSlide.type === 'image' && currentSlide.mediaUrl) {
            return <img src={currentSlide.mediaUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-55" />;
        }
        if (currentSlide.type === 'video' && currentSlide.mediaUrl) {
            return <video src={currentSlide.mediaUrl} className="absolute inset-0 w-full h-full object-cover opacity-55" muted preload="metadata" />;
        }
        if (currentSlide.type === 'youtube' && currentSlide.videoId) {
            return <img src={`https://img.youtube.com/vi/${currentSlide.videoId}/hqdefault.jpg`} alt="" className="absolute inset-0 w-full h-full object-cover opacity-55" />;
        }
        return null;
    };

    const renderSlideIcon = (type?: string) => {
        if (type === 'image') return <ImageIcon size={17} />;
        if (type === 'video') return <Video size={17} />;
        if (type === 'youtube') return <Monitor size={17} />;
        return <Type size={17} />;
    };

    return (
        <div className="flex flex-col h-[100dvh] w-full bg-[#070b16] text-slate-100 overflow-hidden font-sans antialiased">
            <header className="shrink-0 px-4 pt-4 pb-3 bg-[#070b16]/95 border-b border-white/10">
                <div className="flex items-center justify-between gap-3">
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 text-slate-300 flex items-center justify-center active:scale-95"
                        title="Cerrar"
                    >
                        {onClose ? <X size={20} /> : <Smartphone size={20} />}
                    </button>
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase font-black tracking-wider text-indigo-300">Oasis Remote</p>
                        <h1 className="text-sm font-black truncate">{activeItem?.title || liveState.currentProjectName || 'Control remoto'}</h1>
                    </div>
                    <div className={`px-2.5 py-1.5 rounded-full border flex items-center gap-1.5 ${isConnected ? 'bg-emerald-500/10 border-emerald-400/20 text-emerald-300' : 'bg-amber-500/10 border-amber-400/20 text-amber-300'}`}>
                        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-300'}`} />
                        <span className="text-[10px] font-black">{connectionLabel}</span>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto pb-24">
                {activeTab === 'control' && (
                    <section className="p-4 max-w-md mx-auto space-y-4">
                        <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 bg-slate-900 shadow-2xl">
                            {renderSlideBackdrop()}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#070b16] via-[#070b16]/25 to-transparent" />
                            <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-black/45 border border-white/10 px-2.5 py-1 text-[10px] font-black uppercase">
                                <Radio size={12} className="text-emerald-300" />
                                {hasLiveItem ? `Slide ${(liveState.liveSlideIndex ?? 0) + 1}` : 'Sin vivo'}
                            </div>
                            <div className="absolute inset-x-0 bottom-0 p-4">
                                <p className="text-xs text-indigo-200/80 font-bold uppercase mb-1">{currentSlide?.label || currentSlide?.type || 'Vista previa'}</p>
                                <p className="text-xl font-black leading-tight line-clamp-3">
                                    {stripHtml(currentSlide?.content) || activeItem?.title || 'Selecciona un elemento para comenzar'}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => sendCommand('blackout')}
                                className={`rounded-2xl border p-3 flex flex-col items-center gap-2 active:scale-[0.98] ${liveState.isPreviewHidden ? 'bg-red-500/15 border-red-400/30 text-red-200' : 'bg-white/[0.05] border-white/10 text-slate-300'}`}
                            >
                                {liveState.isPreviewHidden ? <EyeOff size={22} /> : <Eye size={22} />}
                                <span className="text-[10px] font-black uppercase">Blackout</span>
                            </button>
                            <button
                                onClick={() => sendCommand('clear')}
                                className={`rounded-2xl border p-3 flex flex-col items-center gap-2 active:scale-[0.98] ${liveState.isTextHidden ? 'bg-amber-500/15 border-amber-400/30 text-amber-200' : 'bg-white/[0.05] border-white/10 text-slate-300'}`}
                            >
                                <Square size={22} />
                                <span className="text-[10px] font-black uppercase">Texto</span>
                            </button>
                            <button
                                onClick={() => sendCommand('logo')}
                                className={`rounded-2xl border p-3 flex flex-col items-center gap-2 active:scale-[0.98] ${liveState.isLogoActive ? 'bg-indigo-500/20 border-indigo-400/30 text-indigo-200' : 'bg-white/[0.05] border-white/10 text-slate-300'}`}
                            >
                                <ImageIcon size={22} />
                                <span className="text-[10px] font-black uppercase">Logo</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => sendCommand('prev')}
                                className="h-20 rounded-2xl bg-white/[0.06] border border-white/10 text-slate-100 flex items-center justify-center gap-2 font-black active:scale-[0.98]"
                            >
                                <ChevronLeft size={24} /> Anterior
                            </button>
                            <button
                                onClick={() => sendCommand('next')}
                                className="h-20 rounded-2xl bg-indigo-600 text-white flex items-center justify-center gap-2 font-black shadow-lg shadow-indigo-600/25 active:scale-[0.98]"
                            >
                                Siguiente <ChevronRight size={24} />
                            </button>
                        </div>

                        {hasLiveItem && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">Slides del item</h2>
                                    <button onClick={() => sendCommand('stop_live')} className="text-[10px] font-black text-red-300 flex items-center gap-1">
                                        <AlertCircle size={12} /> Detener
                                    </button>
                                </div>
                                {liveState.activeItemSlides?.map((slide, index) => {
                                    const isLive = index === liveState.liveSlideIndex;
                                    return (
                                        <button
                                            key={slide.id || index}
                                            onClick={() => sendCommand('jump_to_slide', { index })}
                                            className={`w-full flex items-center gap-3 rounded-2xl border p-2 text-left active:scale-[0.99] ${isLive ? 'bg-indigo-500/15 border-indigo-400/40' : 'bg-white/[0.04] border-white/10'}`}
                                        >
                                            <div className="w-20 aspect-video rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center overflow-hidden text-slate-400 relative">
                                                {slide.type === 'image' && slide.mediaUrl && <img src={slide.mediaUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />}
                                                {slide.type === 'video' && slide.mediaUrl && <video src={slide.mediaUrl} className="absolute inset-0 w-full h-full object-cover opacity-60" muted preload="metadata" />}
                                                {slide.type === 'youtube' && slide.videoId && <img src={`https://img.youtube.com/vi/${slide.videoId}/mqdefault.jpg`} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />}
                                                <span className="relative z-10">{renderSlideIcon(slide.type)}</span>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${isLive ? 'bg-indigo-400/20 text-indigo-200' : 'bg-white/10 text-slate-400'}`}>
                                                        {isLive ? 'Actual' : `Slide ${index + 1}`}
                                                    </span>
                                                </div>
                                                <p className="text-sm font-bold truncate">{stripHtml(slide.content) || slide.label || slide.type}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                )}

                {activeTab === 'playlist' && (
                    <section className="p-4 max-w-md mx-auto space-y-4">
                        <label className="relative block">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar canciones, lecturas o media"
                                className="w-full h-12 rounded-2xl bg-white/[0.06] border border-white/10 pl-10 pr-4 text-sm outline-none focus:border-indigo-400"
                            />
                        </label>
                        <div className="space-y-2">
                            {filteredPlaylist.map(item => {
                                const isLive = liveState.liveItemId === item.id;
                                const ItemIcon = item.type === 'song' ? Music : item.type === 'scripture' ? BookOpen : LayoutGrid;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => sendCommand('jump_to_item', { itemId: item.id, makeLive: true })}
                                        className={`w-full flex items-center gap-3 rounded-2xl border p-3 text-left active:scale-[0.99] ${isLive ? 'bg-emerald-500/10 border-emerald-400/30' : 'bg-white/[0.04] border-white/10'}`}
                                    >
                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isLive ? 'bg-emerald-400/15 text-emerald-300' : 'bg-slate-900 text-slate-400'}`}>
                                            <ItemIcon size={20} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-black truncate">{item.title}</p>
                                            <p className="text-xs text-slate-500">{item.slides?.length || 0} slides · {item.type}</p>
                                        </div>
                                        {isLive ? <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" /> : <PlayCircle size={18} className="text-slate-500" />}
                                    </button>
                                );
                            })}
                            {filteredPlaylist.length === 0 && (
                                <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">
                                    No hay resultados.
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {activeTab === 'projects' && (
                    <section className="p-4 max-w-md mx-auto space-y-4">
                        <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">Proyectos</h2>
                        <div className="grid grid-cols-2 gap-3">
                            {liveState.projects?.map(project => {
                                const selected = liveState.currentProjectName === project.name;
                                return (
                                    <button
                                        key={project.id}
                                        onClick={() => sendCommand('change_project', { projectId: project.id })}
                                        className={`aspect-square rounded-2xl border p-3 text-left flex flex-col justify-between active:scale-[0.98] ${selected ? 'bg-indigo-500/15 border-indigo-400/40' : 'bg-white/[0.04] border-white/10'}`}
                                    >
                                        <Folder size={32} className={selected ? 'text-indigo-300' : 'text-slate-500'} />
                                        <div>
                                            <p className="text-sm font-black line-clamp-2">{project.name}</p>
                                            <p className="text-[10px] text-slate-500 uppercase mt-1">Proyecto</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                )}

                {activeTab === 'add' && (
                    <section className="p-4 max-w-md mx-auto space-y-4">
                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-3">
                            <div className="flex items-center gap-2 text-indigo-200 font-black">
                                <Sparkles size={18} /> Generar cancion
                            </div>
                            <input
                                value={songQuery}
                                onChange={(e) => setSongQuery(e.target.value)}
                                placeholder="Ej: Way Maker"
                                className="w-full h-11 rounded-xl bg-slate-950 border border-white/10 px-3 text-sm outline-none focus:border-indigo-400"
                            />
                            <button
                                onClick={() => songQuery.trim() && sendCommand('add_song', { query: songQuery.trim(), makeLive: true })}
                                className="w-full h-11 rounded-xl bg-indigo-600 text-white text-sm font-black active:scale-[0.99]"
                            >
                                Agregar y poner en vivo
                            </button>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-3">
                            <div className="flex items-center gap-2 text-emerald-200 font-black">
                                <BookOpen size={18} /> Pasaje biblico
                            </div>
                            <input
                                value={bibleQuery}
                                onChange={(e) => setBibleQuery(e.target.value)}
                                placeholder="Ej: Juan 3:16"
                                className="w-full h-11 rounded-xl bg-slate-950 border border-white/10 px-3 text-sm outline-none focus:border-emerald-400"
                            />
                            <div className="flex gap-2">
                                <select
                                    value={bibleVersion}
                                    onChange={(e) => setBibleVersion(e.target.value)}
                                    className="w-28 h-11 rounded-xl bg-slate-950 border border-white/10 px-2 text-xs outline-none"
                                >
                                    <option value="RVR1960">RVR1960</option>
                                    <option value="NVI">NVI</option>
                                    <option value="TLA">TLA</option>
                                    <option value="DHH">DHH</option>
                                </select>
                                <button
                                    onClick={() => bibleQuery.trim() && sendCommand('add_bible', { query: bibleQuery.trim(), version: bibleVersion, makeLive: true })}
                                    className="flex-1 h-11 rounded-xl bg-emerald-600 text-white text-sm font-black active:scale-[0.99]"
                                >
                                    Generar pasaje
                                </button>
                            </div>
                        </div>
                    </section>
                )}
            </main>

            <nav className="absolute bottom-0 inset-x-0 border-t border-white/10 bg-[#0b1020]/95 backdrop-blur-xl px-4 pt-2 pb-5">
                <div className="grid grid-cols-4 gap-1 max-w-md mx-auto">
                    {[
                        { id: 'control' as const, label: 'Control', icon: Monitor },
                        { id: 'playlist' as const, label: 'Lista', icon: List },
                        { id: 'projects' as const, label: 'Sets', icon: Folder },
                        { id: 'add' as const, label: 'Agregar', icon: Search },
                    ].map(item => {
                        const Icon = item.icon;
                        const selected = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`h-14 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all ${selected ? 'bg-indigo-500/15 text-indigo-200' : 'text-slate-500'}`}
                            >
                                <Icon size={20} />
                                <span className="text-[10px] font-black">{item.label}</span>
                            </button>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
};

export default RemoteControlPanel;
