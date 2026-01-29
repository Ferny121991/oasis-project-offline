import React, { useState, useEffect, useRef } from 'react';
import { fetchSongLyrics, fetchBiblePassage, processManualText, searchSongs, DensityMode, SongSearchResult } from '../services/geminiService';
import { PresentationItem, Theme, AnimationType, Slide, TextSegment, HistoryEntry } from '../types';
import { THEME_PRESETS, TEXT_STYLE_EDITIONS } from '../constants';
import { Music, BookOpen, Monitor, Loader2, Plus, Edit3, AlignJustify, Grid, FileText, AlignCenter, Search, User, X, Sliders, PlayCircle, Image as ImageIcon, Type, Bold, Italic, PenTool, CaseUpper, Upload, ChevronDown, Underline, Strikethrough, AlignLeft, AlignRight, Highlighter, Palette, Ratio, BoxSelect, PaintBucket, Layers, RotateCcw, Eraser, Book, LayoutGrid, Square, Check, PauseCircle, SkipForward, SkipBack, Clock, Mic, Maximize2, Eye, EyeOff, ExternalLink, XCircle, Minus, ChevronLeft, ChevronRight, Trash2, Edit2, LogIn, User as UserIcon, LogOut, RefreshCw } from 'lucide-react';
import RichTextEditor, { textToSegments, segmentsToText } from './RichTextEditor';
import HistoryPanel from './HistoryPanel';

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
  onUpdateSlideSegments?: (slideId: string, segments: TextSegment[]) => void;
  onPreviewSlideUpdate?: (slide: Slide | null) => void;
  onSetBackgroundAudio?: (videoId: string | null, title?: string) => void;
  onStopLive?: () => void;
  isLiveActive?: boolean;
  onUndo: () => void;
  onRestoreOriginal: () => void;
  canUndo: boolean;
  onDeselect?: () => void;
  // Audio Control Props
  isAudioPlaying?: boolean;
  backgroundAudioItem?: { videoId: string; title: string } | null;
  onToggleAudioPlayback?: () => void;
  onSeekAudio?: (seconds: number) => void;
  bgAudioItem?: { videoId: string; title: string } | null;
  history: HistoryEntry[];
  onRestore: (entry: HistoryEntry) => void;
  isKaraokeActive?: boolean;
  onToggleKaraoke?: () => void;
  // Custom Themes (cloud synced)
  customThemes?: Theme[];
  onUpdateCustomThemes?: (themes: Theme[]) => void;
}

// Updated Bible Versions as requested
const BIBLE_VERSIONS = [
  'Reina Valera 1960',
  'Nueva Versión Internacional',
  'Nueva Traducción Viviente',
  'La Biblia de las Américas',
  'New International Version',
  'King James Version',
  'New King James Version'
];

const FONTS = [
  { name: 'Montserrat', value: 'Montserrat, sans-serif' },
  { name: 'Poppins', value: 'Poppins, sans-serif' },
  { name: 'Inter', value: 'Inter, sans-serif' },
  { name: 'Outfit', value: 'Outfit, sans-serif' },
  { name: 'Roboto', value: 'Roboto, sans-serif' },
  { name: 'Oswald', value: 'Oswald, sans-serif' },
  { name: 'Bebas Neue', value: '"Bebas Neue", sans-serif' },
  { name: 'Archivo Black', value: '"Archivo Black", sans-serif' },
  { name: 'DM Sans', value: '"DM Sans", sans-serif' },
  { name: 'Lexend', value: 'Lexend, sans-serif' },
  { name: 'Quicksand', value: 'Quicksand, sans-serif' },
  { name: 'Raleway', value: 'Raleway, sans-serif' },
  { name: 'Space Grotesk', value: '"Space Grotesk", sans-serif' },
  { name: 'Syne', value: 'Syne, sans-serif' },
  { name: 'Unbounded', value: 'Unbounded, sans-serif' },
  { name: 'Merriweather', value: 'Merriweather, serif' },
  { name: 'Playfair Display', value: '"Playfair Display", serif' },
  { name: 'Cormorant', value: '"Cormorant Garamond", serif' },
  { name: 'Cinzel', value: 'Cinzel, serif' },
  { name: 'Josefin Sans', value: '"Josefin Sans", sans-serif' },
  { name: 'Bungee', value: 'Bungee, sans-serif' },
  { name: 'Lobster', value: 'Lobster, cursive' },
  { name: 'Pacifico', value: 'Pacifico, cursive' },
  { name: 'Caveat', value: 'Caveat, cursive' },
  { name: 'Permanent Marker', value: '"Permanent Marker", cursive' },
  { name: 'Courier New', value: 'Courier New, monospace' },
];

