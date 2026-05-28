import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ControlPanel from './components/ControlPanel';
import { ReflowEditor } from './components/ReflowEditor';
import Playlist from './components/Playlist';
import LiveScreen from './components/LiveScreen';
import Onboarding from './components/Onboarding';
import MobileConnectModal from './components/MobileConnectModal';
import RemoteControlPanel from './components/RemoteControlPanel';
import TimerWidget from './components/TimerWidget';
import SplitScreen from './components/SplitScreen';
import ProjectManager from './components/ProjectManager';
import ExportImportModal from './components/ExportImportModal';
import CalendarView from './components/CalendarView';
import ActionHistoryPanel from './components/ActionHistoryPanel';
import { PresentationItem, Theme, Slide, Project } from './types';
import { DEFAULT_THEME } from './constants';
import { Maximize2, Eye, EyeOff, Square, ExternalLink, XCircle, AlignLeft, AlignCenter, AlignRight, Type, Plus, Minus, Image, Eraser, Clock, ChevronLeft, ChevronRight, Monitor, PlayCircle, Music, BookOpen, Trash2, X, Edit2, Check, LogIn, User as UserIcon, LogOut, RefreshCw, Timer, Columns, HelpCircle, Lock, Download, Upload, Calendar, LayoutGrid, Smartphone, History, AlertCircle, FileText } from 'lucide-react';
import { supabase } from './services/supabaseClient';
import { Session } from '@supabase/supabase-js';
import { fetchSongLyrics, fetchBiblePassage, searchSongs, DensityMode } from './services/geminiService';
import { createRealtimeSyncService, realtimeSyncService, actionHistoryService, LiveState } from './services/realtimeService';
import { compressImage } from './services/imageService';
import { storeMediaBlob, stripPlaylistMedia } from './services/mediaBlobStore';
import { isPresentationFile, parsePptxFile, parsePdfFile, getPresentationTypeName } from './services/presentationImportService';

// Mobile Tab Type
type MobileTab = 'control' | 'playlist' | 'preview';

// Sync Confirmation Modal Configuration
interface SyncConfirmConfig {
  title: string;
  message: string;
  itemsList?: string[];
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  type: 'warning' | 'danger' | 'info';
}

const LOCAL_PLAYLIST_KEY = 'flujo_playlist_v2';
const LOCAL_THEMES_KEY = 'oasis_custom_themes';
const LOCAL_PROJECTS_KEY = 'oasis_projects_v2';
const LOCAL_CURRENT_PROJECT_KEY = 'oasis_current_project_id';
const LOCAL_LOGO_SETTINGS_KEY = 'oasis_global_logo_settings_v1';

type LogoSettings = {
  [K in keyof Theme as K extends `logo${string}` ? K : never]: Theme[K];
};

const extractLogoSettings = (theme: Theme): LogoSettings => {
  const settings = {} as any;
  Object.keys(theme).forEach(key => {
    if (key.startsWith('logo')) {
      settings[key] = (theme as any)[key];
    }
  });
  return settings;
};

const applyLogoSettings = (theme: Theme, logoSettings: LogoSettings): Theme => ({
  ...theme,
  ...logoSettings
});

const keepThemeLogoFields = (theme: Theme, source: Theme): Theme => ({
  ...theme,
  ...extractLogoSettings(source)
});

const logoSettingsChanged = (theme: Theme, logoSettings: LogoSettings): boolean =>
  JSON.stringify(extractLogoSettings(theme)) !== JSON.stringify(logoSettings);

function readLocalJson<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

function describeCloudError(error: any, fallback: string): string {
  const rawMessage = String(error?.message || error?.error_description || error?.details || '');
  const lowerMessage = rawMessage.toLowerCase();

  if (lowerMessage.includes('payload') || lowerMessage.includes('too large') || lowerMessage.includes('request entity too large') || lowerMessage.includes('413')) {
    return 'Guardado local. Nube: archivo demasiado grande.';
  }

  if (lowerMessage.includes('jwt') || lowerMessage.includes('auth') || lowerMessage.includes('permission') || lowerMessage.includes('rls')) {
    return 'Guardado local. Nube: vuelve a iniciar sesion.';
  }

  if (lowerMessage.includes('failed to fetch') || lowerMessage.includes('network') || lowerMessage.includes('timeout')) {
    return 'Guardado local. Nube: sin conexion.';
  }

  return rawMessage ? `Guardado local. Nube: ${rawMessage.slice(0, 80)}` : fallback;
}

