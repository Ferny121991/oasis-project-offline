import React, { useMemo, useRef, useState } from 'react';
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
    Plus,
    Radio,
    RotateCcw,
    Search,
    Smartphone,
    Sparkles,
    Square,
    Type,
    Upload,
    Video,
    X,
    ZoomIn,
    ZoomOut,
    Maximize
} from 'lucide-react';
import { LiveState } from '../services/realtimeService';
import { compressImage } from '../services/imageService';

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
    const [newProjectName, setNewProjectName] = useState('');
    const [mediaTitle, setMediaTitle] = useState('');
    const [uploadStatus, setUploadStatus] = useState('');
    const [isZoomExpanded, setIsZoomExpanded] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageGestureRef = useRef({
        lastX: 0,
        lastY: 0,
        lastDistance: 0,
        lastSentAt: 0
    });

    const activeItem = liveState?.playlist?.find(p => p.id === liveState.liveItemId);
    const currentSlide = liveState?.activeItemSlides?.[liveState.liveSlideIndex];
    const hasLiveItem = !!liveState?.liveItemId;

    const filteredPlaylist = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return (liveState?.playlist || []).filter(item => item.title.toLowerCase().includes(query));
    }, [liveState?.playlist, searchQuery]);

    const connectionLabel = isConnected ? (hasLiveItem ? 'EN VIVO' : 'ONLINE') : 'RECONECTANDO';

    const sendImageGestureCommand = (command: string, data: Record<string, any> = {}, force = false) => {
        const now = Date.now();
        if (!force && now - imageGestureRef.current.lastSentAt < 45) return;
        imageGestureRef.current.lastSentAt = now;
        sendCommand(command, { ...data, transient: !force });
    };

    const getTouchDistance = (touches: TouchList) => {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.hypot(dx, dy);
    };

    const handleImagePadTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
        if (event.touches.length === 1) {
            imageGestureRef.current.lastX = event.touches[0].clientX;
            imageGestureRef.current.lastY = event.touches[0].clientY;
        }

        if (event.touches.length === 2) {
            imageGestureRef.current.lastDistance = getTouchDistance(event.touches);
        }
    };

    const handleImagePadTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();

        if (event.touches.length === 2) {
            const distance = getTouchDistance(event.touches);
            const lastDistance = imageGestureRef.current.lastDistance || distance;
            const factor = distance / lastDistance;
            if (Math.abs(factor - 1) > 0.01) {
                sendImageGestureCommand('image_zoom', { factor });
            }
            imageGestureRef.current.lastDistance = distance;
            return;
        }

        if (event.touches.length === 1) {
            const touch = event.touches[0];
            const deltaX = ((touch.clientX - imageGestureRef.current.lastX) / rect.width) * 100;
            const deltaY = ((touch.clientY - imageGestureRef.current.lastY) / rect.height) * 100;
            if (Math.abs(deltaX) > 0.18 || Math.abs(deltaY) > 0.18) {
                sendImageGestureCommand('image_pan', { deltaX, deltaY });
            }
            imageGestureRef.current.lastX = touch.clientX;
            imageGestureRef.current.lastY = touch.clientY;
        }
    };

    const handleImagePadTouchEnd = () => {
        imageGestureRef.current.lastDistance = 0;
    };

    const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    const handleImageUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        const images = Array.from(files).filter(file => file.type.startsWith('image/')).slice(0, 8);
        if (images.length === 0) {
            setUploadStatus('Selecciona imagenes validas.');
            return;
        }

        setUploadStatus(`Preparando ${images.length} imagen${images.length === 1 ? '' : 'es'}...`);
        try {
            const slides = await Promise.all(images.map(async (file) => {
                const raw = await readFileAsDataUrl(file);
                const mediaUrl = await compressImage(raw, 1280, 720, 0.45);
                return {
                    id: Math.random().toString(36).slice(2, 11),
                    type: 'image' as const,
                    content: '',
                    mediaUrl,
                    label: file.name.replace(/\.[^.]+$/, '').toUpperCase()
                };
            }));

            await sendCommand('add_media', {
                title: mediaTitle.trim() || (slides.length === 1 ? slides[0].label : `Imagenes remoto (${slides.length})`),
                slides,
                makeLive: true
            });
            setUploadStatus('Imagenes enviadas al presentador.');
            setMediaTitle('');
        } catch (error) {
            console.error(error);
            setUploadStatus('No se pudo enviar la imagen.');
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
            setTimeout(() => setUploadStatus(''), 3000);
        }
    };

    if (!liveState) {
        return (
            <div className="min-h-[100dvh] bg-[linear-gradient(180deg,#06111f_0%,#0b1020_52%,#020409_100%)] text-white flex items-center justify-center p-6">
                <div className="w-full max-w-sm text-center rounded-[2rem] border border-cyan-300/20 bg-white/[0.055] p-8 shadow-2xl shadow-black/50 backdrop-blur">
                    <div className="w-16 h-16 rounded-2xl bg-cyan-400/10 border border-cyan-300/20 mx-auto mb-5 flex items-center justify-center text-cyan-200 shadow-lg shadow-cyan-950/30">
                        <Smartphone size={32} />
                    </div>
                    <h1 className="text-xl font-black">Conectando control</h1>
                    <p className="text-sm text-slate-400 mt-2">Mantén abierta la pantalla principal del presentador para recibir comandos.</p>
                    <div className="mt-6 h-2 rounded-full bg-slate-900 overflow-hidden">
                        <div className="h-full w-1/2 bg-cyan-400 animate-pulse rounded-full" />
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 h-12 w-full rounded-2xl bg-cyan-400 text-slate-950 text-sm font-black active:scale-[0.99]"
                    >
                        Reintentar conexiÃ³n
                    </button>
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
        <div className="flex flex-col h-[100dvh] w-full bg-[linear-gradient(180deg,#06111f_0%,#0b1020_45%,#020409_100%)] text-slate-100 overflow-hidden font-sans antialiased">
            <header className="shrink-0 px-4 pt-4 pb-3 bg-[#06111f]/95 border-b border-white/10 backdrop-blur">
                <div className="flex items-center justify-between gap-3">
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 text-slate-300 flex items-center justify-center active:scale-95"
                        title="Cerrar"
                    >
                        {onClose ? <X size={20} /> : <Smartphone size={20} />}
                    </button>
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase font-black tracking-[0.2em] text-cyan-300">Oasis Remote</p>
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
                        <div className="relative aspect-video rounded-[1.5rem] overflow-hidden border border-cyan-300/20 bg-slate-950 shadow-2xl shadow-black/50">
                            {renderSlideBackdrop()}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#070b16] via-[#070b16]/25 to-transparent" />
                            <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-black/45 border border-white/10 px-2.5 py-1 text-[10px] font-black uppercase">
                                <Radio size={12} className="text-emerald-300" />
                                {hasLiveItem ? `Slide ${(liveState.liveSlideIndex ?? 0) + 1}` : 'Sin vivo'}
                            </div>
                            <div className="absolute inset-x-0 bottom-0 p-4">
                                <p className="text-xs text-cyan-200/80 font-bold uppercase mb-1">{currentSlide?.label || currentSlide?.type || 'Vista previa'}</p>
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
                                className="h-20 rounded-2xl bg-cyan-400 text-slate-950 flex items-center justify-center gap-2 font-black shadow-lg shadow-cyan-950/35 active:scale-[0.98]"
                            >
                                Siguiente <ChevronRight size={24} />
                            </button>
                        </div>

                        {currentSlide?.type === 'image' && (
                            <div className="rounded-[1.75rem] border border-cyan-300/20 bg-cyan-400/[0.07] p-3 space-y-3 shadow-xl shadow-black/30">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <h2 className="text-xs font-black uppercase tracking-wider text-cyan-200">Zoom de imagen</h2>
                                        <p className="text-[11px] text-slate-400">Toca la imagen para verla grande. Pellizca con dos dedos para acercar.</p>
                                    </div>
                                    <button
                                        onClick={() => sendImageGestureCommand('image_reset', {}, true)}
                                        className="w-11 h-11 rounded-2xl bg-white/[0.06] border border-white/10 text-slate-200 flex items-center justify-center active:scale-95"
                                        title="Restablecer imagen"
                                    >
                                        <RotateCcw size={18} />
                                    </button>
                                </div>
                                <div
                                    className="relative h-56 rounded-[1.5rem] border border-white/10 bg-black overflow-hidden touch-none select-none shadow-inner"
                                    onTouchStart={handleImagePadTouchStart}
                                    onTouchMove={handleImagePadTouchMove}
                                    onTouchEnd={handleImagePadTouchEnd}
                                    onDoubleClick={() => sendImageGestureCommand('image_reset', {}, true)}
                                    onClick={() => setIsZoomExpanded(true)}
                                >
                                    {currentSlide.mediaUrl ? (
                                        <img src={currentSlide.mediaUrl} alt="" className="absolute inset-0 h-full w-full object-contain" draggable={false} />
                                    ) : renderSlideBackdrop()}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/20 pointer-events-none" />
                                    <div className="absolute inset-3 rounded-[1.25rem] border border-dashed border-cyan-200/28 pointer-events-none" />
                                    <div className="absolute inset-x-0 bottom-0 p-4 pointer-events-none">
                                        <p className="text-sm font-black text-white">Abrir y mover zoom</p>
                                        <p className="text-xs text-slate-300 mt-1">Doble toque para reiniciar</p>
                                    </div>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsZoomExpanded(true);
                                        }}
                                        className="absolute right-3 top-3 p-2 rounded-xl bg-black/55 text-white backdrop-blur-md active:scale-95 border border-white/10"
                                    >
                                        <Maximize size={18} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => sendImageGestureCommand('image_zoom', { factor: 0.85 }, true)}
                                        className="h-12 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center gap-2 font-black active:scale-[0.98]"
                                    >
                                        <ZoomOut size={19} /> Alejar
                                    </button>
                                    <button
                                        onClick={() => sendImageGestureCommand('image_zoom', { factor: 1.18 }, true)}
                                        className="h-12 rounded-2xl bg-cyan-400 text-slate-950 flex items-center justify-center gap-2 font-black active:scale-[0.98]"
                                    >
                                        <ZoomIn size={19} /> Acercar
                                    </button>
                                </div>
                                <button
                                    onClick={() => setIsZoomExpanded(true)}
                                    className="w-full h-12 rounded-2xl bg-slate-950/70 border border-cyan-300/25 text-cyan-100 flex items-center justify-center gap-2 font-black active:scale-[0.98]"
                                >
                                    <ImageIcon size={18} /> Abrir imagen grande
                                </button>
                            </div>
                        )}

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
                        <div className="rounded-2xl border border-indigo-400/20 bg-indigo-500/10 p-4 space-y-3">
                            <div className="flex items-center gap-2 text-indigo-200 font-black">
                                <Plus size={18} /> Crear set desde el celular
                            </div>
                            <input
                                value={newProjectName}
                                onChange={(e) => setNewProjectName(e.target.value)}
                                placeholder="Nombre del set, ej: Domingo noche"
                                className="w-full h-11 rounded-xl bg-slate-950 border border-white/10 px-3 text-sm outline-none focus:border-indigo-400"
                            />
                            <button
                                onClick={() => {
                                    const name = newProjectName.trim();
                                    if (!name) return;
                                    sendCommand('create_project', { name });
                                    setNewProjectName('');
                                }}
                                className="w-full h-11 rounded-xl bg-indigo-600 text-white text-sm font-black active:scale-[0.99]"
                            >
                                Crear y abrir set
                            </button>
                        </div>

                        <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">Proyectos guardados</h2>
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
                        <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 p-4 space-y-3">
                            <div className="flex items-center gap-2 text-sky-200 font-black">
                                <Upload size={18} /> Subir imagenes
                            </div>
                            <input
                                value={mediaTitle}
                                onChange={(e) => setMediaTitle(e.target.value)}
                                placeholder="Titulo opcional para la galeria"
                                className="w-full h-11 rounded-xl bg-slate-950 border border-white/10 px-3 text-sm outline-none focus:border-sky-400"
                            />
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={(e) => handleImageUpload(e.target.files)}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full h-12 rounded-xl bg-sky-600 text-white text-sm font-black active:scale-[0.99] flex items-center justify-center gap-2"
                            >
                                <ImageIcon size={18} /> Elegir imagenes y enviar
                            </button>
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                                Se comprimen antes de enviarse para que el proyector no se bloquee. Maximo 8 por envio.
                            </p>
                            {uploadStatus && (
                                <div className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs font-bold text-sky-200">
                                    {uploadStatus}
                                </div>
                            )}
                        </div>

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

            {/* Expanded Zoom Modal */}
            {isZoomExpanded && currentSlide?.type === 'image' && (
                <div className="fixed inset-0 z-[100] bg-black flex flex-col">
                    <header className="absolute top-0 inset-x-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center pointer-events-none">
                        <div className="px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 pointer-events-auto">
                            <p className="text-xs font-bold text-white tracking-wider">MODO ZOOM FULLSCREEN</p>
                        </div>
                        <button
                            onClick={() => setIsZoomExpanded(false)}
                            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white pointer-events-auto active:scale-95"
                        >
                            <X size={20} />
                        </button>
                    </header>
                    <div
                        className="flex-1 w-full h-full touch-none select-none relative bg-black"
                        onTouchStart={handleImagePadTouchStart}
                        onTouchMove={handleImagePadTouchMove}
                        onTouchEnd={handleImagePadTouchEnd}
                        onDoubleClick={() => sendImageGestureCommand('image_reset', {}, true)}
                    >
                        {currentSlide.mediaUrl ? (
                            <img src={currentSlide.mediaUrl} alt="" className="absolute inset-0 w-full h-full object-contain" draggable={false} />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-center text-slate-500 px-8">
                                La imagen es muy grande para verla en el telefono, pero el zoom sigue controlando el proyector.
                            </div>
                        )}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.52)_100%)] pointer-events-none" />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                            <ZoomIn size={60} className="text-white drop-shadow-2xl" />
                        </div>
                    </div>
                    <div className="absolute bottom-8 inset-x-4 flex items-center justify-between pointer-events-none max-w-md mx-auto">
                        <button
                            onClick={() => sendImageGestureCommand('image_reset', {}, true)}
                            className="w-14 h-14 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white pointer-events-auto active:scale-95 shadow-xl"
                        >
                            <RotateCcw size={22} />
                        </button>
                        <div className="flex gap-2 pointer-events-auto shadow-xl bg-black/60 p-2 rounded-[2rem] border border-white/10 backdrop-blur-md">
                            <button
                                onClick={() => sendImageGestureCommand('image_zoom', { factor: 0.85 }, true)}
                                className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-95"
                            >
                                <ZoomOut size={22} />
                            </button>
                            <button
                                onClick={() => sendImageGestureCommand('image_zoom', { factor: 1.18 }, true)}
                                className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white active:scale-95"
                            >
                                <ZoomIn size={22} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RemoteControlPanel;