const ANIMATIONS: { name: string; value: AnimationType }[] = [
  // Básicas
  { name: '🚫 Ninguna', value: 'none' },
  { name: '✨ Desvanecer (Fade)', value: 'fade' },

  // Fade + Dirección
  { name: '⬆️ Fade + Subir', value: 'fade-slide-up' },
  { name: '⬇️ Fade + Bajar', value: 'fade-slide-down' },
  { name: '⬅️ Fade + Izquierda', value: 'fade-slide-left' },
  { name: '➡️ Fade + Derecha', value: 'fade-slide-right' },

  // Zoom
  { name: '🔍 Zoom Entrada', value: 'zoom-in' },
  { name: '🔎 Zoom Salida', value: 'zoom-out' },
  { name: '🎯 Zoom Elástico', value: 'zoom-elastic' },

  // Blur & Focus
  { name: '💨 Desenfoque (Blur)', value: 'blur-in' },
  { name: '🎬 Focus Expand', value: 'focus-in-expand' },

  // Especiales
  { name: '⌨️ Máquina Escribir', value: 'typewriter' },
  { name: '🌀 Rotación', value: 'rotate-in' },
  { name: '🔄 Giro 3D Horizontal', value: 'flip-in-x' },
  { name: '🔃 Giro 3D Vertical', value: 'flip-in-y' },

  // Bounce & Elastic
  { name: '🏀 Rebote (Bounce)', value: 'bounce-in' },
  { name: '⬇️ Rebote desde Arriba', value: 'bounce-in-top' },
  { name: '🎢 Elástico Slide', value: 'elastic-slide' },

  // Dramáticas
  { name: '🎭 Swing (Balanceo)', value: 'swing-in' },
  { name: '🎲 Roll In (Rodar)', value: 'roll-in' },
  { name: '📐 Slit Vertical', value: 'slit-in-vertical' },
  { name: '💥 Puff In (Explosión)', value: 'puff-in' },
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

// Complete list of Bible books in Spanish
const BIBLE_BOOKS = [
  // Antiguo Testamento
  'Génesis', 'Éxodo', 'Levítico', 'Números', 'Deuteronomio',
  'Josué', 'Jueces', 'Rut', '1 Samuel', '2 Samuel',
  '1 Reyes', '2 Reyes', '1 Crónicas', '2 Crónicas', 'Esdras',
  'Nehemías', 'Ester', 'Job', 'Salmos', 'Proverbios',
  'Eclesiastés', 'Cantares', 'Isaías', 'Jeremías', 'Lamentaciones',
  'Ezequiel', 'Daniel', 'Oseas', 'Joel', 'Amós',
  'Abdías', 'Jonás', 'Miqueas', 'Nahúm', 'Habacuc',
  'Sofonías', 'Hageo', 'Zacarías', 'Malaquías',
  // Nuevo Testamento
  'Mateo', 'Marcos', 'Lucas', 'Juan', 'Hechos',
  'Romanos', '1 Corintios', '2 Corintios', 'Gálatas', 'Efesios',
  'Filipenses', 'Colosenses', '1 Tesalonicenses', '2 Tesalonicenses',
  '1 Timoteo', '2 Timoteo', 'Tito', 'Filemón', 'Hebreos',
  'Santiago', '1 Pedro', '2 Pedro', '1 Juan', '2 Juan', '3 Juan',
  'Judas', 'Apocalipsis'
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
  onUpdateSlideSegments,
  onPreviewSlideUpdate,
  onSetBackgroundAudio,
  onStopLive,
  isLiveActive,
  onUndo,
  onRestoreOriginal,
  canUndo,
  onDeselect,
  isAudioPlaying,
  backgroundAudioItem,
  onToggleAudioPlayback,
  onSeekAudio,
  bgAudioItem,
  history,
  onRestore,
  isKaraokeActive = false,
  onToggleKaraoke,
  customThemes: propCustomThemes,
  onUpdateCustomThemes,
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

  // Bible book autocomplete suggestions
  const [bibleSuggestions, setBibleSuggestions] = useState<string[]>([]);
  const [showBibleSuggestions, setShowBibleSuggestions] = useState(false);

  // Accordion state for theme sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    typography: true,
    shadows: false,
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

  // Custom Themes (user-created) - use props if cloud-synced, or local state as fallback
  const [localCustomThemes, setLocalCustomThemes] = useState<Theme[]>(() => {
    try {
      const saved = localStorage.getItem('oasis_custom_themes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showSaveThemeModal, setShowSaveThemeModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);

  // No local state for karaoke needed, use prop
  const [newThemeName, setNewThemeName] = useState('');

  // Use cloud themes if available, otherwise local
  const customThemes = propCustomThemes ?? localCustomThemes;
  const setCustomThemes = (updater: Theme[] | ((prev: Theme[]) => Theme[])) => {
    const newThemes = typeof updater === 'function' ? updater(customThemes) : updater;
    if (onUpdateCustomThemes) {
      // Cloud sync
      onUpdateCustomThemes(newThemes);
    } else {
      // Local only
      setLocalCustomThemes(newThemes);
    }
  };

  // Save local custom themes to localStorage (only if not using cloud)
  useEffect(() => {
    if (!onUpdateCustomThemes) {
      localStorage.setItem('oasis_custom_themes', JSON.stringify(localCustomThemes));
    }
  }, [localCustomThemes, onUpdateCustomThemes]);

  const saveCurrentAsCustomTheme = () => {
    if (!newThemeName.trim()) return;
    const newTheme: Theme = {
      ...currentTheme,
      id: `custom-${Date.now()}`,
      name: `⭐ ${newThemeName.trim()}`
    };
    setCustomThemes(prev => [...prev, newTheme]);
    setNewThemeName('');
    setShowSaveThemeModal(false);
  };

  const deleteCustomTheme = (themeId: string) => {
    setCustomThemes(prev => prev.filter(t => t.id !== themeId));
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

  // Bible book autocomplete effect
  useEffect(() => {
    if (inputType === 'scripture' && inputText.trim().length > 0) {
      // Get the book name part (before any numbers like "3:16")
      const bookPart = inputText.split(/\s+\d/)[0].trim().toLowerCase();

      if (bookPart.length > 0) {
        // Filter books that start with or contain the input
        const matches = BIBLE_BOOKS.filter(book => {
          const bookLower = book.toLowerCase();
          // Remove accents for comparison
          const normalizedBook = bookLower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const normalizedInput = bookPart.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          return bookLower.startsWith(bookPart) ||
            normalizedBook.startsWith(normalizedInput) ||
            bookLower.includes(bookPart);
        });

        setBibleSuggestions(matches.slice(0, 6)); // Limit to 6 suggestions
        setShowBibleSuggestions(matches.length > 0);
      } else {
        setBibleSuggestions([]);
        setShowBibleSuggestions(false);
      }
    } else {
      setBibleSuggestions([]);
      setShowBibleSuggestions(false);
    }
  }, [inputText, inputType]);

  // Handle selecting a Bible book suggestion
  const handleSelectBibleBook = (book: string) => {
    // If the input has a verse reference, keep it
    const verseMatch = inputText.match(/\s+(\d+[:\-,\d\s]*)/);
    setInputText(book + (verseMatch ? verseMatch[0] : ' '));
    setShowBibleSuggestions(false);
  };

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
        if (ev.target?.result) {
          const img = new Image();
          img.src = ev.target.result as string;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1280;
            const MAX_HEIGHT = 720;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);

            // Compress to JPEG with 0.5 quality for better sync
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5);

            updatePendingTheme({ ...currentTheme, background: `url(${compressedBase64}) center/cover no-repeat` });
            e.target.value = ''; // Reset
          };
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSlideImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Compress/Resize image before saving to avoid database size limits
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          const img = new Image();
          img.src = ev.target.result as string;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1280;
            const MAX_HEIGHT = 720;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);

            // Compress to JPEG with 0.5 quality for better sync
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5);

            const newSlide: Slide = {
              id: Math.random().toString(36).substr(2, 9),
              type: 'image',
              content: '',
              mediaUrl: compressedBase64,
              label: 'IMAGEN'
            };
            onAddSlide(newSlide);
            e.target.value = ''; // Reset
          };
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

      {/* Hidden File Inputs moved to top level to be accessible from any tab */}
      <input type="file" accept="image/*" ref={slideFileInputRef} className="hidden" onChange={handleSlideImageUpload} />
      <input type="file" accept="image/*" ref={bgFileInputRef} className="hidden" onChange={handleBgUpload} />

      <div className="flex-1 overflow-y-auto no-scrollbar bg-gradient-to-b from-gray-800 to-gray-900">
        {activeTab === 'content' && (
          <div className="p-5 space-y-6">

            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/30">
              <label className="text-[10px] uppercase text-gray-500 font-bold tracking-widest mb-3 block">📺 Seleccionar Origen</label>
              <div className="grid grid-cols-4 gap-3">
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
                <button
                  onClick={() => {
                    setInputType('manual');
                    setSongResults([]);
                    setInputText('');
                    onDeselect?.();
                  }}
                  className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 bg-gray-900/50 border-gray-700/50 hover:border-emerald-500/50 group/nv`}
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-700 group-hover/nv:bg-emerald-600 transition-colors">
                    <Plus size={18} className="text-white" />
                  </div>
                  <span className="text-[10px] font-bold uppercase text-gray-400 group-hover/nv:text-emerald-300">NV</span>
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
                  <button onClick={() => setDensity('strophe')} className={`p-2 rounded-lg border text-[10px] font-bold transition-all flex flex-col items-center gap-1 ${density === 'strophe' ? 'bg-indigo-600 border-indigo-400' : 'bg-gray-800 border-gray-700 hover:border-gray-500'}`}><LayoutGrid size={14} /> Estrofa</button>
                  <button onClick={() => setDensity('reading')} className={`p-2 rounded-lg border text-[10px] font-bold transition-all flex flex-col items-center gap-1 ${density === 'reading' ? 'bg-indigo-600 border-indigo-400' : 'bg-gray-800 border-gray-700 hover:border-gray-500'}`}><FileText size={14} /> Lectura</button>
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
                      src={inputText.includes('v=') || inputText.includes('youtu.be') ? `https://www.youtube-nocookie.com/embed/${inputText.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/user\/\S+|\/ytscreeningroom\?v=|\/sanday\?v=))([\w-]{11})/)?.[1] || ''}?autoplay=0&mute=1&origin=${window.location.protocol}//${window.location.host}` : `https://www.youtube-nocookie.com/embed?listType=search&list=${inputText || 'Musica Cristiana'}&origin=${window.location.protocol}//${window.location.host}`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
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
                  <div className="relative group/manual flex flex-col gap-2">
                    {/* Rich Text Editor for per-word styling */}
                    <RichTextEditor
                      segments={activeSlide?.segments || textToSegments(activeSlide?.content || '')}
                      onUpdateSegments={(segments) => {
                        if (activeSlide) {
                          // Update segments directly
                          onUpdateSlideSegments?.(activeSlide.id, segments);
                          // Also sync with inputText for the fallback content
                          setInputText(segmentsToText(segments));
                        }
                      }}
                      onTextChange={setInputText}
                      globalColor={currentTheme.textColor}
                      globalFontSize={currentTheme.fontSize}
                      globalFontFamily={currentTheme.fontFamily}
                    />

                    {/* Quick Image Upload Button */}
                    <div className="flex gap-2 items-center">
                      <button
                        onClick={() => slideFileInputRef.current?.click()}
                        className="p-2 rounded-lg bg-gray-700/80 hover:bg-pink-600 text-white transition-all border border-gray-600/50 shadow-lg group/imgbtn flex items-center gap-2"
                        title="Insertar diapositiva de imagen"
                      >
                        <ImageIcon size={16} className="group-hover/imgbtn:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold">IMAGEN</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={inputType === 'scripture' ? "Ej: Juan 3:16" : inputType === 'youtube' ? "Pega link o busca..." : "Ej: Hillsong, Way Maker..."}
                      className="w-full bg-gray-800 rounded-xl px-4 py-3 text-white border border-gray-600/50 focus:border-indigo-500/50 outline-none transition-colors"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (showBibleSuggestions && bibleSuggestions.length > 0) {
                            handleSelectBibleBook(bibleSuggestions[0]);
                          } else {
                            handleSearch();
                          }
                        } else if (e.key === 'Escape') {
                          setShowBibleSuggestions(false);
                        }
                      }}
                      onFocus={() => {
                        if (inputType === 'scripture' && bibleSuggestions.length > 0) {
                          setShowBibleSuggestions(true);
                        }
                      }}
                    />

                    {/* Bible Book Suggestions Dropdown */}
                    {showBibleSuggestions && bibleSuggestions.length > 0 && inputType === 'scripture' && (
                      <div className="absolute z-50 w-full mt-1 bg-gray-900 border border-indigo-500/50 rounded-xl shadow-2xl overflow-hidden animate-fade-in">
                        <div className="px-3 py-2 bg-indigo-900/30 border-b border-gray-700">
                          <span className="text-[9px] text-indigo-300 font-bold uppercase tracking-wider">📖 Libros sugeridos</span>
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {bibleSuggestions.map((book, idx) => (
                            <button
                              key={book}
                              type="button"
                              onClick={() => handleSelectBibleBook(book)}
                              className={`w-full text-left px-4 py-2.5 hover:bg-indigo-600/30 transition-colors flex items-center gap-3 ${idx === 0 ? 'bg-indigo-600/20' : ''}`}
                            >
                              <Book size={14} className="text-amber-400" />
                              <span className="text-white font-medium">{book}</span>
                              {idx === 0 && (
                                <span className="ml-auto text-[9px] text-gray-500 bg-gray-700 px-1.5 py-0.5 rounded">Enter</span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {songResults.length === 0 ? (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        if (activeSlide && inputType === 'manual' && inputText !== activeSlide.content) {
                          onUpdateSlideContent?.(activeSlide.id, inputText);
                          // We MUST also update segments from plain text, otherwise the rich view won't update
                          onUpdateSlideSegments?.(activeSlide.id, textToSegments(inputText));
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



            {/* BACKGROUND AUDIO PLAYER CONTROLS */}
            {backgroundAudioItem && (
              <div className="bg-gray-900 border border-indigo-500/30 rounded-xl p-4 shadow-lg animate-fade-in mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-600/20">
                    <Music size={16} className={isAudioPlaying ? 'animate-pulse' : ''} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest block">Musica de fondo</span>
                    <p className="text-xs text-white font-bold truncate">{backgroundAudioItem.title}</p>
                  </div>
                  <button
                    onClick={() => onSetBackgroundAudio?.('', '')}
                    className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                    title="Detener musica"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => onSeekAudio?.(-15)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-all active:scale-90"
                    title="Retroceder 15s"
                  >
                    <SkipBack size={20} />
                  </button>

                  <button
                    onClick={() => onToggleAudioPlayback?.()}
                    className={`w-12 h-12 flex items-center justify-center rounded-full transition-all active:scale-95 shadow-lg ${isAudioPlaying ? 'bg-indigo-600 text-white shadow-indigo-600/30' : 'bg-white text-indigo-900 shadow-white/10'}`}
                  >
                    {isAudioPlaying ? <PauseCircle size={28} /> : <PlayCircle size={28} />}
                  </button>

                  <button
                    onClick={() => onSeekAudio?.(15)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-all active:scale-90"
                    title="Adelantar 15s"
                  >
                    <SkipForward size={20} />
                  </button>
                </div>
              </div>
            )}

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

                {/* HEADER ACTIONS: Undo & Restore Original & History */}
                <div className="flex gap-2 mb-5">
                  <button
                    onClick={() => setShowHistoryPanel(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-indigo-500/30 text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 text-[10px] font-bold uppercase tracking-wider transition-all"
                  >
                    <Clock size={12} /> Historial
                  </button>
                  <button
                    onClick={onUndo}
                    disabled={!canUndo}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-all rounded-xl ${canUndo ? 'bg-gray-800/80 border border-gray-600/50 text-white hover:bg-gray-700' : 'bg-gray-900/50 border border-gray-800 text-gray-600 cursor-not-allowed'}`}
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

                {/* THEME PRESETS GALLERY */}
                <div className="mb-5">
                  <button
                    onClick={() => toggleSection('presets')}
                    className="w-full flex items-center justify-between py-3 px-4 bg-gradient-to-r from-purple-900/30 to-indigo-900/30 rounded-xl border border-purple-500/30 text-white font-bold text-xs uppercase tracking-wider hover:from-purple-900/50 hover:to-indigo-900/50 transition-all"
                  >
                    <span className="flex items-center gap-2">
                      <Palette size={14} className="text-purple-400" />
                      Temas Predefinidos
                    </span>
                    <ChevronDown size={16} className={`transition-transform ${expandedSections['presets'] ? 'rotate-180' : ''}`} />
                  </button>

                  {expandedSections['presets'] && (
                    <div className="mt-3 grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1">
                      {THEME_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => updatePendingTheme({ ...currentTheme, ...preset, id: currentTheme.id })}
                          className={`relative p-3 rounded-lg text-left transition-all border-2 hover:scale-[1.02] ${currentTheme.background === preset.background
                            ? 'border-indigo-500 ring-2 ring-indigo-500/30'
                            : 'border-gray-700 hover:border-gray-500'
                            }`}
                          style={{ background: preset.background }}
                        >
                          <div
                            className="text-[10px] font-bold truncate pr-4"
                            style={{
                              color: preset.textColor,
                              textShadow: preset.shadow ? '1px 1px 2px rgba(0,0,0,0.5)' : 'none'
                            }}
                          >
                            {preset.name}
                          </div>
                          {currentTheme.background === preset.background && (
                            <div className="absolute top-1 right-1 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center">
                              <Check size={10} className="text-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* CUSTOM THEMES (User Created) */}
                <div className="mb-5">
                  <button
                    onClick={() => toggleSection('customThemes')}
                    className="w-full flex items-center justify-between py-3 px-4 bg-gradient-to-r from-amber-900/30 to-orange-900/30 rounded-xl border border-amber-500/30 text-white font-bold text-xs uppercase tracking-wider hover:from-amber-900/50 hover:to-orange-900/50 transition-all"
                  >
                    <span className="flex items-center gap-2">
                      <PenTool size={14} className="text-amber-400" />
                      Mis Temas ({customThemes.length})
                    </span>
                    <ChevronDown size={16} className={`transition-transform ${expandedSections['customThemes'] ? 'rotate-180' : ''}`} />
                  </button>

                  {expandedSections['customThemes'] && (
                    <div className="mt-3 space-y-2">
                      {/* Save Current Theme Button */}
                      <button
                        onClick={() => setShowSaveThemeModal(true)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-lg text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg"
                      >
                        <Plus size={14} /> Guardar Tema Actual
                      </button>

                      {/* Custom Themes List */}
                      {customThemes.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                          {customThemes.map((theme) => (
                            <div
                              key={theme.id}
                              className="relative group"
                            >
                              <button
                                onClick={() => updatePendingTheme({ ...currentTheme, ...theme, id: currentTheme.id })}
                                className={`w-full p-3 rounded-lg text-left transition-all border-2 hover:scale-[1.02] ${currentTheme.background === theme.background
                                  ? 'border-amber-500 ring-2 ring-amber-500/30'
                                  : 'border-gray-700 hover:border-gray-500'
                                  }`}
                                style={{ background: theme.background }}
                              >
                                <div
                                  className="text-[10px] font-bold truncate pr-6"
                                  style={{
                                    color: theme.textColor,
                                    textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                                  }}
                                >
                                  {theme.name}
                                </div>
                              </button>
                              {/* Delete Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteCustomTheme(theme.id);
                                }}
                                className="absolute top-1 right-1 w-5 h-5 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                                title="Eliminar tema"
                              >
                                <X size={10} className="text-white" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center text-gray-500 text-xs py-4 bg-gray-900/50 rounded-lg">
                          No tienes temas guardados
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* SAVE THEME MODAL */}
                {showSaveThemeModal && (
                  <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6 w-full max-w-md shadow-2xl">
                      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <PenTool size={20} className="text-amber-400" />
                        Guardar Tema Personalizado
                      </h3>

                      {/* Preview */}
                      <div
                        className="h-24 rounded-lg mb-4 flex items-center justify-center border border-gray-600"
                        style={{ background: currentTheme.background }}
                      >
                        <span
                          className="text-sm font-bold"
                          style={{
                            color: currentTheme.textColor,
                            fontFamily: currentTheme.fontFamily,
                            textShadow: currentTheme.shadow ? '2px 2px 4px rgba(0,0,0,0.5)' : 'none'
                          }}
                        >
                          Vista Previa del Tema
                        </span>
                      </div>

                      <input
                        type="text"
                        value={newThemeName}
                        onChange={(e) => setNewThemeName(e.target.value)}
                        placeholder="Nombre del tema (ej: Mi Tema Adoración)"
                        className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-600 outline-none focus:border-amber-500 mb-4"
                        autoFocus
                      />

                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowSaveThemeModal(false)}
                          className="flex-1 py-2.5 rounded-lg border border-gray-600 text-gray-400 hover:text-white hover:border-gray-500 transition-all font-bold text-sm"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={saveCurrentAsCustomTheme}
                          disabled={!newThemeName.trim()}
                          className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          Guardar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

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

                    {/* SECTION: Shadows & Glow */}
                    <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-gray-700/50 rounded-xl overflow-hidden shadow-xl transition-all duration-300">
                      <button onClick={() => toggleSection('shadows')} className="w-full text-[10px] uppercase text-indigo-400 font-bold tracking-widest p-4 flex items-center justify-between hover:bg-gray-700/30 transition-colors">
                        <div className="flex items-center gap-2"><BoxSelect size={14} /> Sombras & Brillo</div>
                        <div className="flex items-center gap-3">
                          <div onClick={(e) => { e.stopPropagation(); updatePendingTheme({ ...currentTheme, shadow: !currentTheme.shadow }); }} className={`w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer ${currentTheme.shadow ? 'bg-indigo-600' : 'bg-gray-700'}`}>
                            <div className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${currentTheme.shadow ? 'translate-x-4' : 'translate-x-0'}`} />
                          </div>
                          <ChevronDown size={14} className={`transition-transform duration-300 ${expandedSections.shadows ? 'rotate-180' : ''}`} />
                        </div>
                      </button>
                      {expandedSections.shadows && (
                        <div className="p-4 pt-0 space-y-4 animate-fade-in border-t border-gray-700/30">
                          <div className={`mt-4 space-y-4 transition-opacity duration-300 ${!currentTheme.shadow ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                            {/* Shadow Color */}
                            <div className="flex items-center justify-between bg-gray-900/40 p-2 rounded-lg border border-gray-700/30">
                              <span className="text-[9px] text-gray-400 font-bold uppercase">Color Sombra</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-gray-500 uppercase">{currentTheme.shadowColor}</span>
                                <input
                                  type="color"
                                  value={currentTheme.shadowColor || '#000000'}
                                  onChange={(e) => updatePendingTheme({ ...currentTheme, shadowColor: e.target.value })}
                                  className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                                />
                              </div>
                            </div>

                            {/* Blur & Opacity */}
                            <div className="bg-gray-900/40 p-3 rounded-lg border border-gray-700/30 space-y-3">
                              <div>
                                <div className="flex justify-between text-[9px] text-gray-400 mb-1 font-bold uppercase"><span>Difuminado (Blur)</span><span>{currentTheme.shadowBlur}px</span></div>
                                <input type="range" min="0" max="50" value={currentTheme.shadowBlur || 0} onChange={(e) => updatePendingTheme({ ...currentTheme, shadowBlur: parseInt(e.target.value) })} className="w-full h-1.5 bg-gray-700 rounded-full accent-indigo-500 cursor-pointer" />
                              </div>
                            </div>

                            {/* Offset X & Y */}
                            <div className="bg-gray-900/40 p-3 rounded-lg border border-gray-700/30 space-y-3">
                              <div>
                                <div className="flex justify-between text-[9px] text-gray-400 mb-1 font-bold uppercase"><span>Desplazamiento X</span><span>{currentTheme.shadowOffsetX}px</span></div>
                                <input type="range" min="-50" max="50" value={currentTheme.shadowOffsetX || 0} onChange={(e) => updatePendingTheme({ ...currentTheme, shadowOffsetX: parseInt(e.target.value) })} className="w-full h-1.5 bg-gray-700 rounded-full accent-indigo-500 cursor-pointer" />
                              </div>
                              <div>
                                <div className="flex justify-between text-[9px] text-gray-400 mb-1 font-bold uppercase"><span>Desplazamiento Y</span><span>{currentTheme.shadowOffsetY}px</span></div>
                                <input type="range" min="-50" max="50" value={currentTheme.shadowOffsetY || 0} onChange={(e) => updatePendingTheme({ ...currentTheme, shadowOffsetY: parseInt(e.target.value) })} className="w-full h-1.5 bg-gray-700 rounded-full accent-indigo-500 cursor-pointer" />
                              </div>
                            </div>
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
                          <div className="bg-gray-900/40 p-3 rounded-lg border border-gray-700/30">
                            <div className="flex justify-between text-[10px] text-gray-300 mb-2 font-bold uppercase">
                              <div className="flex items-center gap-2 text-pink-400"><Plus size={10} /> ZOOM CONTENIDO</div>
                              <span className="text-pink-400">{Math.round((currentTheme.imageContentScale || 1.0) * 100)}%</span>
                            </div>
                            <input
                              type="range" min="0.5" max="3" step="0.05"
                              value={currentTheme.imageContentScale || 1.0}
                              onChange={(e) => updatePendingTheme({ ...currentTheme, imageContentScale: parseFloat(e.target.value) })}
                              className="w-full h-1.5 bg-gray-700 rounded-full accent-pink-500 cursor-pointer mb-2"
                            />
                            <div className="flex justify-between text-[8px] text-gray-500 uppercase font-black">
                              <span>Zoom Out</span>
                              <span>Zoom In</span>
                            </div>
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
                            <button
                              onClick={() => bgFileInputRef.current?.click()}
                              className="flex items-center gap-2 p-3 rounded-xl bg-gray-800 border border-gray-700 hover:border-indigo-500 transition-all group"
                            >
                              <Upload size={16} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                              <span className="text-xs font-bold">Subir Fondo Personalizado</span>
                            </button>
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

                        {/* ANIMATION CONTROLS */}
                        <div className="bg-gray-900/40 p-3 rounded-lg border border-gray-700/30 space-y-3 mt-4">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] text-gray-400 font-bold uppercase">Animación</span>
                            <select
                              value={currentTheme.bgAnimation?.type || 'none'}
                              onChange={(e) => updatePendingTheme({
                                ...currentTheme,
                                bgAnimation: {
                                  type: e.target.value as any,
                                  speed: currentTheme.bgAnimation?.speed || 1,
                                  color: currentTheme.bgAnimation?.color || '#ffffff',
                                  intensity: currentTheme.bgAnimation?.intensity || 50
                                }
                              })}
                              className="bg-gray-800 border-none text-[10px] text-white rounded px-2 py-1 outline-none"
                            >
                              <option value="none">Ninguna</option>
                              <option value="particles">Partículas</option>
                              <option value="stars">Estrellas</option>
                              <option value="waves">Ondas</option>
                              <option value="gradient-pulse">Pulso Glow</option>
                            </select>
                          </div>

                          {currentTheme.bgAnimation && currentTheme.bgAnimation.type !== 'none' && (
                            <div className="space-y-2 pt-2 border-t border-gray-700/30">
                              {/* Speed */}
                              <div className="flex items-center gap-2">
                                <span className="text-[8px] text-gray-500 font-bold w-12 uppercase">Velocidad</span>
                                <input
                                  type="range" min="0.1" max="5" step="0.1"
                                  value={currentTheme.bgAnimation.speed}
                                  onChange={(e) => updatePendingTheme({ ...currentTheme, bgAnimation: { ...currentTheme.bgAnimation!, speed: parseFloat(e.target.value) } })}
                                  className="flex-1 h-1 bg-gray-700 rounded accent-indigo-500"
                                />
                              </div>
                              {/* Intensity */}
                              <div className="flex items-center gap-2">
                                <span className="text-[8px] text-gray-500 font-bold w-12 uppercase">Cantidad</span>
                                <input
                                  type="range" min="10" max="200" step="10"
                                  value={currentTheme.bgAnimation.intensity}
                                  onChange={(e) => updatePendingTheme({ ...currentTheme, bgAnimation: { ...currentTheme.bgAnimation!, intensity: parseInt(e.target.value) } })}
                                  className="flex-1 h-1 bg-gray-700 rounded accent-indigo-500"
                                />
                              </div>
                              {/* Color */}
                              <div className="flex items-center justify-between">
                                <span className="text-[8px] text-gray-500 font-bold uppercase">Color</span>
                                <input
                                  type="color"
                                  value={currentTheme.bgAnimation.color}
                                  onChange={(e) => updatePendingTheme({ ...currentTheme, bgAnimation: { ...currentTheme.bgAnimation!, color: e.target.value } })}
                                  className="w-4 h-4 rounded border border-gray-600 cursor-pointer"
                                />
                              </div>
                            </div>
                          )}
                        </div>

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
      {/* History Panel */}
      <HistoryPanel
        isOpen={showHistoryPanel}
        onClose={() => setShowHistoryPanel(false)}
        history={history || []}
        onRestore={(entry) => {
          if (onRestore) onRestore(entry);
          setShowHistoryPanel(false);
        }}
      />
    </div>
  );
};

export default ControlPanel;
