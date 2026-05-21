import React, { useState, useEffect, useRef } from 'react';
import { fetchSongLyrics, fetchBiblePassage, processManualText, searchSongs, DensityMode, SongSearchResult, searchYouTube, YouTubeSearchResult } from '../services/geminiService';
import { compressImage } from '../services/imageService';
import { PresentationItem, Theme, AnimationType, Slide, TextSegment, HistoryEntry, BackgroundAnimationConfig, BackgroundAnimationType } from '../types';
import { THEME_PRESETS, TEXT_STYLE_EDITIONS } from '../constants';
import { Music, BookOpen, Monitor, Loader2, Plus, Edit3, AlignJustify, Grid, FileText, AlignCenter, Search, User, X, Sliders, PlayCircle, Image as ImageIcon, Type, Bold, Italic, PenTool, CaseUpper, Upload, ChevronDown, Underline, Strikethrough, AlignLeft, AlignRight, Highlighter, Palette, Ratio, BoxSelect, PaintBucket, Layers, RotateCcw, Eraser, Book, LayoutGrid, Square, Check, PauseCircle, SkipForward, SkipBack, Clock, Mic, Maximize2, Eye, EyeOff, ExternalLink, XCircle, Minus, ChevronLeft, ChevronRight, Trash2, Edit2, LogIn, User as UserIcon, LogOut, RefreshCw, Star, AlertCircle, ArrowLeft, Copy } from 'lucide-react';
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
  activeSlideType?: 'text' | 'image' | 'youtube' | 'video';
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
  backgroundAudioItem?: { id?: string; videoId: string; title: string } | null;
  bgAudioPlaylist?: { id: string; videoId: string; title: string }[];
  onToggleAudioPlayback?: () => void;
  onSeekAudio?: (seconds: number) => void;
  onNextAudio?: () => void;
  onPrevAudio?: () => void;
  onRemoveAudio?: (id: string) => void;
  onSelectAudio?: (index: number) => void;
  history: HistoryEntry[];
  onRestore: (entry: HistoryEntry) => void;
  isKaraokeActive?: boolean;
  onToggleKaraoke?: () => void;
  // Custom Themes (cloud synced)
  customThemes?: Theme[];
  onUpdateCustomThemes?: (themes: Theme[]) => void;
  onUploadImages?: (files: FileList | null, itemId?: string) => Promise<void>;
}

