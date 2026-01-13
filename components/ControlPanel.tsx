import React, { useState, useEffect, useRef } from 'react';
import { fetchSongLyrics, fetchBiblePassage, processManualText, searchSongs, DensityMode, SongSearchResult } from '../services/geminiService';
import { PresentationItem, Theme, AnimationType, Slide } from '../types';
import { THEME_PRESETS, TEXT_STYLE_EDITIONS } from '../constants';
import { Music, BookOpen, Monitor, Loader2, Plus, Edit3, AlignJustify, Grid, FileText, AlignCenter, Search, User, X, Sliders, PlayCircle, Image as ImageIcon, Type, Bold, Italic, PenTool, CaseUpper, Upload, ChevronDown, Underline, Strikethrough, AlignLeft, AlignRight, Highlighter, Palette, Ratio, BoxSelect, PaintBucket, Layers, RotateCcw, Eraser, Book, LayoutGrid, Square, Check } from 'lucide-react';

interface ControlPanelProps {
  onAddItem: (item: PresentationItem) => void;
  onUpdateTheme: (theme: Theme) => void;
  onUpdatePendingTheme: (theme: Theme) => void;
  currentTheme: Theme; // This is the PREVIEW/STAGED theme
  liveTheme: Theme;    // This is the ACTUAL theme on projector
  hasActiveItem: boolean;
  onAddSlide: (slide: Slide) => void;
  activeSlideType?: 'text' | 'image' | 'youtube';
  activeSlide?: Slide | null;
  onUpdateSlideContent?: (slideId: string, newContent: string) => void;
  onPreviewSlideUpdate?: (slide: Slide | null) => void;
  onSetBackgroundAudio?: (videoId: string, title: string) => void;
  onStopLive?: () => void;
  isLiveActive?: boolean;
  onUndo: () => void;
  onRestoreOriginal: () => void;
  canUndo: boolean;
}

// Updated Bible Versions as requested
const BIBLE_VERSIONS = [
  'Reina Valera 1960',
  'Nueva Versión Internacional',
  'La Biblia de las Américas',
  'King James Version'
];

const FONTS = [
  { name: 'Montserrat', value: 'Montserrat, sans-serif' },
  { name: 'Inter', value: 'Inter, sans-serif' },
  { name: 'Roboto', value: 'Roboto, sans-serif' },
  { name: 'Lato', value: 'Lato, sans-serif' },
  { name: 'Open Sans', value: '"Open Sans", sans-serif' },
  { name: 'Oswald', value: 'Oswald, sans-serif' },
  { name: 'Merriweather', value: 'Merriweather, serif' },
  { name: 'Playfair Display', value: '"Playfair Display", serif' },
  { name: 'Courier New', value: 'Courier New, monospace' },
  { name: 'Impact', value: 'Impact, sans-serif' },
];

const ANIMATIONS: { name: string; value: AnimationType }[] = [
  { name: 'Ninguna', value: 'none' },
  { name: 'Desvanecer (Fade)', value: 'fade' },
  { name: 'Fade + Subir', value: 'fade-slide-up' },
  { name: 'Zoom Entrada', value: 'zoom-in' },
  { name: 'Zoom Elástico', value: 'zoom-elastic' },
  { name: 'Desenfoque (Blur)', value: 'blur-in' },
  { name: 'Rebote (Bounce)', value: 'bounce-in' },
  { name: 'Rotación', value: 'rotate-in' },
  { name: 'Giro 3D', value: 'flip-in-x' },
];

const FONT_SIZES = [
  { label: 'XS', val: 'text-2xl' },
  { label: 'S', val: 'text-4xl' },
  { label: 'M', val: 'text-6xl' },
  { label: 'L', val: 'text-8xl' },
  { label: 'XL', val: 'text-9xl' },
  { label: '2XL', val: 'text-[10rem]' },
  { label: '3XL', val: 'text-[12rem]' },
  { label: '4XL', val: 'text-[14rem]' },
];

const ASPECT_RATIOS = [
  { label: '16:9 (TV)', val: '16/9' },
  { label: '4:3 (Proyector)', val: '4/3' },
  { label: '1:1 (Cuadrado)', val: '1/1' },
  { label: '9:16 (Vertical)', val: '9/16' },
];

const GRADIENT_PRESETS = [
  { name: 'Azul', value: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)' },
  { name: 'Sunset', value: 'linear-gradient(to right, #ffecd2 0%, #fcb69f 100%)' },
  { name: 'Purple', value: 'linear-gradient(to right, #c084fc, #6366f1)' },
  { name: 'Teal', value: 'linear-gradient(to bottom, #115e59, #042f2e)' },
  { name: 'Dark', value: 'linear-gradient(to bottom, #4b5563, #1f2937)' },
  { name: 'Gold', value: 'linear-gradient(to right, #fbfb2d, #efc633)' },
  { name: 'Fire', value: 'linear-gradient(to right, #f83600 0%, #f9d423 100%)' },
  { name: 'Ocean', value: 'linear-gradient(to top, #209cff 0%, #68e0cf 100%)' },
];