const App: React.FC = () => {
  const bootParams = new URLSearchParams(window.location.search);
  const initialIsProjectorMode = bootParams.get('projector') === 'true';
  const initialIsRemoteControlMode = bootParams.get('remote') === '1';

  // Security State
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('oasis_authenticated') === 'true';
  });
  const [passcodeInput, setPasscodeInput] = useState('');
  const [authError, setAuthError] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcodeInput === '1291') {
      setIsAuthenticated(true);
      setAuthError(false);
      localStorage.setItem('oasis_authenticated', 'true');
    } else {
      setAuthError(true);
      setPasscodeInput('');
    }
  };

  // Initialize state from LocalStorage if available
  const [playlist, setPlaylist] = useState<PresentationItem[]>(() => {
    if (initialIsProjectorMode || initialIsRemoteControlMode) return [];
    return readLocalJson<PresentationItem[]>(LOCAL_PLAYLIST_KEY, []);
  });

  // Projects/Portfolio System. Cloud is primary when signed in, localStorage is the safety backup.
  const [projects, setProjects] = useState<Project[]>(() => {
    if (initialIsProjectorMode || initialIsRemoteControlMode) return [];
    return readLocalJson<Project[]>(LOCAL_PROJECTS_KEY, []);
  });
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(() => {
    if (initialIsProjectorMode || initialIsRemoteControlMode) return null;
    return localStorage.getItem(LOCAL_CURRENT_PROJECT_KEY);
  });


  // Sync Confirmation Modal State
  const [syncConfirm, setSyncConfirm] = useState<SyncConfirmConfig | null>(null);

  // Collapsible panels state
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false);
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(false);

  const [activeView, setActiveView] = useState<'main' | 'lyrics-search'>('main');
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(-1);
  const [liveItemId, setLiveItemId] = useState<string | null>(null);
  const [liveSlideIndex, setLiveSlideIndex] = useState<number>(-1);
  const [frozenLiveItem, setFrozenLiveItem] = useState<PresentationItem | null>(null);
  const [bgAudioPlaylist, setBgAudioPlaylist] = useState<{ id: string; videoId: string; title: string }[]>([]);
  const [currentAudioIndex, setCurrentAudioIndex] = useState<number>(-1);
  const [isAudioPlaying, setIsAudioPlaying] = useState(true);
  const [audioStartTime, setAudioStartTime] = useState<number>(0);
  const [audioElapsedOffset, setAudioElapsedOffset] = useState<number>(0);
  const audioIframeRef = useRef<HTMLIFrameElement>(null);
  const [isPreviewHidden, setIsPreviewHidden] = useState(false); // BLACKOUT
  const [isTextHidden, setIsTextHidden] = useState(false); // CLEAR TEXT (Background stays)
  const [isBackgroundHidden, setIsBackgroundHidden] = useState(false); // CLEAR BACKGROUND
  const [isLogoActive, setIsLogoActive] = useState(false); // LOGO MODE
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Command Palette States
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [paletteResults, setPaletteResults] = useState<import('./services/geminiService').SongSearchResult[]>([]);
  const [paletteLoading, setPaletteLoading] = useState(false);
  const [paletteActiveIndex, setPaletteActiveIndex] = useState(0);

  // State for External Projector Window
  const [externalWindow, setExternalWindow] = useState<Window | null>(null);
  const [isProjectorMode, setIsProjectorMode] = useState(initialIsProjectorMode);
  const [isProjectorFullscreen, setIsProjectorFullscreen] = useState(() => !!document.fullscreenElement);
  const [showProjectorStartOverlay, setShowProjectorStartOverlay] = useState(initialIsProjectorMode && !document.fullscreenElement);

  // Staged Theme for previewing changes before applying to projector (Hoisted for Sync)
  const [stagedTheme, setStagedTheme] = useState<Theme>(DEFAULT_THEME);
  const [globalLogoSettings, setGlobalLogoSettings] = useState<LogoSettings>(() => {
    if (initialIsRemoteControlMode) return extractLogoSettings(DEFAULT_THEME);
    return readLocalJson<LogoSettings>(LOCAL_LOGO_SETTINGS_KEY, extractLogoSettings(DEFAULT_THEME));
  });

  // Custom Themes (Cloud Synced)
  const [customThemes, setCustomThemes] = useState<Theme[]>(() => {
    if (initialIsProjectorMode || initialIsRemoteControlMode) return [];
    return readLocalJson<Theme[]>(LOCAL_THEMES_KEY, []);
  });

  // Onboarding & Timer states
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return localStorage.getItem('oasis_onboarding_complete') !== 'true';
  });
  const [showTimer, setShowTimer] = useState(false);
  const [showExportImport, setShowExportImport] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showReflow, setShowReflow] = useState(false);
  const [showMobileConnect, setShowMobileConnect] = useState(false);
  const [showActionHistory, setShowActionHistory] = useState(false);

  // Karaoke Mode
  const [isKaraokeActive, setIsKaraokeActive] = useState(false);
  const [karaokeIndex, setKaraokeIndex] = useState(-1); // -1 means no highlight, 0 first word

  // Split Screen mode
  const [showSplitScreen, setShowSplitScreen] = useState(false);
  const [splitLeftSlide, setSplitLeftSlide] = useState<Slide | null>(null);
  const [splitRightSlide, setSplitRightSlide] = useState<Slide | null>(null);
  const [splitRatio, setSplitRatio] = useState(50);
  const [splitFontScale, setSplitFontScale] = useState(0.5);

  // Zoom State
  const [zoomState, setZoomState] = useState<{ scale: number, x: number, y: number } | null>(null);

  // Mobile & Sync State
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [mobileTab, setMobileTab] = useState<MobileTab>('playlist');
  const [session, setSession] = useState<Session | null>(null);
  const [remoteLiveState, setRemoteLiveState] = useState<LiveState | null>(null);
  const [isRemoteRealtimeConnected, setIsRemoteRealtimeConnected] = useState(false);
  const remotePanelSyncService = useRef(createRealtimeSyncService());
  const isRemoteControlMode = initialIsRemoteControlMode;
  const remoteControlIdFromUrl = bootParams.get('uid');
  const [localRemoteControlId] = useState(() => {
    const existing = localStorage.getItem('oasis_remote_control_id');
    if (existing) return existing;
    const generated = `local_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    localStorage.setItem('oasis_remote_control_id', generated);
    return generated;
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [autoCloudSync, setAutoCloudSync] = useState(() => {
    return localStorage.getItem('oasis_auto_cloud_sync') === 'true';
  });
  const [syncError, setSyncError] = useState<string | null>(null);

  // ── Premium Toast HUD System (replaces all native browser alerts) ──
  const [appToast, setAppToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const appToastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerAppToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (appToastTimeoutRef.current) clearTimeout(appToastTimeoutRef.current);
    setAppToast({ message, type });
    appToastTimeoutRef.current = setTimeout(() => setAppToast(null), 4500);
  };

  // Shadow global browser alert — all alert() calls in this component
  // will use this premium in-app notification instead of the ugly browser popup
  const alert = (message: string) => {
    let toastType: 'success' | 'error' | 'info' = 'info';
    const lower = message.toLowerCase();
    if (lower.includes('error') || lower.includes('por favor') || lower.includes('falló') || lower.includes('permiso')) {
      toastType = 'error';
    } else if (lower.includes('éxito') || lower.includes('exitosamente') || lower.includes('agregado') || lower.includes('copiado') || lower.includes('guardado')) {
      toastType = 'success';
    }
    triggerAppToast(message, toastType);
  };
  const dataLoaded = useRef(!initialIsProjectorMode && !initialIsRemoteControlMode);
  const lastAuthUserId = useRef<string | null>(null);
  const isSwitchingProject = useRef(false);
  const lastProcessedCommandId = useRef<string | null>(null);
  const remoteControlId = session?.user?.id || localRemoteControlId;

  // --- Derived State ---
  const activeItem = playlist.find(i => i.id === activeItemId);
  // Priority for live item: 1. Find in current playlist, 2. Fallback to frozenLiveItem
  const liveItem = (liveItemId ? playlist.find(i => i.id === liveItemId) : null) || frozenLiveItem;
  const backgroundAudioItem = currentAudioIndex >= 0 ? bgAudioPlaylist[currentAudioIndex] : null;
  const defaultCustomTheme = customThemes.find(theme => theme.isDefault);
  const creationTheme = defaultCustomTheme || stagedTheme;

  // Refs for stable callbacks
  const bgAudioPlaylistRef = useRef(bgAudioPlaylist);
  useEffect(() => { bgAudioPlaylistRef.current = bgAudioPlaylist; }, [bgAudioPlaylist]);

  // Sync Channel for Multi-window Projector
  const syncChannel = useRef<BroadcastChannel | null>(null);
  const lastProjectorSyncStr = useRef<string>('');
  const lastAppliedProjectorSyncStr = useRef<string>('');

  const saveCurrentProjectInto = useCallback((sourceProjects: Project[]) => {
    if (!currentProjectId) return sourceProjects;

    return sourceProjects.map(p =>
      p.id === currentProjectId
        ? { ...p, playlist, customThemes, updatedAt: new Date().toISOString() }
        : p
    );
  }, [currentProjectId, playlist, customThemes]);

  const stripProjectsForStorage = useCallback((sourceProjects: Project[]) => {
    return sourceProjects.map(p => ({
      ...p,
      playlist: stripPlaylistMedia(p.playlist || [])
    }));
  }, []);

  const navigateLiveNext = useCallback(() => {
    if (!liveItemId) return;
    const currentIndex = playlist.findIndex(p => p.id === liveItemId);
    if (currentIndex === -1) return;

    const item = playlist[currentIndex];
    if (liveSlideIndex < item.slides.length - 1) {
      const nextIndex = liveSlideIndex + 1;
      setLiveSlideIndex(nextIndex);
      // If we are currently viewing the live item, move the preview selector too
      if (activeItemId === liveItemId) {
        setActiveSlideIndex(nextIndex);
      }
    } else if (currentIndex < playlist.length - 1) {
      // Auto advance to next item in playlist if it exists
      const nextItem = playlist[currentIndex + 1];
      if (nextItem.type !== 'divider') {
        setLiveItemId(nextItem.id);
        setLiveSlideIndex(0);
        setFrozenLiveItem(nextItem);
        // Also update preview if it was following the live view
        if (activeItemId === liveItemId) {
          setActiveItemId(nextItem.id);
          setActiveSlideIndex(0);
        }
      }
    }
  }, [liveItemId, liveSlideIndex, activeItemId, playlist]);

  const stopLive = useCallback(() => {
    setLiveItemId(null);
    setLiveSlideIndex(-1);
    setFrozenLiveItem(null);

    // Log to action history
    actionHistoryService.log(
      session?.user?.id,
      'live_stopped',
      'Se detuvo la transmisión en vivo',
      {}
    );
  }, [session?.user?.id]);

  const makeLive = useCallback((itemId?: string, slideIndex?: number) => {
    const targetItemId = itemId !== undefined ? itemId : activeItemId;

    // If we're making a DIFFERENT item live, start at the first slide (0) 
    // unless a specific slide index was provided (via double click).
    let targetSlideIndex = slideIndex;
    if (targetSlideIndex === undefined) {
      targetSlideIndex = (targetItemId !== liveItemId) ? 0 : activeSlideIndex;
    }

    if (targetItemId) {
      const item = playlist.find(i => i.id === targetItemId);
      if (item && item.type === 'divider') return; // Cannot make a divider live

      if (item) setFrozenLiveItem(item);
      setLiveItemId(targetItemId);
      // Also make it active so the user can edit it immediately
      setActiveItemId(targetItemId);
      setLiveSlideIndex(targetSlideIndex);
      if (slideIndex !== undefined) setActiveSlideIndex(targetSlideIndex);
      setIsPreviewHidden(false);
      setIsLogoActive(false);

      // Log to action history
      if (item) {
        actionHistoryService.log(
          session?.user?.id,
          'live_started',
          `Transmitiendo: ${item.title}`,
          { itemId: targetItemId, slideIndex: targetSlideIndex }
        );
      }
    }
  }, [activeItemId, activeSlideIndex, liveItemId, session?.user?.id, playlist]);

  const handleSelectProject = useCallback((projectId: string) => {
    // 1. BLOCK auto-saves
    isSwitchingProject.current = true;

    // 2. SNAPSHOT BACKUP: Save current project state for failsafe
    if (currentProjectId) {
      try {
        const snapshot = { playlist, customThemes, timestamp: Date.now() };
        localStorage.setItem(`project_snapshot_${currentProjectId}`, JSON.stringify(snapshot));
      } catch (e) { }
    }

    // 3. FORCE SAVE current project state before loading another project
    const nextProjects = saveCurrentProjectInto(projects);
    setProjects(nextProjects);

    // 4. LOAD new project data
    const project = nextProjects.find(p => p.id === projectId);
    if (project) {
      setCurrentProjectId(projectId);
      setPlaylist(project.playlist || []);
      setActiveSlideIndex(-1);
    }

    // 5. UNBLOCK auto-saves after delay
    setTimeout(() => { isSwitchingProject.current = false; }, 500);
  }, [currentProjectId, customThemes, playlist, projects, saveCurrentProjectInto]);

  const toggleAudioPlayback = useCallback(() => {
    if (!audioIframeRef.current) return;
    const msg = isAudioPlaying ? '{"event":"command","func":"pauseVideo","args":""}' : '{"event":"command","func":"playVideo","args":""}';
    audioIframeRef.current.contentWindow?.postMessage(msg, '*');

    if (isAudioPlaying) {
      setAudioElapsedOffset(prev => prev + (Date.now() - audioStartTime));
    } else {
      setAudioStartTime(Date.now());
    }
    setIsAudioPlaying(!isAudioPlaying);
  }, [isAudioPlaying, audioStartTime]);

  const navigateNextAudio = useCallback(() => {
    const playlist = bgAudioPlaylistRef.current;
    if (playlist.length === 0) return;
    setCurrentAudioIndex(prev => (prev + 1) % playlist.length);
  }, []);

  const navigatePrevAudio = useCallback(() => {
    const playlist = bgAudioPlaylistRef.current;
    if (playlist.length === 0) return;
    setCurrentAudioIndex(prev => (prev - 1 + playlist.length) % playlist.length);
  }, []);

  // YouTube IFrame Player API for background audio auto-advance
  const bgPlayerRef = useRef<any>(null);

  useEffect(() => {
    if (!backgroundAudioItem?.videoId) {
      if (bgPlayerRef.current) {
        try { bgPlayerRef.current.destroy(); } catch (e) { /* ignore */ }
        bgPlayerRef.current = null;
      }
      return;
    }

    let checkInterval: ReturnType<typeof setInterval>;

    const initBgPlayer = () => {
      // Check if YT is ready and iframe exists
      if ((window as any).YT && (window as any).YT.Player && audioIframeRef.current) {
        if (checkInterval) clearInterval(checkInterval);

        // Destroy previous player to avoid leaks
        if (bgPlayerRef.current && bgPlayerRef.current.destroy) {
          try { bgPlayerRef.current.destroy(); } catch (e) { /* ignore */ }
        }

        bgPlayerRef.current = new (window as any).YT.Player(audioIframeRef.current, {
          events: {
            'onStateChange': (event: any) => {
              if (event.data === 0) { // ENDED
                navigateNextAudio();
              }
            },
            'onError': (e: any) => {
              console.error("YouTube Player Error:", e);
            }
          }
        });
      }
    };

    // Load YouTube API script if not present
    if (!(window as any).YT || !(window as any).YT.Player) {
      if (!document.getElementById('youtube-iframe-api')) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api';
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      }
      // Poll until YT is ready
      checkInterval = setInterval(initBgPlayer, 500);
    } else {
      // YT API already loaded, wait a bit for iframe to render
      setTimeout(initBgPlayer, 100);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      if (bgPlayerRef.current && bgPlayerRef.current.destroy) {
        try { bgPlayerRef.current.destroy(); } catch (e) { /* ignore */ }
        bgPlayerRef.current = null;
      }
    };
  }, [backgroundAudioItem?.videoId, navigateNextAudio]);

  const navigateLivePrev = useCallback(() => {
    if (!liveItemId) return;
    if (liveSlideIndex > 0) {
      const prevIndex = liveSlideIndex - 1;
      setLiveSlideIndex(prevIndex);
      // If we are currently viewing the live item, move the preview selector too
      if (activeItemId === liveItemId) {
        setActiveSlideIndex(prevIndex);
      }
    }
  }, [liveItemId, liveSlideIndex, activeItemId]);

  const handleVideoEnd = useCallback(() => {
    if (isProjectorMode) {
      // If we are the projector, notify the main window
      syncChannel.current?.postMessage({ type: 'VIDEO_ENDED' });
    } else {
      // If we are the main window, navigate locally
      navigateLiveNext();
    }
  }, [isProjectorMode, navigateLiveNext]);

  const sendSyncState = useCallback((force = false) => {
    if (syncChannel.current) {
      const projectorLiveItem = liveItem && liveSlideIndex >= 0
        ? { ...liveItem, theme: applyLogoSettings(liveItem.theme, globalLogoSettings), slides: [liveItem.slides[liveSlideIndex]].filter(Boolean) }
        : liveItem ? { ...liveItem, theme: applyLogoSettings(liveItem.theme, globalLogoSettings) } : null;
      // Strip large base64 video data — projector will load from IndexedDB via idb: reference
      const safeLiveItem = projectorLiveItem ? {
        ...projectorLiveItem,
        slides: projectorLiveItem.slides.map(s => {
          if (s.type === 'video' && s.mediaUrl && s.mediaUrl.startsWith('data:')) {
            return { ...s, mediaUrl: undefined };
          }
          return s;
        })
      } : null;
      const syncData = {
        liveItemId,
        activeItemId: liveItemId,
        liveSlideIndex: safeLiveItem ? 0 : -1,
        activeSlideIndex: safeLiveItem ? 0 : -1,
        playlist: safeLiveItem ? [safeLiveItem] : [],
        // Only sync staged theme when there is no live item. Live items carry their applied theme.
        stagedTheme: safeLiveItem ? undefined : applyLogoSettings(stagedTheme, globalLogoSettings),
        isPreviewHidden,
        isTextHidden,
        isBackgroundHidden,
        isLogoActive,
        showSplitScreen,
        splitLeftSlide,
        splitRightSlide,
        splitRatio,
        splitFontScale,
        isKaraokeActive,
        karaokeIndex,
        logoSettings: globalLogoSettings,
        frozenLiveItem: safeLiveItem
      };

      const syncStr = JSON.stringify(syncData);
      if (!force && syncStr === lastProjectorSyncStr.current) return;
      lastProjectorSyncStr.current = syncStr;

      syncChannel.current.postMessage({
        type: 'SYNC_STATE',
        data: syncData
      });
    }
  }, [liveItemId, liveSlideIndex, liveItem, stagedTheme, globalLogoSettings, isPreviewHidden, isTextHidden, isBackgroundHidden, isLogoActive, showSplitScreen, splitLeftSlide, splitRightSlide, splitRatio, splitFontScale, isKaraokeActive, karaokeIndex]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projectorKey = params.get('projector');
    if (projectorKey === 'true') {
      setIsProjectorMode(true);
      setShowProjectorStartOverlay(!document.fullscreenElement);
    }

    syncChannel.current = new BroadcastChannel('flujo_projector_sync');

    if (projectorKey === 'true') {
      const handleMessage = (e: MessageEvent) => {
        if (typeof e.data === 'string' && e.data === 'OASIS_TOGGLE_FULLSCREEN') {
          if (!document.fullscreenElement) {
            setShowProjectorStartOverlay(false);
            document.documentElement.requestFullscreen().catch(err => console.log("Fullscreen auto-block:", err));
          }
        }
      };
      window.addEventListener('message', handleMessage);

      const handleProjectorKeys = (e: KeyboardEvent) => {
        if (e.key.toLowerCase() === 'f' || e.key === 'F11') {
          e.preventDefault();
          if (!document.fullscreenElement) {
            setShowProjectorStartOverlay(false);
            document.documentElement.requestFullscreen().catch(err => console.error(err));
          } else {
            if (document.exitFullscreen) document.exitFullscreen();
          }
        }
      };
      window.addEventListener('keydown', handleProjectorKeys);

      syncChannel.current.onmessage = (event: MessageEvent) => {
        const { type, data } = event.data;
        if (type === 'SYNC_STATE') {
          const incomingSyncStr = JSON.stringify(data);
          if (incomingSyncStr === lastAppliedProjectorSyncStr.current) return;
          lastAppliedProjectorSyncStr.current = incomingSyncStr;

          setShowProjectorStartOverlay(false);
          setLiveItemId(prev => prev === data.liveItemId ? prev : data.liveItemId);
          setActiveItemId(prev => prev === data.activeItemId ? prev : data.activeItemId);
          setLiveSlideIndex(prev => prev === data.liveSlideIndex ? prev : data.liveSlideIndex);
          setActiveSlideIndex(prev => prev === data.activeSlideIndex ? prev : data.activeSlideIndex);
          setPlaylist(prev => JSON.stringify(prev) === JSON.stringify(data.playlist) ? prev : data.playlist);
          if (data.stagedTheme) {
            setStagedTheme(prev => JSON.stringify(prev) === JSON.stringify(data.stagedTheme) ? prev : data.stagedTheme);
          }
          if (data.logoSettings) {
            setGlobalLogoSettings(prev => JSON.stringify(prev) === JSON.stringify(data.logoSettings) ? prev : data.logoSettings);
          }
          setIsPreviewHidden(prev => prev === data.isPreviewHidden ? prev : data.isPreviewHidden);
          setIsTextHidden(prev => prev === data.isTextHidden ? prev : data.isTextHidden);
          setIsBackgroundHidden(prev => prev === data.isBackgroundHidden ? prev : data.isBackgroundHidden);
          setIsLogoActive(prev => prev === data.isLogoActive ? prev : data.isLogoActive);

          if (data.frozenLiveItem) {
            if (data.frozenLiveItem.slides) {
              setFrozenLiveItem(prev => JSON.stringify(prev) === JSON.stringify(data.frozenLiveItem) ? prev : data.frozenLiveItem);
            } else {
              const found = data.playlist.find((i: any) => i.id === data.frozenLiveItem.id);
              if (found) setFrozenLiveItem(prev => JSON.stringify(prev) === JSON.stringify(found) ? prev : found);
            }
          } else {
            setFrozenLiveItem(prev => prev === null ? prev : null);
          }
          if (data.showSplitScreen !== undefined) setShowSplitScreen(prev => prev === data.showSplitScreen ? prev : data.showSplitScreen);
          if (data.splitLeftSlide !== undefined) setSplitLeftSlide(prev => JSON.stringify(prev) === JSON.stringify(data.splitLeftSlide) ? prev : data.splitLeftSlide);
          if (data.splitRightSlide !== undefined) setSplitRightSlide(prev => JSON.stringify(prev) === JSON.stringify(data.splitRightSlide) ? prev : data.splitRightSlide);
          if (data.splitRatio !== undefined) setSplitRatio(prev => prev === data.splitRatio ? prev : data.splitRatio);
          if (data.splitFontScale !== undefined) setSplitFontScale(prev => prev === data.splitFontScale ? prev : data.splitFontScale);
          if (data.isKaraokeActive !== undefined) setIsKaraokeActive(prev => prev === data.isKaraokeActive ? prev : data.isKaraokeActive);
          if (data.karaokeIndex !== undefined) setKaraokeIndex(prev => prev === data.karaokeIndex ? prev : data.karaokeIndex);
        }
      };

      syncChannel.current.postMessage({ type: 'REQUEST_STATE' });

      return () => {
        window.removeEventListener('message', handleMessage);
        window.removeEventListener('keydown', handleProjectorKeys);
        syncChannel.current?.close();
      };
    } else {
      syncChannel.current.onmessage = (event: MessageEvent) => {
        if (event.data.type === 'REQUEST_STATE') {
          sendSyncState(true);
        } else if (event.data.type === 'VIDEO_ENDED') {
          navigateLiveNext();
        }
      };
    }

    return () => {
      syncChannel.current?.close();
    };
  }, [navigateLiveNext, sendSyncState]);

  useEffect(() => {
    if (!isProjectorMode) return;

    const handleFullscreenChange = () => {
      const fullscreen = !!document.fullscreenElement;
      setIsProjectorFullscreen(fullscreen);
      if (fullscreen) setShowProjectorStartOverlay(false);
    };

    handleFullscreenChange();
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isProjectorMode]);

  useEffect(() => {
    if (!isProjectorMode || !showProjectorStartOverlay) return;
    const hideOverlayTimer = window.setTimeout(() => {
      setShowProjectorStartOverlay(false);
    }, 2200);
    return () => window.clearTimeout(hideOverlayTimer);
  }, [isProjectorMode, showProjectorStartOverlay]);


  // Sync state whenever it changes
  useEffect(() => {
    if (!isProjectorMode) {
      sendSyncState();
    }
  }, [liveItemId, activeItemId, liveSlideIndex, activeSlideIndex, playlist, stagedTheme, globalLogoSettings, isPreviewHidden, isTextHidden, isBackgroundHidden, isLogoActive, showSplitScreen, splitLeftSlide, splitRightSlide, splitFontScale, isProjectorMode, sendSyncState, frozenLiveItem]);

  // Ensure sync when window focus changes (user comes back to tab)
  useEffect(() => {
    const handleFocus = () => sendSyncState(true);
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [sendSyncState]);

  const liveViewRef = useRef<HTMLDivElement>(null);
  const miniGridRef = useRef<HTMLDivElement>(null);

  // Auth Effect
  useEffect(() => {
    const applySession = (nextSession: Session | null) => {
      const nextUserId = nextSession?.user?.id || null;
      if (nextUserId !== lastAuthUserId.current) {
        dataLoaded.current = !nextUserId;
        lastAuthUserId.current = nextUserId;
      }
      setSession(nextSession);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Realtime Sync for Mobile Control
  useEffect(() => {
    if (!remoteControlId || isRemoteControlMode) return;

    // Subscribe to realtime changes
    realtimeSyncService.subscribe(remoteControlId, (state: LiveState) => {
      // Process commands from mobile
      const { command, commandData, commandId } = state;
      if (!command) return;
      if (commandId && commandId === lastProcessedCommandId.current) return;
      if (commandId) lastProcessedCommandId.current = commandId;

      const clampImageScale = (value: number) => Math.min(5, Math.max(0.25, value));
      const clampImageOffset = (value: number) => Math.min(150, Math.max(-150, value));
      const updateLiveItemTheme = (updater: (theme: Theme) => Theme) => {
        if (!liveItemId) return;
        setPlaylist(prev => prev.map(item =>
          item.id === liveItemId ? { ...item, theme: updater(item.theme) } : item
        ));
        setFrozenLiveItem(prev => prev && prev.id === liveItemId ? { ...prev, theme: updater(prev.theme) } : prev);
      };

      switch (command) {
        case 'next':
          if (isKaraokeActive && liveItemId) {
            const item = playlist.find(p => p.id === liveItemId);
            if (item) {
              const slide = item.slides[liveSlideIndex];
              const wordCount = slide.content.split(/\s+/).length;
              if (karaokeIndex < wordCount - 1) {
                setKaraokeIndex(prev => prev + 1);
              } else {
                navigateLiveNext();
                setKaraokeIndex(-1);
              }
            } else {
              navigateLiveNext();
            }
          } else {
            navigateLiveNext();
          }
          break;
        case 'prev':
          if (isKaraokeActive && karaokeIndex > -1) {
            setKaraokeIndex(prev => prev - 1);
          } else {
            navigateLivePrev();
            setKaraokeIndex(-1);
          }
          break;
        case 'blackout': setIsPreviewHidden(prev => !prev); break;
        case 'clear': setIsTextHidden(prev => !prev); break;
        case 'logo': setIsLogoActive(prev => !prev); break;
        case 'jump_to_item':
          if (commandData?.itemId) {
            const item = playlist.find(p => p.id === commandData.itemId);
            if (item) {
              setActiveItemId(item.id);
              setActiveSlideIndex(0);
              if (commandData.makeLive) makeLive(item.id, 0);
            }
          }
          break;
        case 'jump_to_slide':
          if (commandData?.index !== undefined) {
            setLiveSlideIndex(commandData.index);
            setActiveSlideIndex(commandData.index);
          }
          break;
        case 'change_project':
          if (commandData?.projectId) handleSelectProject(commandData.projectId);
          break;
        case 'create_project':
          if (commandData?.name) {
            isSwitchingProject.current = true;
            const newProject: Project = {
              id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name: commandData.name,
              description: 'Creado desde control remoto',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              playlist: [],
              customThemes: []
            };
            setProjects(prev => [...saveCurrentProjectInto(prev), newProject]);
            setCurrentProjectId(newProject.id);
            setPlaylist([]);
            setActiveItemId(null);
            setActiveSlideIndex(-1);
            setTimeout(() => {
              isSwitchingProject.current = false;
            }, 250);
          }
          break;
        case 'add_media':
          if (Array.isArray(commandData?.slides) && commandData.slides.length > 0) {
            const newItem: PresentationItem = {
              id: Math.random().toString(36).substr(2, 9),
              title: commandData.title || `Media remota (${commandData.slides.length})`,
              type: 'custom',
              slides: commandData.slides,
              theme: creationTheme
            };
            setPlaylist(prev => [...prev, newItem]);
            setActiveItemId(newItem.id);
            setActiveSlideIndex(0);
            if (commandData.makeLive) {
              setLiveItemId(newItem.id);
              setLiveSlideIndex(0);
              setFrozenLiveItem(newItem);
              setIsPreviewHidden(false);
              setIsLogoActive(false);
            }
          }
          break;
        case 'image_zoom':
          updateLiveItemTheme(itemTheme => ({
            ...itemTheme,
            imageContentScale: clampImageScale((itemTheme.imageContentScale || 1) * (Number(commandData?.factor) || 1))
          }));
          break;
        case 'image_pan':
          updateLiveItemTheme(itemTheme => ({
            ...itemTheme,
            imageContentOffsetX: clampImageOffset((itemTheme.imageContentOffsetX || 0) + (Number(commandData?.deltaX) || 0)),
            imageContentOffsetY: clampImageOffset((itemTheme.imageContentOffsetY || 0) + (Number(commandData?.deltaY) || 0))
          }));
          break;
        case 'image_reset':
          updateLiveItemTheme(itemTheme => ({
            ...itemTheme,
            imageContentScale: 1,
            imageContentOffsetX: 0,
            imageContentOffsetY: 0
          }));
          break;
        case 'toggle_audio': toggleAudioPlayback(); break;
        case 'stop_live': stopLive(); break;
        case 'zoom_update':
          if (commandData) {
            setZoomState(commandData);
          } else {
            setZoomState(null);
          }
          break;
        case 'add_bible':
          if (commandData?.query) {
            import('./services/geminiService').then(({ fetchBiblePassage }) => {
              fetchBiblePassage(commandData.query, commandData.version, 'classic').then(passage => {
                if (passage) {
                  const newItem = {
                    id: Date.now().toString(),
                    title: passage.title,
                    type: 'scripture' as const,
                    slides: passage.slides,
                    theme: creationTheme,
                    query: commandData.query,
                    bibleVersion: commandData.version
                  };
                  setPlaylist(prev => [...prev, newItem]);
                  if (commandData.makeLive) makeLive(newItem.id, 0);
                }
              }).catch(console.error);
            });
          }
          break;
        case 'add_song':
          if (commandData?.query) {
            import('./services/geminiService').then(({ fetchSongLyrics }) => {
              fetchSongLyrics(commandData.query, 'classic').then(song => {
                if (song) {
                  const newItem = {
                    id: Date.now().toString(),
                    title: song.title,
                    type: 'song' as const,
                    slides: song.slides,
                    theme: creationTheme,
                    query: commandData.query
                  };
                  setPlaylist(prev => [...prev, newItem]);
                  if (commandData.makeLive) makeLive(newItem.id, 0);
                }
              }).catch(console.error);
            });
          }
          break;
      }
      // Clear the command after processing
      if (!commandData?.transient) {
        realtimeSyncService.updateState(remoteControlId, { command: null, commandId: null, commandData: null });
      }
    });

    return () => {
      realtimeSyncService.unsubscribe();
    };
  }, [remoteControlId, isRemoteControlMode, liveItemId, liveSlideIndex, playlist, isKaraokeActive, karaokeIndex, navigateLiveNext, navigateLivePrev, setIsPreviewHidden, setIsTextHidden, setIsLogoActive, setActiveItemId, setActiveSlideIndex, makeLive, handleSelectProject, toggleAudioPlayback, stopLive, isAudioPlaying, saveCurrentProjectInto, creationTheme]);

  // Broadcast live state (debounced)
  const lastStateStr = useRef<string>('');
  useEffect(() => {
    if (!remoteControlId || isProjectorMode || isRemoteControlMode) return;

    const stateToBroadcast = {
      liveItemId,
      liveSlideIndex,
      activeItemId,
      activeSlideIndex,
      isPreviewHidden,
      isTextHidden,
      isLogoActive,
      showSplitScreen,
      isKaraokeActive,
      karaokeIndex,
      backgroundAudioTitle: backgroundAudioItem?.title,
      isAudioPlaying: isAudioPlaying,
      zoomState,
      imageContentScale: liveItem?.theme?.imageContentScale ?? 1,
      imageContentOffsetX: liveItem?.theme?.imageContentOffsetX ?? 0,
      imageContentOffsetY: liveItem?.theme?.imageContentOffsetY ?? 0
    };

    const currentStateStr = JSON.stringify(stateToBroadcast);
    if (currentStateStr === lastStateStr.current) return;

    const timer = setTimeout(async () => {
      await realtimeSyncService.updateState(remoteControlId, {
        ...stateToBroadcast,
        playlist: playlist.map(p => ({
          id: p.id,
          title: p.title,
          type: p.type,
          slides: p.slides.map(s => ({ id: s.id, type: s.type, label: s.label }))
        })),
        activeItemSlides: activeItem?.slides.map(s => ({
          id: s.id,
          label: s.label,
          type: s.type,
          content: s.content,
          operatorNotes: s.operatorNotes,
          mediaUrl: s.mediaUrl && s.mediaUrl.length < 50000 ? s.mediaUrl : undefined,
          videoId: s.videoId
        })),
        projects: projects.map(p => ({ id: p.id, name: p.name })),
        currentProjectName: projects.find(p => p.id === currentProjectId)?.name,
      });
      lastStateStr.current = currentStateStr;
    }, 150);

    return () => clearTimeout(timer);
  }, [remoteControlId, liveItemId, liveSlideIndex, activeItemId, activeSlideIndex, isPreviewHidden, isTextHidden, isLogoActive, showSplitScreen, isKaraokeActive, karaokeIndex, isProjectorMode, isRemoteControlMode, playlist, activeItem, liveItem, projects, currentProjectId, backgroundAudioItem, isAudioPlaying]);

  useEffect(() => {
    if (!isRemoteControlMode || !remoteControlIdFromUrl) return;

    const remoteService = remotePanelSyncService.current;
    remoteService.subscribe(remoteControlIdFromUrl, (state: LiveState) => {
      setRemoteLiveState(state);
      setIsRemoteRealtimeConnected(remoteService.isConnected());
    });

    const connectionTimer = window.setInterval(() => {
      setIsRemoteRealtimeConnected(remoteService.isConnected());
    }, 700);

    return () => {
      window.clearInterval(connectionTimer);
      remoteService.unsubscribe();
      setIsRemoteRealtimeConnected(false);
    };
  }, [isRemoteControlMode, remoteControlIdFromUrl]);

  // Sync from Supabase on Login
  const isCloudLoading = useRef(false);

  const fetchUserData = useCallback(async () => {
    if (!session?.user) return;

    // BLOCK persistence during cloud load
    isCloudLoading.current = true;
    isSwitchingProject.current = true;

    setIsSyncing(true);
    setSyncError(null);

    try {
      const { data: settings, error } = await supabase
        .from('user_settings')
        .select('playlist, custom_themes, projects, current_project_id')
        .eq('id', session.user.id)
        .maybeSingle();

      if (error) {
        console.error("Cloud fetch error:", error);
        setSyncError(describeCloudError(error, "Guardado local. Nube: error al descargar."));
      } else if (settings) {

        // Migration Helper: Ensure items have correct types (Fix for 'transforming' dividers)
        const migratePlaylist = (items: any[]) => (items || []).map(item => ({
          ...item,
          type: item.type || (item.dividerColor || item.dividerIcon ? 'divider' : 'custom')
        }));

        // 1. Load and migrate projects
        const migratedProjects = (settings.projects || []).map((p: any) => ({
          ...p,
          playlist: migratePlaylist(p.playlist)
        }));

        const localProjects = readLocalJson<Project[]>(LOCAL_PROJECTS_KEY, []);
        const localPlaylist = readLocalJson<PresentationItem[]>(LOCAL_PLAYLIST_KEY, []);
        const localThemes = readLocalJson<Theme[]>(LOCAL_THEMES_KEY, []);
        const cloudHasData =
          migratedProjects.length > 0 ||
          (settings.playlist || []).length > 0 ||
          (settings.custom_themes || []).length > 0;
        const localHasData = localProjects.length > 0 || localPlaylist.length > 0 || localThemes.length > 0;

        if (!cloudHasData && localHasData) {
          await supabase.from('user_settings').upsert({
            id: session.user.id,
            playlist: stripPlaylistMedia(localPlaylist),
            custom_themes: localThemes,
            projects: stripProjectsForStorage(localProjects),
            current_project_id: localStorage.getItem(LOCAL_CURRENT_PROJECT_KEY),
            updated_at: new Date().toISOString()
          });

          setProjects(localProjects);
          setCurrentProjectId(localStorage.getItem(LOCAL_CURRENT_PROJECT_KEY));
          setPlaylist(localPlaylist);
          setCustomThemes(localThemes);
          dataLoaded.current = true;
          return;
        }

        setProjects(migratedProjects);

        // 2. Load and migrate active playlist/project
        if (settings.current_project_id && migratedProjects.length > 0) {
          const currentProject = migratedProjects.find((p: any) => p.id === settings.current_project_id);
          if (currentProject) {
            setCurrentProjectId(settings.current_project_id);
            setPlaylist(currentProject.playlist);
            
            // Unificar temas globales con los del proyecto de forma failsafe
            const mergedThemes = [
              ...(settings.custom_themes || []),
              ...(currentProject.customThemes || [])
            ].filter((theme, index, self) => 
              self.findIndex(t => t.id === theme.id) === index
            );
            setCustomThemes(mergedThemes);
          } else {
            setCurrentProjectId(null);
            setPlaylist(migratePlaylist(settings.playlist));
            setCustomThemes(settings.custom_themes || []);
          }
        } else {
          setCurrentProjectId(null);
          setPlaylist(migratePlaylist(settings.playlist));
          setCustomThemes(settings.custom_themes || []);
        }

        // 3. Mark as loaded
        dataLoaded.current = true;
      } else {
        // New cloud profile: initialize it from the local backup instead of creating empty data.
        const localProjects = readLocalJson<Project[]>(LOCAL_PROJECTS_KEY, []);
        const localPlaylist = readLocalJson<PresentationItem[]>(LOCAL_PLAYLIST_KEY, []);
        const localThemes = readLocalJson<Theme[]>(LOCAL_THEMES_KEY, []);
        const localCurrentProjectId = localStorage.getItem(LOCAL_CURRENT_PROJECT_KEY);

        const { error: insertError } = await supabase.from('user_settings').upsert({
          id: session.user.id,
          playlist: stripPlaylistMedia(localPlaylist),
          custom_themes: localThemes,
          projects: stripProjectsForStorage(localProjects),
          current_project_id: localCurrentProjectId,
          updated_at: new Date().toISOString()
        });

        if (insertError) {
          setSyncError(describeCloudError(insertError, "Guardado local. Nube: error al inicializar."));
        } else {
          setProjects(localProjects);
          setCurrentProjectId(localCurrentProjectId);
          setPlaylist(localPlaylist);
          setCustomThemes(localThemes);
          dataLoaded.current = true;
        }
      }

    } catch (e) {
      console.error("Unexpected error fetching user data", e);
      setSyncError(describeCloudError(e, "Guardado local. Nube: error de conexion."));
    } finally {
      setIsSyncing(false);
      // Wait longer to ensure all state setters finished and React re-rendered
      setTimeout(() => {
        isCloudLoading.current = false;
        isSwitchingProject.current = false;
      }, 1000);
    }
  }, [session, stripProjectsForStorage]);


  useEffect(() => {
    if (session?.user && !dataLoaded.current) {
      fetchUserData();
    } else if (!session?.user) {
      dataLoaded.current = true;
    }
  }, [session, fetchUserData]);

  // Handle Audio Start Time
  useEffect(() => {
    if (backgroundAudioItem) {
      setAudioStartTime(Date.now());
      setAudioElapsedOffset(0);
      setIsAudioPlaying(true);
    }
  }, [backgroundAudioItem?.videoId]);

  const handleSyncCloud = async () => {
    if (!session) {
      alert("Debes iniciar sesión con Google para sincronizar.");
      return;
    }

    setIsSyncing(true);
    try {
      // 1. Obtener datos actuales en la nube
      const { data: settings, error } = await supabase
        .from('user_settings')
        .select('playlist, custom_themes, projects, current_project_id, updated_at')
        .eq('id', session.user.id)
        .maybeSingle();

      if (error) {
        console.error("Cloud check error:", error);
        setSyncError(describeCloudError(error, "Error de red al comprobar la nube."));
        setIsSyncing(false);
        return;
      }

      // 2. Determinar si hay cambios locales no guardados en la nube
      const currentPlaylistStr = JSON.stringify(stripPlaylistMedia(playlist));
      const currentThemesStr = JSON.stringify(customThemes);
      const currentProjectsStr = JSON.stringify(stripProjectsForStorage(saveCurrentProjectInto(projects)));

      const hasLocalUnsavedChanges = 
        (lastCloudPlaylist.current && currentPlaylistStr !== lastCloudPlaylist.current) ||
        (lastCloudThemes.current && currentThemesStr !== lastCloudThemes.current) ||
        (lastCloudProjects.current && currentProjectsStr !== lastCloudProjects.current);

      // 3. Determinar si hay cambios en la nube
      let hasCloudChanges = false;
      const cloudChangesDesc: string[] = [];

      if (settings) {
        const cloudPlaylistStr = JSON.stringify(settings.playlist || []);
        const cloudThemesStr = JSON.stringify(settings.custom_themes || []);
        const cloudProjectsStr = JSON.stringify(settings.projects || []);

        const cloudIsDifferentFromLastSync =
          (lastCloudPlaylist.current && cloudPlaylistStr !== lastCloudPlaylist.current) ||
          (lastCloudThemes.current && cloudThemesStr !== lastCloudThemes.current) ||
          (lastCloudProjects.current && cloudProjectsStr !== lastCloudProjects.current);

        const localIsDifferentFromCloud =
          currentPlaylistStr !== cloudPlaylistStr ||
          currentThemesStr !== cloudThemesStr ||
          currentProjectsStr !== cloudProjectsStr;

        if (cloudIsDifferentFromLastSync && localIsDifferentFromCloud) {
          hasCloudChanges = true;
          cloudChangesDesc.push("Se detectaron actualizaciones recientes en el servidor de la nube (ej. guardados desde el celular u otro dispositivo).");
        }
      }

      const executeSync = async () => {
        setIsSyncing(true);
        actionHistoryService.log(
          session.user.id,
          'cloud_sync_started',
          'Sincronización manual iniciada'
        );
        await fetchUserData();
      };

      setIsSyncing(false); // Liberar loading para el modal de confirmación

      if (hasLocalUnsavedChanges && hasCloudChanges) {
        setSyncConfirm({
          title: "⚠️ ¡Conflicto de Sincronización!",
          message: "Se detectaron cambios locales sin guardar Y actualizaciones recientes en la nube (realizadas desde tu celular). Si sincronizas ahora, se descargarán los datos de la nube y se SOBRESCRIBIRÁN y PERDERÁN tus cambios locales no guardados. ¿Deseas proceder?",
          itemsList: [
            "Tienes modificaciones locales actuales en tu computadora.",
            "Hay datos más nuevos en la nube que sobrescribirán tu estado local."
          ],
          type: 'danger',
          confirmText: "Descargar Nube y Sobrescribir",
          cancelText: "Cancelar",
          onConfirm: () => {
            setSyncConfirm(null);
            executeSync();
          }
        });
      } else if (hasLocalUnsavedChanges) {
        setSyncConfirm({
          title: "⚠️ Cambios Locales sin Guardar",
          message: "Tienes modificaciones en tu computadora que no has guardado en la nube. Al sincronizar (descargar de la nube), se restaurará el estado anterior de la nube y PERDERÁS tus modificaciones locales actuales. ¿Deseas sincronizar de todas formas?",
          itemsList: [
            "Se descartarán los cambios que hiciste localmente desde la última vez que guardaste."
          ],
          type: 'warning',
          confirmText: "Sincronizar y descartar local",
          cancelText: "Cancelar",
          onConfirm: () => {
            setSyncConfirm(null);
            executeSync();
          }
        });
      } else if (hasCloudChanges) {
        setSyncConfirm({
          title: "🔄 Cambios detectados en la Nube",
          message: "El servidor detectó actualizaciones recientes en la nube (realizadas desde tu celular u otro dispositivo). ¿Estás de acuerdo en sincronizar y aplicar estos nuevos cambios en esta computadora?",
          itemsList: [
            "Se descargarán y aplicarán las canciones, pasajes o proyectos actualizados en la nube."
          ],
          type: 'info',
          confirmText: "Sí, sincronizar y aplicar",
          cancelText: "Cancelar",
          onConfirm: () => {
            setSyncConfirm(null);
            executeSync();
          }
        });
      } else {
        await executeSync();
      }
    } catch (e) {
      console.error("Cloud sync check error", e);
      setIsSyncing(false);
      await fetchUserData();
    }
  };

  const handleManualCloudSave = async () => {
    if (!session?.user) {
      alert("Debes iniciar sesion con Google para guardar manualmente.");
      return;
    }

    setIsSyncing(true);
    try {
      // 1. Obtener la data actual en la nube antes de sobrescribirla
      const { data: settings } = await supabase
        .from('user_settings')
        .select('playlist, projects')
        .eq('id', session.user.id)
        .maybeSingle();

      const deletedItems: string[] = [];

      if (settings) {
        // A. Comparar la playlist en la nube con la local para ver qué se eliminó
        const cloudPlaylist = settings.playlist || [];
        const localPlaylistIds = new Set(playlist.map(item => item.id));
        
        cloudPlaylist.forEach((item: any) => {
          if (!localPlaylistIds.has(item.id)) {
            deletedItems.push(`[Lista] ${item.title || 'Canción/Sección'}`);
          } else {
            // El item sigue existiendo localmente. Verifiquemos si se eliminó algún slide (archivo) dentro de él
            const localItem = playlist.find(li => li.id === item.id);
            if (localItem) {
              const localSlideIds = new Set(localItem.slides.map(s => s.id));
              (item.slides || []).forEach((slide: any) => {
                if (!localSlideIds.has(slide.id)) {
                  const typeLabel = slide.type === 'video' ? 'Video' : slide.type === 'image' ? 'Imagen' : 'Diapositiva';
                  const slideDesc = slide.label || (slide.content ? (slide.content.substring(0, 25) + '...') : `${typeLabel} #${slide.id}`);
                  deletedItems.push(`[Archivo en ${item.title}] ${slideDesc}`);
                }
              });
            }
          }
        });

        // B. Comparar proyectos en la nube con locales para ver qué se eliminó
        const cloudProjects = settings.projects || [];
        const localProjectIds = new Set(projects.map(p => p.id));
        
        cloudProjects.forEach((p: any) => {
          if (!localProjectIds.has(p.id)) {
            deletedItems.push(`[Proyecto] ${p.name || 'Proyecto sin nombre'}`);
          } else {
            // Evitar duplicar advertencias para el proyecto activo actual
            // ya que sus elementos se comparan y reportan en la sección A (playlist principal)
            if (currentProjectId && p.id === currentProjectId) return;

            const localProj = projects.find(lp => lp.id === p.id);

            if (localProj) {
              const localItemIds = new Set(localProj.playlist.map(item => item.id));
              (p.playlist || []).forEach((item: any) => {
                if (!localItemIds.has(item.id)) {
                  deletedItems.push(`[En Proyecto ${p.name}] ${item.title || 'Elemento'}`);
                } else {
                  // El item dentro del proyecto local sigue existiendo. Verifiquemos si se eliminó algún slide (archivo) dentro de él.
                  const localItem = localProj.playlist.find(li => li.id === item.id);
                  if (localItem) {
                    const localSlideIds = new Set(localItem.slides.map(s => s.id));
                    (item.slides || []).forEach((slide: any) => {
                      if (!localSlideIds.has(slide.id)) {
                        const typeLabel = slide.type === 'video' ? 'Video' : slide.type === 'image' ? 'Imagen' : 'Diapositiva';
                        const slideDesc = slide.label || (slide.content ? (slide.content.substring(0, 25) + '...') : `${typeLabel} #${slide.id}`);
                        deletedItems.push(`[Archivo en ${item.title} - Proy. ${p.name}] ${slideDesc}`);
                      }
                    });
                  }
                }
              });
            }
          }
        });
      }


      const executeSave = async () => {
        setIsSyncing(true);
        try {
          const safePlaylist = stripPlaylistMedia(playlist);
          const finalProjects = stripProjectsForStorage(saveCurrentProjectInto(projects));

          const { error } = await supabase
            .from('user_settings')
            .upsert({
              id: session.user.id,
              playlist: safePlaylist,
              custom_themes: customThemes,
              projects: finalProjects,
              current_project_id: currentProjectId,
              updated_at: new Date().toISOString()
            });

          if (error) {
            console.error("Cloud save error:", error);
            setSyncError(describeCloudError(error, "Guardado local. Nube: error al guardar."));
            return;
          }

          setSyncError(null);
          actionHistoryService.log(
            session.user.id,
            'cloud_sync_saved',
            'Cambios guardados manualmente en la nube'
          );
          localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(finalProjects));
          if (currentProjectId) localStorage.setItem(LOCAL_CURRENT_PROJECT_KEY, currentProjectId);
          
          // HUD Toast Success
          triggerAppToast("Cambios guardados exitosamente en la nube", "success");
        } catch (e) {
          console.error("Critical save error", e);
          setSyncError(describeCloudError(e, "Guardado local. Nube: error al guardar."));
        } finally {
          setIsSyncing(false);
        }
      };

      if (deletedItems.length > 0) {
        setIsSyncing(false); // Liberar carga
        setSyncConfirm({
          title: "Confirmar eliminación en la nube",
          message: "Se detectaron elementos que eliminaste localmente. Si guardas ahora, se borrarán permanentemente también en la nube. ¿Estás de acuerdo en eliminarlos de la nube?",
          itemsList: deletedItems,
          type: 'danger',
          confirmText: "Sí, borrar y guardar",
          cancelText: "Cancelar",
          onConfirm: () => {
            setSyncConfirm(null);
            executeSave();
          }
        });
      } else {
        await executeSave();
      }

    } catch (e) {
      console.error("Manual save error check", e);
      setIsSyncing(false);
    }
  };

  const handleToggleAutoCloudSync = () => {
    setAutoCloudSync(prev => {
      const next = !prev;
      localStorage.setItem('oasis_auto_cloud_sync', String(next));
      return next;
    });
  };

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
  };

  const handleSignOut = async () => {
    // 1. DISABLE SYNC IMMEDIATELY
    dataLoaded.current = false;

    try {
      // 2. Immediate visual feedback: Clear local state and session
      setSession(null);
      setPlaylist([]);
      setCustomThemes([]);
      setCurrentProjectId(null);
      setProjects([]);

      // 3. Inform Supabase and wait for it
      // We use scope: 'global' to sign out from all tabs
      await supabase.auth.signOut({ scope: 'global' });

      // 4. Clear only auth/session markers. Keep local project backups intact.
      localStorage.removeItem('oasis_authenticated');
      sessionStorage.clear();

      // 5. Hard reload to ensure all listeners and refs are destroyed
      // Using window.location.href to clear hash/query params if any
      window.location.href = window.location.origin + window.location.pathname;
    } catch (e) {
      console.error("Critical logout error", e);
      localStorage.removeItem('oasis_authenticated');
      window.location.reload();
    }
  };


  // Persistence Effect
  // Persistence Effect: Local Storage (Immediate)
  useEffect(() => {
    if (initialIsProjectorMode || initialIsRemoteControlMode || isCloudLoading.current) return;

    try {
      // Strip large video blobs before saving to localStorage to avoid quota errors
      const safePlaylist = stripPlaylistMedia(playlist);
      const safeProjects = stripProjectsForStorage(saveCurrentProjectInto(projects));
      localStorage.setItem(LOCAL_PLAYLIST_KEY, JSON.stringify(safePlaylist));
      localStorage.setItem(LOCAL_THEMES_KEY, JSON.stringify(customThemes));
      localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(safeProjects));
      if (currentProjectId) {
        localStorage.setItem(LOCAL_CURRENT_PROJECT_KEY, currentProjectId);
      } else {
        localStorage.removeItem(LOCAL_CURRENT_PROJECT_KEY);
      }
    } catch (e) {
      console.warn("Local storage update failed", e);
    }
  }, [playlist, customThemes, projects, currentProjectId, saveCurrentProjectInto, stripProjectsForStorage, initialIsProjectorMode, initialIsRemoteControlMode]);

  useEffect(() => {
    if (initialIsRemoteControlMode) return;
    try {
      localStorage.setItem(LOCAL_LOGO_SETTINGS_KEY, JSON.stringify(globalLogoSettings));
    } catch (e) {
      console.warn("Logo settings save failed", e);
    }
  }, [globalLogoSettings, initialIsRemoteControlMode]);

  // Persistence Effect: Cloud SYNC (Debounced with Deep Comparison)
  const lastCloudPlaylist = useRef<string>('');
  const lastCloudProjects = useRef<string>('');
  const lastCloudThemes = useRef<string>('');

  useEffect(() => {
    if (!autoCloudSync || !session?.user || !dataLoaded.current || isCloudLoading.current || isSwitchingProject.current) return;

    // Skip if nothing changed according to string comparison (IGNORING volatile updatedAt field)
    const stripVolatile = (projs: any[]) => projs.map(p => {
      const { updatedAt, ...rest } = p;
      return rest;
    });

    const currentPlaylistStr = JSON.stringify(playlist);
    const currentThemesStr = JSON.stringify(customThemes);
    const currentProjectsStr = JSON.stringify(stripVolatile(projects));

    if (currentPlaylistStr === lastCloudPlaylist.current &&
      currentThemesStr === lastCloudThemes.current &&
      currentProjectsStr === lastCloudProjects.current) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSyncing(true);
      try {
        const safePlaylist = stripPlaylistMedia(playlist);
        const finalProjects = stripProjectsForStorage(saveCurrentProjectInto(projects));

        // 1. Pre-chequear borrados locales antes de subir a la nube
        const { data: settings } = await supabase
          .from('user_settings')
          .select('playlist, projects')
          .eq('id', session.user.id)
          .maybeSingle();

        const deletedItems: string[] = [];

        if (settings) {
          // A. Comparar la playlist en la nube con la local
          const cloudPlaylist = settings.playlist || [];
          const localPlaylistIds = new Set(playlist.map(item => item.id));
          
          cloudPlaylist.forEach((item: any) => {
            if (!localPlaylistIds.has(item.id)) {
              deletedItems.push(`[Lista] ${item.title || 'Canción/Sección'}`);
            } else {
              // El item sigue existiendo localmente. Verifiquemos si se eliminó algún slide (archivo) dentro de él
              const localItem = playlist.find(li => li.id === item.id);
              if (localItem) {
                const localSlideIds = new Set(localItem.slides.map(s => s.id));
                (item.slides || []).forEach((slide: any) => {
                  if (!localSlideIds.has(slide.id)) {
                    const typeLabel = slide.type === 'video' ? 'Video' : slide.type === 'image' ? 'Imagen' : 'Diapositiva';
                    const slideDesc = slide.label || (slide.content ? (slide.content.substring(0, 25) + '...') : `${typeLabel} #${slide.id}`);
                    deletedItems.push(`[Archivo en ${item.title}] ${slideDesc}`);
                  }
                });
              }
            }
          });

          // B. Comparar proyectos en la nube con locales
          const cloudProjects = settings.projects || [];
          const localProjectIds = new Set(projects.map(p => p.id));
          
          cloudProjects.forEach((p: any) => {
            if (!localProjectIds.has(p.id)) {
              deletedItems.push(`[Proyecto] ${p.name || 'Proyecto sin nombre'}`);
            } else {
              // Evitar duplicar advertencias para el proyecto activo actual
              // ya que sus elementos se comparan y reportan en la sección A (playlist principal)
              if (currentProjectId && p.id === currentProjectId) return;

              const localProj = projects.find(lp => lp.id === p.id);

              if (localProj) {
                const localItemIds = new Set(localProj.playlist.map(item => item.id));
                (p.playlist || []).forEach((item: any) => {
                  if (!localItemIds.has(item.id)) {
                    deletedItems.push(`[En Proyecto ${p.name}] ${item.title || 'Elemento'}`);
                  } else {
                    // El item dentro del proyecto local sigue existiendo. Verifiquemos si se eliminó algún slide (archivo) dentro de él.
                    const localItem = localProj.playlist.find(li => li.id === item.id);
                    if (localItem) {
                      const localSlideIds = new Set(localItem.slides.map(s => s.id));
                      (item.slides || []).forEach((slide: any) => {
                        if (!localSlideIds.has(slide.id)) {
                          const typeLabel = slide.type === 'video' ? 'Video' : slide.type === 'image' ? 'Imagen' : 'Diapositiva';
                          const slideDesc = slide.label || (slide.content ? (slide.content.substring(0, 25) + '...') : `${typeLabel} #${slide.id}`);
                          deletedItems.push(`[Archivo en ${item.title} - Proy. ${p.name}] ${slideDesc}`);
                        }
                      });
                    }
                  }
                });
              }
            }
          });
        }

        const executeUpsert = async () => {
          setIsSyncing(true);
          const { error } = await supabase
            .from('user_settings')
            .upsert({
              id: session.user.id,
              playlist: safePlaylist,
              custom_themes: customThemes,
              projects: finalProjects,
              current_project_id: currentProjectId,
              updated_at: new Date().toISOString()
            });

          if (!error) {
            lastCloudPlaylist.current = currentPlaylistStr;
            lastCloudThemes.current = currentThemesStr;
            lastCloudProjects.current = currentProjectsStr;
            setSyncError(null);
          } else {
            console.error("Cloud sync error:", error);
            setSyncError(describeCloudError(error, "Guardado local. Nube: error al sincronizar."));
          }
          setIsSyncing(false);
        };

        if (deletedItems.length > 0) {
          setIsSyncing(false); // Liberar carga
          setSyncConfirm({
            title: "Confirmar eliminación en la nube (Auto-guardado)",
            message: "El auto-guardado detectó que eliminaste elementos localmente. Si continúas, se borrarán permanentemente también en la nube. ¿Deseas aplicar estos cambios?",
            itemsList: deletedItems,
            type: 'danger',
            confirmText: "Sí, borrar y guardar",
            cancelText: "Cancelar y pausar",
            onConfirm: () => {
              setSyncConfirm(null);
              executeUpsert();
            },
            onCancel: () => {
              setSyncConfirm(null);
              // Sincronizar referencias locales para evitar un bucle de modales
              lastCloudPlaylist.current = currentPlaylistStr;
              lastCloudThemes.current = currentThemesStr;
              lastCloudProjects.current = currentProjectsStr;
            }
          });
        } else {
          await executeUpsert();
        }

      } catch (e) {
        console.error("Critical sync error", e);
        setSyncError(describeCloudError(e, "Guardado local. Nube: error al sincronizar."));
        setIsSyncing(false);
      }
    }, 5000); // 5 second debounce for stability

    return () => clearTimeout(timer);
  }, [playlist, customThemes, projects, currentProjectId, session, autoCloudSync, saveCurrentProjectInto, stripProjectsForStorage]);



  // Auto-save current project's playlist (with guard to prevent infinite loop AND ensure data is loaded)
  const isUpdatingProjectRef = useRef(false);
  // Auto-save current project's playlist (with security check)
  useEffect(() => {
    // GUARD: Do not auto-save if we are currently switching projects
    if (isSwitchingProject.current) return;

    if (isCloudLoading.current || !currentProjectId || projects.length === 0) return;

    // Use a functional update to avoid stale state and race conditions
    // We removed the isUpdatingProjectRef guard because it was skipping valid updates
    setProjects(prev => {
      // VALIDATION: Skip if switching projects or if data isn't fully loaded
      if (isSwitchingProject.current) return prev;

      // Find for changes to avoid unnecessary updates if possible
      const target = prev.find(p => p.id === currentProjectId);

      // Skip if project doesn't exist (edge case during deletion)
      if (!target) return prev;

      // Use deep comparison to avoid spamming updates and triggering sync loops
      if (JSON.stringify(target.playlist) !== JSON.stringify(playlist) ||
        JSON.stringify(target.customThemes) !== JSON.stringify(customThemes)) {
        return prev.map(p =>
          p.id === currentProjectId
            ? { ...p, playlist, customThemes, updatedAt: new Date().toISOString() }
            : p
        );
      }
      return prev;
    });
  }, [playlist, customThemes, currentProjectId, projects.length]);

  // Keep frozenLiveItem in sync with changes in the active playlist
  useEffect(() => {
    if (liveItemId) {
      const itemInPlaylist = playlist.find(i => i.id === liveItemId);
      if (itemInPlaylist) {
        setFrozenLiveItem(itemInPlaylist);
      }
    }
  }, [playlist, liveItemId]);

  // Project Management Functions
  const handleCreateProject = useCallback((name: string, description?: string) => {
    // BLOCK auto-saves to prevent race conditions
    isSwitchingProject.current = true;

    const newProject: Project = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      playlist: [],
      customThemes: []
    };

    // Update all relevant states after preserving the current project.
    setProjects(prev => [...saveCurrentProjectInto(prev), newProject]);
    setCurrentProjectId(newProject.id);
    setPlaylist([]);
    setCustomThemes([]);
    setActiveSlideIndex(-1);

    // Log to action history
    actionHistoryService.log(
      session?.user?.id,
      'project_created',
      `Proyecto creado: ${name}`,
      { projectId: newProject.id, name }
    );

    // Unblock after state settles
    setTimeout(() => {
      isSwitchingProject.current = false;
    }, 250);
  }, [saveCurrentProjectInto, session?.user?.id]);



  const handleDeleteProject = useCallback((projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    const userId = session?.user?.id;

    setProjects(prev => prev.filter(p => p.id !== projectId));
    if (currentProjectId === projectId) {
      setCurrentProjectId(null);
      setPlaylist([]);
      setCustomThemes([]);
    }

    // Log to action history
    actionHistoryService.log(
      session?.user?.id,
      'project_deleted',
      `Proyecto eliminado: ${project?.name || 'Desconocido'}`,
      { projectId, name: project?.name }
    );
  }, [currentProjectId, projects, session?.user?.id]);

  const handleRenameProject = useCallback((projectId: string, newName: string) => {
    const project = projects.find(p => p.id === projectId);
    const userId = session?.user?.id;

    setProjects(prev => prev.map(p =>
      p.id === projectId
        ? { ...p, name: newName, updatedAt: new Date().toISOString() }
        : p
    ));

    // Log to action history
    actionHistoryService.log(
      session?.user?.id,
      'project_renamed',
      `Proyecto renombrado: "${project?.name}" a "${newName}"`,
      { projectId, oldName: project?.name, newName }
    );
  }, [projects, session?.user?.id]);

  const handleDuplicateProject = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const newProject: Project = {
      ...project,
      id: Date.now().toString(),
      name: `${project.name} (Copia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setProjects(prev => [...prev, newProject]);

    // Log to action history
    actionHistoryService.log(
      session?.user?.id,
      'project_duplicated',
      `Proyecto duplicado: ${project.name}`,
      { originalId: projectId, newId: newProject.id, name: newProject.name }
    );
  };

  const handleUpdateProjectDate = (projectId: string, date: string | undefined) => {
    setProjects(prev => prev.map(p =>
      p.id === projectId
        ? { ...p, scheduledDate: date, updatedAt: new Date().toISOString() }
        : p
    ));
    // Save logic is handled by useEffect auto-save
  };

  const handleCreateProjectAtDate = (date: string) => {
    // BLOCK auto-saves to prevent race conditions
    isSwitchingProject.current = true;

    // FORCE SAVE current project state synchronously to the projects array before creating new one
    if (currentProjectId) {
      setProjects(prev => prev.map(p =>
        p.id === currentProjectId
          ? { ...p, playlist, customThemes, updatedAt: new Date().toISOString() }
          : p
      ));
    }

    const newProject: Project = {
      id: Date.now().toString(),
      name: 'Nuevo Evento',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      scheduledDate: date,
      playlist: []
    };

    setProjects(prev => [newProject, ...saveCurrentProjectInto(prev)]);
    setCurrentProjectId(newProject.id);
    setPlaylist([]); // Start empty for the new project
    setShowCalendar(false); // Switch to editor

    // Unblock after state settles
    setTimeout(() => {
      isSwitchingProject.current = false;
    }, 500);
  };

  // Import Playlist Handler - supports selective import
  const handleImportPlaylist = useCallback((
    items: PresentationItem[],
    themes: Theme[],
    mode: 'replace' | 'merge',
    importedProjects?: Project[]
  ) => {
    const userId = session?.user?.id;

    // Handle playlist import
    if (items.length > 0) {
      if (mode === 'replace') {
        setPlaylist(items);
      } else {
        setPlaylist(prev => [...prev, ...items]);
      }

      // Log to action history
      if (userId) {
        actionHistoryService.log(
          userId,
          'data_imported',
          `Importados ${items.length} items a la playlist (modo: ${mode === 'merge' ? 'agregar' : 'reemplazar'})`,
          { itemCount: items.length, mode }
        );
      }
    }

    // Handle themes import
    if (themes.length > 0) {
      if (mode === 'replace') {
        setCustomThemes(themes);
      } else {
        setCustomThemes(prev => {
          const existingNames = prev.map(t => t.name);
          const newThemes = themes.filter(t => !existingNames.includes(t.name));
          return [...prev, ...newThemes];
        });
      }

      if (userId) {
        actionHistoryService.log(
          userId,
          'themes_imported',
          `Importados ${themes.length} temas personalizados`,
          { themeCount: themes.length, mode }
        );
      }
    }

    // Handle projects import
    if (importedProjects && importedProjects.length > 0) {
      if (mode === 'replace') {
        setProjects(importedProjects);
      } else {
        setProjects(prev => {
          const existingIds = prev.map(p => p.id);
          const newProjects = importedProjects.map(p => {
            // If project ID exists, create a new ID
            if (existingIds.includes(p.id)) {
              return { ...p, id: `${p.id}_${Date.now()}`, name: `${p.name} (Importado)` };
            }
            return p;
          });
          return [...prev, ...newProjects];
        });
      }

      if (userId) {
        actionHistoryService.log(
          userId,
          'projects_imported',
          `Importados ${importedProjects.length} proyectos`,
          { projectCount: importedProjects.length, mode }
        );
      }
    }
  }, [session?.user?.id]);

  // Divider Management Functions
  const handleAddDivider = useCallback((title: string, color?: string, icon?: string) => {
    const dividerItem: PresentationItem = {
      id: `divider_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      type: 'divider',
      slides: [], // Dividers have no slides
      theme: DEFAULT_THEME,
      dividerColor: color || '#6366f1',
      dividerIcon: icon || '📋'
    };
    setPlaylist(prev => [...prev, dividerItem]);
  }, []);

  const handleUpdateDivider = useCallback((itemId: string, title: string, color?: string, icon?: string) => {
    setPlaylist(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, title, dividerColor: color, dividerIcon: icon }
        : item
    ));
  }, []);

  // Clock Timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);


  // Sync internal fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Close external window when app closes
  useEffect(() => {
    return () => {
      if (externalWindow) externalWindow.close();
    };
  }, [externalWindow]);

  // Scroll mini grid to active slide
  useEffect(() => {
    if (miniGridRef.current && activeSlideIndex >= 0) {
      const activeEl = miniGridRef.current.children[activeSlideIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeSlideIndex]);

  const handleAddItem = useCallback((item: PresentationItem) => {
    const newItem = {
      ...item,
      theme: { ...(defaultCustomTheme || item.theme || DEFAULT_THEME) }
    };

    setPlaylist(prev => [...prev, newItem]);

    // Log to action history
    actionHistoryService.log(
      session?.user?.id,
      'song_added',
      `Añadido: ${item.title}`,
      { itemId: item.id, type: item.type, slideCount: item.slides?.length || 0 }
    );
  }, [defaultCustomTheme, session?.user?.id]);

  const stopBackgroundAudio = useCallback(() => {
    setBgAudioPlaylist([]);
    setCurrentAudioIndex(-1);
  }, []);


  const seekAudio = useCallback((seconds: number) => {
    if (!audioIframeRef.current) return;

    // Estimate current time: offset from previous plays + time since current play started
    let currentEstimateSeconds = audioElapsedOffset / 1000;
    if (isAudioPlaying) {
      currentEstimateSeconds += (Date.now() - audioStartTime) / 1000;
    }

    const newTime = Math.max(0, currentEstimateSeconds + seconds);
    const msg = `{"event":"command","func":"seekTo","args":[${newTime}, true]}`;
    audioIframeRef.current.contentWindow?.postMessage(msg, '*');

    // Update our baseline
    if (isAudioPlaying) {
      // If playing, we shift the start time backward/forward to match the new position
      setAudioStartTime(prev => prev - (seconds * 1000));
    } else {
      // If paused, we just update the offset
      setAudioElapsedOffset(newTime * 1000);
    }
  }, [audioStartTime, audioElapsedOffset, isAudioPlaying]);

  const handleDeleteItem = (id: string) => {
    const item = playlist.find(i => i.id === id);
    setPlaylist(prev => prev.filter(item => item.id !== id));
    if (activeItemId === id) {
      setActiveItemId(null);
      setActiveSlideIndex(-1);
    }

    // Log to action history
    actionHistoryService.log(
      session?.user?.id,
      'song_removed',
      `Eliminado: ${item?.title || 'Elemento'}`,
      { itemId: id, type: item?.type }
    );
  };

  // --- CORE UPDATE FUNCTIONS ---

  // Sync staged theme ONLY when active item changes
  const lastActiveItemId = useRef<string | null>(null);
  useEffect(() => {
    if (activeItemId !== lastActiveItemId.current) {
      // Use top-level derived activeItem
      if (activeItem) {
        setStagedTheme(activeItem.theme);
      } else {
        setStagedTheme(defaultCustomTheme || DEFAULT_THEME);
      }
      lastActiveItemId.current = activeItemId;
    }
  }, [activeItemId, playlist, defaultCustomTheme]);

  useEffect(() => {
    if (!activeItemId) {
      setStagedTheme(defaultCustomTheme || DEFAULT_THEME);
    }
  }, [activeItemId, defaultCustomTheme]);

  const handleUpdateStagedTheme = (newTheme: Theme) => {
    if (logoSettingsChanged(newTheme, globalLogoSettings)) {
      setGlobalLogoSettings(extractLogoSettings(newTheme));
    }
    setStagedTheme(prev => keepThemeLogoFields(newTheme, prev));
  };

  // History System for Undo/Redo
  const [history, setHistory] = useState<import('./types').HistoryEntry[]>([]);
  const [originalThemes, setOriginalThemes] = useState<Record<string, Theme>>({});

  // Update the Theme of the ACTIVE item only (This is the "Apply" logic)
  const handleUpdateActiveItemTheme = (newTheme: Theme) => {
    if (!activeItemId) return;

    // Use top-level derived activeItem
    const userId = session?.user?.id;

    if (activeItem) {
      // Save current theme to history before updating (limited to 50 steps)
      const entry: import('./types').HistoryEntry = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        timestamp: Date.now(),
        description: `Cambio de tema: ${new Date().toLocaleTimeString()}`,
        data: activeItem.theme
      };
      setHistory(prev => [entry, ...prev].slice(0, 50));

      // Save as original if not already saved
      if (!originalThemes[activeItemId]) {
        setOriginalThemes(prev => ({ ...prev, [activeItemId]: activeItem.theme }));
      }

      // Log to action history
      actionHistoryService.log(
        session?.user?.id,
        'theme_changed',
        `Cambio de estilo en: ${activeItem.title}`,
        { itemId: activeItemId, themeName: newTheme.name }
      );
    }

    if (logoSettingsChanged(newTheme, globalLogoSettings)) {
      setGlobalLogoSettings(extractLogoSettings(newTheme));
    }

    const itemTheme = activeItem ? keepThemeLogoFields(newTheme, activeItem.theme) : newTheme;
    setPlaylist(prev => prev.map(item =>
      item.id === activeItemId ? { ...item, theme: keepThemeLogoFields(newTheme, item.theme) } : item
    ));
    // Also sync staged theme
    setStagedTheme(itemTheme);
  };

  const handleUndo = () => {
    if (history.length === 0 || !activeItemId) return;
    const lastEntry = history[0];
    setHistory(prev => prev.slice(1));

    if (logoSettingsChanged(lastEntry.data, globalLogoSettings)) {
      setGlobalLogoSettings(extractLogoSettings(lastEntry.data));
    }

    setPlaylist(prev => prev.map(item =>
      item.id === activeItemId ? { ...item, theme: lastEntry.data } : item
    ));
    setStagedTheme(lastEntry.data);
  };

  const handleRestoreHistory = (entry: import('./types').HistoryEntry) => {
    if (!activeItemId) return;

    if (logoSettingsChanged(entry.data, globalLogoSettings)) {
      setGlobalLogoSettings(extractLogoSettings(entry.data));
    }

    setPlaylist(prev => prev.map(item =>
      item.id === activeItemId ? { ...item, theme: entry.data } : item
    ));
    setStagedTheme(entry.data);
  };

  const handleRestoreOriginal = () => {
    if (!activeItemId || !originalThemes[activeItemId]) return;
    handleUpdateActiveItemTheme(originalThemes[activeItemId]);
  };

  const handleUpdateItemTitle = (itemId: string, newTitle: string) => {
    const item = playlist.find(i => i.id === itemId);
    const userId = session?.user?.id;

    setPlaylist(prev => prev.map(item =>
      item.id === itemId ? { ...item, title: newTitle } : item
    ));

    // Log to action history
    actionHistoryService.log(
      session?.user?.id,
      'item_renamed',
      `Renombrado: "${item?.title}" a "${newTitle}"`,
      { itemId, oldTitle: item?.title, newTitle }
    );
  };

  const handleUpdateSlideLabel = (itemId: string, slideId: string, newLabel: string) => {
    setPlaylist(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      return {
        ...item,
        slides: item.slides.map(slide =>
          slide.id === slideId ? { ...slide, label: newLabel } : slide
        )
      };
    }));
  };

  const handleDeleteSlide = (itemId: string, slideId: string) => {
    setPlaylist(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      return {
        ...item,
        slides: item.slides.filter(s => s.id !== slideId)
      };
    }).filter(item => item.slides.length > 0)); // Remove item if it has no slides left
  };

  // Duplicar un slide dentro de un item
  const handleDuplicateSlide = useCallback((itemId: string, slideId: string) => {
    setPlaylist(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const slideIndex = item.slides.findIndex(s => s.id === slideId);
      if (slideIndex === -1) return item;

      const originalSlide = item.slides[slideIndex];
      const duplicatedSlide = {
        ...originalSlide,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        label: originalSlide.label ? `${originalSlide.label} (copia)` : undefined,
        segments: originalSlide.segments ? [...originalSlide.segments.map(s => ({
          ...s,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
        }))] : undefined
      };

      const newSlides = [...item.slides];
      newSlides.splice(slideIndex + 1, 0, duplicatedSlide);

      return { ...item, slides: newSlides };
    }));
  }, []);

  const handleRefreshItem = async (item: PresentationItem) => {
    if (!item.query) {
      alert("Este elemento no se puede actualizar automáticamente (no tiene búsqueda guardada).");
      return;
    }

    setIsSyncing(true);
    try {
      const { slides } = await (item.type === 'song'
        ? fetchSongLyrics(item.query, item.density || 'classic')
        : fetchBiblePassage(item.query, item.bibleVersion || 'Reina Valera 1960', item.density || 'classic'));

      setPlaylist(prev => prev.map(i =>
        i.id === item.id ? { ...i, slides: slides } : i
      ));
    } catch (e) {
      console.error("Error refreshing item", e);
      alert("Error al actualizar: " + (e as Error).message);
    }
    setIsSyncing(false);
  };

  const handleDuplicateItem = useCallback((itemId: string) => {
    setPlaylist(prev => {
      const idx = prev.findIndex(item => item.id === itemId);
      if (idx === -1) return prev;

      const itemToDuplicate = prev[idx];
      const duplicatedItem: import('./types').PresentationItem = {
        ...itemToDuplicate,
        id: `song_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: `${itemToDuplicate.title} (Copia)`,
        slides: itemToDuplicate.slides.map((slide, sIdx) => ({
          ...slide,
          id: `slide_${Date.now()}_${sIdx}_${Math.random().toString(36).substr(2, 9)}`
        }))
      };

      const newPlaylist = [...prev];
      newPlaylist.splice(idx + 1, 0, duplicatedItem);
      return newPlaylist;
    });
  }, []);

  const handleUploadImages = async (files: FileList | null, itemId?: string) => {
    if (!files || files.length === 0) return;

    const newSlides: Slide[] = [];
    let presentationTitle = '';

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      const isPresentation = isPresentationFile(file);

      if (!isImage && !isVideo && !isPresentation) continue;

      // ── POWERPOINT / PDF ──────────────────────────────────
      if (isPresentation) {
        const typeName = getPresentationTypeName(file);
        presentationTitle = file.name.replace(/\.[^.]+$/, '');
        setIsSyncing(true); // Show loading indicator
        try {
          let importedSlides: Slide[];
          if (file.name.toLowerCase().endsWith('.pptx')) {
            importedSlides = await parsePptxFile(file);
          } else {
            importedSlides = await parsePdfFile(file);
          }
          newSlides.push(...importedSlides);
          console.log(`✅ Imported ${importedSlides.length} slides from ${typeName}`);
        } catch (err) {
          console.error(`Failed to parse ${typeName}:`, err);
          alert(`Error al importar ${typeName}: ${(err as Error).message}`);
        } finally {
          setIsSyncing(false);
        }
        continue;
      }

      const slideId = Math.random().toString(36).substr(2, 9);

      if (isVideo) {
        // Store video blob in IndexedDB instead of converting to base64
        // This prevents Out of Memory crashes on the projector
        try {
          const idbRef = await storeMediaBlob(slideId, file);
          newSlides.push({
            id: slideId,
            type: 'video',
            content: '',
            mediaUrl: idbRef, // Lightweight reference like "idb:abc123"
            label: `VIDEO - ${file.name.split('.')[0]}`.toUpperCase()
          });
        } catch (err) {
          console.error('Failed to store video in IndexedDB:', err);
          // Fallback: use Object URL (won't persist but won't crash)
          const blobUrl = URL.createObjectURL(file);
          newSlides.push({
            id: slideId,
            type: 'video',
            content: '',
            mediaUrl: blobUrl,
            label: `VIDEO - ${file.name.split('.')[0]}`.toUpperCase()
          });
        }
      } else {
        // Images: compress and use data URL as before
        const reader = new FileReader();
        const promise = new Promise<string>((resolve) => {
          reader.onload = async (e) => {
            const rawDataUrl = e.target?.result as string;
            try {
              const compressed = await compressImage(rawDataUrl);
              resolve(compressed);
            } catch (err) {
              console.error("Compression failed, using original", err);
              resolve(rawDataUrl);
            }
          };
        });
        reader.readAsDataURL(file);
        const dataUrl = await promise;

        newSlides.push({
          id: slideId,
          type: 'image',
          content: '',
          mediaUrl: dataUrl,
          label: `IMAGEN - ${file.name.split('.')[0]}`.toUpperCase()
        });
      }
    }

    if (newSlides.length === 0) return;

    if (itemId) {
      setPlaylist(prev => prev.map(item =>
        item.id === itemId ? { ...item, slides: [...item.slides, ...newSlides] } : item
      ));
    } else {
      const title = presentationTitle 
        || (files.length === 1 ? files[0].name : `Galería (${files.length} fotos)`);
      const newItem: PresentationItem = {
        id: Math.random().toString(36).substr(2, 9),
        title,
        type: 'custom',
        slides: newSlides,
        theme: creationTheme
      };
      setPlaylist(prev => [...prev, newItem]);
    }
  };

  // Logic to add a manual slide (Image or Text) to the current item
  const handleAddSlideToActiveItem = (newSlide: Slide) => {
    if (!activeItemId) {
      // Create a new item if nothing is selected
      const newItem: PresentationItem = {
        id: Math.random().toString(36).substr(2, 9),
        title: newSlide.label === 'IMAGEN' ? 'Nueva Imagen' : (newSlide.label || 'Nuevo Elemento'),
        type: 'custom',
        slides: [newSlide],
        theme: creationTheme
      };
      setPlaylist(prev => [...prev, newItem]);
      setActiveItemId(newItem.id);
      setActiveSlideIndex(0);
      return;
    }

    setPlaylist(prev => prev.map(item => {
      if (item.id !== activeItemId) return item;
      return {
        ...item,
        slides: [...item.slides, newSlide]
      };
    }));
  };

  const handleSlideClick = (itemId: string, index: number) => {
    setActiveItemId(itemId);
    setActiveSlideIndex(index);
    // If the clicked item is already LIVE, update the live slide index immediately
    if (itemId === liveItemId) {
      setLiveSlideIndex(index);
    }
    setIsPreviewHidden(false);
    setIsLogoActive(false);
  };

  const toggleFullscreen = useCallback(() => {
    if (liveViewRef.current) {
      if (!document.fullscreenElement) {
        liveViewRef.current.requestFullscreen().catch(err => console.error(err));
      } else {
        document.exitFullscreen();
      }
    }
  }, []);

  // External Window Logic
  const openProjectorWindow = useCallback(async (): Promise<Window | null> => {
    if (externalWindow && !externalWindow.closed) {
      externalWindow.focus();
      sendSyncState(true);
      return externalWindow;
    }
    if (externalWindow?.closed) {
      setExternalWindow(null);
    }

    // Use current URL with projector=true to ensure same origin for YouTube
    const projectorUrl = window.location.origin + window.location.pathname + '?projector=true';

    // Default Fallback: Assume 2nd screen is to the right
    let left = window.screen.availWidth;
    let top = 0;

    // Advanced: Try to use the modern Window Management API for precise placement
    // This requires a one-time permission grant from the user in Chrome/Edge.
    if ('getScreenDetails' in window) {
      try {
        const screenDetails = await (window as any).getScreenDetails();
        // Find a screen that is NOT the current one
        const currentScreen = screenDetails.currentScreen;
        const extendedScreen = screenDetails.screens.find((s: any) => s !== currentScreen);

        if (extendedScreen) {
          left = extendedScreen.left;
          top = extendedScreen.top;
        }
      } catch (e) {
        console.warn("Projector: Auto-screen detection failed or denied. Using default offset.", e);
      }
    }

    const newWindow = window.open(
      projectorUrl,
      'ProjectorWindow',
      `width=1280,height=720,left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`
    );

    if (newWindow) {
      newWindow.onbeforeunload = () => setExternalWindow(null);
      setExternalWindow(newWindow);

      // Send current state immediately to the new window
      setTimeout(() => sendSyncState(true), 250);
      setTimeout(() => sendSyncState(true), 900);

      // Give it a moment to load then try to focus and fullscreen
      setTimeout(() => {
        if (newWindow && !newWindow.closed) {
          newWindow.focus();
          newWindow.postMessage('OASIS_TOGGLE_FULLSCREEN', '*');
        }
      }, 1000);

      return newWindow;
    }
    return null;
  }, [externalWindow, sendSyncState]);

  const closeProjectorWindow = useCallback(() => {
    if (externalWindow && !externalWindow.closed) {
      externalWindow.close();
    }
    setExternalWindow(null);
  }, [externalWindow]);

  const toggleProjectorFullscreen = useCallback(() => {
    if (externalWindow && !externalWindow.closed) {
      sendSyncState(true);
      externalWindow.postMessage('OASIS_TOGGLE_FULLSCREEN', '*');
      externalWindow.focus();
    } else {
      setExternalWindow(null);
      // If window is closed/null, try to reopen it
      openProjectorWindow();
    }
  }, [externalWindow, openProjectorWindow, sendSyncState]);

  const [previewSlide, setPreviewSlide] = useState<Slide | null>(null);


  // 1. DASHBOARD VIEW (Private Staging)
  const currentSlide: Slide | null = activeItem && activeSlideIndex >= 0
    ? activeItem.slides[activeSlideIndex]
    : null;
  const currentTheme = applyLogoSettings(stagedTheme, globalLogoSettings);

  // 2. PROJECTOR VIEW (Public Live)
  const projectorSlide: Slide | null = (liveItem && liveSlideIndex >= 0)
    ? liveItem.slides[liveSlideIndex]
    : null;

  // The projector ONLY shows the already saved theme of the live item.
  // Staging changes will NOT appear here until they are saved/applied.
  const projectorTheme = applyLogoSettings(liveItem ? liveItem.theme : stagedTheme, globalLogoSettings);
  const [lastStableProjectorSlide, setLastStableProjectorSlide] = useState<Slide | null>(null);
  const [lastStableProjectorTheme, setLastStableProjectorTheme] = useState<Theme>(projectorTheme);

  useEffect(() => {
    if (projectorSlide) {
      setLastStableProjectorSlide(projectorSlide);
    } else if (!liveItemId) {
      setLastStableProjectorSlide(null);
    }
  }, [projectorSlide, liveItemId]);

  useEffect(() => {
    if (liveItem || !liveItemId) {
      setLastStableProjectorTheme(prev => JSON.stringify(prev) === JSON.stringify(projectorTheme) ? prev : projectorTheme);
    }
  }, [projectorTheme, liveItem, liveItemId]);

  // Reference for ControlPanel comparison
  const liveTheme = applyLogoSettings(activeItem ? activeItem.theme : DEFAULT_THEME, globalLogoSettings);

  // CONTENT LOGIC:
  // 1. Internal Preview: Show previewSlide (draft) if exists, else current active slide.
  const internalPreviewContent = previewSlide || currentSlide;

  // 2. Projector (External/Live):
  //    Priority: Blackout > Logo > Slide(with ClearText option)
  const projectorContent = isPreviewHidden || isLogoActive ? null : (projectorSlide || (liveItemId ? lastStableProjectorSlide : null));
  const displayedProjectorTheme = liveItemId && !liveItem ? lastStableProjectorTheme : projectorTheme;

  useEffect(() => {
    (window as any).makeLive = makeLive;
    (window as any).stopLive = stopLive;
    (window as any).setBackgroundAudio = (vid: string, title: string) => {
      console.log("Setting background audio:", vid, title);
      const newItem = { id: `bga_${Date.now()}`, videoId: vid, title: title || 'Fondo' };
      setBgAudioPlaylist(prev => {
        const alreadyExists = prev.some(item => item.videoId === vid);
        if (alreadyExists) return prev;
        return [...prev, newItem];
      });
      setCurrentAudioIndex(prev => prev === -1 ? 0 : prev);
    };
  }, [makeLive, stopLive]);

  // Update slide content for an existing item
  const handleUpdateSlideContent = useCallback((slideId: string, newContent: string) => {
    setPlaylist(prev => prev.map(item => ({
      ...item,
      slides: item.slides.map(s => s.id === slideId ? { ...s, content: newContent } : s)
    })));
  }, []);

  // Update slide segments for rich text editing
  const handleUpdateSlideSegments = useCallback((slideId: string, segments: import('./types').TextSegment[]) => {
    setPlaylist(prev => prev.map(item => ({
      ...item,
      slides: item.slides.map(s => s.id === slideId
        ? { ...s, segments, content: segments.map(seg => seg.text).join('') }
        : s)
    })));
  }, []);

  // Update operator notes for a slide (internal notes not shown on projector)
  const handleUpdateSlideNotes = useCallback((itemId: string, slideId: string, notes: string) => {
    setPlaylist(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, slides: item.slides.map(s => s.id === slideId ? { ...s, operatorNotes: notes } : s) }
        : item
    ));
  }, []);

  // --- HELPER FOR QUICK THEME EDIT (PRESENTER MODE) ---
  const cycleFontSize = (direction: 'up' | 'down') => {
    const sizes = ['text-6xl', 'text-7xl', 'text-8xl', 'text-9xl', 'text-[10rem]', 'text-[12rem]', 'text-[14rem]'];
    const currentIndex = sizes.indexOf(currentTheme.fontSize) === -1 ? 3 : sizes.indexOf(currentTheme.fontSize);
    let nextIndex = direction === 'up' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= sizes.length) nextIndex = sizes.length - 1;
    if (nextIndex < 0) nextIndex = 0;
    handleUpdateActiveItemTheme({ ...currentTheme, fontSize: sizes[nextIndex] });
  };

  const navigateNext = useCallback(() => {
    if (!activeItemId) return;
    const currentItemIndex = playlist.findIndex(p => p.id === activeItemId);
    if (currentItemIndex === -1) return;
    const currentItem = playlist[currentItemIndex];

    if (activeSlideIndex < currentItem.slides.length - 1) {
      setActiveSlideIndex(prev => prev + 1);
    }
  }, [activeItemId, activeSlideIndex, playlist]);

  const navigatePrev = useCallback(() => {
    if (!activeItemId) return;
    const currentItemIndex = playlist.findIndex(p => p.id === activeItemId);
    if (currentItemIndex === -1) return;

    if (activeSlideIndex > 0) {
      setActiveSlideIndex(prev => prev - 1);
    }
  }, [activeItemId, activeSlideIndex, playlist]);




  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
        setPaletteQuery('');
        setPaletteResults([]);
        setPaletteActiveIndex(0);
        return;
      }
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          if (isKaraokeActive && liveItemId) {
            const item = playlist.find(p => p.id === liveItemId);
            if (item) {
              const slide = item.slides[liveSlideIndex];
              const wordCount = slide.content.split(/\s+/).length;
              if (karaokeIndex < wordCount - 1) {
                setKaraokeIndex(prev => prev + 1);
              } else {
                navigateLiveNext();
                setKaraokeIndex(-1);
              }
            } else {
              navigateLiveNext();
            }
          } else {
            navigateLiveNext();
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (isKaraokeActive && karaokeIndex > -1) {
            setKaraokeIndex(prev => prev - 1);
          } else {
            navigateLivePrev();
            setKaraokeIndex(-1); // Reset when going back slide
          }
          break;
        case 'Enter': case ' ': e.preventDefault(); makeLive(); break;
        case 'Escape':
        case 'F9':
          e.preventDefault();
          setIsPreviewHidden(prev => !prev);
          break;
        case 'F10':
          e.preventDefault();
          setIsTextHidden(prev => !prev);
          break;
        case 'F11':
          e.preventDefault();
          setIsBackgroundHidden(prev => !prev);
          break;
        case 'F12':
          e.preventDefault();
          setIsLogoActive(prev => !prev);
          break;
        case 'b': case 'B': case '.': setIsPreviewHidden(prev => !prev); break;
        case 'c': case 'C': setIsTextHidden(prev => !prev); break;
        case 'l': case 'L': setIsLogoActive(prev => !prev); break;
        case 'f': case 'F': e.preventDefault(); toggleFullscreen(); break;
        case 'g': case 'G': e.preventDefault(); toggleProjectorFullscreen(); break;

        case 'p': case 'P':
          if (externalWindow) {
            closeProjectorWindow();
          } else {
            openProjectorWindow().then(win => {
              if (win) {
                // Second attempt slightly later to ensure DOM is settled
                setTimeout(() => {
                  win.focus();
                  win.postMessage('OASIS_TOGGLE_FULLSCREEN', '*');
                }, 600);
              }
            });
          }
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateNext, navigatePrev, toggleFullscreen, toggleProjectorFullscreen, openProjectorWindow, closeProjectorWindow, externalWindow, showCommandPalette]);

  if (isProjectorMode) {
    return (
      <div
        className="fixed inset-0 w-screen h-screen bg-black overflow-hidden flex flex-col items-center justify-center cursor-none z-[9999]"
        onDoubleClick={() => {
          if (!document.fullscreenElement) {
            setShowProjectorStartOverlay(false);
            document.documentElement.requestFullscreen().catch(e => console.error(e));
          } else {
            if (document.exitFullscreen) document.exitFullscreen();
          }
        }}
      >
        <style>{`
          body, html, #root { 
            margin: 0 !important; 
            padding: 0 !important; 
            width: 100% !important; 
            height: 100% !important; 
            overflow: hidden !important;
            background: black !important;
          }
        `}</style>
        {showProjectorStartOverlay && !isProjectorFullscreen && (
          <div
            className="absolute inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center text-white cursor-pointer group"
            onClick={() => {
              setShowProjectorStartOverlay(false);
              document.documentElement.requestFullscreen().catch(e => console.error(e));
            }}
          >
            <div className="p-16 border-4 border-white/20 rounded-[4rem] bg-gray-900 flex flex-col items-center gap-6 transition-all hover:bg-gray-800 hover:border-white/40 shadow-3xl">
              <div className="w-24 h-24 bg-white text-black rounded-full flex items-center justify-center animate-bounce">
                <Monitor size={48} />
              </div>
              <div className="text-center">
                <p className="text-5xl font-black mb-2 tracking-tight">PANTALLA COMPLETA</p>
                <p className="text-xl text-gray-400 font-medium">Haz clic aquí para iniciar la proyección</p>
              </div>
              <div className="mt-4 px-6 py-2 bg-white/10 rounded-full text-sm text-gray-500 font-mono">
                Presiona 'F' para alternar
              </div>
            </div>
          </div>
        )}
        <div className="w-full h-full relative">
          {showSplitScreen ? (
            <SplitScreen
              leftSlide={splitLeftSlide || projectorContent}
              rightSlide={splitRightSlide}
              theme={displayedProjectorTheme}
              isFullscreen={true}
              showControls={false}
              splitRatio={splitRatio}
              fontScale={splitFontScale}
            />
          ) : (
            <LiveScreen
              slide={projectorContent}
              theme={displayedProjectorTheme}
              isFullscreen={true}
              enableOverlay={false}
              hideText={isTextHidden}
              hideBackground={isBackgroundHidden}
              isLogoMode={isLogoActive}
              blackout={isPreviewHidden}
              onVideoEnd={handleVideoEnd}
              disableAnimations={true}
            />
          )}
        </div>
      </div>
    );
  }
  // Command Palette Search Trigger
  useEffect(() => {
    if (!showCommandPalette || !paletteQuery.trim()) {
      setPaletteResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setPaletteLoading(true);
      try {
        const query = paletteQuery.trim();
        const songRes = await searchSongs(query);

        // Prepend a virtual item if it looks like a Bible verse
        const isBible = /\d/.test(query);
        if (isBible) {
          const virtualBibleItem = {
            title: `📖 Importar Pasaje Bíblico: "${query}"`,
            artist: 'Biblia Reina Valera 1960',
            snippet: 'Genera diapositivas automáticas del pasaje'
          };
          setPaletteResults([virtualBibleItem, ...songRes]);
        } else {
          setPaletteResults(songRes);
        }
      } catch (err) {
        console.error("Error in Command Palette search:", err);
      } finally {
        setPaletteLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [paletteQuery, showCommandPalette]);

  const handleCommandPaletteSelect = async (result: import('./services/geminiService').SongSearchResult) => {
    setPaletteLoading(true);
    try {
      let item;
      if (result.title.startsWith('📖 Importar Pasaje Bíblico:')) {
        item = await fetchBiblePassage(paletteQuery, 'Reina Valera 1960', 'classic');
      } else {
        item = await fetchSongLyrics(`${result.title} de ${result.artist}`, 'classic');
      }
      handleAddItem(item);
      setShowCommandPalette(false);
    } catch (err) {
      alert("Error al cargar: " + (err as Error).message);
    } finally {
      setPaletteLoading(false);
    }
  };

  if (isRemoteControlMode) {
    if (!remoteControlIdFromUrl) {
      return (
        <div className="min-h-[100dvh] bg-slate-950 text-white flex items-center justify-center p-6">
          <div className="w-full max-w-sm rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center shadow-2xl">
            <Smartphone size={40} className="mx-auto mb-4 text-red-300" />
            <h1 className="text-lg font-black">Enlace remoto incompleto</h1>
            <p className="text-sm text-red-100/80 mt-2">Vuelve a generar el QR desde el panel del presentador.</p>
          </div>
        </div>
      );
    }

    return (
      <RemoteControlPanel
        liveState={remoteLiveState}
        isConnected={isRemoteRealtimeConnected}
        sendCommand={(cmd, data) => remotePanelSyncService.current.sendCommand(remoteControlIdFromUrl, cmd, data)}
      />
    );
  }

  if (!isAuthenticated && !isProjectorMode) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-[radial-gradient(circle_at_top,#1e1b4b_0%,#020617_48%,#000_100%)] text-white p-4">
        <div className="w-full max-w-md bg-slate-950/85 border border-indigo-400/20 rounded-3xl shadow-2xl shadow-indigo-950/40 p-8 flex flex-col items-center gap-6 backdrop-blur">
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 bg-indigo-500/15 rounded-3xl flex items-center justify-center text-indigo-400 mb-2 ring-4 ring-indigo-500/10 border border-indigo-400/20">
              <Lock size={40} />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-center">Acceso Restringido</h2>
            <p className="text-gray-400 text-center text-sm">Esta es un área protegida. Por favor ingresa el código de seguridad para continuar.</p>
          </div>

          <form onSubmit={handleLogin} className="w-full flex flex-col gap-4">
            <div className="relative">
              <input
                type="password"
                value={passcodeInput}
                onChange={(e) => {
                  setPasscodeInput(e.target.value);
                  setAuthError(false);
                }}
                className={`w-full bg-gray-950 border ${authError ? 'border-red-500 text-red-500 focus:ring-red-500/50' : 'border-gray-800 focus:border-indigo-500 focus:ring-indigo-500/50'} rounded-xl px-4 py-4 text-center text-2xl font-mono tracking-[0.5em] outline-none focus:ring-4 transition-all placeholder:tracking-normal`}
                placeholder="••••"
                maxLength={4}
                autoFocus
              />
              {authError && (
                <div className="absolute -bottom-6 left-0 w-full text-center text-xs font-bold text-red-500 animate-pulse">
                  Código Incorrecto
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-indigo-600/20 mt-4 flex items-center justify-center gap-2"
            >
              <Lock size={18} />
              Desbloquear Acceso
            </button>
          </form>

          <div className="mt-4 flex flex-col items-center gap-2">
            <p className="text-[10px] text-gray-600 uppercase font-bold tracking-widest">FlujoEclesial Security</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-[100dvh] bg-[linear-gradient(135deg,#07111d_0%,#0b1020_46%,#020409_100%)] text-white font-sans overflow-hidden select-none">
      {/* LEFT: Control Center (30%) */}
      <div 
        id="control-panel" 
        className={`${mobileTab === 'control' ? 'flex flex-1 min-h-0 pb-[96px] lg:pb-0' : 'hidden'} lg:flex lg:flex-none flex-shrink-0 scrollbar-hide overflow-hidden bg-[#080d17]/95 border-r border-white/10 flex-col shadow-2xl transition-all duration-300`}
        style={{
          width: isLeftSidebarCollapsed ? '0px' : (isMobile ? '100%' : '28%'),
          opacity: isLeftSidebarCollapsed ? 0 : 1,
          borderRightWidth: isLeftSidebarCollapsed ? '0px' : '1px'
        }}
      >
        <ControlPanel
          onAddItem={handleAddItem}
          onUpdateTheme={handleUpdateActiveItemTheme}
          onUpdatePendingTheme={handleUpdateStagedTheme}
          currentTheme={currentTheme}
          liveTheme={activeItem ? applyLogoSettings(activeItem.theme, globalLogoSettings) : currentTheme}
          hasActiveItem={!!activeItemId}
          onAddSlide={handleAddSlideToActiveItem}
          activeSlideType={activeItem?.slides[activeSlideIndex]?.type || 'text'}
          activeSlide={currentSlide}
          onUpdateSlideContent={handleUpdateSlideContent}
          onUpdateSlideSegments={handleUpdateSlideSegments}
          onPreviewSlideUpdate={setPreviewSlide}

          onSetBackgroundAudio={(vid, title) => {
            if (!vid) {
              stopBackgroundAudio();
              return;
            }
            const newItem = { id: `bga_${Date.now()}`, videoId: vid, title: title || 'Fondo Desconocido' };
            setBgAudioPlaylist(prev => [...prev, newItem]);
            if (currentAudioIndex === -1) setCurrentAudioIndex(0);
          }}
          onStopLive={stopLive}
          isLiveActive={!!liveItemId}

          onUndo={handleUndo}
          onRestoreOriginal={handleRestoreOriginal}
          canUndo={history.length > 0}
          onDeselect={() => {
            setActiveItemId(null);
            setActiveSlideIndex(-1);
          }}

          // Karaoke
          isKaraokeActive={isKaraokeActive}
          onToggleKaraoke={() => setIsKaraokeActive(prev => !prev)}

          // Passing audio controls
          isAudioPlaying={isAudioPlaying}
          backgroundAudioItem={backgroundAudioItem}
          bgAudioPlaylist={bgAudioPlaylist}
          onToggleAudioPlayback={toggleAudioPlayback}
          onSeekAudio={seekAudio}
          onNextAudio={navigateNextAudio}
          onPrevAudio={navigatePrevAudio}
          onRemoveAudio={(id) => setBgAudioPlaylist(prev => prev.filter(t => t.id !== id))}
          onSelectAudio={(index) => setCurrentAudioIndex(index)}
          // Custom Themes
          customThemes={customThemes}
          onUpdateCustomThemes={setCustomThemes}
          onUploadImages={handleUploadImages}
          // History
          history={history}
          onRestore={handleRestoreHistory}
        />
      </div>

      {/* MIDDLE: Playlist & Management (45%) */}
      <div id="playlist-panel" className={`${mobileTab === 'playlist' ? 'flex flex-1 min-h-0 pb-[96px] lg:pb-0' : 'hidden'} lg:flex w-full lg:flex-1 flex-col border-r border-white/10 min-w-0 lg:min-w-[300px] overflow-hidden bg-[linear-gradient(180deg,#0a101b_0%,#080d17_52%,#050812_100%)] relative`}>
        {/* Left Collapse Handle */}
        <button
          onClick={() => setIsLeftSidebarCollapsed(!isLeftSidebarCollapsed)}
          className="hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 z-50 h-16 w-[18px] items-center justify-center rounded-r-2xl border-y border-r border-white/10 bg-[#0c1220]/95 text-slate-400 hover:text-cyan-300 hover:bg-[#0f172a] hover:shadow-[0_0_15px_rgba(34,211,238,0.25)] hover:border-cyan-500/30 transition-all duration-300 cursor-pointer shadow-lg"
          title={isLeftSidebarCollapsed ? "Mostrar editor y logo" : "Ocultar editor y logo"}
        >
          {isLeftSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Right Collapse Handle */}
        <button
          onClick={() => setIsRightSidebarCollapsed(!isRightSidebarCollapsed)}
          className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 z-50 h-16 w-[18px] items-center justify-center rounded-l-2xl border-y border-l border-white/10 bg-[#0c1220]/95 text-slate-400 hover:text-cyan-300 hover:bg-[#0f172a] hover:shadow-[0_0_15px_rgba(34,211,238,0.25)] hover:border-cyan-500/30 transition-all duration-300 cursor-pointer shadow-lg"
          title={isRightSidebarCollapsed ? "Mostrar proyección y controles" : "Ocultar proyección y controles"}
        >
          {isRightSidebarCollapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
        {/* Mobile Header - Compact with Live Status */}
        <div className="lg:hidden bg-slate-900/80 backdrop-blur-md px-4 py-3 border-b border-white/10 flex justify-between items-center shrink-0 relative z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-400/20 flex items-center justify-center shadow-lg shadow-indigo-950/20">
              <img src="/logo.svg" alt="Logo" className="w-7 h-7 object-contain brightness-110 contrast-125 drop-shadow-[0_0_8px_rgba(129,140,248,0.5)]" />
            </div>
            <h1 className="text-base font-black tracking-tight text-white flex items-center gap-1">
              <span className="bg-gradient-to-r from-cyan-300 via-indigo-300 to-amber-200 bg-clip-text text-transparent">FlujoEclesial</span>
              <span className="font-light text-slate-400 text-xs">Studio</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {session && (
              <button
                onClick={handleSyncCloud}
                disabled={isSyncing}
                className={`p-2 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-600/20 transition-all active:scale-90 ${isSyncing ? 'animate-spin' : ''}`}
                title="Sincronizar con la nube"
              >
                <RefreshCw size={16} />
              </button>
            )}
            {liveItemId && (
              <div className="flex items-center gap-1.5 bg-red-600/15 border border-red-500/30 rounded-full px-2.5 py-1 shadow-[0_0_12px_rgba(239,68,68,0.2)]">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_6px_#ef4444]"></div>
                <span className="text-[9px] font-black text-red-400 uppercase tracking-wider">VIVO</span>
              </div>
            )}
            {session?.user?.user_metadata?.avatar_url && (
              <img src={session.user.user_metadata.avatar_url} alt="" className="w-7 h-7 rounded-full border border-indigo-500 shadow-lg shadow-indigo-500/20" />
            )}
          </div>
        </div>
        {/* Mobile Quick Actions Bar */}
        <div className="lg:hidden bg-gray-950 px-3 py-2 border-b border-gray-800 flex gap-2 shrink-0">
          <button
            onClick={() => makeLive()}
            disabled={!activeItemId}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-sm uppercase tracking-wide transition-all active:scale-95 ${activeItemId ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-500/30' : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`}
          >
            <PlayCircle size={20} /> EN VIVO
          </button>
          {liveItemId && (
            <button
              onClick={stopLive}
              className="px-4 py-3.5 rounded-xl bg-gray-800 border border-red-500/50 text-red-400 font-bold uppercase active:scale-95 transition-all"
            >
              <Square size={18} fill="currentColor" />
            </button>
          )}
        </div>
        {/* Desktop Header */}
        <div className="hidden lg:flex bg-[#0a101b]/90 backdrop-blur-xl px-6 py-4 border-b border-white/10 justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-cyan-400/10 border border-cyan-300/20 flex items-center justify-center shadow-lg shadow-cyan-950/30">
              <img src="/logo.svg" alt="Logo" className="w-11 h-11 object-contain brightness-110 contrast-125 drop-shadow-[0_0_12px_rgba(129,140,248,0.6)]" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                <span className="bg-gradient-to-r from-cyan-300 via-indigo-300 to-amber-200 bg-clip-text text-transparent">FlujoEclesial</span>
                <span className="font-light text-slate-400">Studio</span>
              </h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Centro de control para proyeccion en vivo</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {session ? (
              <div className="flex items-center gap-4 bg-gray-850/50 p-1.5 pr-4 rounded-xl border border-gray-700/50 shadow-inner">
                <button
                  onClick={handleSyncCloud}
                  disabled={isSyncing}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-all font-black text-[10px] uppercase shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50 ${isSyncing ? 'animate-pulse' : ''}`}
                >
                  <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                  {isSyncing ? 'Sincronizando...' : 'Sincronizar Nube'}
                </button>
                <div className="flex flex-col">
                  <div className="text-[9px] text-gray-500 font-black uppercase tracking-tight">Estado</div>
                  <div className="text-[10px] text-green-500 font-bold flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div>
                    Conectado
                  </div>
                </div>
                <button
                  onClick={() => {
                    localStorage.removeItem('oasis_authenticated');
                    window.location.reload();
                  }}
                  className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                  title="Bloquear Sistema"
                >
                  <Lock size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="text-xs text-gray-500 italic bg-gray-850 px-3 py-1.5 rounded-lg border border-gray-800">
                  Guardado Local Activo
                </div>
                <button
                  onClick={() => {
                    localStorage.removeItem('oasis_authenticated');
                    window.location.reload();
                  }}
                  className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                  title="Bloquear Sistema"
                >
                  <Lock size={18} />
                </button>
              </div>
            )}
          </div>
        </div>

        <div id="playlist-panel" className="flex-1 flex flex-col min-h-0 relative">
          {/* Header Switcher */}
          <div className="flex bg-[#080d17] border-b border-white/10 p-2 gap-2 shrink-0">
            <button
              onClick={() => { setShowCalendar(false); setShowReflow(false); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${!showCalendar && !showReflow ? 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-950/25' : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'}`}
            >
              <LayoutGrid size={14} /> Rejilla
            </button>
            <button
              onClick={() => { setShowCalendar(false); setShowReflow(true); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${showReflow && !showCalendar ? 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-950/25' : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'}`}
            >
              <FileText size={14} /> Reflow Editor
            </button>
            <button
              onClick={() => { setShowCalendar(true); setShowReflow(false); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${showCalendar ? 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-950/25' : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'}`}
            >
              <Calendar size={14} /> Calendario
            </button>
          </div>

          {showCalendar ? (
            <CalendarView
              projects={projects}
              onOpenProject={(id) => {
                handleSelectProject(id);
                setShowCalendar(false);
                setShowReflow(false);
              }}
              onUpdateProjectDate={handleUpdateProjectDate}
              onCreateProjectAtDate={handleCreateProjectAtDate}
            />
          ) : showReflow ? (
            activeItem ? (
              <ReflowEditor
                item={activeItem}
                onUpdateSlides={(itemId, newSlides) => {
                  setPlaylist(prev => prev.map(item =>
                    item.id === itemId ? { ...item, slides: newSlides } : item
                  ));
                }}
                activeSlideIndex={activeSlideIndex}
                onSlideClick={(index) => {
                  setActiveSlideIndex(index);
                  if (liveItemId === activeItemId) setLiveSlideIndex(index);
                  setIsPreviewHidden(false);
                  setIsLogoActive(false);
                }}
                onSlideDoubleClick={(index) => {
                  makeLive(activeItemId, index);
                }}
                liveSlideIndex={liveSlideIndex}
                isLiveActive={liveItemId === activeItemId}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-slate-500 bg-[#060a13] select-none">
                <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-400/20 flex items-center justify-center text-indigo-400 animate-bounce">
                  <Music size={28} />
                </div>
                <div className="text-center max-w-sm">
                  <h3 className="text-white font-black text-sm uppercase tracking-wider">Sin Canción Seleccionada</h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed font-medium">
                    Selecciona una canción o pasaje en tu playlist lateral izquierda primero, y luego abre el Reflow Editor para editarla fluidamente en texto corrido.
                  </p>
                </div>
              </div>
            )
          ) : (
            <>
              {/* Project Manager */}
              <ProjectManager
                projects={projects}
                currentProjectId={currentProjectId}
                onSelectProject={handleSelectProject}
                onCreateProject={handleCreateProject}
                onDeleteProject={handleDeleteProject}
                onRenameProject={handleRenameProject}
                onDuplicateProject={handleDuplicateProject}
              />
              {/* Export/Import Button */}
              <div className="px-4 py-3 border-b border-white/10 flex flex-row overflow-x-auto no-scrollbar gap-2 bg-[#0a111e]/90 items-center scroll-smooth shrink-0">
                {session && (
                  <>
                    <button
                      onClick={handleManualCloudSave}
                      disabled={isSyncing}
                      className="flex-1 bg-emerald-700/80 hover:bg-emerald-600 disabled:opacity-50 text-white px-3 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-bold transition-all"
                      title="Guardar ahora en la nube"
                    >
                      <Check size={14} />
                      <span className="hidden xl:inline">Guardar manual</span>
                    </button>
                    <button
                      onClick={handleToggleAutoCloudSync}
                      className={`px-3 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-bold transition-all border ${autoCloudSync ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40' : 'bg-gray-800 text-gray-400 border-gray-700'}`}
                      title={autoCloudSync ? 'Apagar guardado automatico' : 'Prender guardado automatico'}
                    >
                      <RefreshCw size={14} className={autoCloudSync ? 'text-indigo-300' : 'text-gray-500'} />
                      <span className="hidden 2xl:inline">{autoCloudSync ? 'Auto ON' : 'Auto OFF'}</span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowExportImport(true)}
                  className="flex-1 bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/10 px-3 py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all"
                >
                  <Download size={14} />
                  <Upload size={14} />
                  <span className="hidden xl:inline">Exportar</span>
                </button>
                <button
                  onClick={() => setShowActionHistory(true)}
                  className="bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/10 px-3 py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all"
                  title="Historial de Acciones"
                >
                  <History size={14} />
                  <span className="hidden xl:inline">Historial</span>
                </button>
                <button
                  onClick={() => setShowMobileConnect(true)}
                  className="bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-300 border border-emerald-400/20 px-3 py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all"
                  title="Control Móvil"
                >
                  <Smartphone size={14} />
                  <span className="hidden xl:inline">Móvil</span>
                </button>
              </div>
              <Playlist
                items={playlist}
                activeItemId={activeItemId}
                activeSlideIndex={activeSlideIndex}
                liveItemId={liveItemId}
                liveSlideIndex={liveSlideIndex}
                onSlideClick={handleSlideClick}
                onSlideDoubleClick={(itemId, index) => makeLive(itemId, index)}
                onToggleBackgroundAudio={(vid, title) => {
                  const newItem = { id: `bga_${Date.now()}`, videoId: vid, title: title || 'Fondo' };
                  setBgAudioPlaylist(prev => [...prev, newItem]);
                  if (currentAudioIndex === -1) setCurrentAudioIndex(0);
                }}
                onDeleteItem={handleDeleteItem}
                onDeleteSlide={handleDeleteSlide}
                onDuplicateSlide={handleDuplicateSlide}
                onDuplicateItem={handleDuplicateItem}
                onRefreshItem={handleRefreshItem}

                onUploadImages={handleUploadImages}
                onUpdateSlideLabel={handleUpdateSlideLabel}
                onUpdateItemTitle={handleUpdateItemTitle}
                onReorderItems={(newItems) => setPlaylist(newItems)}
                onReorderSlides={(itemId, newSlides) => {
                  setPlaylist(prev => prev.map(item =>
                    item.id === itemId ? { ...item, slides: newSlides } : item
                  ));
                }}
                onAddDivider={handleAddDivider}
                onUpdateDivider={handleUpdateDivider}
                onUpdateSlideNotes={handleUpdateSlideNotes}
                isSplitMode={showSplitScreen}
                onSetSplitLeft={setSplitLeftSlide}
                onSetSplitRight={setSplitRightSlide}
                splitLeftSlide={splitLeftSlide}
                splitRightSlide={splitRightSlide}
              />
            </>
          )}


          {/* User Auth Bar */}
          <div className="bg-gray-900 px-4 py-2 border-t border-gray-800 flex justify-between items-center shrink-0">
            {session ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white overflow-hidden border border-indigo-400">
                  {session.user.user_metadata.avatar_url ? (
                    <img src={session.user.user_metadata.avatar_url} alt="Profile" />
                  ) : (
                    <UserIcon size={16} />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-300 truncate max-w-[120px]">
                    {session.user.user_metadata.full_name || session.user.email}
                  </span>
                  <span
                    className={`text-[8px] flex items-center gap-1 max-w-[170px] truncate ${syncError ? 'text-amber-400' : isSyncing ? 'text-indigo-400' : 'text-green-500'}`}
                    title={syncError || (isSyncing ? 'Sincronizando...' : 'Sincronizado')}
                  >
                    <div className={`w-1 h-1 rounded-full animate-pulse ${syncError ? 'bg-red-500' : isSyncing ? 'bg-indigo-400' : 'bg-green-500'}`} />
                    {syncError || (isSyncing ? 'Sincronizando...' : 'Sincronizado')}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="ml-2 p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                  title="Cerrar Sesión"
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="flex items-center gap-2 bg-white text-black px-3 py-1.5 rounded-md text-xs font-bold hover:bg-gray-200 transition-all shadow-md group"
              >
                <LogIn size={14} className="group-hover:translate-x-0.5 transition-transform" />
                Ingresar con Google
              </button>
            )}
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  localStorage.removeItem('oasis_onboarding_complete');
                  setShowOnboarding(true);
                }}
                className="flex items-center gap-1.5 px-2 py-1 rounded bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 text-[10px] font-bold transition-all border border-indigo-500/20"
              >
                <HelpCircle size={12} /> Ver Tutorial
              </button>
              <button
                onClick={() => setShowMobileConnect(true)}
                className="flex items-center gap-1.5 px-2 py-1 rounded bg-green-600/10 hover:bg-green-600/20 text-green-400 text-[10px] font-bold transition-all border border-green-500/20"
              >
                <Smartphone size={12} /> App Móvil
              </button>
              <div className="text-[10px] text-gray-500 italic">
                {isSyncing ? 'Sincronizando...' : 'Nube Activa'}
              </div>
            </div>
          </div>

          {/* Desktop Only Footer */}
          <div className="hidden lg:flex bg-gray-900 p-4 border-t border-gray-800 flex-col gap-2 shrink-0">
            <div className="text-[10px] text-gray-600 text-center mt-1">
              Atajos: Espacio (Sig), Flechas (Nav), B (Black), C (Clear), L (Logo), F (Pantalla), P (Proyector)
            </div>
            <div className="text-[10px] text-orange-400 text-center font-bold animate-pulse">
              NOTA: Para pantalla completa dale a cualquier letra y después a proy-full.
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Live Preview & Presenter Tools (35%) */}
      <div 
        id="live-preview-panel" 
        className={`${mobileTab === 'preview' ? 'flex flex-1 min-h-0 pb-[96px] lg:pb-0' : 'hidden'} lg:flex lg:flex-none flex-shrink-0 flex-col bg-[#070b13] relative border-l border-white/10 overflow-hidden transition-all duration-300`}
        style={{
          width: isRightSidebarCollapsed ? '0px' : (isMobile ? '100%' : '34%'),
          opacity: isRightSidebarCollapsed ? 0 : 1,
          borderLeftWidth: isRightSidebarCollapsed ? '0px' : '1px'
        }}
      >

        {/* TOP BAR: Clock and Status - Responsive */}
        <div className="h-12 lg:h-14 bg-[#0a101b] border-b border-white/10 flex items-center justify-between px-3 lg:px-4 shrink-0 shadow-[0_16px_45px_rgba(0,0,0,0.24)]">
          <div className="flex items-center gap-2 text-cyan-300 font-black text-xs lg:text-sm truncate max-w-[55%] lg:max-w-[50%]">
            <PlayCircle size={14} className="shrink-0" />
            <span className="truncate">{activeItem ? activeItem.title : 'Sin Selección'}</span>
          </div>
          <div className="flex items-center gap-2 lg:gap-3">
            {/* Timer Toggle Button */}
            <button
              onClick={() => setShowTimer(prev => !prev)}
              className={`p-2 rounded-lg transition-all ${showTimer ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'}`}
              title="Temporizador"
            >
              <Timer size={16} />
            </button>
            <div className="text-base lg:text-xl font-mono text-gray-300 font-bold flex items-center gap-1.5 lg:gap-2 bg-black px-2 py-0.5 rounded border border-gray-700">
              <Clock size={12} className="text-indigo-500 hidden sm:block" />
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        {/* Hotline Emergency Panic Controls (ProPresenter-style) */}
        <div className="bg-slate-950/80 backdrop-blur-md px-4 py-2 border-b border-white/10 flex gap-2 shrink-0 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setIsPreviewHidden(prev => !prev)}
            className={`flex-1 min-w-[100px] py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all duration-300 border ${
              isPreviewHidden
                ? 'bg-red-500/20 text-red-400 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse'
                : 'bg-white/[0.04] text-slate-400 border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30'
            }`}
            title="Limpia texto y fondo (Pantalla a negro) [F9 o ESC]"
          >
            <div className={`w-2 h-2 rounded-full ${isPreviewHidden ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-red-500/40'}`} />
            CLEAR ALL
            <span className="hidden sm:inline opacity-50 text-[8px] font-normal">F9</span>
          </button>

          <button
            onClick={() => {
              setIsTextHidden(prev => !prev);
              setIsPreviewHidden(false);
            }}
            className={`flex-1 min-w-[100px] py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all duration-300 border ${
              isTextHidden
                ? 'bg-amber-500/20 text-amber-400 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                : 'bg-white/[0.04] text-slate-400 border-white/10 hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/30'
            }`}
            title="Quita el texto manteniendo el fondo [F10]"
          >
            <div className={`w-2 h-2 rounded-full ${isTextHidden ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b]' : 'bg-amber-500/40'}`} />
            CLEAR TEXT
            <span className="hidden sm:inline opacity-50 text-[8px] font-normal">F10</span>
          </button>

          <button
            onClick={() => {
              setIsBackgroundHidden(prev => !prev);
              setIsPreviewHidden(false);
            }}
            className={`flex-1 min-w-[100px] py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all duration-300 border ${
              isBackgroundHidden
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                : 'bg-white/[0.04] text-slate-400 border-white/10 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30'
            }`}
            title="Quita el fondo y deja el texto sobre negro [F11]"
          >
            <div className={`w-2 h-2 rounded-full ${isBackgroundHidden ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-emerald-500/40'}`} />
            CLEAR BG
            <span className="hidden sm:inline opacity-50 text-[8px] font-normal">F11</span>
          </button>

          <button
            onClick={() => {
              setIsLogoActive(prev => !prev);
              setIsPreviewHidden(false);
            }}
            className={`flex-1 min-w-[100px] py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all duration-300 border ${
              isLogoActive
                ? 'bg-blue-500/20 text-blue-400 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.4)]'
                : 'bg-white/[0.04] text-slate-400 border-white/10 hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/30'
            }`}
            title="Proyecta el Logotipo de la Iglesia [F12]"
          >
            <div className={`w-2 h-2 rounded-full ${isLogoActive ? 'bg-blue-500 shadow-[0_0_8px_#3b82f6]' : 'bg-blue-500/40'}`} />
            SHOW LOGO
            <span className="hidden sm:inline opacity-50 text-[8px] font-normal">F12</span>
          </button>
        </div>

        {/* PREVIEW AREA */}
        <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-[radial-gradient(circle_at_center,#111827_0%,#070b13_62%,#020409_100%)] p-4">

          {/* Status Overlays for Operator */}
          {isPreviewHidden && (
            <div className="absolute top-4 right-4 z-50">
              <div className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest shadow-lg animate-pulse border border-red-400">
                BLACKOUT
              </div>
            </div>
          )}
          {isTextHidden && !isPreviewHidden && !isLogoActive && (
            <div className="absolute top-4 right-4 z-50">
              <div className="bg-yellow-600 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest shadow-lg border border-yellow-400">
                TEXTO OCULTO
              </div>
            </div>
          )}
          {isLogoActive && !isPreviewHidden && (
            <div className="absolute top-4 right-4 z-50">
              <div className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest shadow-lg border border-blue-400">
                LOGO
              </div>
            </div>
          )}
          {showSplitScreen && (
            <div className="absolute top-4 right-4 z-50">
              <div className="bg-purple-600 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest shadow-lg border border-purple-400">
                SPLIT
              </div>
            </div>
          )}

          <div ref={liveViewRef} className="w-full aspect-video max-h-full flex items-center justify-center relative group rounded-2xl overflow-hidden border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.7),0_0_40px_rgba(99,102,241,0.08)] bg-slate-950 transition-all duration-300">
            {/* Internal Preview renders logic (Always detailed "Staging" view) */}
            {showSplitScreen ? (
              <SplitScreen
                leftSlide={splitLeftSlide || currentSlide}
                rightSlide={splitRightSlide}
                theme={currentTheme}
                isFullscreen={false}
                showControls={true}
                splitRatio={splitRatio}
                onSplitRatioChange={setSplitRatio}
                fontScale={splitFontScale}
                onFontScaleChange={setSplitFontScale}
              />
            ) : (
              <LiveScreen
                slide={currentSlide}
                theme={currentTheme}
                isFullscreen={false}
                enableOverlay={true}
                onUpdateTheme={handleUpdateStagedTheme}
                karaokeActive={isKaraokeActive && liveItemId === activeItem?.id}
                karaokeIndex={karaokeIndex}
                hideText={isTextHidden && liveItemId === activeItem?.id && !isLogoActive}
                hideBackground={isBackgroundHidden}
                isLogoMode={isLogoActive}
                blackout={isPreviewHidden}
                autoPlay={false}
                mute={true}
                onVideoEnd={handleVideoEnd}
              />
            )}

            {/* LIVE MONITOR PIP (Picture-in-Picture) */}
            {(liveItemId || isLogoActive) && (
              <div className="absolute bottom-6 right-6 w-56 aspect-video bg-black border-2 border-red-600 rounded-lg shadow-[0_0_20px_rgba(220,38,38,0.4)] z-50 overflow-hidden ring-4 ring-black/50">
                <div className="absolute top-0 left-0 bg-red-600 text-white text-[9px] font-black px-2 py-0.5 z-[60] flex items-center gap-1 shadow-md">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  VIVO
                </div>
                <div className="w-full h-full pointer-events-none scale-[1.01]">
                  <LiveScreen
                    slide={projectorContent}
                    theme={projectorTheme}
                    isFullscreen={false}
                    enableOverlay={false}
                    hideText={isTextHidden}
                    hideBackground={isBackgroundHidden}
                    isLogoMode={isLogoActive}
                    blackout={isPreviewHidden}
                    autoPlay={false} // PIP is static to avoid sync annoyance
                    mute={true}      // PIP is silent
                    onVideoEnd={handleVideoEnd}
                    disableAnimations={true}
                  />
                </div>
              </div>
            )}

            {/* On-Screen Navigation Arrows (Visible on Hover) */}
            {!isFullscreen && (
              <>
                <button onClick={navigatePrev} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-indigo-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all z-40 transform hover:scale-110">
                  <ChevronLeft size={24} />
                </button>
                <button onClick={navigateNext} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-indigo-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all z-40 transform hover:scale-110">
                  <ChevronRight size={24} />
                </button>
              </>
            )}
          </div>

        </div>

        {/* PRESENTER CONTROLS & MINI GRID */}
        <div className="bg-slate-950/95 border-t border-white/10 flex flex-col shadow-[0_-5px_24px_rgba(0,0,0,0.35)] z-30 shrink-0 backdrop-blur">

          {/* Mobile Navigation Arrows */}
          <div className="lg:hidden flex items-center justify-center gap-6 py-3 border-b border-gray-800 bg-gray-950">
            <button
              onClick={navigateLivePrev}
              disabled={!liveItemId || liveSlideIndex <= 0}
              className="flex items-center justify-center w-14 h-12 rounded-xl bg-gray-800 text-white active:bg-indigo-600 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={28} />
            </button>
            <div className="flex flex-col items-center min-w-[60px]">
              <span className="text-[9px] text-gray-500 uppercase font-bold">Slide</span>
              <span className="text-2xl font-black text-indigo-400">
                {liveItemId && liveItem ? `${liveSlideIndex + 1}/${liveItem.slides.length}` : '-'}
              </span>
            </div>
            <button
              onClick={navigateLiveNext}
              disabled={!liveItemId || !liveItem || liveSlideIndex >= liveItem.slides.length - 1}
              className="flex items-center justify-center w-14 h-12 rounded-xl bg-gray-800 text-white active:bg-indigo-600 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={28} />
            </button>
          </div>

          {/* Row 1: Quick Actions - Larger on Mobile */}
          <div id="live-action-controls" className="grid grid-cols-5 gap-2 p-3 border-b border-white/10">
            <button onClick={() => setIsPreviewHidden(!isPreviewHidden)} className={`flex flex-col items-center justify-center p-3 lg:p-2.5 rounded-xl transition-all active:scale-95 ${isPreviewHidden ? 'bg-red-600 text-white' : 'bg-white/[0.07] border border-white/10 text-gray-400 hover:bg-white/[0.1] hover:text-white'}`}>
              {isPreviewHidden ? <EyeOff size={20} className="lg:w-4 lg:h-4" /> : <Eye size={20} className="lg:w-4 lg:h-4" />}
              <span className="text-[8px] lg:text-[9px] font-bold mt-1">BLACK</span>
            </button>
            <button onClick={() => setIsTextHidden(!isTextHidden)} className={`flex flex-col items-center justify-center p-3 lg:p-2.5 rounded-xl transition-all active:scale-95 ${isTextHidden ? 'bg-yellow-600 text-white' : 'bg-white/[0.07] border border-white/10 text-gray-400 hover:bg-white/[0.1] hover:text-white'}`}>
              <Eraser size={20} className="lg:w-4 lg:h-4" />
              <span className="text-[8px] lg:text-[9px] font-bold mt-1">CLEAR</span>
            </button>
            <button onClick={() => { setIsLogoActive(!isLogoActive); setIsPreviewHidden(false); }} className={`flex flex-col items-center justify-center p-3 lg:p-2.5 rounded-xl transition-all active:scale-95 ${isLogoActive ? 'bg-cyan-400 text-slate-950' : 'bg-white/[0.07] border border-white/10 text-gray-400 hover:bg-white/[0.1] hover:text-white'}`}>
              <Image size={20} className="lg:w-4 lg:h-4" />
              <span className="text-[8px] lg:text-[9px] font-bold mt-1">LOGO</span>
            </button>
            <button onClick={() => setShowSplitScreen(!showSplitScreen)} className={`flex flex-col items-center justify-center p-3 lg:p-2.5 rounded-xl transition-all active:scale-95 ${showSplitScreen ? 'bg-purple-600 text-white' : 'bg-white/[0.07] border border-white/10 text-gray-400 hover:bg-white/[0.1] hover:text-white'}`}>
              <Columns size={20} className="lg:w-4 lg:h-4" />
              <span className="text-[8px] lg:text-[9px] font-bold mt-1">SPLIT</span>
            </button>
            <div className="flex flex-col gap-1">
              {!externalWindow ? (
                <button onClick={openProjectorWindow} className="flex-1 bg-indigo-600/35 hover:bg-indigo-500 active:bg-indigo-500 text-indigo-100 hover:text-white rounded-xl flex items-center justify-center gap-1 text-[8px] lg:text-[9px] font-bold transition-colors active:scale-95 border border-indigo-300/20">
                  <ExternalLink size={12} /> <span className="hidden sm:inline">PROY</span><span className="sm:hidden">P</span>
                </button>
              ) : (
                <div className="flex flex-1 gap-1">
                  <button onClick={toggleProjectorFullscreen} className="flex-1 bg-green-600 hover:bg-green-500 active:bg-green-400 text-white rounded-lg lg:rounded flex items-center justify-center text-[8px] lg:text-[9px] font-bold transition-colors active:scale-95">
                    <Maximize2 size={14} />
                  </button>
                  <button onClick={closeProjectorWindow} className="flex-1 bg-red-900/50 hover:bg-red-600 active:bg-red-500 text-red-200 hover:text-white rounded-lg lg:rounded flex items-center justify-center text-[8px] lg:text-[9px] font-bold transition-colors active:scale-95">
                    <XCircle size={14} />
                  </button>
                </div>
              )}
              <button onClick={toggleFullscreen} className="flex-1 bg-white/[0.07] hover:bg-white/[0.1] active:bg-gray-600 text-gray-400 hover:text-white rounded-xl flex items-center justify-center gap-1 text-[8px] lg:text-[9px] font-bold transition-colors active:scale-95 border border-white/10">
                <Maximize2 size={12} /> <span className="hidden sm:inline">FULL</span>
              </button>
            </div>
          </div>

          {/* Row 2: Theme Tweaks - Desktop Only */}
          <div className="hidden lg:flex items-center justify-between p-2 bg-gray-950 border-b border-gray-800">
            <div className="flex gap-1">
              <button onClick={() => cycleFontSize('down')} className="p-1.5 bg-gray-900 hover:bg-gray-800 rounded text-gray-400"><Minus size={14} /></button>
              <button onClick={() => cycleFontSize('up')} className="p-1.5 bg-gray-900 hover:bg-gray-800 rounded text-gray-400"><Plus size={14} /></button>
            </div>
            <div className="flex gap-1">
              <button onClick={() => handleUpdateActiveItemTheme({ ...currentTheme, alignment: 'left' })} className={`p-1.5 rounded ${currentTheme.alignment === 'left' ? 'bg-indigo-600 text-white' : 'bg-gray-900 text-gray-400 hover:bg-gray-800'}`}><AlignLeft size={14} /></button>
              <button onClick={() => handleUpdateActiveItemTheme({ ...currentTheme, alignment: 'center' })} className={`p-1.5 rounded ${currentTheme.alignment === 'center' ? 'bg-indigo-600 text-white' : 'bg-gray-900 text-gray-400 hover:bg-gray-800'}`}><AlignCenter size={14} /></button>
              <button onClick={() => handleUpdateActiveItemTheme({ ...currentTheme, alignment: 'right' })} className={`p-1.5 rounded ${currentTheme.alignment === 'right' ? 'bg-indigo-600 text-white' : 'bg-gray-900 text-gray-400 hover:bg-gray-800'}`}><AlignRight size={14} /></button>
            </div>
          </div>

          {/* Row 3: Active Slide Grid (Mini) */}
          <div id="slide-grid" className="h-20 lg:h-24 bg-slate-950 overflow-x-auto no-scrollbar whitespace-nowrap p-2 flex gap-2 items-center" ref={miniGridRef}>
            {activeItem ? activeItem.slides.map((slide, idx) => (
              <button
                key={slide.id}
                onClick={() => {
                  setActiveSlideIndex(idx);
                  if (liveItemId === activeItemId) setLiveSlideIndex(idx);
                  setIsPreviewHidden(false);
                  setIsLogoActive(false);
                }}
                className={`inline-flex flex-col justify-between w-24 h-20 rounded border-2 transition-all flex-shrink-0 p-1 relative ${activeSlideIndex === idx ? 'border-indigo-500 bg-indigo-900/20' : 'border-gray-700 bg-gray-800 hover:border-gray-500'}`}
              >
                <span className="text-[9px] font-bold text-gray-500 uppercase self-end">{slide.label || idx + 1}</span>
                <span className={`text-[9px] whitespace-normal line-clamp-3 text-left leading-tight ${activeSlideIndex === idx ? 'text-white' : 'text-gray-400'}`}>
                  {slide.content}
                </span>
                {activeSlideIndex === idx && <div className="absolute inset-0 bg-indigo-500/10 pointer-events-none"></div>}
              </button>
            )) : (
              <div className="w-full text-center text-xs text-gray-600 italic">Selecciona un elemento para ver sus diapositivas</div>
            )}
          </div>
        </div>
      </div>

      {
        backgroundAudioItem && (
          <div className="fixed bottom-[-100px] left-[-100px] w-1 h-1 opacity-0 pointer-events-none overflow-hidden">
            <iframe
              key={backgroundAudioItem.id}
              ref={audioIframeRef}
              id="bg-audio-iframe"
              src={`https://www.youtube.com/embed/${backgroundAudioItem.videoId}?enablejsapi=1&autoplay=1&mute=0&rel=0&origin=${window.location.origin}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              title="Background audio"
            ></iframe>
          </div>
        )
      }

      {/* MOBILE BOTTOM NAV - Enhanced Floating Glassmorphic Bar */}
      <div className="lg:hidden fixed bottom-5 left-1/2 -translate-x-1/2 w-[90%] max-w-sm h-[68px] bg-slate-950/75 backdrop-blur-xl border border-white/10 flex items-center justify-around z-50 px-3 py-2 rounded-[24px] shadow-[0_24px_50px_rgba(0,0,0,0.8),0_0_20px_rgba(99,102,241,0.15)] transition-all duration-300">
        <button
          onClick={() => setMobileTab('control')}
          className={`flex flex-col items-center justify-center gap-0.5 py-1.5 flex-1 h-full rounded-[18px] transition-all active:scale-90 ${mobileTab === 'control' ? 'text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 shadow-inner' : 'text-slate-400 border border-transparent'}`}
        >
          <Edit2 size={20} className={mobileTab === 'control' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          <span className="text-[9px] font-black uppercase tracking-widest">Editor</span>
        </button>
        <button
          onClick={() => setMobileTab('playlist')}
          className={`flex flex-col items-center justify-center gap-0.5 py-1.5 flex-1 h-full rounded-[18px] transition-all active:scale-90 ${mobileTab === 'playlist' ? 'text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 shadow-inner' : 'text-slate-400 border border-transparent'}`}
        >
          <Music size={20} className={mobileTab === 'playlist' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          <span className="text-[9px] font-black uppercase tracking-widest">Lista</span>
        </button>
      </div>

      {/* Timer Widget Overlay */}
      {
        showTimer && (
          <div className="fixed top-20 right-4 z-[9000] animate-fade-in">
            <TimerWidget onClose={() => setShowTimer(false)} />
          </div>
        )
      }

      {/* Onboarding Tutorial */}
      {
        showOnboarding && (
          <Onboarding onComplete={() => setShowOnboarding(false)} />
        )
      }

      {/* Export/Import Modal */}
      <ExportImportModal
        isOpen={showExportImport}
        onClose={() => setShowExportImport(false)}
        playlist={playlist}
        customThemes={customThemes}
        projects={projects}
        currentProjectId={currentProjectId}
        onImport={handleImportPlaylist}
      />

      {/* Mobile Connect Modal */}
      <MobileConnectModal
        isOpen={showMobileConnect}
        onClose={() => setShowMobileConnect(false)}
        controlId={remoteControlId}
      />

      {/* Action History Panel */}
      <ActionHistoryPanel
        isOpen={showActionHistory}
        onClose={() => setShowActionHistory(false)}
      />

      {/* ── Premium Sync Confirmation Modal ── */}
      {syncConfirm && (
        <div className="fixed inset-0 z-[99999] bg-black/65 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900/95 border border-white/10 rounded-[24px] max-w-md w-full overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.85),0_0_30px_rgba(99,102,241,0.06)] animate-fade-in">
            {/* Header */}
            <div className={`px-6 py-5 border-b border-white/5 flex items-center gap-3.5 ${
              syncConfirm.type === 'danger' ? 'bg-rose-500/10' : syncConfirm.type === 'warning' ? 'bg-amber-500/10' : 'bg-indigo-500/10'
            }`}>
              <div className={`p-2 rounded-xl ${
                syncConfirm.type === 'danger' ? 'bg-rose-500/15 text-rose-400' : syncConfirm.type === 'warning' ? 'bg-amber-500/15 text-amber-400' : 'bg-indigo-500/15 text-indigo-400'
              }`}>
                <AlertCircle size={20} className="animate-pulse" />
              </div>
              <h2 className="text-white font-black text-sm uppercase tracking-wider">{syncConfirm.title}</h2>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <p className="text-gray-300 text-xs leading-relaxed font-medium">{syncConfirm.message}</p>
              
              {syncConfirm.itemsList && syncConfirm.itemsList.length > 0 && (
                <div className="bg-black/35 border border-white/5 rounded-xl p-3 max-h-40 overflow-y-auto no-scrollbar space-y-1.5">
                  <div className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1">Detalles:</div>
                  <ul className="space-y-1">
                    {syncConfirm.itemsList.map((item, idx) => (
                      <li key={idx} className="text-[11px] text-gray-400 font-bold flex items-start gap-2">
                        <span className="text-indigo-400 select-none">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 bg-slate-950/65 border-t border-white/5 flex gap-3">
              <button
                onClick={() => {
                  setSyncConfirm(null);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl border border-white/15 text-slate-300 hover:text-white hover:bg-white/[0.04] transition-all font-black text-[10px] uppercase tracking-wider active:scale-95"
              >
                {syncConfirm.cancelText || 'Cancelar'}
              </button>
              <button
                onClick={syncConfirm.onConfirm}
                className={`flex-1 py-2.5 px-4 rounded-xl text-white font-black text-[10px] uppercase tracking-wider transition-all active:scale-95 shadow-lg ${
                  syncConfirm.type === 'danger' 
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 shadow-red-600/20 hover:from-red-500 hover:to-rose-500' 
                    : syncConfirm.type === 'warning'
                    ? 'bg-gradient-to-r from-amber-600 to-yellow-600 shadow-amber-600/20 hover:from-amber-500 hover:to-yellow-500'
                    : 'bg-gradient-to-r from-indigo-600 to-cyan-600 shadow-indigo-600/20 hover:from-indigo-500 hover:to-cyan-500'
                }`}
              >
                {syncConfirm.confirmText || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Premium Toast Notification HUD ── */}
      {appToast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 999999,
          pointerEvents: 'auto',
          animation: 'toastSlideIn 0.35s cubic-bezier(0.16,1,0.3,1)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 22px',
            borderRadius: '16px',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${appToast.type === 'success' ? 'rgba(16,185,129,0.3)' : appToast.type === 'error' ? 'rgba(244,63,94,0.3)' : 'rgba(100,116,139,0.35)'}`,
            background: appToast.type === 'success' ? 'rgba(6,78,59,0.88)' : appToast.type === 'error' ? 'rgba(76,5,25,0.88)' : 'rgba(15,23,42,0.88)',
            color: appToast.type === 'success' ? '#6ee7b7' : appToast.type === 'error' ? '#fda4af' : '#e2e8f0',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)'
          }}>
            {appToast.type === 'success' && <Check size={15} style={{ color: '#34d399', flexShrink: 0 }} />}
            {appToast.type === 'error' && <AlertCircle size={15} style={{ color: '#fb7185', flexShrink: 0 }} />}
            <span style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{appToast.message}</span>
            <button
              onClick={() => setAppToast(null)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', marginLeft: '8px', padding: '2px', flexShrink: 0, transition: 'color 0.2s' }}
              onMouseOver={(e) => (e.currentTarget.style.color = '#fff')}
              onMouseOut={(e) => (e.currentTarget.style.color = '#94a3b8')}
              type="button"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Command Palette (Spotlight) Modal */}
      {showCommandPalette && createPortal(
        <div 
          className="fixed inset-0 z-[999999] bg-slate-950/70 backdrop-blur-md flex items-start justify-center pt-[15vh] px-4 animate-in fade-in duration-200"
          onClick={() => setShowCommandPalette(false)}
        >
          <div 
            className="max-w-2xl w-full bg-slate-900/95 border border-indigo-500/30 rounded-3xl p-6 shadow-3xl shadow-indigo-950/50 flex flex-col gap-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Row */}
            <div className="relative flex items-center border-b border-white/10 pb-4">
              <span className="absolute left-3 text-indigo-400">
                <LayoutGrid size={20} className="animate-pulse" />
              </span>
              <input
                type="text"
                autoFocus
                placeholder="Buscar canción o pasaje bíblico (ej: Genesis 1, Cuan Grande)..."
                value={paletteQuery}
                onChange={(e) => {
                  setPaletteQuery(e.target.value);
                  setPaletteActiveIndex(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setShowCommandPalette(false);
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setPaletteActiveIndex(prev => (prev + 1) % (paletteResults.length || 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setPaletteActiveIndex(prev => (prev - 1 + (paletteResults.length || 1)) % (paletteResults.length || 1));
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (paletteResults[paletteActiveIndex]) {
                      handleCommandPaletteSelect(paletteResults[paletteActiveIndex]);
                    }
                  }
                }}
                className="w-full pl-12 pr-10 py-3 bg-slate-950/50 border border-white/5 focus:border-indigo-500/50 rounded-2xl outline-none text-white text-base font-semibold focus:ring-4 focus:ring-indigo-500/10 placeholder-slate-500 transition-all caret-cyan-400"
              />
              <button 
                onClick={() => setShowCommandPalette(false)}
                className="absolute right-3 p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Cerrar (Esc)"
              >
                <X size={14} />
              </button>
            </div>

            {/* Results Pane */}
            <div className="max-h-[50vh] overflow-y-auto no-scrollbar space-y-2">
              {paletteLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest animate-pulse">Buscando en la Nube...</span>
                </div>
              ) : paletteResults.length > 0 ? (
                paletteResults.map((res, idx) => {
                  const isActive = paletteActiveIndex === idx;
                  const isBible = res.title.startsWith('📖 Importar Pasaje Bíblico:');

                  return (
                    <div
                      key={idx}
                      onClick={() => handleCommandPaletteSelect(res)}
                      className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-4 ${
                        isActive
                          ? 'bg-gradient-to-r from-indigo-900/40 to-slate-950/80 border-indigo-500/60 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                          : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
                          isActive
                            ? 'bg-indigo-500/10 border-indigo-400/30 text-indigo-300'
                            : 'bg-white/5 border-white/5 text-slate-400'
                        }`}>
                          {isBible ? <BookOpen size={18} /> : <Music size={18} />}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-sm text-white truncate">{res.title}</span>
                          <span className="text-xs text-slate-400 truncate mt-0.5">{res.artist}</span>
                          {res.snippet && (
                            <span className="text-[10px] text-slate-500 font-medium truncate mt-1 italic">{res.snippet}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isBible ? (
                          <span className="text-[9px] font-black bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-md uppercase tracking-wider">
                            Pasaje
                          </span>
                        ) : (
                          <span className="text-[9px] font-black bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-md uppercase tracking-wider">
                            Canción
                          </span>
                        )}
                        {isActive && (
                          <span className="text-[9px] font-black bg-white text-slate-950 px-2 py-0.5 rounded-md uppercase tracking-wider shadow animate-bounce">
                            ENTER
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : paletteQuery.trim() ? (
                <div className="py-12 text-center text-slate-500 text-sm font-semibold italic">
                  No se encontraron canciones. Escribe números para importar pasajes bíblicos.
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
                  <LayoutGrid size={32} className="opacity-15 animate-bounce" />
                  <span className="text-xs font-bold uppercase tracking-wider">FlujoEclesial Spotlight</span>
                  <span className="text-[10px] text-slate-600 font-medium text-center max-w-sm leading-relaxed px-4">
                    Escribe para buscar. Presiona <kbd className="bg-slate-950 px-1.5 py-0.5 rounded border border-white/10 text-[9px] mx-1 text-slate-400 font-mono">ENTER</kbd> para importar pasajes bíblicos y canciones en un clic.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Toast slide-in animation */}
      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-18px) scale(0.92); }
          to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

const MonitorIcon = ({ size }: { size: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="3" rx="2" /><line x1="8" x2="16" y1="21" y2="21" /><line x1="12" x2="12" y1="17" y2="21" /></svg>
);

export default App;