// Updated Bible Versions as requested
const BIBLE_VERSIONS = [
  'Reina Valera 1960',
  'Nueva Version Internacional',
  'Nueva Traduccion Viviente',
  'La Biblia de las Americas',
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
  // Basicas
  { name: 'Ninguna', value: 'none' },
  { name: 'Desvanecer (Fade)', value: 'fade' },

  // Fade + Direccion
  { name: 'Fade + Subir', value: 'fade-slide-up' },
  { name: 'Fade + Bajar', value: 'fade-slide-down' },
  { name: 'Fade + Izquierda', value: 'fade-slide-left' },
  { name: 'Fade + Derecha', value: 'fade-slide-right' },

  // Zoom
  { name: 'Zoom Entrada', value: 'zoom-in' },
  { name: 'Zoom Salida', value: 'zoom-out' },
  { name: 'Zoom Elastico', value: 'zoom-elastic' },

  // Blur & Focus
  { name: 'Desenfoque (Blur)', value: 'blur-in' },
  { name: 'Focus Expand', value: 'focus-in-expand' },

  // Especiales
  { name: 'Maquina Escribir', value: 'typewriter' },
  { name: 'Rotacion', value: 'rotate-in' },
  { name: 'Giro 3D Horizontal', value: 'flip-in-x' },
  { name: 'Giro 3D Vertical', value: 'flip-in-y' },

  // Bounce & Elastic
  { name: 'Rebote (Bounce)', value: 'bounce-in' },
  { name: 'Rebote desde Arriba', value: 'bounce-in-top' },
  { name: 'Elastico Slide', value: 'elastic-slide' },

  // Dramaticas
  { name: 'Swing (Balanceo)', value: 'swing-in' },
  { name: 'Roll In (Rodar)', value: 'roll-in' },
  { name: 'Slit Vertical', value: 'slit-in-vertical' },
  { name: 'Puff In (Explosion)', value: 'puff-in' },
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

const BG_ANIMATION_PRESETS: { name: string; value: BackgroundAnimationType }[] = [
  { name: 'Ninguna', value: 'none' },
  { name: 'Particulas suaves', value: 'particles' },
  { name: 'Estrellas', value: 'stars' },
  { name: 'Ondas', value: 'waves' },
  { name: 'Pulso glow', value: 'gradient-pulse' },
  { name: 'Luciernagas', value: 'fireflies' },
  { name: 'Aurora', value: 'aurora' },
  { name: 'Rayos de luz', value: 'rays' },
  { name: 'Burbujas', value: 'bubbles' },
  { name: 'Confeti', value: 'confetti' },
  { name: 'Lluvia', value: 'rain' },
  { name: 'Nieve', value: 'snow' },
  { name: 'Espiral', value: 'spiral' },
  { name: 'Cruces de luz', value: 'cross-light' },
  { name: 'Personalizada', value: 'custom' },
];

const DEFAULT_BG_ANIMATION: BackgroundAnimationConfig = {
  type: 'particles',
  speed: 1,
  color: '#ffffff',
  color2: '#6366f1',
  intensity: 50,
  size: 10,
  direction: 'random',
  shape: 'circle'
};

// Complete list of Bible books in Spanish
const BIBLE_BOOKS = [
  // Antiguo Testamento
  'Genesis', 'Exodo', 'Levitico', 'Numeros', 'Deuteronomio',
  'Josue', 'Jueces', 'Rut', '1 Samuel', '2 Samuel',
  '1 Reyes', '2 Reyes', '1 Cronicas', '2 Cronicas', 'Esdras',
  'Nehemias', 'Ester', 'Job', 'Salmos', 'Proverbios',
  'Eclesiastes', 'Cantares', 'Isaias', 'Jeremias', 'Lamentaciones',
  'Ezequiel', 'Daniel', 'Oseas', 'Joel', 'Amos',
  'Abdias', 'Jonas', 'Miqueas', 'Nahum', 'Habacuc',
  'Sofonias', 'Hageo', 'Zacarias', 'Malaquias',
  // Nuevo Testamento
  'Mateo', 'Marcos', 'Lucas', 'Juan', 'Hechos',
  'Romanos', '1 Corintios', '2 Corintios', 'Galatas', 'Efesios',
  'Filipenses', 'Colosenses', '1 Tesalonicenses', '2 Tesalonicenses',
  '1 Timoteo', '2 Timoteo', 'Tito', 'Filemon', 'Hebreos',
  'Santiago', '1 Pedro', '2 Pedro', '1 Juan', '2 Juan', '3 Juan',
  'Judas', 'Apocalipsis'
];
const getYouTubeVideoId = (value: string): string => {
  const text = value.trim();
  if (!text) return '';
  return text.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/shorts\/|\/watch\?v=|\/watch\?.*&v=))([\w-]{11})/)?.[1]
    || (text.length === 11 && /^[\w-]+$/.test(text) ? text : '');
};

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
  onNextAudio,
  onPrevAudio,
  onRemoveAudio,
  onSelectAudio,
  bgAudioPlaylist = [],
  history,
  onRestore,
  isKaraokeActive = false,
  onToggleKaraoke,
  customThemes: propCustomThemes,
  onUpdateCustomThemes,
  onUploadImages,
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'theme' | 'logo'>('content');
  const [bgMode, setBgMode] = useState<'image' | 'solid' | 'gradient'>('image');
  const [loading, setLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [inputType, setInputType] = useState<'youtube' | 'scripture' | 'manual'>('youtube');
  const [bibleVersion, setBibleVersion] = useState('Reina Valera 1960');
  const [density, setDensity] = useState<DensityMode>('classic');
  const [songResults, setSongResults] = useState<SongSearchResult[]>([]);
  const [youtubeResults, setYoutubeResults] = useState<YouTubeSearchResult[]>([]);
  const [isSearchingSongs, setIsSearchingSongs] = useState(false);
  const [isSearchingYoutube, setIsSearchingYoutube] = useState(false);
  const [hasSearchedYoutube, setHasSearchedYoutube] = useState(false);
  const [youtubeSearchError, setYoutubeSearchError] = useState<string | null>(null);

  const [isYoutubeFullBrowserOpen, setIsYoutubeFullBrowserOpen] = useState(false);
  const [youtubeBrowserMode, setYoutubeBrowserMode] = useState<'cards' | 'iframe'>('cards');
  const [youtubeSearchQuery, setYoutubeSearchQuery] = useState<string>('');
  const [activePortalVideoId, setActivePortalVideoId] = useState<string | null>(null);
  const [previewVideoId, setPreviewVideoId] = useState<string | null>(null);

  // Rename-before-import system
  const [pendingVideoImport, setPendingVideoImport] = useState<{
    videoId: string;
    action: 'project' | 'background';
    defaultName: string;
    destination?: 'current' | 'new';
  } | null>(null);
  const [importName, setImportName] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  const confirmVideoImport = (destinationOverride?: 'current' | 'new') => {
    if (!pendingVideoImport) return;
    const { videoId, action } = pendingVideoImport;
    const finalName = importName.trim() || pendingVideoImport.defaultName;

    if (action === 'project') {
      const destination = destinationOverride ?? pendingVideoImport.destination;
      const shouldAddToCurrent = destination !== 'new' && hasActiveItem;
      const newSlide: Slide = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'youtube',
        content: `https://www.youtube.com/watch?v=${videoId}`,
        videoId: videoId,
        label: finalName
      };

      if (shouldAddToCurrent) {
        onAddSlide(newSlide);
        alert("Video agregado exitosamente a la diapositiva actual!");
      } else {
        onAddItem({
          id: Math.random().toString(36).substr(2, 9),
          title: finalName,
          type: 'custom',
          slides: [newSlide],
          theme: currentTheme
        });
        alert("Video agregado exitosamente!");
      }
    } else {
      onSetBackgroundAudio?.(videoId, finalName);
      alert("Agregado exitosamente a la musica de fondo!");
    }

    setInputText('');
    setPendingVideoImport(null);
    setImportName('');
  };

  const cancelVideoImport = () => {
    setPendingVideoImport(null);
    setImportName('');
  };

  const [editorSubTab, setEditorSubTab] = useState<'text' | 'image' | 'youtube'>(
    activeSlideType === 'image' ? 'image' : (activeSlideType === 'youtube' ? 'youtube' : 'text')
  );

  const performYoutubeSearch = async (query: string) => {
    if (!query.trim()) return;
    setIsSearchingYoutube(true);
    setHasSearchedYoutube(true);
    setYoutubeSearchError(null);
    try {
      const results = await searchYouTube(query);
      setYoutubeResults(results);
      if (results.length === 0) {
        setYoutubeSearchError("No se encontraron videos para tu busqueda.");
      }
    } catch (err) {
      console.error("YouTube search error", err);
      setYoutubeSearchError(err instanceof Error ? err.message : 'Error al buscar en YouTube.');
    } finally {
      setIsSearchingYoutube(false);
    }
  };

  // Toast System for premium alerts
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Shadow global browser alert with styled premium toast notification
  const alert = (message: string) => {
    let toastType: 'success' | 'error' | 'info' = 'info';
    const lower = message.toLowerCase();
    if (lower.includes('error') || lower.includes('por favor') || lower.includes('fallo') || lower.includes('falló') || lower.includes('permiso')) {
      toastType = 'error';
    } else if (lower.includes('exito') || lower.includes('éxito') || lower.includes('exitosamente') || lower.includes('agregado') || lower.includes('copiado')) {
      toastType = 'success';
    }
    triggerToast(message, toastType);
  };

  const copyTextToClipboard = async (text: string): Promise<boolean> => {
    if (!text.trim()) return false;
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand('copy');
        document.body.removeChild(textarea);
        return copied;
      } catch (fallbackError) {
        console.warn("Clipboard copy failed", fallbackError);
        return false;
      }
    }
  };

  const readClipboardText = async (): Promise<string> => {
    try {
      return await navigator.clipboard.readText();
    } catch (error) {
      console.warn("Could not read clipboard", error);
      return '';
    }
  };

  const getSelectedYouTubeVideoId = async (): Promise<string> => {
    if (activePortalVideoId) return activePortalVideoId;
    if (previewVideoId) return previewVideoId;

    const typedId = getYouTubeVideoId(inputText);
    if (typedId) return typedId;

    const searchBoxId = getYouTubeVideoId(youtubeSearchQuery);
    if (searchBoxId) return searchBoxId;

    return getYouTubeVideoId(await readClipboardText());
  };

  const getSelectedYouTubeLink = async (): Promise<string> => {
    const videoId = await getSelectedYouTubeVideoId();
    return videoId ? `https://www.youtube.com/watch?v=${videoId}` : '';
  };

  // Bible book autocomplete suggestions
  const [bibleSuggestions, setBibleSuggestions] = useState<string[]>([]);
  const [showBibleSuggestions, setShowBibleSuggestions] = useState(false);

  // Accordion state for theme sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    typography: true,
    shadows: true,
    transformation: true,
    filters: false,
    background: true,
    logo: false,
    effects: true,
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
  const [saveThemeAsDefault, setSaveThemeAsDefault] = useState(false);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [editingThemeName, setEditingThemeName] = useState('');
  const [editingThemeDefault, setEditingThemeDefault] = useState(false);
  const [addYouTubeToCurrent, setAddYouTubeToCurrent] = useState(false);

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
      name: newThemeName.trim()
    };
    newTheme.isDefault = saveThemeAsDefault;
    setCustomThemes(prev => [
      ...prev.map(theme => saveThemeAsDefault ? { ...theme, isDefault: false } : theme),
      newTheme
    ]);
    setNewThemeName('');
    setSaveThemeAsDefault(false);
    setShowSaveThemeModal(false);
  };

  const deleteCustomTheme = (themeId: string) => {
    setCustomThemes(prev => prev.filter(t => t.id !== themeId));
  };

  const toggleDefaultTheme = (themeId: string) => {
    const selected = customThemes.find(theme => theme.id === themeId);
    const shouldSetDefault = !selected?.isDefault;
    setCustomThemes(prev => prev.map(theme => ({
      ...theme,
      isDefault: shouldSetDefault && theme.id === themeId
    })));
  };

  const openEditTheme = (theme: Theme) => {
    setEditingTheme(theme);
    setEditingThemeName(theme.name);
    setEditingThemeDefault(!!theme.isDefault);
  };

  const closeEditTheme = () => {
    setEditingTheme(null);
    setEditingThemeName('');
    setEditingThemeDefault(false);
  };

  const saveThemeEdits = (replaceWithCurrent: boolean = false) => {
    if (!editingTheme || !editingThemeName.trim()) return;
    const editedTheme: Theme = {
      ...(replaceWithCurrent ? currentTheme : editingTheme),
      id: editingTheme.id,
      name: editingThemeName.trim(),
      isDefault: editingThemeDefault
    };

    setCustomThemes(prev => prev.map(theme => {
      if (theme.id === editingTheme.id) return editedTheme;
      return editingThemeDefault ? { ...theme, isDefault: false } : theme;
    }));
    closeEditTheme();
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

  // Close YouTube full browser on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsYoutubeFullBrowserOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const slideFileInputRef = useRef<HTMLInputElement>(null);
  const presentationFileInputRef = useRef<HTMLInputElement>(null);

  // No secondary preview effect for audio, it stays in the list.

  const handleYoutubeFullSearch = (query: string) => {
    if (!query.trim()) return;
    setIsYoutubeFullBrowserOpen(true);
    setInputText(query);
    setYoutubeSearchQuery(query);
    const directVideoId = getYouTubeVideoId(query);
    if (directVideoId) {
      setYoutubeBrowserMode('iframe');
      setActivePortalVideoId(directVideoId);
      setYoutubeResults([]);
      setYoutubeSearchError(null);
      setHasSearchedYoutube(false);
      return;
    }
    if (youtubeBrowserMode === 'iframe') {
      setYoutubeBrowserMode('cards');
    }
    performYoutubeSearch(query);
  };

  const handleSearch = async () => {
    if (!inputText.trim()) return;
    if (inputType === 'youtube') {
      const videoId = inputText.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/user\/\S+|\/ytscreeningroom\?v=|\/sanday\?v=))([\w-]{11})/)?.[1];
      if (videoId) {
        // Direct link - Open Rename Modal
        setPendingVideoImport({
          videoId: videoId,
          action: 'project',
          defaultName: 'Video de YouTube',
          destination: hasActiveItem ? 'current' : 'new'
        });
        setImportName('');
      } else {
        // Search mode - open integrated search panel
        setYoutubeSearchQuery(inputText);
        performYoutubeSearch(inputText);
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
      reader.onload = async (ev) => {
        if (ev.target?.result) {
          try {
            const compressedBase64 = await compressImage(ev.target.result as string);
            updatePendingTheme({ ...currentTheme, background: `url(${compressedBase64}) center/cover no-repeat` });
            e.target.value = ''; // Reset
          } catch (err) {
            console.error("Background compression failed", err);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      if (!ev.target?.result) return;
      try {
        const compressedBase64 = await compressImage(ev.target.result as string, 1400, 1400, 0.86);
        updatePendingTheme({ ...currentTheme, logoUrl: compressedBase64 });
        e.target.value = '';
      } catch (err) {
        console.error("Logo compression failed", err);
      }
    };
    reader.readAsDataURL(file);
  };

  const updateAnimationType = (animation: BackgroundAnimationConfig | undefined, type: BackgroundAnimationType): BackgroundAnimationConfig => ({
    ...DEFAULT_BG_ANIMATION,
    ...(animation || {}),
    type
  });

  const renderRangeControl = (
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    onChange: (value: number) => void,
    suffix = '',
    accentClass = 'accent-indigo-500'
  ) => (
    <label className="block rounded-2xl border border-white/10 bg-slate-950/45 p-3">
      <span className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-wide text-slate-400">
        <span>{label}</span>
        <span className="text-slate-200">{value}{suffix}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={`w-full h-1.5 cursor-pointer rounded-full bg-slate-700 ${accentClass}`}
      />
    </label>
  );

  const keepLogoSettings = (nextTheme: Theme): Theme => ({
    ...nextTheme,
    logoUrl: currentTheme.logoUrl,
    logoBackground: currentTheme.logoBackground,
    logoSize: currentTheme.logoSize,
    logoOpacity: currentTheme.logoOpacity,
    logoGlow: currentTheme.logoGlow,
    logoBgAnimation: currentTheme.logoBgAnimation
  });

  const renderBackgroundAnimationEditor = (
    animation: BackgroundAnimationConfig | undefined,
    onChange: (animation: BackgroundAnimationConfig) => void,
    accentClass = 'accent-indigo-500'
  ) => {
    const current = { ...DEFAULT_BG_ANIMATION, ...(animation || {}) };
    const activePreset = BG_ANIMATION_PRESETS.find(option => option.value === current.type)?.name || 'Personalizada';

    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">Motor visual</p>
              <p className="mt-1 text-xs font-black text-white">{activePreset}</p>
            </div>
            <button
              onClick={() => onChange({ ...current, type: current.type === 'none' ? 'particles' : 'none' })}
              className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase transition ${current.type !== 'none' ? 'border-emerald-300/40 bg-emerald-400/15 text-emerald-200' : 'border-white/10 bg-white/[0.04] text-slate-400'}`}
            >
              {current.type !== 'none' ? 'Activo' : 'Apagado'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {BG_ANIMATION_PRESETS.map(option => (
              <button
                key={option.value}
                onClick={() => onChange(updateAnimationType(animation, option.value))}
                className={`min-h-[52px] rounded-xl border px-2 py-2 text-[9px] font-black uppercase leading-tight transition ${current.type === option.value
                  ? 'border-cyan-300/70 bg-cyan-400/18 text-cyan-100 shadow-lg shadow-cyan-950/20'
                  : 'border-white/10 bg-white/[0.045] text-slate-400 hover:border-cyan-300/35 hover:text-white'}`}
              >
                {option.name}
              </button>
            ))}
          </div>
        </div>

        {current.type !== 'none' && (
          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <div className="grid grid-cols-2 gap-3">
              {renderRangeControl('Velocidad', Number(current.speed || 1), 0.1, 5, 0.1, (value) => onChange({ ...current, speed: value }), 'x', accentClass)}
              {renderRangeControl('Cantidad', Number(current.intensity || 50), 10, 220, 5, (value) => onChange({ ...current, intensity: value }), '', accentClass)}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="rounded-2xl border border-white/10 bg-slate-950/45 p-3">
                <span className="mb-2 block text-[10px] font-black uppercase text-slate-400">Color principal</span>
                <input type="color" value={current.color} onChange={(e) => onChange({ ...current, color: e.target.value })} className="h-10 w-full rounded-xl border border-white/10 bg-slate-900" />
              </label>
              <label className="rounded-2xl border border-white/10 bg-slate-950/45 p-3">
                <span className="mb-2 block text-[10px] font-black uppercase text-slate-400">Color secundario</span>
                <input type="color" value={current.color2} onChange={(e) => onChange({ ...current, color2: e.target.value })} className="h-10 w-full rounded-xl border border-white/10 bg-slate-900" />
              </label>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {renderRangeControl('Tamano', Number(current.size || 10), 2, 40, 1, (value) => onChange({ ...current, size: value }), 'px', accentClass)}
              <label className="block rounded-2xl border border-white/10 bg-slate-950/45 p-3">
                <span className="mb-2 block text-[10px] font-black uppercase text-slate-400">Direccion</span>
                <select value={current.direction} onChange={(e) => onChange({ ...current, direction: e.target.value as any })} className="h-9 w-full rounded-xl border border-white/10 bg-slate-900 px-2 text-[10px] font-bold text-white outline-none">
                  <option value="random">Libre</option>
                  <option value="up">Sube</option>
                  <option value="down">Baja</option>
                  <option value="left">Izquierda</option>
                  <option value="right">Derecha</option>
                  <option value="center">Centro</option>
                </select>
              </label>
              <label className="block rounded-2xl border border-white/10 bg-slate-950/45 p-3">
                <span className="mb-2 block text-[10px] font-black uppercase text-slate-400">Forma</span>
                <select value={current.shape} onChange={(e) => onChange({ ...current, shape: e.target.value as any })} className="h-9 w-full rounded-xl border border-white/10 bg-slate-900 px-2 text-[10px] font-bold text-white outline-none">
                  <option value="circle">Circulo</option>
                  <option value="square">Cuadro</option>
                  <option value="diamond">Diamante</option>
                  <option value="line">Linea</option>
                  <option value="cross">Cruz</option>
                </select>
              </label>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Suave', speed: 0.6, intensity: 35, size: 8 },
                { label: 'Vivo', speed: 1.4, intensity: 80, size: 12 },
                { label: 'Lleno', speed: 2.2, intensity: 140, size: 16 }
              ].map(preset => (
                <button
                  key={preset.label}
                  onClick={() => onChange({ ...current, speed: preset.speed, intensity: preset.intensity, size: preset.size })}
                  className="rounded-xl border border-white/10 bg-slate-950/55 px-3 py-2 text-[10px] font-black uppercase text-slate-300 transition hover:border-cyan-300/40 hover:text-white"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleSlideImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Compress/Resize image before saving to avoid database size limits
      const reader = new FileReader();
      reader.onload = async (ev) => {
        if (ev.target?.result) {
          try {
            const compressedBase64 = await compressImage(ev.target.result as string);
            const newSlide: Slide = {
              id: Math.random().toString(36).substr(2, 9),
              type: 'image',
              content: '',
              mediaUrl: compressedBase64,
              label: 'IMAGEN'
            };
            onAddSlide(newSlide);
            e.target.value = ''; // Reset
          } catch (err) {
            console.error("Slide image compression failed", err);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePresentationUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onUploadImages) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    try {
      await onUploadImages(files);
    } finally {
      e.target.value = '';
      setLoading(false);
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

  const renderLogoDesigner = () => (
    <div className="p-5 pb-24 space-y-5 animate-fade-in">
      {hasPendingChanges && (
        <div className="sticky top-0 z-20 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-3 shadow-xl shadow-emerald-950/20 backdrop-blur">
          <div className="flex gap-2">
            <button
              onClick={applyChanges}
              className="flex-1 rounded-xl bg-emerald-500 px-3 py-3 text-xs font-black uppercase tracking-wide text-slate-950 transition hover:bg-emerald-400 flex items-center justify-center gap-2"
            >
              <PlayCircle size={15} /> Aplicar al proyector
            </button>
            <button
              onClick={discardChanges}
              className="w-12 rounded-xl border border-red-400/30 bg-red-500/10 text-red-200 transition hover:bg-red-500/20 flex items-center justify-center"
              title="Cancelar cambios"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="rounded-[1.35rem] border border-cyan-300/20 bg-[linear-gradient(180deg,rgba(8,13,25,0.95),rgba(13,20,35,0.86))] p-4 shadow-2xl shadow-black/30">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">Logo y Proyector</p>
            <h2 className="mt-1 text-lg font-black text-white">Pantalla de bienvenida</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => logoFileInputRef.current?.click()}
              className="rounded-xl bg-cyan-400 px-3 py-2 text-[11px] font-black uppercase text-slate-950 transition hover:bg-cyan-300 flex items-center gap-2"
            >
              <Upload size={14} /> Logo
            </button>
            {currentTheme.logoUrl && (
              <button
                onClick={() => updatePendingTheme({ ...currentTheme, logoUrl: undefined })}
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] font-black uppercase text-red-200 transition hover:bg-red-500/20 flex items-center gap-2"
                title="Restablecer al logo predeterminado"
              >
                <Trash2 size={14} /> Restablecer
              </button>
            )}
          </div>
        </div>

        <div
          className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 shadow-inner"
          style={{ background: currentTheme.logoBackground || '#ffffff' }}
        >
          {currentTheme.logoBgAnimation && (
            <div className="absolute inset-0 opacity-90 pointer-events-none">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.18)_100%)]" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <img
              src={currentTheme.logoUrl || '/logo.png'}
              alt="Logo"
              className="max-h-full max-w-full object-contain"
              style={{
                opacity: currentTheme.logoOpacity ?? 1,
                filter: currentTheme.logoGlow ? 'drop-shadow(0 0 24px rgba(59,130,246,0.55)) drop-shadow(0 0 48px rgba(14,165,233,0.28))' : 'none'
              }}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <span className="mb-2 flex justify-between text-[10px] font-black uppercase text-slate-400"><span>Tamano</span><span>{currentTheme.logoSize || 78}%</span></span>
            <input type="range" min="20" max="100" value={currentTheme.logoSize || 78} onChange={(e) => updatePendingTheme({ ...currentTheme, logoSize: parseInt(e.target.value) })} className="w-full accent-cyan-400" />
          </label>
          <label className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <span className="mb-2 flex justify-between text-[10px] font-black uppercase text-slate-400"><span>Opacidad</span><span>{Math.round((currentTheme.logoOpacity ?? 1) * 100)}%</span></span>
            <input type="range" min="0.2" max="1" step="0.05" value={currentTheme.logoOpacity ?? 1} onChange={(e) => updatePendingTheme({ ...currentTheme, logoOpacity: parseFloat(e.target.value) })} className="w-full accent-cyan-400" />
          </label>
        </div>
      </div>

      <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.045] p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Fondo</p>
            <h3 className="text-sm font-black text-white">Color, degradado y brillo</h3>
          </div>
          <input type="color" value={currentTheme.logoBackground?.startsWith('#') ? currentTheme.logoBackground : '#ffffff'} onChange={(e) => updatePendingTheme({ ...currentTheme, logoBackground: e.target.value })} className="h-9 w-11 rounded-xl border border-white/10 bg-slate-900" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            'radial-gradient(circle at center, #ffffff 0%, #eef2ff 45%, #dbeafe 100%)',
            'radial-gradient(circle at center, #020617 0%, #111827 55%, #000000 100%)',
            'linear-gradient(135deg, #111827 0%, #1e3a8a 50%, #f59e0b 100%)',
            'linear-gradient(180deg, #f8fafc 0%, #bfdbfe 100%)',
            'radial-gradient(circle at center, #fef3c7 0%, #92400e 100%)',
            'linear-gradient(135deg, #064e3b 0%, #0f172a 100%)'
          ].map(bg => (
            <button key={bg} onClick={() => updatePendingTheme({ ...currentTheme, logoBackground: bg })} className="h-14 rounded-xl border border-white/10 transition hover:scale-[1.02] hover:border-cyan-300/60" style={{ background: bg }} />
          ))}
        </div>
        <button
          onClick={() => updatePendingTheme({ ...currentTheme, logoGlow: !currentTheme.logoGlow })}
          className={`mt-4 w-full rounded-xl border px-3 py-3 text-[11px] font-black uppercase transition ${currentTheme.logoGlow ? 'border-cyan-300/40 bg-cyan-400/15 text-cyan-100' : 'border-white/10 bg-slate-950/70 text-slate-400'}`}
        >
          Brillo del logo {currentTheme.logoGlow ? 'activo' : 'apagado'}
        </button>
      </div>

      <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.045] p-4 shadow-xl">
        <div className="mb-4">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Movimiento de fondo</p>
          <h3 className="text-sm font-black text-white">Animaciones para el logo</h3>
        </div>
        {renderBackgroundAnimationEditor(
          currentTheme.logoBgAnimation,
          (logoBgAnimation) => updatePendingTheme({ ...currentTheme, logoBgAnimation }),
          'accent-cyan-400'
        )}
      </div>
    </div>
  );

  const renderYoutubeFullBrowser = () => {
    if (!isYoutubeFullBrowserOpen) return null;
    const directVideoId = getYouTubeVideoId(inputText) || activePortalVideoId || getYouTubeVideoId(youtubeSearchQuery);

    return (
      <div className="fixed inset-0 z-50 bg-[#050913]/97 backdrop-blur-xl flex flex-col p-6 overflow-hidden animate-fade-in text-white font-sans">
        {/* Header section */}
        <div className="flex flex-col gap-4 border-b border-white/10 pb-5 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-600/10 border border-red-500/30 flex items-center justify-center text-red-500 shadow-lg shadow-red-950/20">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-red-500 stroke-none" strokeWidth="0">
                  <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.107C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.388.556a3.003 3.003 0 0 0-2.11 2.107C0 8.05 0 12 0 12s0 3.95.502 5.837a3.003 3.003 0 0 0 2.11 2.107C4.5 20.5 12 20.5 12 20.5s7.5 0 9.388-.556a3.003 3.003 0 0 0 2.11-2.107C24 15.95 24 12 24 12s0-3.95-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </div>
              <div>
                <h1 className="text-sm font-black uppercase tracking-widest text-white">Buscador Oficial de YouTube</h1>
                <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Busca y reproduce videos directamente en el reproductor oficial de YouTube</p>
              </div>
            </div>

            {/* Selector de modo de buscador: Servidor Rapido / Reproductor Directo */}
            <div className="flex gap-1 bg-slate-950/80 p-1.5 rounded-2xl border border-white/10 shadow-lg shadow-black/45 shrink-0 my-2 sm:my-0 self-start sm:self-auto">
              <button
                onClick={() => setYoutubeBrowserMode('cards')}
                className={`px-3 py-2 sm:px-4 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
                  youtubeBrowserMode === 'cards'
                    ? 'bg-red-600 text-white shadow-md shadow-red-950/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
                type="button"
              >
                Servidor Rapido
              </button>
              <button
                onClick={() => setYoutubeBrowserMode('iframe')}
                className={`px-3 py-2 sm:px-4 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
                  youtubeBrowserMode === 'iframe'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
                type="button"
              >
                Reproductor Directo
              </button>
            </div>

            <button
              onClick={() => setIsYoutubeFullBrowserOpen(false)}
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-red-600 hover:text-white border border-white/10 hover:border-red-500/40 flex items-center justify-center transition-all duration-300 active:scale-95 self-end sm:self-auto"
              title="Cerrar (Esc)"
              type="button"
            >
              <X size={18} />
            </button>
          </div>

          {/* Search bar & quick chips row */}
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Escribe palabras clave para buscar en YouTube..."
                className="w-full bg-slate-950/80 rounded-2xl pl-12 pr-32 py-4 text-sm text-white border border-gray-700/60 focus:border-red-500/50 outline-none transition-all shadow-inner focus:shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleYoutubeFullSearch(inputText);
                  }
                }}
              />
              <Search className="absolute left-4 top-4.5 text-gray-500" size={18} />
              <button
                onClick={() => handleYoutubeFullSearch(inputText)}
                className="absolute right-2 top-2 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase px-5 py-2.5 rounded-xl transition-all shadow-lg active:scale-95 flex items-center gap-2 border border-red-500/20"
                type="button"
              >
                <Search size={14} />
                BUSCAR
              </button>
            </div>

            {/* Quick chips */}
            <div className="flex gap-1.5 shrink-0 self-start md:self-auto overflow-x-auto max-w-full pb-1 md:pb-0 no-scrollbar">
              {[
                { label: 'Adoracion', query: 'Musica de adoracion cristiana' },
                { label: 'Instrumental', query: 'Piano instrumental cristiano' },
                { label: 'Alabanza', query: 'Alabanza y adoracion cristiana' },
                { label: 'Pistas', query: 'Pistas de piano cristiano para cantar' },
                { label: 'Himnos', query: 'Himnos cristianos clasicos' }
              ].map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => handleYoutubeFullSearch(chip.query)}
                  className="text-[10px] font-black bg-white/5 hover:bg-red-600/20 border border-white/10 hover:border-red-500/40 text-slate-300 hover:text-white px-3.5 py-2 rounded-xl transition-all active:scale-95 shrink-0"
                  type="button"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col lg:flex-row gap-6 mt-6 min-h-0 overflow-hidden">
          {/* Left Area: Premium Custom YouTube search result grid + player */}
          <div className="flex-1 bg-[#090e18] rounded-3xl border border-white/10 overflow-hidden relative shadow-2xl min-h-[300px] flex flex-col">
            {activePortalVideoId && youtubeBrowserMode !== 'iframe' && (
              <div className="w-full bg-black border-b border-white/10 relative flex flex-col animate-slide-down shrink-0">
                <div className="flex items-center justify-between p-3 bg-slate-950/90 border-b border-white/5">
                  <span className="text-[10px] text-red-400 font-black uppercase tracking-widest flex items-center gap-1.5">
                    <PlayCircle size={14} className="text-red-500 animate-pulse" /> REPRODUCTOR EN VIVO DE VISTA PREVIA
                  </span>
                  <button
                    onClick={() => setActivePortalVideoId(null)}
                    className="text-slate-400 hover:text-white transition-colors bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 hover:bg-red-600 hover:border-red-500/40 text-[9px] font-black uppercase"
                  >
                    Cerrar Reproductor
                  </button>
                </div>
                <div className="relative aspect-video max-h-[320px] w-full bg-black">
                  <iframe
                    className="absolute inset-0 w-full h-full border-0"
                    src={`https://www.youtube.com/embed/${activePortalVideoId}?autoplay=1&mute=0&controls=1&rel=0&playsinline=1`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    title="Oasis YouTube Player"
                  ></iframe>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-5 no-scrollbar min-h-0">
              {youtubeBrowserMode === 'iframe' ? (
                /* Premium integrated official YouTube browser frame */
                <div className="w-full h-full flex flex-col min-h-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-3 mb-4 gap-2 shrink-0">
                    <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                      REPRODUCTOR DIRECTO OFICIAL DE YOUTUBE
                    </span>
                    <span className="text-[9px] text-slate-400 italic">
                      Pega un enlace o ID de YouTube arriba para verlo aqui sin salir de la aplicacion.
                    </span>
                  </div>
                  {directVideoId ? (
                    <div className="flex-1 w-full rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl relative">
                      <iframe
                        className="absolute inset-0 w-full h-full border-0"
                        src={`https://www.youtube.com/embed/${directVideoId}?autoplay=1&mute=0&controls=1&rel=0&playsinline=1`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        title="Reproductor Directo YouTube"
                      ></iframe>
                    </div>
                  ) : (
                    <div className="flex-1 rounded-2xl border border-white/10 bg-slate-950/70 p-8 flex flex-col items-center justify-center text-center">
                      <PlayCircle size={44} className="text-red-400 mb-4" />
                      <h3 className="text-sm font-black uppercase tracking-widest text-white">Pega un enlace de YouTube</h3>
                      <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-400">
                        YouTube bloquea su pagina completa dentro de otras apps, pero el reproductor oficial si funciona. Pega aqui un enlace, un Shorts o solo el ID del video.
                      </p>
                    </div>
                  )}
                </div>
              ) : isSearchingYoutube ? (
                <div className="h-full w-full flex flex-col items-center justify-center text-center p-8">
                  <div className="relative w-20 h-20 mb-6">
                    <div className="absolute inset-0 rounded-full border-4 border-red-500/20 border-t-red-600 animate-spin"></div>
                    <div className="absolute inset-2 rounded-full border-4 border-indigo-500/10 border-b-indigo-500 animate-spin" style={{ animationDirection: 'reverse' }}></div>
                    <div className="absolute inset-0 flex items-center justify-center text-red-500">
                      <svg viewBox="0 0 24 24" className="w-8 h-8 fill-red-500 stroke-none animate-pulse">
                        <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.107C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.388.556a3.003 3.003 0 0 0-2.11 2.107C0 8.05 0 12 0 12s0 3.95.502 5.837a3.003 3.003 0 0 0 2.11 2.107C4.5 20.5 12 20.5 12 20.5s7.5 0 9.388-.556a3.003 3.003 0 0 0 2.11-2.107C24 15.95 24 12 24 12s0-3.95-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-base font-black text-white uppercase tracking-widest animate-pulse">ESCANEANDO YOUTUBE...</h3>
                  <p className="text-xs text-slate-400 mt-2 max-w-sm leading-relaxed">
                    Buscando los mejores videos en servidores de alto rendimiento
                  </p>
                </div>
              ) : youtubeSearchError ? (
                <div className="h-full w-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 mb-4 animate-pulse">
                    <AlertCircle size={32} />
                  </div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Error de Busqueda</h3>
                  <p className="text-xs text-slate-400 mt-2 max-w-xs leading-relaxed">
                    {youtubeSearchError}
                  </p>
                  <p className="text-[10px] text-indigo-300 bg-indigo-950/30 border border-indigo-500/20 px-4 py-2.5 rounded-xl max-w-sm mt-4 leading-relaxed font-medium">
                    <strong>Consejo rapido:</strong> si la busqueda rapida no responde, pega un enlace de YouTube y usa el reproductor directo. YouTube no permite embeber su pagina completa dentro de otra app.
                  </p>
                  <button
                    onClick={() => setYoutubeBrowserMode('iframe')}
                    className="mt-5 bg-gradient-to-r from-red-600 to-indigo-600 hover:from-red-500 hover:to-indigo-500 active:scale-95 text-white text-[10px] font-black uppercase px-6 py-3.5 rounded-2xl transition-all shadow-lg shadow-indigo-950/40 border border-white/10 animate-bounce flex items-center gap-2"
                    type="button"
                  >
                    ACTIVAR REPRODUCTOR DIRECTO
                  </button>
                </div>
              ) : youtubeResults.length > 0 ? (
                <div className="space-y-4 h-full flex flex-col min-h-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.75)]" />
                      <span className="text-[10px] text-slate-200 font-black uppercase tracking-[0.22em]">
                        Resultados encontrados
                      </span>
                      <span className="text-[10px] text-slate-500 font-black uppercase">
                        {youtubeResults.length} videos
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 italic">Selecciona una miniatura para previsualizar.</span>
                  </div>
                  <div className="flex-1 overflow-y-auto pr-1 no-scrollbar grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-3.5 pb-8">
                    {youtubeResults.map((video) => (
                      <div
                        key={video.id}
                        className={`group relative overflow-hidden rounded-2xl border text-left min-h-40 transition-all duration-300 ${
                          activePortalVideoId === video.id
                            ? 'bg-red-950/25 border-red-400/60 shadow-[0_18px_36px_rgba(239,68,68,0.16)]'
                            : 'bg-slate-950/70 border-white/8 hover:border-red-400/45 hover:bg-slate-950 shadow-xl shadow-black/20'
                        }`}
                      >
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                        <div className="grid grid-cols-[122px_1fr] sm:grid-cols-[148px_1fr] min-h-40 h-full">
                          <button
                            onClick={() => setActivePortalVideoId(video.id)}
                            className="relative overflow-hidden bg-slate-900 text-left focus:outline-none focus:ring-2 focus:ring-red-400/70"
                            type="button"
                            title="Ver vista previa"
                          >
                            <img src={video.thumbnail} alt={video.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                              <span className="w-11 h-11 rounded-full bg-white/95 text-red-600 flex items-center justify-center shadow-2xl shadow-black/40">
                                <PlayCircle size={25} />
                              </span>
                            </div>
                            {video.duration && (
                              <span className="absolute bottom-2 right-2 bg-black/85 text-[9px] text-white px-2 py-0.5 rounded-md font-black tracking-wider">
                                {video.duration}
                              </span>
                            )}
                          </button>

                          <div className="p-3.5 flex min-w-0 flex-col justify-between gap-3">
                            <button className="text-left min-w-0" onClick={() => setActivePortalVideoId(video.id)} type="button">
                              <h4 className="text-[13px] font-black text-white line-clamp-2 leading-snug group-hover:text-red-200 transition-colors" title={video.title}>
                                {video.title}
                              </h4>
                              <p className="text-[10px] text-slate-400 mt-1.5 font-black uppercase tracking-wider truncate">
                                {video.author}
                              </p>
                            </button>

                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => setActivePortalVideoId(video.id)}
                                className="h-8 rounded-xl bg-white/7 hover:bg-white/12 active:scale-95 border border-white/10 text-slate-100 transition-all flex items-center justify-center gap-1.5 text-[9px] font-black uppercase"
                                type="button"
                                title="Vista previa"
                              >
                                <Eye size={12} /> Ver
                              </button>
                              <button
                                onClick={async () => {
                                  const copied = await copyTextToClipboard(`https://www.youtube.com/watch?v=${video.id}`);
                                  alert(copied ? "Enlace copiado al portapapeles." : "No se pudo copiar el enlace. Permite acceso al portapapeles e intenta de nuevo.");
                                }}
                                className="h-8 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 active:scale-95 text-white transition-all flex items-center justify-center gap-1.5 text-[9px] font-black uppercase shadow-lg shadow-emerald-950/20 border border-emerald-400/25"
                                type="button"
                                title="Copiar enlace"
                              >
                                <Copy size={12} /> Copiar
                              </button>
                              <button
                                onClick={() => {
                                  setPendingVideoImport({
                                    videoId: video.id,
                                    action: 'project',
                                    defaultName: video.title,
                                    destination: hasActiveItem ? 'current' : 'new'
                                  });
                                  setImportName('');
                                }}
                                className="h-8 min-w-0 bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white text-[9px] font-black uppercase rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-red-950/30 border border-red-400/25"
                                type="button"
                              >
                                <Plus size={12} /> Proyectar
                              </button>
                              <button
                                onClick={() => {
                                  setPendingVideoImport({
                                    videoId: video.id,
                                    action: 'background',
                                    defaultName: video.title
                                  });
                                  setImportName('');
                                }}
                                className="h-8 min-w-0 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-[9px] font-black uppercase rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-950/30 border border-indigo-400/25"
                                type="button"
                              >
                                <Music size={12} /> Audio
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 rounded-full bg-slate-950/80 border border-white/5 flex items-center justify-center text-red-500 mb-4 animate-pulse">
                    <PlayCircle size={32} />
                  </div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Centro de Vista Previa</h3>
                  <p className="text-xs text-slate-400 mt-2 max-w-xs leading-relaxed">
                    Ingresa palabras clave en el buscador de arriba o selecciona un chip rapido para cargar el buscador de YouTube en tiempo real.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Control Drawer */}
          <div className="w-full lg:w-[380px] bg-slate-900/60 border border-white/10 rounded-3xl p-5 flex flex-col justify-between shrink-0 shadow-2xl relative backdrop-blur-md overflow-y-auto">
            <div className="flex flex-col gap-5">
              <span className="text-[10px] text-red-400 font-black uppercase tracking-widest flex items-center gap-1.5 border-b border-white/5 pb-2">
                <Sliders size={14} className="text-red-500" /> PANEL DE CONTROL DE IMPORTACION
              </span>

              {/* Instructions */}
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-3">
                <h4 className="text-xs font-black text-white uppercase tracking-wider">Como importar videos?</h4>
                <ol className="text-[10px] text-slate-300 space-y-2 list-decimal list-inside font-medium leading-relaxed">
                  <li>Busca y reproduce el video que deseas en la pantalla de la izquierda.</li>
                  <li>
                    Haz clic en el icono de <span className="text-white font-bold">compartir</span> o en el logo de <span className="text-white font-bold">YouTube</span> dentro del video para copiar su enlace (o copialo desde tu navegador).
                  </li>
                  <li>
                    Presiona uno de los botones de importacion rapida de abajo para capturarlo automaticamente.
                  </li>
                </ol>
              </div>

              {/* Input for Manual URL Paste */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Enlace de YouTube:</label>
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Pega el enlace de YouTube aqui..."
                  className="w-full bg-slate-950/80 rounded-xl px-3.5 py-2.5 text-xs text-white border border-white/10 focus:border-red-500/50 outline-none transition-all"
                />
              </div>

              {/* Add options toggle */}
              <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Agregar a diapositiva activa</span>
                  <button
                    onClick={() => setAddYouTubeToCurrent(prev => !prev)}
                    className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${addYouTubeToCurrent ? 'bg-emerald-500' : 'bg-slate-700'}`}
                    type="button"
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-all duration-300 ${addYouTubeToCurrent ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={async () => {
                    try {
                      const vId = await getSelectedYouTubeVideoId();
                       
                      if (!vId) {
                        alert("Selecciona un video de la lista o pega un enlace valido de YouTube.");
                        return;
                      }

                      setPendingVideoImport({
                        videoId: vId,
                        action: 'project',
                        defaultName: 'Video de YouTube',
                        destination: hasActiveItem ? 'current' : 'new'
                      });
                      setImportName('');
                    } catch (err) {
                      alert("Error de importacion rapida. Selecciona un video o pega un enlace valido.");
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-[10px] font-black uppercase py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/20 border border-emerald-500/20"
                  type="button"
                >
                  <Plus size={14} /> PEGAR Y PROYECTAR
                </button>

                <button
                  onClick={async () => {
                    try {
                      const vId = await getSelectedYouTubeVideoId();
                       
                      if (!vId) {
                        alert("Selecciona un video de la lista o pega un enlace valido de YouTube.");
                        return;
                      }

                      setPendingVideoImport({
                        videoId: vId,
                        action: 'background',
                        defaultName: 'Audio de YouTube'
                      });
                      setImportName('');
                    } catch (err) {
                      alert("Error de importacion rapida. Selecciona un video o pega un enlace valido.");
                    }
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-[10px] font-black uppercase py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/20 border border-indigo-500/20"
                  type="button"
                >
                  <Music size={14} /> ESTABLECER AUDIO DE FONDO
                </button>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={async () => {
                  const link = await getSelectedYouTubeLink();
                  if (!link) {
                    alert("Selecciona un video de la lista o pega un enlace valido de YouTube.");
                    return;
                  }
                  const copied = await copyTextToClipboard(link);
                  alert(copied ? "Enlace copiado al portapapeles." : "No se pudo copiar el enlace. Permite acceso al portapapeles e intenta de nuevo.");
                }}
                className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[10px] font-black uppercase py-3 rounded-xl transition-all flex items-center justify-center gap-1.5"
                type="button"
              >
                <Copy size={12} /> Copiar Link
              </button>
              <button
                onClick={() => setIsYoutubeFullBrowserOpen(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-slate-300 hover:text-white text-[10px] font-black uppercase py-3 rounded-xl transition-all flex items-center justify-center"
                type="button"
              >
                Cerrar Buscador
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-[#080d17] border-r border-white/10 font-sans">
      <div className="p-3 border-b border-white/10 bg-[#080d17]/95">
        <div className="grid grid-cols-3 gap-2 rounded-[1.35rem] border border-white/10 bg-[#030711] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_45px_rgba(0,0,0,0.28)]">
          <button onClick={() => setActiveTab('content')} className={`py-3 text-[11px] font-black uppercase tracking-wide flex items-center justify-center gap-2 rounded-2xl transition-all ${activeTab === 'content' ? 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-950/30' : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'}`}>
            <Plus size={14} /> Contenido
          </button>
          <button
            onClick={() => setActiveTab('theme')}
            className={`py-3 text-[11px] font-black uppercase tracking-wide flex items-center justify-center gap-2 rounded-2xl transition-all ${activeTab === 'theme'
              ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-950/35'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
              }`}
          >
            <Edit3 size={14} /> Editor
          </button>
          <button
            onClick={() => setActiveTab('logo')}
            className={`py-3 text-[11px] font-black uppercase tracking-wide flex items-center justify-center gap-2 rounded-2xl transition-all ${activeTab === 'logo'
              ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-950/30'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
              }`}
          >
            <ImageIcon size={14} /> Logo
          </button>
        </div>
      </div>

      {/* Hidden File Inputs moved to top level to be accessible from any tab */}
      <input type="file" accept="image/*" ref={slideFileInputRef} className="hidden" onChange={handleSlideImageUpload} />
      <input type="file" accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation" ref={presentationFileInputRef} className="hidden" onChange={handlePresentationUpload} />
      <input type="file" accept="image/*" ref={bgFileInputRef} className="hidden" onChange={handleBgUpload} />
      <input type="file" accept="image/*" ref={logoFileInputRef} className="hidden" onChange={handleLogoUpload} />

      <div className="flex-1 overflow-y-auto no-scrollbar bg-[linear-gradient(180deg,#0d1524_0%,#0a0f1b_45%,#070b13_100%)]">
        {activeTab === 'content' && (
          <div className="p-5 space-y-6">

            <div className="bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(8,13,25,0.78))] rounded-[1.35rem] p-4 border border-white/10 shadow-2xl shadow-black/20">
              <label className="text-[10px] uppercase text-cyan-300 font-black tracking-[0.22em] mb-3 block">Seleccionar Origen</label>
              <div className="grid grid-cols-5 gap-3">
                <button
                  onClick={() => { setInputType('youtube'); setSongResults([]); }}
                  className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${inputType === 'youtube' ? 'bg-gradient-to-br from-red-600/35 to-rose-600/20 border-red-400/60 shadow-lg shadow-red-950/20' : 'bg-slate-950/60 border-white/10 hover:border-cyan-300/40 hover:bg-white/[0.04]'}`}
                >
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${inputType === 'youtube' ? 'bg-red-500' : 'bg-slate-700'}`}>
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
                  className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${inputType === 'manual' ? 'bg-gradient-to-br from-cyan-500/30 to-indigo-600/25 border-cyan-300/50 shadow-lg shadow-cyan-950/20' : 'bg-slate-950/60 border-white/10 hover:border-cyan-300/40 hover:bg-white/[0.04]'}`}
                >
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${inputType === 'manual' ? 'bg-cyan-500' : 'bg-slate-700'}`}>
                    <Edit3 size={18} className="text-white" />
                  </div>
                  <span className={`text-[10px] font-bold uppercase ${inputType === 'manual' ? 'text-indigo-300' : 'text-gray-400'}`}>Manual</span>
                </button>
                <button
                  onClick={() => { setInputType('scripture'); setSongResults([]); }}
                  className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${inputType === 'scripture' ? 'bg-gradient-to-br from-amber-500/35 to-orange-700/20 border-amber-400/60 shadow-lg shadow-amber-950/20' : 'bg-slate-950/60 border-white/10 hover:border-cyan-300/40 hover:bg-white/[0.04]'}`}
                >
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${inputType === 'scripture' ? 'bg-amber-500' : 'bg-slate-700'}`}>
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
                  className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 bg-slate-950/60 border-white/10 hover:border-emerald-400/50 hover:bg-white/[0.04] group/nv`}
                >
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-slate-700 group-hover/nv:bg-emerald-500 transition-colors">
                    <Plus size={18} className="text-white" />
                  </div>
                  <span className="text-[10px] font-bold uppercase text-gray-400 group-hover/nv:text-emerald-300">NV</span>
                </button>
                <button
                  onClick={() => presentationFileInputRef.current?.click()}
                  disabled={loading || !onUploadImages}
                  className="p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 bg-slate-950/60 border-white/10 hover:border-cyan-400/60 hover:bg-cyan-950/30 disabled:opacity-50 disabled:cursor-not-allowed group/ppt"
                  title="Agregar PDF o PowerPoint"
                >
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-slate-700 group-hover/ppt:bg-cyan-500 transition-colors">
                    {loading ? <Loader2 size={18} className="text-white animate-spin" /> : <FileText size={18} className="text-white" />}
                  </div>
                  <span className="text-[10px] font-bold uppercase text-gray-400 group-hover/ppt:text-cyan-300">PDF/PPT</span>
                </button>
              </div>
            </div>

            {/* DENSITY SELECTOR - Compact */}
            {inputType !== 'youtube' && (
              <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/30">
                <label className="text-[10px] uppercase text-gray-500 font-bold tracking-widest mb-3 block">Densidad de Texto</label>
                <div className="grid grid-cols-4 gap-2">
                  <button onClick={() => setDensity('impact')} className={`p-2 rounded-lg border text-[10px] font-bold transition-all flex flex-col items-center gap-1 ${density === 'impact' ? 'bg-indigo-600 border-indigo-400' : 'bg-gray-800 border-gray-700 hover:border-gray-500'}`}><AlignLeft size={14} /> Impacto</button>
                  <button onClick={() => setDensity('classic')} className={`p-2 rounded-lg border text-[10px] font-bold transition-all flex flex-col items-center gap-1 ${density === 'classic' ? 'bg-indigo-600 border-indigo-400' : 'bg-gray-800 border-gray-700 hover:border-gray-500'}`}><AlignCenter size={14} /> Clasico</button>
                  <button onClick={() => setDensity('strophe')} className={`p-2 rounded-lg border text-[10px] font-bold transition-all flex flex-col items-center gap-1 ${density === 'strophe' ? 'bg-indigo-600 border-indigo-400' : 'bg-gray-800 border-gray-700 hover:border-gray-500'}`}><LayoutGrid size={14} /> Estrofa</button>
                  <button onClick={() => setDensity('reading')} className={`p-2 rounded-lg border text-[10px] font-bold transition-all flex flex-col items-center gap-1 ${density === 'reading' ? 'bg-indigo-600 border-indigo-400' : 'bg-gray-800 border-gray-700 hover:border-gray-500'}`}><FileText size={14} /> Lectura</button>
                </div>
              </div>
            )}

            {/* INPUT FIELD - Stylized */}
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/30">
              <label className="text-[10px] uppercase text-gray-500 font-bold tracking-widest mb-3 block">
                {inputType === 'youtube' ? 'Navegador YouTube' : inputType === 'manual' ? 'Escribe tu Texto' : 'Cita Biblica'}
              </label>

              {inputType === 'youtube' && (
                <div className="mb-4">
                  {/* Active Preview Player */}
                  {previewVideoId && (
                    <div className="mb-4 bg-gray-900/90 rounded-2xl border border-red-500/30 overflow-hidden shadow-2xl relative animate-fade-in">
                      <div className="flex items-center justify-between p-3 border-b border-gray-800/80 bg-red-950/20">
                        <span className="text-[10px] text-red-400 font-black uppercase tracking-widest flex items-center gap-1.5">
                          <PlayCircle size={14} className="text-red-500 animate-pulse" /> Vista Previa
                        </span>
                        <button
                          onClick={() => setPreviewVideoId(null)}
                          className="text-gray-400 hover:text-white transition-colors bg-white/5 p-1 rounded-full hover:bg-white/10"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div className="relative aspect-video bg-black">
                        <iframe
                          className="w-full h-full"
                          src={`https://www.youtube.com/embed/${previewVideoId}?autoplay=1&rel=0&playsinline=1`}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          title="Preview Video"
                        ></iframe>
                      </div>
                    </div>
                  )}

                  {/* NEW: Permanent Premium YouTube External Import Assistant Card - Step-by-Step Flow */}
                  <div className="bg-gradient-to-br from-slate-900/90 via-gray-900 to-red-950/20 border border-red-500/20 rounded-2xl p-5 shadow-xl relative overflow-hidden text-left mb-5">
                    {/* Decorative red glow */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-red-500/5 rounded-full blur-2xl pointer-events-none"></div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-white/5 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500">
                          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-red-500 stroke-none" strokeWidth="0">
                            <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.107C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.388.556a3.003 3.003 0 0 0-2.11 2.107C0 8.05 0 12 0 12s0 3.95.502 5.837a3.003 3.003 0 0 0 2.11 2.107C4.5 20.5 12 20.5 12 20.5s7.5 0 9.388-.556a3.003 3.003 0 0 0 2.11-2.107C24 15.95 24 12 24 12s0-3.95-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-xs font-black text-white uppercase tracking-wider">Asistente de Busqueda y Pegado</h3>
                          <p className="text-[9px] text-red-400 font-bold uppercase tracking-widest">Busca en YouTube y agrega con un click</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const query = inputText.trim() || 'musica cristiana';
                          handleYoutubeFullSearch(query);
                        }}
                        className="bg-red-600 hover:bg-red-500 text-white text-[10px] font-black uppercase px-3 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-red-950/20 active:scale-95 border border-red-500/30 w-full sm:w-auto"
                        type="button"
                      >
                        <Maximize2 size={12} /> BUSCADOR COMPLETO
                      </button>
                    </div>

                    <div className="space-y-4">
                      {/* Paso 1 */}
                      <div className="relative pl-6">
                        <div className="absolute left-0 top-0.5 w-4 h-4 rounded-full bg-red-500/10 border border-red-500/40 flex items-center justify-center text-[9px] font-black text-red-400">1</div>
                        <p className="text-[10px] text-white font-bold mb-1.5">Escribe tu busqueda y presiona Buscar:</p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Ej: Musica cristiana adoracion"
                            className="flex-1 bg-slate-950/80 rounded-lg px-3 py-1.5 text-[10px] text-white border border-gray-700/60 focus:border-red-500/40 outline-none"
                          />
                          <button
                            onClick={() => {
                              const query = inputText.trim() || 'musica cristiana';
                              setYoutubeSearchQuery(query);
                            }}
                            className="bg-red-600 hover:bg-red-500 text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-md active:scale-95 border border-red-500/30"
                            type="button"
                          >
                            <Search size={10} /> BUSCAR INTEGRADO
                          </button>
                        </div>
                      </div>

                      {/* Paso 2 */}
                      <div className="relative pl-6">
                        <div className="absolute left-0 top-0.5 w-4 h-4 rounded-full bg-red-500/10 border border-red-500/40 flex items-center justify-center text-[9px] font-black text-red-400">2</div>
                        <p className="text-[10px] text-gray-300 font-medium leading-relaxed">
                          Busca y abre cualquier video en YouTube, luego <span className="text-white font-black">Copia su enlace</span> desde la barra de direcciones o compartiendo el video.
                        </p>
                      </div>

                      {/* Paso 3 */}
                      <div className="relative pl-6">
                        <div className="absolute left-0 top-0.5 w-4 h-4 rounded-full bg-red-500/10 border border-red-500/40 flex items-center justify-center text-[9px] font-black text-red-400">3</div>
                        <p className="text-[10px] text-white font-bold mb-2">Importar al Instante:</p>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={async () => {
                              try {
                                const vId = await getSelectedYouTubeVideoId();
                                
                                if (!vId) {
                                  alert("Selecciona un video de la lista o pega un enlace valido de YouTube.");
                                  return;
                                }

                                setPendingVideoImport({
                                  videoId: vId,
                                  action: 'project',
                                  defaultName: 'Video de YouTube',
                                  destination: hasActiveItem ? 'current' : 'new'
                                });
                                setImportName('');
                                setInputText('');
                              } catch (err) {
                                alert("Error de importacion rapida. Selecciona un video o pega un enlace valido.");
                              }
                            }}
                            className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-[9px] font-black uppercase py-2 px-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/20 border border-emerald-500/20"
                            type="button"
                          >
                            <Plus size={12} /> Auto-Pegar y Proyectar
                          </button>

                          <button
                            onClick={async () => {
                              try {
                                const vId = await getSelectedYouTubeVideoId();
                                
                                if (!vId) {
                                  alert("Selecciona un video de la lista o pega un enlace valido de YouTube.");
                                  return;
                                }

                                setPendingVideoImport({
                                  videoId: vId,
                                  action: 'background',
                                  defaultName: 'Audio de YouTube'
                                });
                                setImportName('');
                              } catch (err) {
                                alert("Error de importacion rapida. Selecciona un video o pega un enlace valido.");
                              }
                            }}
                            className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-[9px] font-black uppercase py-2 px-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-950/20 border border-indigo-500/20"
                            type="button"
                          >
                            <Music size={12} /> Auto-Pegar y Fondo
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>
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
                ) : inputType === 'scripture' ? (
                  <div className="relative flex flex-col">
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

                    {inputType === 'youtube' && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => {
                            const query = inputText.trim() || 'musica cristiana';
                            handleYoutubeFullSearch(query);
                          }}
                          className="flex-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-red-400 text-[10px] font-black uppercase py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                          type="button"
                        >
                          <Search size={12} className="text-red-500" />
                          Buscar en Aplicacion
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              const text = await navigator.clipboard.readText();
                              if (text) {
                                setInputText(text);
                              }
                            } catch (err) {
                              alert("Por favor, permite el permiso para leer el portapapeles o pega el enlace manualmente.");
                            }
                          }}
                          className="flex-1 bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 hover:border-indigo-500/50 text-indigo-400 text-[10px] font-black uppercase py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                          type="button"
                        >
                          <Upload size={12} className="text-indigo-500" />
                          Auto-Pegar Enlace
                        </button>
                      </div>
                    )}

                    {/* Bible Book Suggestions Dropdown */}
                    {showBibleSuggestions && bibleSuggestions.length > 0 && inputType === 'scripture' && (
                      <div className="absolute z-50 w-full mt-1 bg-gray-900 border border-indigo-500/50 rounded-xl shadow-2xl overflow-hidden animate-fade-in">
                        <div className="px-3 py-2 bg-indigo-900/30 border-b border-gray-700">
                          <span className="text-[9px] text-indigo-300 font-bold uppercase tracking-wider">Libros sugeridos</span>
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
                ) : null}

                {songResults.length === 0 ? (
                  <div className="flex flex-col gap-2">
                    {inputType !== 'youtube' && (
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
                        disabled={loading || isSearchingSongs || isSearchingYoutube || !inputText}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white py-3.5 rounded-xl flex justify-center items-center gap-2 font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all font-sans"
                      >
                        {loading || isSearchingSongs || isSearchingYoutube ? <Loader2 className="animate-spin" size={18} /> : (activeSlide && inputType === 'manual' && inputText !== activeSlide.content) ? <Eraser size={18} /> : <Plus size={18} />}
                        {loading ? 'GENERANDO...' : isSearchingSongs ? 'BUSCANDO...' : (activeSlide && inputType === 'manual' && inputText !== activeSlide.content) ? 'APLICAR CAMBIO' : 'AGREGAR A LISTA'}
                      </button>
                    )}

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
                    <X size={14} /> CANCELAR BUSQUEDA
                  </button>
                )}
              </div>
            </div>



            {/* UNIFIED BACKGROUND AUDIO PLAYER & PLAYLIST */}
            {(backgroundAudioItem || bgAudioPlaylist.length > 0) && (
              <div className="bg-gray-900 border border-pink-500/30 rounded-xl overflow-hidden shadow-lg animate-fade-in mb-6 flex flex-col">
                {/* TOP: Reproductor / Controles */}
                {backgroundAudioItem && (
                  <div className="p-4 bg-gradient-to-br from-gray-900 to-gray-800 border-b border-pink-500/20 shadow-[0_4px_20px_rgba(0,0,0,0.5)] z-10 relative">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-pink-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-pink-600/20">
                        <Music size={20} className={isAudioPlaying ? 'animate-pulse' : ''} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[9px] text-pink-400 font-bold uppercase tracking-widest block mb-1">Musica de fondo en vivo</span>
                        <p className="text-sm text-white font-bold truncate">{backgroundAudioItem.title}</p>
                      </div>
                      <button
                        onClick={async () => {
                          const copied = await copyTextToClipboard(`https://www.youtube.com/watch?v=${backgroundAudioItem.videoId}`);
                          alert(copied ? "Enlace del audio de fondo copiado al portapapeles!" : "No se pudo copiar el enlace. Permite acceso al portapapeles e intenta de nuevo.");
                        }}
                        className="w-8 h-8 rounded-full bg-emerald-500/10 hover:bg-emerald-500 hover:text-white text-emerald-400 flex items-center justify-center transition-all"
                        title="Copiar enlace del audio"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={() => onSetBackgroundAudio?.('', '')}
                        className="w-8 h-8 rounded-full bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 flex items-center justify-center transition-all"
                        title="Detener y limpiar todo"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => onPrevAudio?.()}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-all active:scale-90"
                        title="Pista Anterior"
                      >
                        <SkipBack size={20} />
                      </button>
                      <button
                        onClick={() => onSeekAudio?.(-15)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-all active:scale-90"
                        title="Retroceder 15s"
                      >
                        <RotateCcw size={18} />
                      </button>

                      <button
                        onClick={() => onToggleAudioPlayback?.()}
                        className={`w-14 h-14 flex items-center justify-center rounded-full transition-all active:scale-95 shadow-xl mx-2 ${isAudioPlaying ? 'bg-pink-600 text-white shadow-pink-600/30' : 'bg-white text-pink-900 shadow-white/10'}`}
                      >
                        {isAudioPlaying ? <PauseCircle size={32} /> : <PlayCircle size={32} />}
                      </button>

                      <button
                        onClick={() => onSeekAudio?.(15)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-all active:scale-90"
                        title="Adelantar 15s"
                      >
                        <Clock size={18} />
                      </button>
                      <button
                        onClick={() => onNextAudio?.()}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-all active:scale-90"
                        title="Siguiente Pista"
                      >
                        <SkipForward size={20} />
                      </button>
                    </div>
                  </div>
                )}

                {/* BOTTOM: Playlist */}
                {bgAudioPlaylist.length > 0 && (
                  <div className="bg-gray-950/80 oasis-audio-playlist-container flex flex-col max-h-48 relative z-0">
                    <div className="px-3 py-2 bg-pink-900/10 border-b border-pink-500/10 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
                      <span className="text-[10px] text-pink-300 font-bold uppercase tracking-widest flex items-center gap-2">
                        <Layers size={12} /> Siguiente en la fila ({bgAudioPlaylist.length})
                      </span>
                    </div>
                    <div className="overflow-y-auto no-scrollbar pb-2">
                      {bgAudioPlaylist.map((track, idx) => (
                        <div
                          key={track.id}
                          className={`flex items-center gap-3 px-3 py-2 border-b border-gray-800/50 group hover:bg-white/5 transition-all cursor-pointer ${backgroundAudioItem?.id === track.id ? 'bg-pink-600/10' : ''} oasis-audio-track-row`}
                          onClick={() => onSelectAudio?.(idx)}
                        >
                          <div className="w-4 flex justify-center shrink-0">
                            {backgroundAudioItem?.id === track.id && isAudioPlaying ? (
                              <div className="flex items-end gap-[2px] h-3">
                                <div className="w-[3px] bg-pink-500 animate-[bounce_1s_infinite_0ms] h-full rounded-t-sm"></div>
                                <div className="w-[3px] bg-pink-500 animate-[bounce_1s_infinite_200ms] h-2/3 rounded-t-sm"></div>
                                <div className="w-[3px] bg-pink-500 animate-[bounce_1s_infinite_400ms] h-full rounded-t-sm"></div>
                              </div>
                            ) : (
                              <span className="text-[10px] font-bold text-gray-600">{idx + 1}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium truncate ${backgroundAudioItem?.id === track.id ? 'text-pink-400' : 'text-gray-400 group-hover:text-gray-300'}`}>
                              {track.title}
                            </p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); onRemoveAudio?.(track.id); }}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-all shrink-0"
                            title="Quitar de la fila"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SONG RESULTS */}
            {songResults.length > 0 && (
              <div className="bg-gray-900/80 rounded-xl border border-gray-700/50 overflow-hidden shadow-xl">
                <div className="p-3 bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border-b border-gray-700/50">
                  <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">{songResults.length} resultado(s) encontrado(s)</span>
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

        {activeTab === 'logo' && renderLogoDesigner()}

        {/* ... Rest of the ControlPanel theme logic remains identical ... */}
        {activeTab === 'theme' && (
          <div className="pb-20">
            {/* STICKY APPLY BAR */}
            {hasPendingChanges && (
              <div className="m-4 mb-0 rounded-[1.25rem] border border-emerald-300/25 bg-emerald-400/10 p-3 sticky top-3 z-20 backdrop-blur-xl shadow-2xl shadow-black/30 animate-fade-in">
                <div className="flex gap-2">
                  <button
                    onClick={applyChanges}
                    className="flex-1 bg-emerald-400 hover:bg-emerald-300 text-slate-950 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-950/30 flex items-center justify-center gap-2 transition-all"
                  >
                    <PlayCircle size={14} /> Aplicar al vivo
                  </button>
                  <button
                    onClick={discardChanges}
                    className="px-4 py-2.5 rounded-xl border border-red-400/40 text-red-300 bg-red-500/10 hover:bg-red-500/20 text-xs font-bold uppercase transition-all"
                  >
                    <X size={14} />
                  </button>
                </div>
                <p className="text-[9px] text-emerald-200/80 text-center mt-1.5">Los cambios estan en vista previa hasta aplicarlos.</p>
              </div>
            )}

            {/* --- 1. PAGE SETUP BAR --- */}
            <div className="m-4 rounded-[1.35rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(8,13,25,0.82))] p-4 shadow-2xl shadow-black/20">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-300">Editor de slide</p>
                  <h2 className="mt-1 text-lg font-black text-white">Formato y composicion</h2>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2 text-[10px] font-black uppercase text-slate-300">
                  {activeSlideType === 'image' ? 'Imagen' : activeSlideType === 'youtube' ? 'Video' : 'Texto'}
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-1.5 block">Formato</span>
                  <select
                    value={currentTheme.aspectRatio || '16/9'}
                    onChange={(e) => updatePendingTheme({ ...currentTheme, aspectRatio: e.target.value })}
                    className="w-full bg-slate-950/70 text-xs text-white p-2.5 rounded-xl border border-white/10 outline-none hover:border-cyan-300/40 transition-colors"
                  >
                    {ASPECT_RATIOS.map(ar => <option key={ar.val} value={ar.val}>{ar.label}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Margen</span>
                    <span className="text-cyan-300">{currentTheme.padding}</span>
                  </span>
                  <input
                    type="range" min="0" max="16" step="1"
                    value={currentTheme.padding}
                    onChange={(e) => updatePendingTheme({ ...currentTheme, padding: parseInt(e.target.value) })}
                    className="w-full h-2 bg-slate-800 rounded-full accent-cyan-400 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 pt-0 space-y-5">
              {!hasActiveItem && <div className="bg-yellow-900/30 text-yellow-500 p-4 rounded-xl text-xs border border-yellow-700/50 text-center font-medium">Selecciona un elemento de la lista para editarlo</div>}

              <div className={!hasActiveItem ? 'opacity-40 pointer-events-none' : ''}>

                {/* HEADER ACTIONS: Undo & Restore Original & History */}
                <div className="grid grid-cols-3 gap-2 mb-5 rounded-[1.25rem] border border-white/10 bg-white/[0.035] p-2">
                  <button
                    onClick={() => setShowHistoryPanel(true)}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-indigo-400/25 text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/20 text-[10px] font-black uppercase tracking-wider transition-all"
                  >
                    <Clock size={12} /> Historial
                  </button>
                  <button
                    onClick={onUndo}
                    disabled={!canUndo}
                    className={`flex items-center justify-center gap-2 py-2.5 text-[10px] font-black uppercase tracking-wider transition-all rounded-xl ${canUndo ? 'bg-white/[0.06] border border-white/10 text-white hover:bg-white/[0.1]' : 'bg-slate-950/40 border border-white/[0.06] text-gray-600 cursor-not-allowed'}`}
                  >
                    <RotateCcw size={12} /> Deshacer
                  </button>
                  <button
                    onClick={onRestoreOriginal}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-amber-400/25 text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 text-[10px] font-black uppercase tracking-wider transition-all"
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
                          onClick={() => updatePendingTheme(keepLogoSettings({ ...currentTheme, ...preset, id: currentTheme.id }))}
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
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleDefaultTheme(theme.id);
                                }}
                                className={`absolute top-1 left-1 w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                                  theme.isDefault
                                    ? 'bg-yellow-400 text-gray-950 border-yellow-200 shadow-lg shadow-yellow-400/30'
                                    : 'bg-black/50 text-white/70 border-white/20 opacity-0 group-hover:opacity-100 hover:bg-yellow-400 hover:text-gray-950'
                                }`}
                                title={theme.isDefault ? 'Tema predeterminado' : 'Usar como predeterminado'}
                              >
                                <Star size={12} fill={theme.isDefault ? 'currentColor' : 'none'} />
                              </button>
                              <button
                                onClick={() => updatePendingTheme(keepLogoSettings({ ...currentTheme, ...theme, id: currentTheme.id }))}
                                className={`w-full p-3 rounded-lg text-left transition-all border-2 hover:scale-[1.02] ${currentTheme.background === theme.background
                                  ? 'border-amber-500 ring-2 ring-amber-500/30'
                                  : 'border-gray-700 hover:border-gray-500'
                                  }`}
                                style={{ background: theme.background }}
                              >
                                <div
                                  className="text-[10px] font-bold truncate pr-6 pl-4"
                                  style={{
                                    color: theme.textColor,
                                    textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                                  }}
                                >
                                  {theme.name}
                                </div>
                                {theme.isDefault && (
                                  <div className="mt-1 text-[8px] font-black uppercase text-yellow-200 drop-shadow">
                                    Predeterminado
                                  </div>
                                )}
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
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditTheme(theme);
                                }}
                                className="absolute bottom-1 right-1 w-6 h-6 bg-gray-950/75 hover:bg-indigo-600 rounded-full border border-white/15 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                                title="Editar tema"
                              >
                                <Edit2 size={11} className="text-white" />
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
                        placeholder="Nombre del tema (ej: Mi Tema Adoracion)"
                        className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-600 outline-none focus:border-amber-500 mb-3"
                        autoFocus
                      />

                      <button
                        type="button"
                        onClick={() => setSaveThemeAsDefault(prev => !prev)}
                        className={`w-full mb-4 px-4 py-3 rounded-lg border flex items-center gap-3 text-left transition-all ${
                          saveThemeAsDefault
                            ? 'bg-yellow-500/15 border-yellow-400/60 text-yellow-100'
                            : 'bg-gray-800/70 border-gray-700 text-gray-300 hover:border-yellow-500/40'
                        }`}
                      >
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center ${saveThemeAsDefault ? 'bg-yellow-400 text-gray-950' : 'bg-gray-700 text-gray-400'}`}>
                          <Star size={16} fill={saveThemeAsDefault ? 'currentColor' : 'none'} />
                        </span>
                        <span className="flex-1">
                          <span className="block text-sm font-black">Usar como tema predeterminado</span>
                          <span className="block text-[10px] text-gray-400">Se aplicara automaticamente a nuevos textos, imagenes, PDF y PowerPoint.</span>
                        </span>
                      </button>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setShowSaveThemeModal(false);
                            setSaveThemeAsDefault(false);
                          }}
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

                {editingTheme && (
                  <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6 w-full max-w-md shadow-2xl">
                      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Edit2 size={20} className="text-indigo-400" />
                        Editar Tema
                      </h3>

                      <div
                        className="h-24 rounded-lg mb-4 flex items-center justify-center border border-gray-600"
                        style={{ background: editingTheme.background }}
                      >
                        <span
                          className="text-sm font-bold"
                          style={{
                            color: editingTheme.textColor,
                            fontFamily: editingTheme.fontFamily,
                            textShadow: editingTheme.shadow ? '2px 2px 4px rgba(0,0,0,0.5)' : 'none'
                          }}
                        >
                          {editingTheme.name}
                        </span>
                      </div>

                      <input
                        type="text"
                        value={editingThemeName}
                        onChange={(e) => setEditingThemeName(e.target.value)}
                        placeholder="Nombre del tema"
                        className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-600 outline-none focus:border-indigo-500 mb-3"
                        autoFocus
                      />

                      <button
                        type="button"
                        onClick={() => setEditingThemeDefault(prev => !prev)}
                        className={`w-full mb-4 px-4 py-3 rounded-lg border flex items-center gap-3 text-left transition-all ${
                          editingThemeDefault
                            ? 'bg-yellow-500/15 border-yellow-400/60 text-yellow-100'
                            : 'bg-gray-800/70 border-gray-700 text-gray-300 hover:border-yellow-500/40'
                        }`}
                      >
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center ${editingThemeDefault ? 'bg-yellow-400 text-gray-950' : 'bg-gray-700 text-gray-400'}`}>
                          <Star size={16} fill={editingThemeDefault ? 'currentColor' : 'none'} />
                        </span>
                        <span className="flex-1">
                          <span className="block text-sm font-black">Tema predeterminado</span>
                          <span className="block text-[10px] text-gray-400">Puedes prenderlo o apagarlo cuando quieras.</span>
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => saveThemeEdits(true)}
                        className="w-full mb-4 py-2.5 rounded-lg bg-indigo-600/20 border border-indigo-500/40 text-indigo-200 hover:bg-indigo-600/30 transition-all font-bold text-xs"
                      >
                        Reemplazar con el estilo actual
                      </button>

                      <div className="flex gap-2">
                        <button
                          onClick={closeEditTheme}
                          className="flex-1 py-2.5 rounded-lg border border-gray-600 text-gray-400 hover:text-white hover:border-gray-500 transition-all font-bold text-sm"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => saveThemeEdits(false)}
                          disabled={!editingThemeName.trim()}
                          className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
                    <div className="overflow-hidden rounded-[1.35rem] border border-sky-300/20 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(8,13,25,0.92))] shadow-2xl shadow-black/25">
                      <button onClick={() => toggleSection('typography')} className="w-full p-4 flex items-center justify-between hover:bg-white/[0.035] transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-400/12 text-sky-200 border border-sky-300/20"><Type size={17} /></div>
                          <div className="text-left">
                            <p className="text-[10px] uppercase text-sky-300 font-black tracking-[0.22em]">Tipografia Basica</p>
                            <p className="mt-1 text-xs font-bold text-slate-400">Fuente, tamano, alineacion y color de letra</p>
                          </div>
                        </div>
                        <ChevronDown size={16} className={`text-sky-200 transition-transform duration-300 ${expandedSections.typography ? 'rotate-180' : ''}`} />
                      </button>
                      {expandedSections.typography && (
                        <div className="p-4 pt-0 space-y-4 animate-fade-in border-t border-white/10">
                          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/45 p-3">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-300">Vista de texto</p>
                                <p className="mt-1 text-xs font-bold text-slate-500">Los cambios aqui no afectan el logo.</p>
                              </div>
                              <span className="rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1 text-[10px] font-black uppercase text-sky-100">Texto</span>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-black/35 p-4 text-center">
                              <span style={{ fontFamily: currentTheme.fontFamily, color: currentTheme.textColor, fontWeight: currentTheme.fontWeight, fontStyle: currentTheme.fontStyle, letterSpacing: `${currentTheme.letterSpacing}px` }} className="text-lg">Vista previa</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-[1fr_112px] gap-3">
                            <label className="rounded-2xl border border-white/10 bg-slate-950/45 p-3">
                              <span className="mb-2 block text-[10px] font-black uppercase text-slate-400">Familia</span>
                              <select value={currentTheme.fontFamily} onChange={(e) => updatePendingTheme({ ...currentTheme, fontFamily: e.target.value })} className="h-10 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-xs font-bold text-white outline-none">
                                {FONTS.map(font => <option key={font.name} value={font.value}>{font.name}</option>)}
                              </select>
                            </label>
                            <label className="rounded-2xl border border-white/10 bg-slate-950/45 p-3">
                              <span className="mb-2 block text-[10px] font-black uppercase text-slate-400">Tamano</span>
                              <select value={getCurrentFontSizeIndex()} onChange={(e) => updatePendingTheme({ ...currentTheme, fontSize: FONT_SIZES[parseInt(e.target.value)].val })} className="h-10 w-full rounded-xl border border-white/10 bg-slate-900 px-2 text-xs font-bold text-white outline-none">
                                {FONT_SIZES.map((fs, i) => <option key={i} value={i}>{fs.label}</option>)}
                              </select>
                            </label>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-3">
                              <span className="mb-2 block text-[10px] font-black uppercase text-slate-400">Estilo</span>
                              <div className="grid grid-cols-4 gap-2">
                                <button onClick={() => updatePendingTheme({ ...currentTheme, fontWeight: currentTheme.fontWeight === 'bold' ? 'normal' : 'bold' })} className={`h-10 rounded-xl border text-sm font-black transition ${currentTheme.fontWeight !== 'normal' ? 'border-sky-300/60 bg-sky-400/18 text-white' : 'border-white/10 text-slate-400'}`}><Bold size={15} className="mx-auto" /></button>
                                <button onClick={() => updatePendingTheme({ ...currentTheme, fontStyle: currentTheme.fontStyle === 'italic' ? 'normal' : 'italic' })} className={`h-10 rounded-xl border text-sm font-black transition ${currentTheme.fontStyle === 'italic' ? 'border-sky-300/60 bg-sky-400/18 text-white' : 'border-white/10 text-slate-400'}`}><Italic size={15} className="mx-auto" /></button>
                                <button onClick={() => toggleDecoration('underline')} className={`h-10 rounded-xl border text-sm font-black transition ${currentTheme.textDecoration.includes('underline') ? 'border-sky-300/60 bg-sky-400/18 text-white' : 'border-white/10 text-slate-400'}`}><Underline size={15} className="mx-auto" /></button>
                                <button onClick={() => updatePendingTheme({ ...currentTheme, textDecoration: currentTheme.textDecoration.includes('line-through') ? 'none' : 'line-through' })} className={`h-10 rounded-xl border text-sm font-black transition ${currentTheme.textDecoration.includes('line-through') ? 'border-sky-300/60 bg-sky-400/18 text-white' : 'border-white/10 text-slate-400'}`}><Strikethrough size={15} className="mx-auto" /></button>
                              </div>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-3">
                              <span className="mb-2 block text-[10px] font-black uppercase text-slate-400">Alineacion</span>
                              <div className="grid grid-cols-3 gap-2">
                                <button onClick={() => updatePendingTheme({ ...currentTheme, alignment: 'left' })} className={`h-10 rounded-xl border transition ${currentTheme.alignment === 'left' ? 'border-sky-300/60 bg-sky-400/18 text-white' : 'border-white/10 text-slate-400'}`}><AlignLeft size={15} className="mx-auto" /></button>
                                <button onClick={() => updatePendingTheme({ ...currentTheme, alignment: 'center' })} className={`h-10 rounded-xl border transition ${currentTheme.alignment === 'center' ? 'border-sky-300/60 bg-sky-400/18 text-white' : 'border-white/10 text-slate-400'}`}><AlignCenter size={15} className="mx-auto" /></button>
                                <button onClick={() => updatePendingTheme({ ...currentTheme, alignment: 'right' })} className={`h-10 rounded-xl border transition ${currentTheme.alignment === 'right' ? 'border-sky-300/60 bg-sky-400/18 text-white' : 'border-white/10 text-slate-400'}`}><AlignRight size={15} className="mx-auto" /></button>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-3 space-y-3">
                              <div className="flex items-center justify-between"><span className="text-[10px] font-black uppercase text-slate-400">Color letra</span><input type="color" value={currentTheme.textColor || '#ffffff'} onChange={(e) => updatePendingTheme({ ...currentTheme, textColor: e.target.value })} className="h-9 w-11 rounded-xl border border-white/10 bg-slate-900" /></div>
                              <div className="flex flex-wrap gap-1.5">
                                {['#ffffff', '#facc15', '#fb923c', '#ef4444', '#f472b6', '#a78bfa', '#60a5fa', '#34d399'].map(color => <button key={color} onClick={() => updatePendingTheme({ ...currentTheme, textColor: color })} className={`h-6 w-6 rounded-full border border-white/10 ${currentTheme.textColor === color ? 'ring-2 ring-sky-300 ring-offset-2 ring-offset-slate-950' : ''}`} style={{ backgroundColor: color }} />)}
                              </div>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-3 space-y-3">
                              <div className="flex items-center justify-between"><span className="text-[10px] font-black uppercase text-slate-400">Resaltado</span><input type="color" value={currentTheme.textBackgroundColor && currentTheme.textBackgroundColor !== 'transparent' ? currentTheme.textBackgroundColor : '#000000'} onChange={(e) => updatePendingTheme({ ...currentTheme, textBackgroundColor: e.target.value })} className="h-9 w-11 rounded-xl border border-white/10 bg-slate-900" /></div>
                              <button onClick={() => updatePendingTheme({ ...currentTheme, textBackgroundColor: 'transparent' })} className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2 text-[10px] font-black uppercase text-slate-300">Quitar resaltado</button>
                            </div>
                          </div>

                          <button onClick={resetTextStyle} className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 text-[10px] font-black uppercase text-slate-300 hover:text-white hover:bg-white/[0.08] flex items-center justify-center gap-2"><Eraser size={13} /> Limpiar solo texto</button>
                        </div>
                      )}
                    </div>

                    {/* SECTION: Shadows & Glow */}
                    <div className="overflow-hidden rounded-[1.35rem] border border-amber-300/20 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(8,13,25,0.92))] shadow-2xl shadow-black/25">
                      <button onClick={() => toggleSection('shadows')} className="w-full p-4 flex items-center justify-between hover:bg-white/[0.035] transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-400/12 text-amber-200 border border-amber-300/20"><BoxSelect size={17} /></div>
                          <div className="text-left">
                            <p className="text-[10px] uppercase text-amber-300 font-black tracking-[0.22em]">Sombras & Brillo</p>
                            <p className="mt-1 text-xs font-bold text-slate-400">Profundidad, glow y posicion de sombra</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div onClick={(e) => { e.stopPropagation(); updatePendingTheme({ ...currentTheme, shadow: !currentTheme.shadow }); }} className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${currentTheme.shadow ? 'bg-amber-400' : 'bg-slate-700'}`}><div className={`h-4 w-4 rounded-full bg-white transition-transform ${currentTheme.shadow ? 'translate-x-5' : 'translate-x-0'}`} /></div>
                          <ChevronDown size={16} className={`text-amber-200 transition-transform duration-300 ${expandedSections.shadows ? 'rotate-180' : ''}`} />
                        </div>
                      </button>
                      {expandedSections.shadows && (
                        <div className="p-4 pt-0 space-y-4 animate-fade-in border-t border-white/10">
                          <div className={`mt-4 space-y-4 transition-opacity ${!currentTheme.shadow ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                            <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-3">
                              <div className="mb-3 flex items-center justify-between"><span className="text-[10px] font-black uppercase text-slate-400">Color sombra</span><input type="color" value={currentTheme.shadowColor || '#000000'} onChange={(e) => updatePendingTheme({ ...currentTheme, shadowColor: e.target.value })} className="h-9 w-11 rounded-xl border border-white/10 bg-slate-900" /></div>
                              <div className="grid grid-cols-3 gap-2">
                                {[{ label: 'Suave', blur: 8, x: 2, y: 3 }, { label: 'Profunda', blur: 18, x: 5, y: 8 }, { label: 'Glow', blur: 28, x: 0, y: 0 }].map(p => <button key={p.label} onClick={() => updatePendingTheme({ ...currentTheme, shadow: true, shadowBlur: p.blur, shadowOffsetX: p.x, shadowOffsetY: p.y })} className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-2 text-[10px] font-black uppercase text-slate-300 hover:border-amber-300/40 hover:text-white">{p.label}</button>)}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              {renderRangeControl('Difuminado', currentTheme.shadowBlur || 0, 0, 70, 1, (value) => updatePendingTheme({ ...currentTheme, shadowBlur: value }), 'px', 'accent-amber-400')}
                              {renderRangeControl('Sombra X', currentTheme.shadowOffsetX || 0, -60, 60, 1, (value) => updatePendingTheme({ ...currentTheme, shadowOffsetX: value }), 'px', 'accent-amber-400')}
                              {renderRangeControl('Sombra Y', currentTheme.shadowOffsetY || 0, -60, 60, 1, (value) => updatePendingTheme({ ...currentTheme, shadowOffsetY: value }), 'px', 'accent-amber-400')}
                              {renderRangeControl('Spread visual', currentTheme.textShadowSpread || 0, 0, 40, 1, (value) => updatePendingTheme({ ...currentTheme, textShadowSpread: value }), 'px', 'accent-amber-400')}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SECTION: Transformation */}
                    <div className="overflow-hidden rounded-[1.35rem] border border-emerald-300/20 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(8,13,25,0.92))] shadow-2xl shadow-black/25">
                      <button onClick={() => toggleSection('transformation')} className="w-full p-4 flex items-center justify-between hover:bg-white/[0.035] transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-400/12 text-emerald-200 border border-emerald-300/20"><Monitor size={17} /></div>
                          <div className="text-left">
                            <p className="text-[10px] uppercase text-emerald-300 font-black tracking-[0.22em]">Transformacion Avanzada</p>
                            <p className="mt-1 text-xs font-bold text-slate-400">Mayusculas, giro, inclinacion y caja de resaltado</p>
                          </div>
                        </div>
                        <ChevronDown size={16} className={`text-emerald-200 transition-transform duration-300 ${expandedSections.transformation ? 'rotate-180' : ''}`} />
                      </button>
                      {expandedSections.transformation && (
                        <div className="p-4 pt-0 space-y-4 animate-fade-in border-t border-white/10">
                          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/45 p-3">
                            <label className="mb-2 block text-[10px] font-black uppercase text-slate-400">Formato</label>
                            <select value={currentTheme.textCase} onChange={(e) => updatePendingTheme({ ...currentTheme, textCase: e.target.value as any })} className="h-10 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-xs font-bold text-white outline-none">
                              <option value="none">Normal</option>
                              <option value="uppercase">MAYUSCULAS</option>
                              <option value="capitalize">Capitalizado</option>
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            {renderRangeControl('Giro texto', currentTheme.textRotation || 0, -180, 180, 1, (value) => updatePendingTheme({ ...currentTheme, textRotation: value }), 'deg', 'accent-emerald-400')}
                            {renderRangeControl('Inclinacion', currentTheme.textSkewX || 0, -45, 45, 1, (value) => updatePendingTheme({ ...currentTheme, textSkewX: value }), 'deg', 'accent-emerald-400')}
                            {renderRangeControl('Margen resaltado', currentTheme.textHighlightPadding || 8, 0, 48, 1, (value) => updatePendingTheme({ ...currentTheme, textHighlightPadding: value }), 'px', 'accent-emerald-400')}
                            {renderRangeControl('Radio resaltado', currentTheme.textHighlightRadius || 4, 0, 40, 1, (value) => updatePendingTheme({ ...currentTheme, textHighlightRadius: value }), 'px', 'accent-emerald-400')}
                          </div>
                          <button onClick={() => updatePendingTheme({ ...currentTheme, textRotation: 0, textSkewX: 0, textHighlightPadding: 8, textHighlightRadius: 4 })} className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 text-[10px] font-black uppercase text-slate-300 hover:text-white hover:bg-white/[0.08]">Restablecer transformacion</button>
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
                        <div className="flex items-center gap-2"><ImageIcon size={14} /> Composicion</div>
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
                            <div className="flex justify-between text-[10px] text-gray-300 mb-2 font-bold uppercase"><span>Rotacion</span><span className="text-pink-400">{currentTheme.imageContentRotation || 0} deg</span></div>
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
                                <div className="flex justify-between text-[8px] text-gray-500 mb-1 font-bold uppercase"><span>Tono</span><span>{currentTheme.imageContentHueRotate || 0} deg</span></div>
                                <input type="range" min="0" max="360" value={currentTheme.imageContentHueRotate || 0} onChange={(e) => updatePendingTheme({ ...currentTheme, imageContentHueRotate: parseInt(e.target.value) })} className="w-full h-1 bg-gray-700 rounded accent-blue-400" />
                              </div>
                              <div>
                                <div className="flex justify-between text-[8px] text-gray-500 mb-1 font-bold uppercase"><span>Saturacion</span><span>{Math.round((currentTheme.imageContentSaturate || 1) * 100)}%</span></div>
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
                  <div className="overflow-hidden rounded-[1.35rem] border border-cyan-300/20 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(8,13,25,0.9))] shadow-2xl shadow-black/25">
                    <button onClick={() => toggleSection('background')} className="w-full p-4 flex items-center justify-between hover:bg-white/[0.035] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/12 text-cyan-200 border border-cyan-300/20">
                          <ImageIcon size={17} />
                        </div>
                        <div className="text-left">
                          <p className="text-[10px] uppercase text-cyan-300 font-black tracking-[0.22em]">Fondo General</p>
                          <p className="mt-1 text-xs font-bold text-slate-400">Imagen, color, overlay y movimiento</p>
                        </div>
                      </div>
                      <ChevronDown size={16} className={`text-cyan-200 transition-transform duration-300 ${expandedSections.background ? 'rotate-180' : ''}`} />
                    </button>
                    {expandedSections.background && (
                      <div className="p-4 pt-0 space-y-4 animate-fade-in border-t border-white/10">
                        <div
                          className="relative mt-4 aspect-video overflow-hidden rounded-2xl border border-white/10 shadow-inner"
                          style={{
                            background: currentTheme.background,
                            filter: `brightness(${currentTheme.bgBrightness}) blur(${currentTheme.bgImageBlur}px)`
                          }}
                        >
                          <div className="absolute inset-0" style={{ backgroundColor: currentTheme.bgOverlayColor, opacity: currentTheme.bgOverlayOpacity }} />
                          <div className="absolute bottom-3 left-3 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[10px] font-black uppercase text-white/80 backdrop-blur">Vista previa</div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-slate-950/55 p-1.5">
                          <button onClick={() => setBgMode('image')} className={`py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${bgMode === 'image' ? 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-950/25' : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'}`}>Imagen</button>
                          <button onClick={() => setBgMode('solid')} className={`py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${bgMode === 'solid' ? 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-950/25' : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'}`}>Solido</button>
                          <button onClick={() => setBgMode('gradient')} className={`py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${bgMode === 'gradient' ? 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-950/25' : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'}`}>Degradado</button>
                        </div>
                        {bgMode === 'image' && (
                          <div className="space-y-3">
                            <input type="text" placeholder="Pega URL de imagen..." className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-3 text-xs text-white outline-none focus:border-cyan-300/50" onChange={(e) => { if (e.target.value) updatePendingTheme({ ...currentTheme, background: `url(${e.target.value}) center/cover no-repeat` }); }} />
                            <button
                              onClick={() => bgFileInputRef.current?.click()}
                              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-300/25 bg-cyan-400/12 p-3 text-cyan-100 transition-all hover:bg-cyan-400/18"
                            >
                              <Upload size={16} />
                              <span className="text-xs font-black uppercase">Subir Fondo Personalizado</span>
                            </button>
                            <input type="file" accept="image/*" ref={bgFileInputRef} className="hidden" onChange={handleBgUpload} />
                          </div>
                        )}
                        {bgMode === 'solid' && (
                          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/50 p-3">
                            <input type="color" value={currentTheme.background.startsWith('#') ? currentTheme.background : '#000000'} className="h-11 w-14 rounded-xl border border-white/10 bg-slate-900 cursor-pointer" onChange={(e) => updatePendingTheme({ ...currentTheme, background: e.target.value })} />
                            <div>
                              <p className="text-xs font-black text-white">Color de fondo</p>
                              <p className="text-[10px] font-bold uppercase text-slate-500">{currentTheme.background.startsWith('#') ? currentTheme.background : 'personalizado'}</p>
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          {renderRangeControl('Brillo fondo', Math.round(currentTheme.bgBrightness * 100), 0, 200, 5, (value) => updatePendingTheme({ ...currentTheme, bgBrightness: value / 100 }), '%', 'accent-cyan-400')}
                          {renderRangeControl('Desenfoque', currentTheme.bgImageBlur, 0, 20, 1, (value) => updatePendingTheme({ ...currentTheme, bgImageBlur: value }), 'px', 'accent-cyan-400')}
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

                        <div className="rounded-[1.2rem] border border-cyan-300/15 bg-slate-950/35 p-3">
                          <div className="mb-3 flex items-center justify-between">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">Animacion del fondo</p>
                              <p className="mt-1 text-xs font-bold text-slate-500">Presets con velocidad, cantidad, color, direccion y forma.</p>
                            </div>
                          </div>
                          {renderBackgroundAnimationEditor(
                            currentTheme.bgAnimation,
                            (bgAnimation) => updatePendingTheme({ ...currentTheme, bgAnimation }),
                            'accent-cyan-400'
                          )}
                        </div>
                        <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/35 p-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-cyan-300 font-black uppercase tracking-[0.2em]">Capa Overlay</span>
                            <div className="flex items-center gap-2">
                              <input type="color" value={currentTheme.bgOverlayColor} onChange={(e) => updatePendingTheme({ ...currentTheme, bgOverlayColor: e.target.value })} className="h-8 w-10 rounded-xl border border-white/10 bg-slate-900" />
                              <span className="text-[8px] text-gray-500 font-mono">{currentTheme.bgOverlayColor}</span>
                            </div>
                          </div>
                          {renderRangeControl('Opacidad overlay', Math.round(currentTheme.bgOverlayOpacity * 100), 0, 100, 5, (value) => updatePendingTheme({ ...currentTheme, bgOverlayOpacity: value / 100 }), '%', 'accent-cyan-400')}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ACCORDION: Advanced Effects */}
                  {/* ACCORDION: Advanced Effects */}
                  <div className="overflow-hidden rounded-[1.35rem] border border-violet-300/20 bg-[linear-gradient(180deg,rgba(17,24,39,0.92),rgba(10,15,28,0.92))] shadow-2xl shadow-black/25">
                    <button onClick={() => toggleSection('effects')} className="w-full p-4 flex items-center justify-between hover:bg-white/[0.035] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-400/12 text-violet-200 border border-violet-300/20">
                          <Highlighter size={17} />
                        </div>
                        <div className="text-left">
                          <p className="text-[10px] uppercase text-violet-300 font-black tracking-[0.22em]">Efectos & Animacion</p>
                          <p className="mt-1 text-xs font-bold text-slate-400">Entrada, borde, opacidad, espaciado y transformacion</p>
                        </div>
                      </div>
                      <ChevronDown size={16} className={`text-violet-200 transition-transform duration-300 ${expandedSections.effects ? 'rotate-180' : ''}`} />
                    </button>
                    {expandedSections.effects && (
                      <div className="p-4 pt-0 space-y-4 animate-fade-in border-t border-white/10">
                        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/45 p-3">
                          <div className="mb-3 flex items-center justify-between">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-300">Animacion de entrada</p>
                              <p className="mt-1 text-xs font-bold text-slate-500">Elige como aparece cada slide en pantalla.</p>
                            </div>
                            <select value={currentTheme.animation} onChange={(e) => updatePendingTheme({ ...currentTheme, animation: e.target.value as AnimationType })} className="max-w-[155px] rounded-xl border border-white/10 bg-slate-900 px-2 py-2 text-[10px] font-bold text-white outline-none">
                              {ANIMATIONS.map(anim => <option key={anim.value} value={anim.value}>{anim.name}</option>)}
                            </select>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { label: 'Limpio', value: 'fade' as AnimationType },
                              { label: 'Subir', value: 'fade-slide-up' as AnimationType },
                              { label: 'Zoom', value: 'zoom-in' as AnimationType },
                              { label: 'Blur', value: 'blur-in' as AnimationType },
                              { label: 'Rebote', value: 'bounce-in' as AnimationType },
                              { label: 'Ninguna', value: 'none' as AnimationType }
                            ].map(option => (
                              <button
                                key={option.value}
                                onClick={() => updatePendingTheme({ ...currentTheme, animation: option.value })}
                                className={`rounded-xl border px-2 py-2 text-[10px] font-black uppercase transition ${currentTheme.animation === option.value ? 'border-violet-300/70 bg-violet-400/18 text-violet-100' : 'border-white/10 bg-white/[0.045] text-slate-400 hover:text-white hover:border-violet-300/35'}`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <label className="rounded-2xl border border-white/10 bg-slate-950/45 p-3">
                            <span className="mb-2 flex items-center justify-between text-[10px] font-black uppercase text-slate-400">
                              <span>Borde texto</span>
                              <span>{currentTheme.textStrokeWidth}px</span>
                            </span>
                            <div className="flex items-center gap-3">
                              <input type="color" value={currentTheme.textStrokeColor} onChange={(e) => updatePendingTheme({ ...currentTheme, textStrokeColor: e.target.value })} className="h-9 w-10 rounded-xl border border-white/10 bg-slate-900" />
                              <input type="range" min="0" max="8" step="0.5" value={currentTheme.textStrokeWidth} onChange={(e) => updatePendingTheme({ ...currentTheme, textStrokeWidth: parseFloat(e.target.value) })} className="w-full h-1.5 bg-slate-700 rounded-full accent-violet-400" />
                            </div>
                          </label>
                          {renderRangeControl('Opacidad texto', Math.round(currentTheme.textOpacity * 100), 10, 100, 5, (value) => updatePendingTheme({ ...currentTheme, textOpacity: value / 100 }), '%', 'accent-violet-400')}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          {renderRangeControl('Interlineado', Number(currentTheme.lineHeight), 0.8, 2.4, 0.1, (value) => updatePendingTheme({ ...currentTheme, lineHeight: value }), 'x', 'accent-violet-400')}
                          {renderRangeControl('Espaciado', Number(currentTheme.letterSpacing), -2, 12, 0.5, (value) => updatePendingTheme({ ...currentTheme, letterSpacing: value }), 'px', 'accent-violet-400')}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          {renderRangeControl('Rotacion', currentTheme.textRotation || 0, -45, 45, 1, (value) => updatePendingTheme({ ...currentTheme, textRotation: value }), 'deg', 'accent-violet-400')}
                          {renderRangeControl('Inclinacion', currentTheme.textSkewX || 0, -30, 30, 1, (value) => updatePendingTheme({ ...currentTheme, textSkewX: value }), 'deg', 'accent-violet-400')}
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-3">
                          <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-violet-300">Color avanzado de texto</p>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { label: 'Normal', value: null },
                              { label: 'Dorado', value: 'linear-gradient(90deg,#fde68a,#f59e0b,#fff7ed)' },
                              { label: 'Cielo', value: 'linear-gradient(90deg,#67e8f9,#818cf8,#f0abfc)' }
                            ].map(option => (
                              <button
                                key={option.label}
                                onClick={() => updatePendingTheme({ ...currentTheme, textGradient: option.value })}
                                className={`h-12 rounded-xl border text-[10px] font-black uppercase transition ${currentTheme.textGradient === option.value ? 'border-violet-300/70 text-white' : 'border-white/10 text-slate-300 hover:border-violet-300/35'}`}
                                style={{ background: option.value || 'rgba(15,23,42,0.85)' }}
                              >
                                {option.label}
                              </button>
                            ))}
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

      {/* Toast Notification HUD */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[99999] pointer-events-auto">
          <div className={`px-5 py-3.5 rounded-2xl backdrop-blur-xl border flex items-center gap-3 shadow-2xl transition-all duration-300 animate-fade-in ${
            toast.type === 'success' 
              ? 'bg-emerald-950/85 border-emerald-500/30 text-emerald-300' 
              : toast.type === 'error'
              ? 'bg-rose-950/85 border-rose-500/30 text-rose-300'
              : 'bg-slate-900/85 border-slate-700/50 text-slate-200'
          }`}>
            {toast.type === 'success' && <Check size={14} className="text-emerald-400 shrink-0" />}
            {toast.type === 'error' && <AlertCircle size={14} className="text-rose-400 shrink-0" />}
            <span className="text-[10px] font-black uppercase tracking-wider">{toast.message}</span>
            <button 
              onClick={() => setToast(null)} 
              className="text-slate-400 hover:text-white ml-2 shrink-0 transition-colors"
              type="button"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Rename Import Modal */}
      {pendingVideoImport && (
        <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700/60 rounded-3xl p-6 w-full max-w-md shadow-2xl text-left relative overflow-hidden">
            {/* Elemento decorativo del fondo */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                pendingVideoImport.action === 'project' 
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
                  : 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-400'
              }`}>
                {pendingVideoImport.action === 'project' ? <Plus size={18} /> : <Music size={18} />}
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">
                  {pendingVideoImport.action === 'project' ? 'Personalizar Nombre de Video' : 'Personalizar Nombre de Audio'}
                </h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                  Establece un titulo descriptivo para la lista
                </p>
              </div>
            </div>

            <p className="text-[10px] text-slate-300 font-medium leading-relaxed mb-4">
              Escribe como deseas que aparezca este elemento en el proyector y el panel de control:
            </p>

            {pendingVideoImport.action === 'project' && (
              <div className="mb-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">
                  Destino
                </p>
                <p className="mt-1 text-[11px] font-bold text-slate-100">
                  {hasActiveItem && pendingVideoImport.destination !== 'new'
                    ? 'Se agregara al elemento que tienes seleccionado.'
                    : 'Se creara un elemento nuevo en la lista.'}
                </p>
              </div>
            )}

            <div className="space-y-4 mb-5">
              <input
                ref={renameInputRef}
                type="text"
                value={importName}
                onChange={(e) => setImportName(e.target.value)}
                placeholder={pendingVideoImport.defaultName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    confirmVideoImport();
                  } else if (e.key === 'Escape') {
                    cancelVideoImport();
                  }
                }}
                className="w-full bg-slate-950/70 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-xs outline-none focus:border-violet-500/80 transition-all font-bold"
                autoFocus
              />
              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">
                ID del Video: <span className="text-slate-400 font-mono">{pendingVideoImport.videoId}</span>
              </span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelVideoImport}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 bg-white/5 active:scale-95 transition-all font-black text-[9px] uppercase tracking-wider"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => confirmVideoImport()}
                className={`flex-1 py-2.5 rounded-xl text-white active:scale-95 transition-all font-black text-[9px] uppercase tracking-wider ${
                  pendingVideoImport.action === 'project'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-950/30'
                    : 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-950/30'
                }`}
              >
                Guardar y Aplicar
              </button>
            </div>
            {pendingVideoImport.action === 'project' && hasActiveItem && pendingVideoImport.destination !== 'new' && (
              <button
                type="button"
                onClick={() => confirmVideoImport('new')}
                className="mt-2 w-full py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:border-emerald-500/60 bg-slate-950/50 active:scale-95 transition-all font-black text-[9px] uppercase tracking-wider"
              >
                Pegar en proyecto nuevo
              </button>
            )}
          </div>
        </div>
      )}

      {/* YouTube Full-Screen Browser Portal */}
      {renderYoutubeFullBrowser()}
    </div>
  );
};

export default ControlPanel;