const ControlPanel: React.FC<ControlPanelProps> = ({
  onAddItem,
  onUpdateTheme,
  onUpdatePendingTheme,
  currentTheme,
  liveTheme,
  hasActiveItem,
  onAddSlide,
  activeSlideType,
  activeSlide,
  onUpdateSlideContent,
  onPreviewSlideUpdate,
  onSetBackgroundAudio,
  onStopLive,
  isLiveActive,
  onUndo,
  onRestoreOriginal,
  canUndo
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'theme'>('content');
  const [bgMode, setBgMode] = useState<'image' | 'solid' | 'gradient'>('image');
  const [loading, setLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [inputType, setInputType] = useState<'youtube' | 'scripture' | 'manual'>('youtube');
  const [bibleVersion, setBibleVersion] = useState('Reina Valera 1960');
  const [density, setDensity] = useState<DensityMode>('classic');
  const [songResults, setSongResults] = useState<SongSearchResult[]>([]);
  const [isSearchingSongs, setIsSearchingSongs] = useState(false);
  const [editorSubTab, setEditorSubTab] = useState<'text' | 'image' | 'youtube'>(activeSlideType === 'image' ? 'image' : (activeSlideType === 'youtube' ? 'youtube' : 'text'));

  // Accordion state for theme sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    typography: true,
    transformation: false,
    filters: false,
    background: false,
    effects: false,
    imageFit: true,
    imageEffects: false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // --- STAGED THEME SYSTEM ---
  // We use currentTheme (pending) and liveTheme (on projector) from props
  const hasPendingChanges = JSON.stringify(currentTheme) !== JSON.stringify(liveTheme);

  // Update pending theme (local preview)
  const updatePendingTheme = (newTheme: Theme) => {
    onUpdatePendingTheme(newTheme);
  };

  // Sync manual input with active slide content
  useEffect(() => {
    if (activeSlide && activeSlide.content && inputType === 'manual') {
      setInputText(activeSlide.content);
      setEditorSubTab('text');
      onPreviewSlideUpdate?.(null); // Clear any pending preview when switching slides
    }
  }, [activeSlide?.id]);

  // Live preview effect for manual edits
  useEffect(() => {
    if (inputType === 'manual' && activeSlide && inputText !== activeSlide.content) {
      onPreviewSlideUpdate?.({ ...activeSlide, content: inputText });
    } else if (inputType === 'manual') {
      onPreviewSlideUpdate?.(null);
    }
  }, [inputText, inputType, activeSlide?.id]);

  // Apply pending changes to projector
  const applyChanges = () => {
    onUpdateTheme(currentTheme);
  };

  // Discard pending changes
  const discardChanges = () => {
    onUpdatePendingTheme(liveTheme);
  };

  // Gradient Builder State
  const [gradStart, setGradStart] = useState('#1e3a8a');
  const [gradEnd, setGradEnd] = useState('#0f172a');
  const [gradDir, setGradDir] = useState('135deg');

  // Refs for file inputs
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const slideFileInputRef = useRef<HTMLInputElement>(null);

  // No secondary preview effect for audio, it stays in the list.

  const handleSearch = async () => {
    if (!inputText.trim()) return;
    if (inputType === 'youtube') {
      const videoId = inputText.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/user\/\S+|\/ytscreeningroom\?v=|\/sanday\?v=))([\w-]{11})/)?.[1];
      if (videoId) {
        onAddItem({
          id: Math.random().toString(36).substr(2, 9),
          title: `YouTube: ${videoId}`,
          type: 'custom',
          slides: [{
            id: Math.random().toString(36).substr(2, 9),
            type: 'youtube',
            content: inputText,
            videoId: videoId,
            label: 'YOUTUBE'
          }],
          theme: currentTheme
        });
        setInputText('');
      } else {
        alert("Por favor pega un link de YouTube válido.");
      }
      return;
    }
    setLoading(true);
    try {
      let item: PresentationItem;
      if (inputType === 'manual') item = await processManualText(inputText, density);
      else item = await fetchBiblePassage(inputText, bibleVersion, density);
      onAddItem(item);
      if (inputType !== 'manual') setInputText('');
    } catch (err) { alert(err instanceof Error ? err.message : 'Error al buscar.'); } finally { setLoading(false); }
  };

  const handleSelectSong = async (result: SongSearchResult) => {
    setLoading(true);
    try {
      const item = await fetchSongLyrics(`${result.title} de ${result.artist}`, density);
      onAddItem(item);
      setInputText('');
      setSongResults([]);
    } catch (err) { alert('Error generando diapositivas. Se requiere API Key para canciones.'); } finally { setLoading(false); }
  };

  // --- FILE HANDLERS ---
  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) updatePendingTheme({ ...currentTheme, background: `url(${ev.target.result}) center/cover no-repeat` });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSlideImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          const newSlide: Slide = {
            id: Math.random().toString(36).substr(2, 9),
            type: 'image',
            content: '',
            mediaUrl: ev.target.result as string,
            label: 'IMAGEN'
          };
          onAddSlide(newSlide);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const getCurrentFontSizeIndex = () => {
    const idx = FONT_SIZES.findIndex(f => f.val === currentTheme.fontSize);
    return idx === -1 ? 4 : idx;
  };

  const toggleDecoration = (type: 'underline' | 'line-through') => {
    let current = currentTheme.textDecoration;
    if (current.includes(type)) {
      const newDec = current.replace(type, '').trim();
      updatePendingTheme({ ...currentTheme, textDecoration: newDec === '' ? 'none' : newDec as any });
    } else {
      const newDec = current === 'none' ? type : `${current} ${type}`;
      updatePendingTheme({ ...currentTheme, textDecoration: newDec as any });
    }
  };

  const applyCustomGradient = () => {
    const newVal = `linear-gradient(${gradDir}, ${gradStart} 0%, ${gradEnd} 100%)`;
    updatePendingTheme({ ...currentTheme, background: newVal });
  };

  const resetTextStyle = () => {
    updatePendingTheme({
      ...currentTheme,
      textColor: '#ffffff',
      textOpacity: 1,
      textBackgroundColor: 'transparent',
      fontWeight: 'bold',
      fontStyle: 'normal',
      textDecoration: 'none',
      textTransform: 'none',
      shadow: true,
      shadowColor: 'rgba(0,0,0,0.8)',
      shadowBlur: 10,
      shadowOffsetX: 4,
      shadowOffsetY: 4,
      textStrokeWidth: 0,
      bgClip: undefined
    });
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 border-r border-gray-800 font-sans">
      <div className="flex border-b border-gray-800">
        <button onClick={() => setActiveTab('content')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 ${activeTab === 'content' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white bg-gray-800'}`}>
          <Plus size={14} /> Contenido
        </button>
        <button
          onClick={() => setActiveTab('theme')}
          className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${activeTab === 'theme'
            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
            : 'text-gray-400 hover:text-white bg-gray-800/80'
            }`}
        >
          <Edit3 size={14} /> Editor
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar bg-gradient-to-b from-gray-800 to-gray-900">
        {activeTab === 'content' && (
          <div className="p-5 space-y-6">

            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/30">
              <label className="text-[10px] uppercase text-gray-500 font-bold tracking-widest mb-3 block">📺 Seleccionar Origen</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => { setInputType('youtube'); setSongResults([]); }}
                  className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${inputType === 'youtube' ? 'bg-gradient-to-br from-red-600/30 to-rose-600/30 border-red-500/50 shadow-lg shadow-red-500/10' : 'bg-gray-900/50 border-gray-700/50 hover:border-gray-500'}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${inputType === 'youtube' ? 'bg-red-500' : 'bg-gray-700'}`}>
                    <Monitor size={18} className="text-white" />
                  </div>
                  <span className={`text-[10px] font-bold uppercase ${inputType === 'youtube' ? 'text-red-300' : 'text-gray-400'}`}>YouTube</span>
                </button>
                <button
                  onClick={() => {
                    setInputType('manual');
                    setSongResults([]);
                    if (activeSlide?.content) setInputText(activeSlide.content);
                  }}
                  className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${inputType === 'manual' ? 'bg-gradient-to-br from-indigo-600/30 to-blue-600/30 border-indigo-500/50 shadow-lg shadow-indigo-500/10' : 'bg-gray-900/50 border-gray-700/50 hover:border-gray-500'}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${inputType === 'manual' ? 'bg-indigo-500' : 'bg-gray-700'}`}>
                    <Edit3 size={18} className="text-white" />
                  </div>
                  <span className={`text-[10px] font-bold uppercase ${inputType === 'manual' ? 'text-indigo-300' : 'text-gray-400'}`}>Manual</span>
                </button>
                <button
                  onClick={() => { setInputType('scripture'); setSongResults([]); }}
                  className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${inputType === 'scripture' ? 'bg-gradient-to-br from-amber-600/30 to-orange-600/30 border-amber-500/50 shadow-lg shadow-amber-500/10' : 'bg-gray-900/50 border-gray-700/50 hover:border-gray-500'}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${inputType === 'scripture' ? 'bg-amber-500' : 'bg-gray-700'}`}>
                    <Book size={18} className="text-white" />
                  </div>
                  <span className={`text-[10px] font-bold uppercase ${inputType === 'scripture' ? 'text-amber-300' : 'text-gray-400'}`}>Biblia</span>
                </button>
              </div>
            </div>

            {/* DENSITY SELECTOR - Compact */}
            {inputType !== 'youtube' && (
              <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/30">
                <label className="text-[10px] uppercase text-gray-500 font-bold tracking-widest mb-3 block">📊 Densidad de Texto</label>
                <div className="grid grid-cols-4 gap-2">
                  <button onClick={() => setDensity('impact')} className={`p-2 rounded-lg border text-[10px] font-bold transition-all flex flex-col items-center gap-1 ${density === 'impact' ? 'bg-indigo-600 border-indigo-400' : 'bg-gray-800 border-gray-700 hover:border-gray-500'}`}><AlignLeft size={14} /> Impacto</button>
                  <button onClick={() => setDensity('classic')} className={`p-2 rounded-lg border text-[10px] font-bold transition-all flex flex-col items-center gap-1 ${density === 'classic' ? 'bg-indigo-600 border-indigo-400' : 'bg-gray-800 border-gray-700 hover:border-gray-500'}`}><AlignCenter size={14} /> Clásico</button>
                  <button onClick={() => setDensity('stanza')} className={`p-2 rounded-lg border text-[10px] font-bold transition-all flex flex-col items-center gap-1 ${density === 'stanza' ? 'bg-indigo-600 border-indigo-400' : 'bg-gray-800 border-gray-700 hover:border-gray-500'}`}><LayoutGrid size={14} /> Estrofa</button>
                  <button onClick={() => setDensity('dense')} className={`p-2 rounded-lg border text-[10px] font-bold transition-all flex flex-col items-center gap-1 ${density === 'dense' ? 'bg-indigo-600 border-indigo-400' : 'bg-gray-800 border-gray-700 hover:border-gray-500'}`}><FileText size={14} /> Lectura</button>
                </div>
              </div>
            )}

            {/* INPUT FIELD - Stylized */}
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/30">
              <label className="text-[10px] uppercase text-gray-500 font-bold tracking-widest mb-3 block">
                {inputType === 'youtube' ? '📺 Navegador YouTube' : inputType === 'manual' ? '✍️ Escribe tu Texto' : '📖 Cita Bíblica'}
              </label>

              {inputType === 'youtube' && (
                <div className="mb-4">
                  <div className="relative group overflow-hidden rounded-xl border border-gray-700 bg-black aspect-video mb-3 shadow-inner">
                    <iframe
                      id="youtube-browser-iframe"
                      className="w-full h-full"
                      src={inputText.includes('v=') || inputText.includes('youtu.be') ? `https://www.youtube.com/embed/${inputText.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/user\/\S+|\/ytscreeningroom\?v=|\/sanday\?v=))([\w-]{11})/)?.[1] || ''}?autoplay=0&mute=1` : `https://www.youtube.com/embed?listType=search&list=${inputText || 'Musica Cristiana'}`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                    {!inputText && <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none group-hover:opacity-0 transition-opacity">
                      <p className="text-gray-400 text-xs italic">Escribe arriba para navegar...</p>
                    </div>}
                  </div>
                  <p className="text-[9px] text-gray-500 mb-2 italic">Tip: Pega el link directo o escribe palabras clave para buscar.</p>
                </div>
              )}

              {inputType === 'scripture' && (
                <select value={bibleVersion} onChange={(e) => setBibleVersion(e.target.value)} className="w-full bg-gray-800 text-white text-xs rounded-lg p-3 mb-3 outline-none border border-gray-600/50 hover:border-indigo-500/50 transition-colors">
                  {BIBLE_VERSIONS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              )}

              <div className="flex flex-col gap-3">
                {inputType === 'manual' ? (
                  <div className="relative">
                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Escribe aquí tu texto...sssss"
                      className="w-full h-32 bg-gray-800 rounded-xl px-4 py-3 text-white text-sm border border-gray-600/50 focus:border-indigo-500/50 outline-none resize-none transition-colors"
                    />
                    {activeSlide && inputText !== activeSlide.content && (
                      <div className="absolute top-2 right-2 flex gap-1">
                        <button
                          onClick={() => {
                            onUpdateSlideContent?.(activeSlide.id, inputText);
                            onPreviewSlideUpdate?.(null);
                          }}
                          className="bg-green-600 hover:bg-green-500 text-white text-[10px] font-black px-3 py-1.5 rounded-lg shadow-lg animate-pulse flex items-center gap-1"
                        >
                          <Check size={12} /> APLICAR
                        </button>
                        <button
                          onClick={() => {
                            setInputText(activeSlide.content);
                            onPreviewSlideUpdate?.(null);
                          }}
                          className="bg-gray-700 hover:bg-gray-600 text-white text-[10px] font-black px-2 py-1.5 rounded-lg shadow-lg"
                          title="Descartar cambios"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={inputType === 'scripture' ? "Ej: Juan 3:16" : inputType === 'youtube' ? "Pega link o busca..." : "Ej: Hillsong, Way Maker..."}
                    className="w-full bg-gray-800 rounded-xl px-4 py-3 text-white border border-gray-600/50 focus:border-indigo-500/50 outline-none transition-colors"
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                )}

                {songResults.length === 0 ? (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        if (activeSlide && inputType === 'manual' && inputText !== activeSlide.content) {
                          onUpdateSlideContent?.(activeSlide.id, inputText);
                          onPreviewSlideUpdate?.(null);
                        } else {
                          handleSearch();
                        }
                      }}
                      disabled={loading || isSearchingSongs || !inputText}
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white py-3.5 rounded-xl flex justify-center items-center gap-2 font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all font-sans"
                    >
                      {loading || isSearchingSongs ? <Loader2 className="animate-spin" size={18} /> : (activeSlide && inputType === 'manual' && inputText !== activeSlide.content) ? <Eraser size={18} /> : <Plus size={18} />}
                      {loading ? 'GENERANDO...' : (activeSlide && inputType === 'manual' && inputText !== activeSlide.content) ? 'APLICAR CAMBIO' : 'AGREGAR A LISTA'}
                    </button>

                    {hasActiveItem && (
                      <div className="grid grid-cols-1 gap-2">
                        <button
                          onClick={() => (window as any).makeLive()}
                          className="w-full bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl flex justify-center items-center gap-2 font-black text-sm shadow-lg shadow-red-500/20 transition-all animate-pulse font-sans"
                        >
                          <PlayCircle size={18} /> EN VIVO
                        </button>
                        {isLiveActive && (
                          <button
                            onClick={() => onStopLive?.()}
                            className="w-full bg-gray-800 hover:bg-gray-700 text-red-500 py-3 rounded-xl flex justify-center items-center gap-2 font-bold text-xs border border-red-900/30 transition-all"
                          >
                            <Square size={14} fill="currentColor" /> DETENER VIVO
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <button onClick={() => { setSongResults([]); setInputText(''); }} className="w-full bg-gray-600 hover:bg-gray-500 text-white py-2.5 rounded-xl flex justify-center items-center gap-2 text-xs font-bold">
                    <X size={14} /> CANCELAR BÚSQUEDA
                  </button>
                )}
              </div>
            </div>



            {/* SONG RESULTS */}
            {songResults.length > 0 && (
              <div className="bg-gray-900/80 rounded-xl border border-gray-700/50 overflow-hidden shadow-xl">
                <div className="p-3 bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border-b border-gray-700/50">
                  <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">🎵 {songResults.length} resultado(s) encontrado(s)</span>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {songResults.map((result, idx) => (
                    <button key={idx} onClick={() => handleSelectSong(result)} className="w-full text-left p-4 hover:bg-indigo-900/30 border-b border-gray-800/50 transition-colors">
                      <div className="font-bold text-white text-sm flex items-center gap-2"><Music size={14} className="text-pink-400" /> {result.title}</div>
                      <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-400"><User size={10} /> {result.artist}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ... Rest of the ControlPanel theme logic remains identical ... */}
        {activeTab === 'theme' && (
          <div className="pb-20">
            {/* STICKY APPLY BAR */}
            {hasPendingChanges && (
              <div className="bg-gradient-to-r from-green-900/90 to-emerald-900/90 p-3 border-b border-green-700 sticky top-0 z-20 backdrop-blur-sm shadow-lg animate-fade-in">
                <div className="flex gap-2">
                  <button
                    onClick={applyChanges}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider shadow-lg shadow-green-500/30 flex items-center justify-center gap-2 transition-all"
                  >
                    <PlayCircle size={14} /> Aplicar Cambios
                  </button>
                  <button
                    onClick={discardChanges}
                    className="px-4 py-2.5 rounded-lg border border-red-500/50 text-red-400 bg-red-500/10 hover:bg-red-500/20 text-xs font-bold uppercase transition-all"
                  >
                    <X size={14} />
                  </button>
                </div>
                <p className="text-[9px] text-green-300/70 text-center mt-1.5">Tienes cambios sin aplicar al proyector</p>
              </div>
            )}

            {/* --- 1. PAGE SETUP BAR --- */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-4 border-b border-gray-700/50 sticky top-0 z-10">
              <div className="flex gap-4">
                <div className="flex-1">
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-1.5 block">📐 Formato</span>
                  <select
                    value={currentTheme.aspectRatio || '16/9'}
                    onChange={(e) => updatePendingTheme({ ...currentTheme, aspectRatio: e.target.value })}
                    className="w-full bg-gray-800 text-xs text-white p-2 rounded-lg border border-gray-600/50 outline-none hover:border-indigo-500/50 transition-colors"
                  >
                    {ASPECT_RATIOS.map(ar => <option key={ar.val} value={ar.val}>{ar.label}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>📏 Margen</span>
                    <span className="text-indigo-400">{currentTheme.padding}</span>
                  </span>
                  <input
                    type="range" min="0" max="16" step="1"
                    value={currentTheme.padding}
                    onChange={(e) => updatePendingTheme({ ...currentTheme, padding: parseInt(e.target.value) })}
                    className="w-full h-2 bg-gray-700 rounded-full accent-indigo-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 space-y-5">
              {!hasActiveItem && <div className="bg-yellow-900/30 text-yellow-500 p-4 rounded-xl text-xs border border-yellow-700/50 text-center font-medium">⚠️ Selecciona un elemento de la lista para editarlo</div>}

              <div className={!hasActiveItem ? 'opacity-40 pointer-events-none' : ''}>

                {/* HEADER ACTIONS: Undo & Restore Original */}
                <div className="flex gap-2 mb-5">
                  <button
                    onClick={onUndo}
                    disabled={!canUndo}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all ${canUndo ? 'bg-gray-800/80 border-gray-600/50 text-white hover:bg-gray-700 hover:border-gray-500' : 'bg-gray-900/50 border-gray-800 text-gray-600 cursor-not-allowed'}`}
                  >
                    <RotateCcw size={12} /> Deshacer
                  </button>
                  <button
                    onClick={onRestoreOriginal}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-orange-500/30 text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 text-[10px] font-bold uppercase tracking-wider transition-all"
                  >
                    <Eraser size={12} /> Original
                  </button>
                </div>

                {/* SUB-TABS: Word vs Image - Modern Design */}
                <div className="flex bg-gradient-to-r from-gray-800/80 to-gray-900/80 p-1 rounded-2xl mb-5 border border-gray-700/30 shadow-inner">
                  <button onClick={() => setEditorSubTab('text')} className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider transition-all duration-300 ${editorSubTab === 'text' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20' : 'text-gray-400 hover:text-white'}`}>
                    <Type size={14} /> Texto
                  </button>
                  <button onClick={() => setEditorSubTab('image')} className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider transition-all duration-300 ${editorSubTab === 'image' ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg shadow-pink-500/20' : 'text-gray-400 hover:text-white'}`}>
                    <ImageIcon size={14} /> Imagen
                  </button>
                </div>

                {/* ADD IMAGE SLIDE QUICK ACTION (Available in Theme Tab) */}
                <div className="mb-5 bg-gradient-to-r from-green-900/20 to-emerald-900/20 rounded-xl p-3 border border-green-500/20">
                  <input type="file" accept="image/*" ref={slideFileInputRef} className="hidden" onChange={handleSlideImageUpload} />
                  <button onClick={() => slideFileInputRef.current?.click()} className="w-full bg-green-600 hover:bg-green-500 text-white py-2 rounded-lg text-[11px] font-black flex items-center justify-center gap-2 shadow-md transition-all uppercase tracking-tighter">
                    <Plus size={14} /> Nueva Diapositiva de Imagen
                  </button>
                </div>

                {/* --- EDITOR CONTENT: TEXT --- */}
                {editorSubTab === 'text' && (
                  <div className="animate-fade-in space-y-4">
                    {/* SECTION: Typography */}
                    <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-gray-700/50 rounded-xl overflow-hidden shadow-xl transition-all duration-300">
                      <button onClick={() => toggleSection('typography')} className="w-full text-[10px] uppercase text-indigo-400 font-bold tracking-widest p-4 flex items-center justify-between hover:bg-gray-700/30 transition-colors">
                        <div className="flex items-center gap-2"><Type size={14} /> Tipografía Básica</div>
                        <ChevronDown size={14} className={`transition-transform duration-300 ${expandedSections.typography ? 'rotate-180' : ''}`} />
                      </button>
                      {expandedSections.typography && (
                        <div className="p-4 pt-0 space-y-4 animate-fade-in border-t border-gray-700/30">
                          <div className="mt-4 space-y-4">
                            <div className="flex gap-2">
                              <div className="flex-1 relative">
                                <select value={currentTheme.fontFamily} onChange={(e) => updatePendingTheme({ ...currentTheme, fontFamily: e.target.value })} className="w-full bg-gray-900/80 text-xs text-white h-9 pl-3 pr-6 rounded-lg border border-gray-600/50 outline-none appearance-none truncate hover:border-indigo-500/50 transition-colors">
                                  {FONTS.map(font => <option key={font.name} value={font.value}>{font.name}</option>)}
                                </select>
                                <ChevronDown className="absolute right-2 top-2.5 text-gray-400 pointer-events-none" size={14} />
                              </div>
                              <div className="w-28 relative">
                                <select value={getCurrentFontSizeIndex()} onChange={(e) => updatePendingTheme({ ...currentTheme, fontSize: FONT_SIZES[parseInt(e.target.value)].val })} className="w-full bg-gray-900/80 text-xs text-white h-9 pl-3 pr-6 rounded-lg border border-gray-600/50 outline-none appearance-none hover:border-indigo-500/50 transition-colors">
                                  {FONT_SIZES.map((fs, i) => <option key={i} value={i}>{fs.label}</option>)}
                                </select>
                                <ChevronDown className="absolute right-2 top-2.5 text-gray-400 pointer-events-none" size={14} />
                              </div>
                            </div>
                            <div className="flex justify-between items-center bg-gray-900/60 rounded-lg p-1.5 border border-gray-700/30">
                              <div className="flex gap-0.5">
                                <button onClick={() => updatePendingTheme({ ...currentTheme, fontWeight: currentTheme.fontWeight === 'bold' ? 'normal' : 'bold' })} className={`p-2 rounded-md transition-all ${currentTheme.fontWeight !== 'normal' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}><Bold size={14} /></button>
                                <button onClick={() => updatePendingTheme({ ...currentTheme, fontStyle: currentTheme.fontStyle === 'italic' ? 'normal' : 'italic' })} className={`p-2 rounded-md transition-all ${currentTheme.fontStyle === 'italic' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}><Italic size={14} /></button>
                                <button onClick={() => toggleDecoration('underline')} className={`p-2 rounded-md transition-all ${currentTheme.textDecoration.includes('underline') ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}><Underline size={14} /></button>
                              </div>
                              <div className="w-px h-6 bg-gray-700" />
                              <div className="flex gap-0.5">
                                <button onClick={() => updatePendingTheme({ ...currentTheme, alignment: 'left' })} className={`p-2 rounded-md transition-all ${currentTheme.alignment === 'left' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}><AlignLeft size={14} /></button>
                                <button onClick={() => updatePendingTheme({ ...currentTheme, alignment: 'center' })} className={`p-2 rounded-md transition-all ${currentTheme.alignment === 'center' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}><AlignCenter size={14} /></button>
                                <button onClick={() => updatePendingTheme({ ...currentTheme, alignment: 'right' })} className={`p-2 rounded-md transition-all ${currentTheme.alignment === 'right' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}><AlignRight size={14} /></button>
                              </div>
                            </div>
                            <button onClick={resetTextStyle} className="w-full py-2 rounded-lg border border-gray-700 text-[9px] font-bold uppercase text-gray-400 hover:text-white hover:bg-gray-800 transition-all flex items-center justify-center gap-2">
                              <Eraser size={12} /> Limpiar Estilo de Texto
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SECTION: Transformation */}
                    <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-gray-700/50 rounded-xl overflow-hidden shadow-xl transition-all duration-300">
                      <button onClick={() => toggleSection('transformation')} className="w-full text-[10px] uppercase text-indigo-400 font-bold tracking-widest p-4 flex items-center justify-between hover:bg-gray-700/30 transition-colors">
                        <div className="flex items-center gap-2"><Monitor size={14} /> Transformación Avanzada</div>
                        <ChevronDown size={14} className={`transition-transform duration-300 ${expandedSections.transformation ? 'rotate-180' : ''}`} />
                      </button>
                      {expandedSections.transformation && (
                        <div className="p-4 pt-0 space-y-4 animate-fade-in border-t border-gray-700/30">
                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <div className="flex flex-col gap-1.5 bg-gray-900/40 p-2 rounded-lg border border-gray-700/30">
                              <label className="text-[9px] text-gray-500 font-bold uppercase">Formato</label>
                              <select value={currentTheme.textCase} onChange={(e) => updatePendingTheme({ ...currentTheme, textCase: e.target.value as any })} className="bg-gray-800 text-[10px] text-white p-1.5 rounded border border-gray-600 outline-none">
                                <option value="none">Normal</option>
                                <option value="uppercase">MAYÚSCULAS</option>
                                <option value="capitalize">Capitalizado</option>
                              </select>
                            </div>
                            <div className="flex flex-col gap-1.5 bg-gray-900/40 p-2 rounded-lg border border-gray-700/30">
                              <label className="text-[9px] text-gray-500 font-bold uppercase">Giro Texto</label>
                              <div className="flex items-center gap-2">
                                <input type="range" min="-180" max="180" value={currentTheme.textRotation || 0} onChange={(e) => updatePendingTheme({ ...currentTheme, textRotation: parseInt(e.target.value) })} className="flex-1 h-1 bg-gray-700 rounded accent-indigo-500" />
                                <span className="text-[9px] text-indigo-400 w-6">{currentTheme.textRotation || 0}°</span>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <div className="flex justify-between text-[9px] text-gray-400 mb-1 font-bold uppercase"><span>Inclinación</span><span>{currentTheme.textSkewX || 0}°</span></div>
                              <input type="range" min="-45" max="45" value={currentTheme.textSkewX || 0} onChange={(e) => updatePendingTheme({ ...currentTheme, textSkewX: parseInt(e.target.value) })} className="w-full h-1.5 bg-gray-700 rounded-full accent-indigo-500 cursor-pointer" />
                            </div>
                            <div>
                              <div className="flex justify-between text-[9px] text-gray-400 mb-1 font-bold uppercase"><span>Margen Resaltado</span><span>{currentTheme.textHighlightPadding || 8}px</span></div>
                              <input type="range" min="0" max="40" value={currentTheme.textHighlightPadding || 8} onChange={(e) => updatePendingTheme({ ...currentTheme, textHighlightPadding: parseInt(e.target.value) })} className="w-full h-1.5 bg-gray-700 rounded-full accent-indigo-500 cursor-pointer" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* --- EDITOR CONTENT: IMAGE --- */}
                {editorSubTab === 'image' && (
                  <div className="animate-fade-in space-y-4">
                    {/* SECTION: Image Fit & Rotation */}
                    <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-gray-700/50 rounded-xl overflow-hidden shadow-xl transition-all duration-300">
                      <button onClick={() => toggleSection('imageFit')} className="w-full text-[10px] uppercase text-pink-400 font-bold tracking-widest p-4 flex items-center justify-between hover:bg-gray-700/30 transition-colors">
                        <div className="flex items-center gap-2"><ImageIcon size={14} /> Composición</div>
                        <ChevronDown size={14} className={`transition-transform duration-300 ${expandedSections.imageFit ? 'rotate-180' : ''}`} />
                      </button>
                      {expandedSections.imageFit && (
                        <div className="p-4 pt-0 space-y-4 animate-fade-in border-t border-gray-700/30">
                          <div className="mt-4 grid grid-cols-3 gap-2">
                            {(['contain', 'cover', 'fill'] as const).map(fit => (
                              <button key={fit} onClick={() => updatePendingTheme({ ...currentTheme, imageContentFit: fit })} className={`py-2 rounded-lg text-[9px] font-bold uppercase transition-all duration-300 border ${currentTheme.imageContentFit === fit ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white border-pink-500 shadow-lg' : 'bg-gray-800/50 text-gray-400 border-gray-700 hover:border-pink-500/50'}`}>
                                {fit === 'contain' ? 'Cuadro' : fit === 'cover' ? 'Llenar' : 'Estirar'}
                              </button>
                            ))}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => updatePendingTheme({ ...currentTheme, imageContentFlipH: !currentTheme.imageContentFlipH })} className={`py-2 rounded-lg text-[9px] font-bold uppercase border transition-all ${currentTheme.imageContentFlipH ? 'bg-pink-600 text-white border-pink-400' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>Espejo H</button>
                            <button onClick={() => updatePendingTheme({ ...currentTheme, imageContentFlipV: !currentTheme.imageContentFlipV })} className={`py-2 rounded-lg text-[9px] font-bold uppercase border transition-all ${currentTheme.imageContentFlipV ? 'bg-pink-600 text-white border-pink-400' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>Espejo V</button>
                          </div>
                          <div className="bg-gray-900/40 p-3 rounded-lg border border-gray-700/30">
                            <div className="flex justify-between text-[10px] text-gray-300 mb-2 font-bold uppercase"><span>Rotación</span><span className="text-pink-400">{currentTheme.imageContentRotation || 0}°</span></div>
                            <input type="range" min="-180" max="180" value={currentTheme.imageContentRotation || 0} onChange={(e) => updatePendingTheme({ ...currentTheme, imageContentRotation: parseInt(e.target.value) })} className="w-full h-1.5 bg-gray-700 rounded-full accent-pink-500 cursor-pointer" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SECTION: Filters */}
                    <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-gray-700/50 rounded-xl overflow-hidden shadow-xl transition-all duration-300">
                      <button onClick={() => toggleSection('filters')} className="w-full text-[10px] uppercase text-pink-400 font-bold tracking-widest p-4 flex items-center justify-between hover:bg-gray-700/30 transition-colors">
                        <div className="flex items-center gap-2"><Sliders size={14} /> Filtros Avanzados</div>
                        <ChevronDown size={14} className={`transition-transform duration-300 ${expandedSections.filters ? 'rotate-180' : ''}`} />
                      </button>
                      {expandedSections.filters && (
                        <div className="p-4 pt-0 space-y-4 animate-fade-in border-t border-gray-700/30">
                          <div className="mt-4 space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <div className="flex justify-between text-[8px] text-gray-500 mb-1 font-bold uppercase"><span>Gris</span><span>{Math.round((currentTheme.imageContentGrayscale || 0) * 100)}%</span></div>
                                <input type="range" min="0" max="1" step="0.01" value={currentTheme.imageContentGrayscale || 0} onChange={(e) => updatePendingTheme({ ...currentTheme, imageContentGrayscale: parseFloat(e.target.value) })} className="w-full h-1 bg-gray-700 rounded accent-gray-400" />
                              </div>
                              <div>
                                <div className="flex justify-between text-[8px] text-gray-500 mb-1 font-bold uppercase"><span>Sepia</span><span>{Math.round((currentTheme.imageContentSepia || 0) * 100)}%</span></div>
                                <input type="range" min="0" max="1" step="0.01" value={currentTheme.imageContentSepia || 0} onChange={(e) => updatePendingTheme({ ...currentTheme, imageContentSepia: parseFloat(e.target.value) })} className="w-full h-1 bg-gray-700 rounded accent-orange-400" />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <div className="flex justify-between text-[8px] text-gray-500 mb-1 font-bold uppercase"><span>Tono</span><span>{currentTheme.imageContentHueRotate || 0}°</span></div>
                                <input type="range" min="0" max="360" value={currentTheme.imageContentHueRotate || 0} onChange={(e) => updatePendingTheme({ ...currentTheme, imageContentHueRotate: parseInt(e.target.value) })} className="w-full h-1 bg-gray-700 rounded accent-blue-400" />
                              </div>
                              <div>
                                <div className="flex justify-between text-[8px] text-gray-500 mb-1 font-bold uppercase"><span>Saturación</span><span>{Math.round((currentTheme.imageContentSaturate || 1) * 100)}%</span></div>
                                <input type="range" min="0" max="3" step="0.1" value={currentTheme.imageContentSaturate || 1} onChange={(e) => updatePendingTheme({ ...currentTheme, imageContentSaturate: parseFloat(e.target.value) })} className="w-full h-1 bg-gray-700 rounded accent-pink-400" />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <div className="flex justify-between text-[8px] text-gray-500 mb-1 font-bold uppercase"><span>Invertir</span><span>{Math.round((currentTheme.imageContentInvert || 0) * 100)}%</span></div>
                                <input type="range" min="0" max="1" step="0.01" value={currentTheme.imageContentInvert || 0} onChange={(e) => updatePendingTheme({ ...currentTheme, imageContentInvert: parseFloat(e.target.value) })} className="w-full h-1 bg-gray-700 rounded accent-cyan-400" />
                              </div>
                              <div>
                                <div className="flex justify-between text-[8px] text-gray-500 mb-1 font-bold uppercase"><span>Malla (Blur)</span><span>{currentTheme.imageContentBlur || 0}px</span></div>
                                <input type="range" min="0" max="20" value={currentTheme.imageContentBlur || 0} onChange={(e) => updatePendingTheme({ ...currentTheme, imageContentBlur: parseInt(e.target.value) })} className="w-full h-1 bg-gray-700 rounded accent-indigo-400" />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SECTION: Borders & Shadows */}
                    <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-gray-700/50 rounded-xl overflow-hidden shadow-xl transition-all duration-300">
                      <button onClick={() => toggleSection('imageEffects')} className="w-full text-[10px] uppercase text-pink-400 font-bold tracking-widest p-4 flex items-center justify-between hover:bg-gray-700/30 transition-colors">
                        <div className="flex items-center gap-2"><Layers size={14} /> Estilo & Mezcla</div>
                        <ChevronDown size={14} className={`transition-transform duration-300 ${expandedSections.imageEffects ? 'rotate-180' : ''}`} />
                      </button>
                      {expandedSections.imageEffects && (
                        <div className="p-4 pt-0 space-y-4 animate-fade-in border-t border-gray-700/30">
                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5 bg-gray-900/40 p-2 rounded-lg border border-gray-700/30">
                              <label className="text-[9px] text-gray-500 font-bold uppercase">Mezcla</label>
                              <select value={currentTheme.imageContentBlendMode || 'normal'} onChange={(e) => updatePendingTheme({ ...currentTheme, imageContentBlendMode: e.target.value })} className="bg-gray-800 text-[10px] text-white p-1 rounded border border-gray-600">
                                <option value="normal">Normal</option>
                                <option value="multiply">Multiplicar</option>
                                <option value="screen">Trama</option>
                                <option value="overlay">Superponer</option>
                                <option value="darken">Oscurecer</option>
                                <option value="lighten">Aclarar</option>
                              </select>
                            </div>
                            <div className="flex flex-col gap-1.5 bg-gray-900/40 p-2 rounded-lg border border-gray-700/30">
                              <label className="text-[9px] text-gray-500 font-bold uppercase">Borde</label>
                              <div className="flex items-center gap-2">
                                <input type="color" value={currentTheme.imageContentBorderColor} onChange={(e) => updatePendingTheme({ ...currentTheme, imageContentBorderColor: e.target.value })} className="w-4 h-4 rounded border border-gray-600" />
                                <input type="range" min="0" max="20" value={currentTheme.imageContentBorderWidth} onChange={(e) => updatePendingTheme({ ...currentTheme, imageContentBorderWidth: parseInt(e.target.value) })} className="flex-1 h-1 accent-pink-500" />
                              </div>
                            </div>
                          </div>
                          <div className="bg-gray-900/40 p-3 rounded-lg border border-gray-700/30">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[9px] text-gray-500 font-bold uppercase">Sombra</span>
                              <input type="color" value={currentTheme.imageContentShadowColor} onChange={(e) => updatePendingTheme({ ...currentTheme, imageContentShadowColor: e.target.value })} className="w-4 h-4 rounded border border-gray-600" />
                            </div>
                            <div className="flex gap-2">
                              <input type="range" min="0" max="50" value={currentTheme.imageContentShadowBlur} onChange={(e) => updatePendingTheme({ ...currentTheme, imageContentShadowBlur: parseInt(e.target.value) })} className="w-full h-1 accent-pink-500" />
                              <input type="range" min="-30" max="30" value={currentTheme.imageContentShadowOffsetX} onChange={(e) => updatePendingTheme({ ...currentTheme, imageContentShadowOffsetX: parseInt(e.target.value) })} className="w-full h-1 accent-pink-500" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* --- SHARED SECTIONS --- */}
                <div className="mt-6 space-y-4">
                  {/* ACCORDION: Background */}
                  <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-gray-700/50 rounded-xl overflow-hidden shadow-xl transition-all duration-300">
                    <button onClick={() => toggleSection('background')} className="w-full text-[10px] uppercase text-indigo-400 font-bold tracking-widest p-4 flex items-center justify-between hover:bg-gray-700/30 transition-colors">
                      <div className="flex items-center gap-2"><ImageIcon size={14} /> Fondo General</div>
                      <ChevronDown size={14} className={`transition-transform duration-300 ${expandedSections.background ? 'rotate-180' : ''}`} />
                    </button>
                    {expandedSections.background && (
                      <div className="p-4 pt-0 space-y-4 animate-fade-in border-t border-gray-700/30">
                        <div className="mt-4 flex bg-gray-800 rounded-lg p-1 border border-gray-700">
                          <button onClick={() => setBgMode('image')} className={`flex-1 py-1.5 rounded-md text-[9px] font-bold uppercase transition-all ${bgMode === 'image' ? 'bg-indigo-600 text-white' : 'text-gray-400'}`}>Imagen</button>
                          <button onClick={() => setBgMode('solid')} className={`flex-1 py-1.5 rounded-md text-[9px] font-bold uppercase transition-all ${bgMode === 'solid' ? 'bg-indigo-600 text-white' : 'text-gray-400'}`}>Sólido</button>
                          <button onClick={() => setBgMode('gradient')} className={`flex-1 py-1.5 rounded-md text-[9px] font-bold uppercase transition-all ${bgMode === 'gradient' ? 'bg-indigo-600 text-white' : 'text-gray-400'}`}>Degradado</button>
                        </div>
                        {bgMode === 'image' && (
                          <div className="space-y-3">
                            <input type="text" placeholder="URL imagen..." className="w-full bg-gray-900 rounded p-2 text-[10px] text-white border border-gray-700 outline-none" onChange={(e) => { if (e.target.value) updatePendingTheme({ ...currentTheme, background: `url(${e.target.value}) center/cover no-repeat` }); }} />
                            <button onClick={() => bgFileInputRef.current?.click()} className="w-full bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs p-2 rounded flex items-center justify-center gap-2"><Upload size={14} /> Subir Imagen</button>
                            <input type="file" accept="image/*" ref={bgFileInputRef} className="hidden" onChange={handleBgUpload} />
                          </div>
                        )}
                        {bgMode === 'solid' && (
                          <div className="flex items-center gap-3 bg-gray-900/40 p-2 rounded border border-gray-700">
                            <input type="color" value={currentTheme.background.startsWith('#') ? currentTheme.background : '#000000'} className="w-8 h-8 rounded cursor-pointer" onChange={(e) => updatePendingTheme({ ...currentTheme, background: e.target.value })} />
                            <span className="text-[10px] text-gray-400 font-bold uppercase">Color de Fondo</span>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-700/30">
                          <div>
                            <div className="flex justify-between text-[8px] text-gray-500 mb-1 font-bold uppercase"><span>Brillo Fondo</span><span>{Math.round(currentTheme.bgBrightness * 100)}%</span></div>
                            <input type="range" min="0" max="2" step="0.1" value={currentTheme.bgBrightness} onChange={(e) => updatePendingTheme({ ...currentTheme, bgBrightness: parseFloat(e.target.value) })} className="w-full h-1 bg-gray-700 rounded accent-indigo-500" />
                          </div>
                          <div>
                            <div className="flex justify-between text-[8px] text-gray-500 mb-1 font-bold uppercase"><span>Desenfoque</span><span>{currentTheme.bgImageBlur}px</span></div>
                            <input type="range" min="0" max="20" value={currentTheme.bgImageBlur} onChange={(e) => updatePendingTheme({ ...currentTheme, bgImageBlur: parseInt(e.target.value) })} className="w-full h-1 bg-gray-700 rounded accent-indigo-500" />
                          </div>
                        </div>
                        {bgMode === 'gradient' && (
                          <div className="space-y-4 pt-2 border-t border-gray-700/30">
                            <span className="text-[9px] text-gray-400 font-bold uppercase block">Predeterminados</span>
                            <div className="grid grid-cols-4 gap-2">
                              {GRADIENT_PRESETS.map(grad => (
                                <button
                                  key={grad.name}
                                  onClick={() => updatePendingTheme({ ...currentTheme, background: grad.value })}
                                  className="h-8 rounded overflow-hidden border border-gray-700 hover:border-indigo-500 transition-all"
                                  style={{ background: grad.value }}
                                  title={grad.name}
                                />
                              ))}
                            </div>
                            <div className="bg-gray-900/40 p-3 rounded-lg border border-gray-700/30 space-y-3">
                              <span className="text-[9px] text-gray-400 font-bold uppercase block">Constructor Personalizado</span>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[8px] text-gray-500 uppercase font-bold">Inicio</label>
                                  <input type="color" value={gradStart} onChange={(e) => setGradStart(e.target.value)} className="w-full h-8 rounded bg-gray-800" />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[8px] text-gray-500 uppercase font-bold">Fin</label>
                                  <input type="color" value={gradEnd} onChange={(e) => setGradEnd(e.target.value)} className="w-full h-8 rounded bg-gray-800" />
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <select value={gradDir} onChange={(e) => setGradDir(e.target.value)} className="flex-1 bg-gray-800 text-[10px] text-white p-1.5 rounded border border-gray-600">
                                  <option value="to right">Horizontal</option>
                                  <option value="to bottom">Vertical</option>
                                  <option value="135deg">Diagonal</option>
                                </select>
                                <button onClick={applyCustomGradient} className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold px-4 py-1.5 rounded-lg transition-all">Generar</button>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="bg-gray-900/40 p-3 rounded-lg border border-gray-700/30 space-y-3 mt-4">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] text-gray-400 font-bold uppercase">Capa Overlay</span>
                            <div className="flex items-center gap-2">
                              <input type="color" value={currentTheme.bgOverlayColor} onChange={(e) => updatePendingTheme({ ...currentTheme, bgOverlayColor: e.target.value })} className="w-4 h-4 rounded border border-gray-600" />
                              <span className="text-[8px] text-gray-500 font-mono">{currentTheme.bgOverlayColor}</span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[8px] text-gray-500 font-bold"><span>Opacidad</span><span>{Math.round(currentTheme.bgOverlayOpacity * 100)}%</span></div>
                            <input type="range" min="0" max="1" step="0.05" value={currentTheme.bgOverlayOpacity} onChange={(e) => updatePendingTheme({ ...currentTheme, bgOverlayOpacity: parseFloat(e.target.value) })} className="w-full h-1 bg-gray-700 rounded accent-indigo-500" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ACCORDION: Advanced Effects */}
                  <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-gray-700/50 rounded-xl overflow-hidden shadow-xl transition-all duration-300">
                    <button onClick={() => toggleSection('effects')} className="w-full text-[10px] uppercase text-indigo-400 font-bold tracking-widest p-4 flex items-center justify-between hover:bg-gray-700/30 transition-colors">
                      <div className="flex items-center gap-2"><Highlighter size={14} /> Efectos & Animación</div>
                      <ChevronDown size={14} className={`transition-transform duration-300 ${expandedSections.effects ? 'rotate-180' : ''}`} />
                    </button>
                    {expandedSections.effects && (
                      <div className="p-4 pt-0 space-y-4 animate-fade-in border-t border-gray-700/30">
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div className="bg-gray-900/40 p-2 rounded-lg border border-gray-700/30">
                            <span className="text-[9px] text-gray-500 font-bold uppercase block mb-1">Borde Texto</span>
                            <div className="flex items-center gap-2">
                              <input type="color" value={currentTheme.textStrokeColor} onChange={(e) => updatePendingTheme({ ...currentTheme, textStrokeColor: e.target.value })} className="w-4 h-4 rounded" />
                              <input type="range" min="0" max="5" step="0.5" value={currentTheme.textStrokeWidth} onChange={(e) => updatePendingTheme({ ...currentTheme, textStrokeWidth: parseFloat(e.target.value) })} className="flex-1 h-1 bg-gray-700 accent-indigo-500" />
                            </div>
                          </div>
                          <div className="bg-gray-900/40 p-2 rounded-lg border border-gray-700/30">
                            <span className="text-[9px] text-gray-500 font-bold uppercase block mb-1">Animación</span>
                            <select value={currentTheme.animation} onChange={(e) => updatePendingTheme({ ...currentTheme, animation: e.target.value as AnimationType })} className="w-full bg-gray-800 text-[10px] text-white p-1 rounded border border-gray-600 outline-none">
                              {ANIMATIONS.map(anim => <option key={anim.value} value={anim.value}>{anim.name}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="p-3 border-t border-gray-800 bg-gray-900 text-center">
        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
          by Fernely Nunez Sosa
        </p>
      </div>
    </div >
  );
};

export default ControlPanel;
