import React, { useMemo, useRef, useState } from 'react';
import {
    AlertCircle,
    BookOpen,
    Clock,
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
    PauseCircle,
    PlayCircle,
    Plus,
    Radio,
    RotateCcw,
    Search,
    Smartphone,
    Sparkles,
    Square,
    SkipBack,
    SkipForward,
    Star,
    Type,
    Upload,
    Video,
    Volume2,
    VolumeX,
    X,
    ZoomIn,
    ZoomOut,
    Maximize
} from 'lucide-react';
import { LiveState } from '../services/realtimeService';
import { searchYouTube, YouTubeSearchResult } from '../services/geminiService';

interface RemoteControlPanelProps {
    liveState: LiveState | null;
    sendCommand: (command: string, data?: any) => Promise<void>;
    isConnected: boolean;
    onClose?: () => void;
}

type RemoteTab = 'control' | 'audio' | 'playlist' | 'projects' | 'add';

const stripHtml = (value?: string) => (value || '').replace(/<[^>]*>?/gm, '').trim();
const formatAudioTime = (seconds?: number) => {
    const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = safeSeconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const RemoteControlPanel: React.FC<RemoteControlPanelProps> = ({ liveState, sendCommand, isConnected, onClose }) => {
    const [activeTab, setActiveTab] = useState<RemoteTab>('control');
    const [searchQuery, setSearchQuery] = useState('');
    const [quickAddQuery, setQuickAddQuery] = useState('');
    const [quickAddType, setQuickAddType] = useState<'bible' | 'youtube'>('youtube');
    const [bibleVersion, setBibleVersion] = useState('RVR1960');
    const [newProjectName, setNewProjectName] = useState('');
    const [mediaTitle, setMediaTitle] = useState('');
    const [uploadStatus, setUploadStatus] = useState('');
    const [youtubeResults, setYoutubeResults] = useState<YouTubeSearchResult[]>([]);
    const [youtubeLoading, setYoutubeLoading] = useState(false);
    const [youtubeError, setYoutubeError] = useState('');
    const [isZoomExpanded, setIsZoomExpanded] = useState(false);
    const [favoriteItemIds, setFavoriteItemIds] = useState<string[]>(() => {
        try { return JSON.parse(localStorage.getItem('oasis_remote_favorite_items') || '[]'); } catch { return []; }
    });
    const [favoriteProjectIds, setFavoriteProjectIds] = useState<string[]>(() => {
        try { return JSON.parse(localStorage.getItem('oasis_remote_favorite_projects') || '[]'); } catch { return []; }
    });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageGestureRef = useRef({
        lastX: 0,
        lastY: 0,
        lastDistance: 0,
        lastSentAt: 0
    });

    const activeItem = liveState?.playlist?.find(p => p.id === liveState.liveItemId);
    const stagedItem = liveState?.playlist?.find(p => p.id === liveState.activeItemId);
    const displaySlideIndex = liveState?.activeItemId && liveState.activeItemId !== liveState.liveItemId
        ? Math.max(0, liveState.activeSlideIndex || 0)
        : Math.max(0, liveState?.liveSlideIndex || 0);
    const currentSlide = liveState?.activeItemSlides?.[displaySlideIndex];
    const hasLiveItem = !!liveState?.liveItemId;
    const hasPreparedItem = !!liveState?.activeItemId && liveState.activeItemId !== liveState?.liveItemId;
    const audioCurrentTime = Math.max(0, Number(liveState?.backgroundAudioCurrentTime) || 0);
    const audioDuration = Math.max(0, Number(liveState?.backgroundAudioDuration) || 0);
    const audioProgress = audioDuration > 0 ? Math.min(100, Math.max(0, (audioCurrentTime / audioDuration) * 100)) : 0;
    const hasBackgroundAudio = !!liveState?.backgroundAudioTitle;
    const audioVolume = Math.min(100, Math.max(0, Number(liveState?.backgroundAudioVolume) || 0));
    const audioPositionLabel = typeof liveState?.backgroundAudioIndex === 'number' && liveState.backgroundAudioIndex >= 0
        ? `${liveState.backgroundAudioIndex + 1}/${liveState.backgroundAudioCount || '?'}`
        : '';
    const imageScale = Math.round((Number(liveState?.imageContentScale) || 1) * 100);
    const imageOffsetX = Math.round(Number(liveState?.imageContentOffsetX) || 0);
    const imageOffsetY = Math.round(Number(liveState?.imageContentOffsetY) || 0);
    const imagePreviewTransform = `translate(${imageOffsetX}%, ${imageOffsetY}%) scale(${Math.max(0.2, Number(liveState?.imageContentScale) || 1)})`;

    const filteredPlaylist = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        const seen = new Set<string>();
        return (liveState?.playlist || []).filter(item => {
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return item.title.toLowerCase().includes(query);
        });
    }, [liveState?.playlist, searchQuery]);

    const connectionLabel = isConnected ? (hasLiveItem ? 'EN VIVO' : 'ONLINE') : 'RECONECTANDO';

    const toggleFavoriteItem = (id: string) => {
        setFavoriteItemIds(prev => {
            const next = prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id];
            localStorage.setItem('oasis_remote_favorite_items', JSON.stringify(next));
            return next;
        });
    };

    const toggleFavoriteProject = (id: string) => {
        setFavoriteProjectIds(prev => {
            const next = prev.includes(id) ? prev.filter(projectId => projectId !== id) : [...prev, id];
            localStorage.setItem('oasis_remote_favorite_projects', JSON.stringify(next));
            return next;
        });
    };

    const runQuickAdd = async () => {
        const query = quickAddQuery.trim();
        if (!query) return;
        if (quickAddType === 'bible') {
            await sendCommand('add_bible', { query, version: bibleVersion, makeLive: true });
            setQuickAddQuery('');
            return;
        }

        setYoutubeLoading(true);
        setYoutubeError('');
        try {
            const results = await searchYouTube(query);
            const seen = new Set<string>();
            const unique = results.filter(result => {
                const key = result.playlistId ? `playlist:${result.playlistId}` : `video:${result.id}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            }).slice(0, 12);
            setYoutubeResults(unique);
            if (unique.length === 0) setYoutubeError('No encontre resultados de YouTube.');
        } catch (error) {
            console.error(error);
            setYoutubeError('No se pudo buscar en YouTube desde el movil.');
        } finally {
            setYoutubeLoading(false);
        }
    };

    const addYoutubeResult = async (video: YouTubeSearchResult, makeLive = true) => {
        if (video.playlistId || video.kind === 'playlist') {
            await sendCommand('add_youtube', { query: video.title, playlistId: video.playlistId, title: video.title, makeLive });
        } else {
            await sendCommand('add_youtube', { query: video.title, videoId: video.id, title: video.title, makeLive });
        }
    };

    const addYoutubeAsBackgroundAudio = async (video: YouTubeSearchResult) => {
        const playlistId = video.playlistId || (video.kind === 'playlist' ? video.id : undefined);
        await sendCommand('add_background_audio', {
            title: video.title,
            videoId: playlistId ? undefined : video.id,
            playlistId,
            sourcePlaylistTitle: playlistId ? video.title : undefined,
        });
        setActiveTab('audio');
    };
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

    const compressRemoteImage = (file: File): Promise<string> => new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
            try {
                const maxWidth = 820;
                const maxHeight = 460;
                const ratio = Math.min(1, maxWidth / img.width, maxHeight / img.height);
                const width = Math.max(1, Math.round(img.width * ratio));
                const height = Math.max(1, Math.round(img.height * ratio));
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('No se pudo preparar la imagen.'));
                    return;
                }

                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.38));
            } catch (error) {
                reject(error);
            } finally {
                URL.revokeObjectURL(objectUrl);
            }
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('No se pudo leer la imagen.'));
        };

        img.src = objectUrl;
    });

    const handleMediaUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        const selected = Array.from(files)
            .filter(file => file.type.startsWith('image/') || file.type.startsWith('video/'))
            .slice(0, 10);

        if (selected.length === 0) {
            setUploadStatus('Selecciona imagenes o videos validos.');
            return;
        }

        setUploadStatus(`Preparando 0/${selected.length} archivos...`);
        try {
            const slides = [] as Array<{ id: string; type: 'image' | 'video'; content: string; mediaUrl: string; label: string }>;
            for (let index = 0; index < selected.length; index += 1) {
                const file = selected[index];
                const cleanName = file.name.replace(/\.[^.]+$/, '').toUpperCase();
                setUploadStatus(`Preparando ${index + 1}/${selected.length}: ${file.name}`);

                if (file.type.startsWith('video/')) {
                    if (file.size > 25 * 1024 * 1024) {
                        setUploadStatus(`Video muy pesado: ${file.name}. Maximo 25MB desde movil.`);
                        continue;
                    }
                    const mediaUrl = await readFileAsDataUrl(file);
                    slides.push({
                        id: Math.random().toString(36).slice(2, 11),
                        type: 'video',
                        content: '',
                        mediaUrl,
                        label: `VIDEO - ${cleanName}`
                    });
                } else {
                    const mediaUrl = await compressRemoteImage(file);
                    slides.push({
                        id: Math.random().toString(36).slice(2, 11),
                        type: 'image',
                        content: '',
                        mediaUrl,
                        label: `IMAGEN - ${cleanName}`
                    });
                }
            }

            if (slides.length === 0) return;
            await sendCommand('add_media', {
                title: mediaTitle.trim() || (slides.length === 1 ? slides[0].label : `Medios remoto (${slides.length})`),
                slides,
                makeLive: true,
                remoteUpload: true
            });
            setUploadStatus(`${slides.length} archivo${slides.length === 1 ? '' : 's'} enviado${slides.length === 1 ? '' : 's'} al presentador.`);
            setMediaTitle('');
        } catch (error) {
            console.error(error);
            setUploadStatus('No se pudo enviar el archivo. Intenta con menos archivos o mas livianos.');
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
            setTimeout(() => setUploadStatus(''), 5000);
        }
    };
    if (!liveState) {
        return (
            <div className="min-h-[100dvh] bg-[radial-gradient(circle_at_top,#12324a_0%,#07111f_36%,#020409_100%)] text-white flex items-center justify-center p-6">
                <div className="w-full max-w-sm text-center rounded-[2rem] border border-cyan-300/20 bg-slate-950/70 p-8 shadow-2xl shadow-black/60 backdrop-blur-xl">
                    <div className="relative w-20 h-20 mx-auto mb-5">
                        <div className="absolute inset-0 rounded-3xl border border-cyan-300/20 bg-cyan-400/10 animate-pulse" />
                        <div className="absolute inset-3 rounded-2xl bg-slate-950 border border-white/10 flex items-center justify-center text-cyan-200 shadow-lg shadow-cyan-950/30">
                            <Smartphone size={32} />
                        </div>
                    </div>
                    <h1 className="text-xl font-black">Conectando control</h1>
                    <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                        Abre la pantalla principal y verifica que ambos dispositivos esten en la misma sesion.
                    </p>
                    <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-cyan-200">
                            <span className="h-2 w-2 rounded-full bg-cyan-300 animate-pulse" />
                            Esperando sincronizacion
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-slate-900 overflow-hidden">
                            <div className="h-full w-1/2 bg-gradient-to-r from-cyan-400 to-emerald-300 animate-pulse rounded-full" />
                        </div>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 h-12 w-full rounded-2xl bg-cyan-400 text-slate-950 text-sm font-black shadow-lg shadow-cyan-950/40 active:scale-[0.99]"
                    >
                        Reintentar conexion
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

                        {hasPreparedItem && stagedItem && (
                            <div className="rounded-[1.5rem] border border-amber-300/25 bg-amber-400/10 p-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-amber-200">Preparado para salir</p>
                                        <p className="truncate text-sm font-black text-white">{stagedItem.title}</p>
                                    </div>
                                    <button
                                        onClick={() => sendCommand('go_live_active')}
                                        className="shrink-0 rounded-2xl bg-amber-300 px-4 py-3 text-xs font-black text-slate-950 active:scale-95"
                                    >
                                        Poner en vivo
                                    </button>
                                </div>
                            </div>
                        )}

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

                        {hasBackgroundAudio && (
                            <button
                                onClick={() => setActiveTab('audio')}
                                className="w-full rounded-[1.5rem] border border-pink-400/25 bg-pink-500/10 p-3 text-left active:scale-[0.99] shadow-lg shadow-black/20"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`h-12 w-12 rounded-2xl bg-pink-600 flex items-center justify-center text-white ${liveState.isAudioPlaying ? 'animate-pulse' : ''}`}>
                                        {liveState.isAudioPlaying ? <PauseCircle size={24} /> : <PlayCircle size={24} />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-pink-200">
                                            Musica de fondo {audioPositionLabel && <span className="rounded-full bg-black/30 px-2 py-0.5 text-slate-300">{audioPositionLabel}</span>}
                                        </div>
                                        <p className="truncate text-sm font-black text-white">{liveState.backgroundAudioTitle}</p>
                                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/35">
                                            <div className="h-full rounded-full bg-pink-400" style={{ width: `${audioProgress}%` }} />
                                        </div>
                                    </div>
                                </div>
                            </button>
                        )}

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
                                        <img src={currentSlide.mediaUrl} alt="" className="absolute inset-0 h-full w-full object-contain transition-transform duration-100" style={{ transform: imagePreviewTransform }} draggable={false} />
                                    ) : renderSlideBackdrop()}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/20 pointer-events-none" />
                                    <div className="absolute inset-3 rounded-[1.25rem] border border-dashed border-cyan-200/28 pointer-events-none" />
                                    <div className="absolute inset-x-0 bottom-0 p-4 pointer-events-none">
                                        <p className="text-sm font-black text-white">Abrir y mover zoom</p>
                                        <p className="text-xs text-slate-300 mt-1">Doble toque para reiniciar</p>`r`n                                        <div className="mt-2 flex gap-2 text-[10px] font-black text-cyan-100">`r`n                                            <span className="rounded-full bg-black/45 px-2 py-1">Zoom {imageScale}%</span>`r`n                                            <span className="rounded-full bg-black/45 px-2 py-1">X {imageOffsetX}%</span>`r`n                                            <span className="rounded-full bg-black/45 px-2 py-1">Y {imageOffsetY}%</span>`r`n                                        </div>
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

                        {!!liveState.recentActions?.length && (
                            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-3">
                                <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Historial reciente</h2>
                                <div className="space-y-2">
                                    {liveState.recentActions.slice(0, 4).map((action, index) => (
                                        <div key={action.id || index} className="rounded-xl bg-slate-950/55 border border-white/5 px-3 py-2">
                                            <p className="text-xs font-bold text-slate-200 line-clamp-2">{action.description}</p>
                                            <p className="mt-1 text-[9px] uppercase tracking-wider text-slate-500">{action.action_type || 'accion'}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {!!liveState.activeItemSlides?.length && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">{hasPreparedItem ? 'Slides preparados' : 'Slides del item'}</h2>
                                    {hasLiveItem && <button onClick={() => sendCommand('stop_live')} className="text-[10px] font-black text-red-300 flex items-center gap-1">
                                        <AlertCircle size={12} /> Detener
                                    </button>}
                                </div>
                                {liveState.activeItemSlides?.map((slide, index) => {
                                    const isLive = !hasPreparedItem && index === liveState.liveSlideIndex;
                                    const isPreparedSlide = hasPreparedItem && index === (liveState.activeSlideIndex || 0);
                                    return (
                                        <button
                                            key={slide.id || index}
                                            onClick={() => sendCommand('jump_to_slide', { index, makeLive: !hasPreparedItem })}
                                            className={`w-full flex items-center gap-3 rounded-2xl border p-2 text-left active:scale-[0.99] ${isLive ? 'bg-indigo-500/15 border-indigo-400/40' : isPreparedSlide ? 'bg-amber-500/10 border-amber-300/30' : 'bg-white/[0.04] border-white/10'}`}
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
                                                        {isLive ? 'Actual' : isPreparedSlide ? 'Preparado' : `Slide ${index + 1}`}
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
                                const isPrepared = liveState.activeItemId === item.id && !isLive;
                                const isFavorite = favoriteItemIds.includes(item.id);
                                const ItemIcon = item.type === 'song' ? Music : item.type === 'scripture' ? BookOpen : LayoutGrid;
                                return (
                                    <div
                                        key={item.id}
                                        className={`rounded-2xl border p-3 text-left ${isLive ? 'bg-emerald-500/10 border-emerald-400/30' : isPrepared ? 'bg-amber-500/10 border-amber-300/30' : 'bg-white/[0.04] border-white/10'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => toggleFavoriteItem(item.id)}
                                                className={`w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 ${isFavorite ? 'bg-amber-300 text-slate-950' : 'bg-slate-900 text-slate-500'}`}
                                                title="Favorito"
                                            >
                                                <Star size={18} fill={isFavorite ? 'currentColor' : 'none'} />
                                            </button>
                                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isLive ? 'bg-emerald-400/15 text-emerald-300' : isPrepared ? 'bg-amber-300/15 text-amber-200' : 'bg-slate-900 text-slate-400'}`}>
                                                <ItemIcon size={20} />
                                            </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-black truncate">{item.title}</p>
                                            <p className="text-xs text-slate-500">{item.slides?.length || 0} slides · {item.type}</p>
                                        </div>
                                        {isLive ? <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" /> : isPrepared ? <span className="text-[9px] font-black text-amber-200 uppercase">Listo</span> : null}
                                        </div>
                                        <div className="mt-3 grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => sendCommand('jump_to_item', { itemId: item.id, makeLive: false })}
                                                className="h-10 rounded-xl border border-white/10 bg-white/[0.06] text-xs font-black text-slate-200 active:scale-95"
                                            >
                                                Preparar
                                            </button>
                                            <button
                                                onClick={() => sendCommand('jump_to_item', { itemId: item.id, makeLive: true })}
                                                className="h-10 rounded-xl bg-emerald-500 text-xs font-black text-slate-950 active:scale-95"
                                            >
                                                En vivo
                                            </button>
                                        </div>
                                    </div>
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

                {activeTab === 'audio' && (
                    <section className="p-4 max-w-md mx-auto space-y-4">
                        <div className="rounded-[2rem] border border-pink-400/25 bg-[radial-gradient(circle_at_25%_0%,rgba(236,72,153,0.24),transparent_38%),linear-gradient(180deg,rgba(30,41,59,0.9),rgba(10,10,25,0.96))] p-4 shadow-2xl shadow-black/45">
                            <div className="flex items-start gap-3">
                                <div className="h-16 w-16 rounded-3xl bg-pink-600 flex items-center justify-center text-white shadow-lg shadow-pink-950/40">
                                    <Music size={30} className={liveState.isAudioPlaying ? 'animate-pulse' : ''} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-wider text-pink-200">
                                        Musica de fondo
                                        {audioPositionLabel && <span className="rounded-full border border-white/10 bg-black/25 px-2 py-0.5 text-slate-300">{audioPositionLabel}</span>}
                                    </div>
                                    <h2 className="mt-1 text-lg font-black leading-tight text-white">
                                        {liveState.backgroundAudioTitle || 'No hay musica activa'}
                                    </h2>
                                    {liveState.backgroundAudioSourceTitle && (
                                        <p className="mt-1 truncate text-[11px] font-black uppercase tracking-wider text-indigo-200/80">
                                            {liveState.backgroundAudioSourceTitle}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="mt-5 rounded-3xl border border-white/10 bg-black/25 p-4">
                                <div className="mb-2 flex items-center justify-between text-xs font-black text-slate-300">
                                    <span>{formatAudioTime(audioCurrentTime)}</span>
                                    <span className="text-pink-200">{audioDuration > 0 ? formatAudioTime(audioDuration) : '--:--'}</span>
                                </div>
                                <input
                                    type="range"
                                    min={0}
                                    max={Math.max(1, Math.floor(audioDuration || 0))}
                                    value={Math.min(Math.floor(audioCurrentTime), Math.max(1, Math.floor(audioDuration || 0)))}
                                    onChange={(event) => sendCommand('audio_seek_to', { seconds: Number(event.target.value) })}
                                    disabled={!hasBackgroundAudio || !audioDuration}
                                    className="w-full accent-pink-500 disabled:opacity-40"
                                />
                                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-950/80">
                                    <div className="h-full rounded-full bg-gradient-to-r from-pink-500 to-indigo-400" style={{ width: `${audioProgress}%` }} />
                                </div>
                            </div>

                            <div className="mt-3 rounded-3xl border border-white/10 bg-black/20 p-4">
                                <div className="mb-2 flex items-center justify-between text-xs font-black text-slate-300">
                                    <span className="flex items-center gap-2">
                                        {liveState.isAudioMuted ? <VolumeX size={16} className="text-red-300" /> : <Volume2 size={16} className="text-pink-200" />}
                                        Volumen
                                    </span>
                                    <span className="text-pink-200">{liveState.isAudioMuted ? 'Mute' : `${audioVolume}%`}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => sendCommand('audio_toggle_mute')}
                                        disabled={!hasBackgroundAudio}
                                        className={`h-11 w-14 rounded-2xl border border-white/10 flex items-center justify-center active:scale-95 disabled:opacity-35 ${liveState.isAudioMuted ? 'bg-red-500/20 text-red-200' : 'bg-white/[0.06] text-slate-200'}`}
                                    >
                                        {liveState.isAudioMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                                    </button>
                                    <input
                                        type="range"
                                        min={0}
                                        max={100}
                                        value={audioVolume}
                                        onChange={(event) => sendCommand('audio_set_volume', { volume: Number(event.target.value) })}
                                        disabled={!hasBackgroundAudio}
                                        className="min-w-0 flex-1 accent-pink-500 disabled:opacity-40"
                                    />
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-5 items-center gap-2">
                                <button
                                    onClick={() => sendCommand('audio_prev')}
                                    disabled={!hasBackgroundAudio}
                                    className="h-12 rounded-2xl border border-white/10 bg-white/[0.06] text-slate-300 flex items-center justify-center active:scale-95 disabled:opacity-35"
                                >
                                    <SkipBack size={22} />
                                </button>
                                <button
                                    onClick={() => sendCommand('audio_seek_relative', { seconds: -15 })}
                                    disabled={!hasBackgroundAudio}
                                    className="h-12 rounded-2xl border border-white/10 bg-white/[0.06] text-slate-300 flex items-center justify-center active:scale-95 disabled:opacity-35"
                                >
                                    <RotateCcw size={20} />
                                </button>
                                <button
                                    onClick={() => sendCommand('toggle_audio')}
                                    disabled={!hasBackgroundAudio}
                                    className={`h-16 rounded-3xl flex items-center justify-center active:scale-95 disabled:opacity-35 shadow-xl ${liveState.isAudioPlaying ? 'bg-pink-600 text-white shadow-pink-950/40' : 'bg-white text-pink-900 shadow-white/10'}`}
                                >
                                    {liveState.isAudioPlaying ? <PauseCircle size={36} /> : <PlayCircle size={36} />}
                                </button>
                                <button
                                    onClick={() => sendCommand('audio_seek_relative', { seconds: 15 })}
                                    disabled={!hasBackgroundAudio}
                                    className="h-12 rounded-2xl border border-white/10 bg-white/[0.06] text-slate-300 flex items-center justify-center active:scale-95 disabled:opacity-35"
                                >
                                    <Clock size={20} />
                                </button>
                                <button
                                    onClick={() => sendCommand('audio_next')}
                                    disabled={!hasBackgroundAudio}
                                    className="h-12 rounded-2xl border border-white/10 bg-white/[0.06] text-slate-300 flex items-center justify-center active:scale-95 disabled:opacity-35"
                                >
                                    <SkipForward size={22} />
                                </button>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                            <h3 className="text-sm font-black text-white">Controles rapidos</h3>
                            <p className="mt-1 text-xs leading-relaxed text-slate-400">
                                Desde aqui puedes pausar, adelantar, atrasar, saltar canciones y mover la musica al segundo exacto sin tocar la computadora.
                            </p>
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
                                const isFavorite = favoriteProjectIds.includes(project.id);
                                return (
                                    <div
                                        key={project.id}
                                        className={`aspect-square rounded-2xl border p-3 text-left flex flex-col justify-between active:scale-[0.98] ${selected ? 'bg-indigo-500/15 border-indigo-400/40' : 'bg-white/[0.04] border-white/10'}`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <Folder size={32} className={selected ? 'text-indigo-300' : 'text-slate-500'} />
                                            <button
                                                onClick={() => toggleFavoriteProject(project.id)}
                                                className={`h-9 w-9 rounded-xl flex items-center justify-center ${isFavorite ? 'bg-amber-300 text-slate-950' : 'bg-slate-900 text-slate-500'}`}
                                            >
                                                <Star size={16} fill={isFavorite ? 'currentColor' : 'none'} />
                                            </button>
                                        </div>
                                        <div>
                                            <p className="text-sm font-black line-clamp-2">{project.name}</p>
                                            <p className="text-[10px] text-slate-500 uppercase mt-1">Proyecto</p>
                                            <button
                                                onClick={() => sendCommand('change_project', { projectId: project.id })}
                                                className="mt-3 h-9 w-full rounded-xl bg-indigo-500 text-[10px] font-black text-white active:scale-95"
                                            >
                                                Abrir
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {activeTab === 'add' && (
                    <section className="p-4 max-w-md mx-auto space-y-4">
                        <div className="rounded-[1.75rem] border border-cyan-300/20 bg-cyan-400/10 p-4 space-y-3">
                            <div className="flex items-center gap-2 text-cyan-100 font-black">
                                <Search size={18} /> Buscar y agregar
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: 'youtube' as const, label: 'YouTube' },
                                    { id: 'bible' as const, label: 'Biblia' },
                                ].map(option => (
                                    <button
                                        key={option.id}
                                        onClick={() => {
                                            setQuickAddType(option.id);
                                            setYoutubeError('');
                                        }}
                                        className={`h-10 rounded-xl text-[10px] font-black uppercase border active:scale-95 ${quickAddType === option.id ? 'bg-cyan-300 text-slate-950 border-cyan-200' : 'bg-slate-950/60 text-slate-300 border-white/10'}`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                            <input
                                value={quickAddQuery}
                                onChange={(e) => setQuickAddQuery(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') runQuickAdd(); }}
                                placeholder={quickAddType === 'bible' ? 'Ej: Juan 3:16' : 'Nombre o link de YouTube'}
                                className="w-full h-12 rounded-2xl bg-slate-950 border border-white/10 px-3 text-sm outline-none focus:border-cyan-300"
                            />
                            {quickAddType === 'bible' && (
                                <select
                                    value={bibleVersion}
                                    onChange={(e) => setBibleVersion(e.target.value)}
                                    className="w-full h-11 rounded-xl bg-slate-950 border border-white/10 px-3 text-sm outline-none"
                                >
                                    <option value="Reina Valera 1960">Reina Valera 1960</option>
                                    <option value="Nueva Version Internacional">Nueva Version Internacional</option>
                                    <option value="Nueva Traduccion Viviente">Nueva Traduccion Viviente</option>
                                    <option value="La Biblia de las Americas">La Biblia de las Americas</option>
                                </select>
                            )}
                            <button
                                onClick={runQuickAdd}
                                disabled={youtubeLoading}
                                className="w-full h-12 rounded-2xl bg-cyan-300 text-slate-950 text-sm font-black active:scale-[0.99] disabled:opacity-60"
                            >
                                {quickAddType === 'youtube' ? (youtubeLoading ? 'Buscando YouTube...' : 'Buscar videos') : 'Agregar versiculo en vivo'}
                            </button>
                            {youtubeError && <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200">{youtubeError}</div>}
                        </div>

                        {quickAddType === 'youtube' && youtubeResults.length > 0 && (
                            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Resultados YouTube</h3>
                                    <span className="text-[10px] font-black text-cyan-200">{youtubeResults.length}</span>
                                </div>
                                {youtubeResults.map(video => (
                                    <div key={`${video.playlistId || video.id}-${video.kind || 'video'}`} className="rounded-2xl border border-white/10 bg-slate-950/55 overflow-hidden">
                                        <div className="flex gap-3 p-2">
                                            <div className="relative w-28 aspect-video rounded-xl overflow-hidden bg-black shrink-0">
                                                {video.thumbnail && <img src={video.thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                                                <div className="absolute left-1.5 top-1.5 rounded-full bg-red-600 px-2 py-0.5 text-[8px] font-black text-white">{video.playlistId || video.kind === 'playlist' ? 'PLAYLIST' : 'VIDEO'}</div>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="line-clamp-2 text-sm font-black text-white">{video.title}</p>
                                                <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-wider text-slate-500">{video.author || 'YouTube'}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 border-t border-white/10 p-2">
                                            <button onClick={() => addYoutubeResult(video, false)} className="h-10 rounded-xl border border-white/10 bg-white/[0.06] text-xs font-black text-slate-200 active:scale-95">Preparar</button>
                                            <button onClick={() => addYoutubeResult(video, true)} className="h-10 rounded-xl bg-red-500 text-xs font-black text-white active:scale-95">En vivo</button>
                                            <button onClick={() => addYoutubeAsBackgroundAudio(video)} className="h-10 rounded-xl bg-pink-600 text-xs font-black text-white active:scale-95">Audio</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 p-4 space-y-3">
                            <div className="flex items-center gap-2 text-sky-200 font-black">
                                <Upload size={18} /> Subir imagenes y videos
                            </div>
                            <input
                                value={mediaTitle}
                                onChange={(e) => setMediaTitle(e.target.value)}
                                placeholder="Titulo opcional para el grupo"
                                className="w-full h-11 rounded-xl bg-slate-950 border border-white/10 px-3 text-sm outline-none focus:border-sky-400"
                            />
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*,video/*"
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                    handleMediaUpload(e.target.files);
                                    e.currentTarget.value = '';
                                }}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full h-12 rounded-xl bg-sky-600 text-white text-sm font-black active:scale-[0.99] flex items-center justify-center gap-2"
                            >
                                <ImageIcon size={18} /> Elegir archivos y enviar
                            </button>
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                                Las imagenes se comprimen antes de enviarse. Videos desde movil: maximo 25MB por archivo.
                            </p>
                            {uploadStatus && (
                                <div className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs font-bold text-sky-200">
                                    {uploadStatus}
                                </div>
                            )}
                        </div>
                    </section>
                )}
            </main>

            <nav className="absolute bottom-0 inset-x-0 border-t border-white/10 bg-[#07111f]/90 backdrop-blur-xl px-4 pt-2 pb-5 shadow-[0_-20px_45px_rgba(0,0,0,0.45)]">
                <div className="grid grid-cols-5 gap-1.5 max-w-md mx-auto rounded-[1.35rem] border border-white/10 bg-white/[0.035] p-1.5">
                    {[
                        { id: 'control' as const, label: 'Control', icon: Monitor },
                        { id: 'audio' as const, label: 'Musica', icon: Music },
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
                                className={`h-14 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${selected ? 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-950/30' : 'text-slate-500 hover:bg-white/[0.06] hover:text-white'}`}
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
                            <p className="mt-1 text-[10px] font-black text-cyan-200">Zoom {imageScale}% - X {imageOffsetX}% - Y {imageOffsetY}%</p>
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
                            <img src={currentSlide.mediaUrl} alt="" className="absolute inset-0 w-full h-full object-contain transition-transform duration-100" style={{ transform: imagePreviewTransform }} draggable={false} />
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

