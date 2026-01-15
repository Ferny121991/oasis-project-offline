import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ControlPanel from './components/ControlPanel';
import Playlist from './components/Playlist';
import LiveScreen from './components/LiveScreen';
import { PresentationItem, Theme, Slide } from './types';
import { DEFAULT_THEME } from './constants';
import { Maximize2, Eye, EyeOff, Square, ExternalLink, XCircle, AlignLeft, AlignCenter, AlignRight, Type, Plus, Minus, Image, Eraser, Clock, ChevronLeft, ChevronRight, Monitor, PlayCircle, Music, BookOpen, Trash2, X, Edit2, Check, LogIn, User as UserIcon, LogOut, RefreshCw } from 'lucide-react';
import { supabase } from './services/supabaseClient';
import { Session } from '@supabase/supabase-js';
import { fetchSongLyrics, fetchBiblePassage, DensityMode } from './services/geminiService';

// Mobile Tab Type
type MobileTab = 'control' | 'playlist' | 'preview';

const App: React.FC = () => {
  // Initialize state from LocalStorage if available
  const [playlist, setPlaylist] = useState<PresentationItem[]>(() => {
    try {
      const saved = localStorage.getItem('flujo_playlist_v2');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load playlist", e);
      return [];
    }
  });

  const [activeView, setActiveView] = useState<'main' | 'lyrics-search'>('main');
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(-1);
  const [liveItemId, setLiveItemId] = useState<string | null>(null);
  const [liveSlideIndex, setLiveSlideIndex] = useState<number>(-1);
  const [backgroundAudioItem, setBackgroundAudioItem] = useState<{ videoId: string; title: string } | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(true);
  const [audioStartTime, setAudioStartTime] = useState<number>(0);
  const [audioElapsedOffset, setAudioElapsedOffset] = useState<number>(0);
  const audioIframeRef = useRef<HTMLIFrameElement>(null);
  const [isPreviewHidden, setIsPreviewHidden] = useState(false); // BLACKOUT
  const [isTextHidden, setIsTextHidden] = useState(false); // CLEAR TEXT (Background stays)
  const [isLogoActive, setIsLogoActive] = useState(false); // LOGO MODE
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // State for External Projector Window
  const [externalWindow, setExternalWindow] = useState<Window | null>(null);
  const [isProjectorMode, setIsProjectorMode] = useState(false);

  // Staged Theme for previewing changes before applying to projector (Hoisted for Sync)
  const [stagedTheme, setStagedTheme] = useState<Theme>(DEFAULT_THEME);

  // Sync Channel for Multi-window Projector
  const syncChannel = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    // Check if we are in projector mode
    const params = new URLSearchParams(window.location.search);
    if (params.get('projector') === 'true') {
      setIsProjectorMode(true);
    }

    // Initialize Sync Channel
    syncChannel.current = new BroadcastChannel('flujo_projector_sync');

    // If we are the projector, listen for updates and fullscreen commands
    if (params.get('projector') === 'true') {
      const handleMessage = (e: MessageEvent) => {
        if (e.data === 'TOGGLE_FULLSCREEN') {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => console.log("Fullscreen auto-block:", err));
          }
        }
      };
      window.addEventListener('message', handleMessage);

      // Local keyboard shortcuts for the projector window
      const handleProjectorKeys = (e: KeyboardEvent) => {
        if (e.key.toLowerCase() === 'f' || e.key === 'F11') {
          e.preventDefault();
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => console.error(err));
          } else {
            if (document.exitFullscreen) document.exitFullscreen();
          }
        }
      };
      window.addEventListener('keydown', handleProjectorKeys);

      syncChannel.current.onmessage = (event) => {
        const { type, data } = event.data;
        if (type === 'SYNC_STATE') {
          setLiveItemId(data.liveItemId);
          setActiveItemId(data.activeItemId);
          setLiveSlideIndex(data.liveSlideIndex);
          setActiveSlideIndex(data.activeSlideIndex);
          setPlaylist(data.playlist);
          if (data.stagedTheme) setStagedTheme(data.stagedTheme); // Sync staged theme
          setIsPreviewHidden(data.isPreviewHidden);
          setIsTextHidden(data.isTextHidden);
          setIsLogoActive(data.isLogoActive);
        }
      };

      // Request initial state from any open main window
      syncChannel.current.postMessage({ type: 'REQUEST_STATE' });

      return () => {
        window.removeEventListener('message', handleMessage);
        window.removeEventListener('keydown', handleProjectorKeys);
        syncChannel.current?.close();
      };
    } else {
      // If we are the main window, respond to state requests
      syncChannel.current.onmessage = (event) => {
        if (event.data.type === 'REQUEST_STATE') {
          sendSyncState();
        }
      };
    }

    return () => {
      syncChannel.current?.close();
    };
  }, []);

  const sendSyncState = useCallback(() => {
    if (syncChannel.current) {
      syncChannel.current.postMessage({
        type: 'SYNC_STATE',
        data: {
          liveItemId,
          activeItemId,
          liveSlideIndex,
          activeSlideIndex,
          playlist,
          stagedTheme, // Send the staged theme
          isPreviewHidden,
          isTextHidden,
          isLogoActive
        }
      });
    }
  }, [liveItemId, activeItemId, liveSlideIndex, activeSlideIndex, playlist, stagedTheme, isPreviewHidden, isTextHidden, isLogoActive]);

  // Sync state whenever it changes
  useEffect(() => {
    if (!isProjectorMode) {
      sendSyncState();
    }
  }, [liveItemId, activeItemId, liveSlideIndex, activeSlideIndex, playlist, stagedTheme, isPreviewHidden, isTextHidden, isLogoActive, isProjectorMode, sendSyncState]);

  // Ensure sync when window focus changes (user comes back to tab)
  useEffect(() => {
    const handleFocus = () => sendSyncState();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [sendSyncState]);

  // Mobile State
  const [mobileTab, setMobileTab] = useState<MobileTab>('playlist');

  const [session, setSession] = useState<Session | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const liveViewRef = useRef<HTMLDivElement>(null);
  const miniGridRef = useRef<HTMLDivElement>(null);
  const dataLoaded = useRef(false);

  // Auth Effect
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sync from Supabase on Login
  const isCloudLoading = useRef(false);

  const fetchUserData = useCallback(async () => {
    if (!session?.user) return;
    setIsSyncing(true);
    isCloudLoading.current = true;
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('playlist')
        .single();

      if (data && data.playlist) {
        setPlaylist(data.playlist);
        dataLoaded.current = true;
      } else if (error && (error.code === 'PGRST116' || error.message?.includes('0 rows'))) {
        // No settings found, create initial ones with empty playlist or current local one
        await supabase.from('user_settings').insert([
          { id: session.user.id, playlist: [] }
        ]);
        dataLoaded.current = true;
      }
    } catch (e) {
      console.error("Error fetching user data", e);
    } finally {
      setIsSyncing(false);
      // Wait a bit before allowing persistence to push back to cloud
      setTimeout(() => { isCloudLoading.current = false; }, 500);
    }
  }, [session]);

  useEffect(() => {
    if (session?.user) {
      fetchUserData();
    } else {
      dataLoaded.current = false;
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
    await fetchUserData();
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
    await supabase.auth.signOut();
    setPlaylist([]);
    localStorage.removeItem('flujo_playlist_v2');
  };

  // Persistence Effect
  useEffect(() => {
    try {
      localStorage.setItem('flujo_playlist_v2', JSON.stringify(playlist));

      // Update Supabase if logged in AND data has been loaded AND NOT currently loading from cloud
      if (session?.user && dataLoaded.current && !isCloudLoading.current) {
        const updateCloud = async () => {
          setIsSyncing(true);
          try {
            await supabase
              .from('user_settings')
              .upsert({
                id: session.user.id,
                playlist,
                updated_at: new Date().toISOString()
              });
          } catch (e) {
            console.error("Cloud update failed", e);
          } finally {
            setIsSyncing(false);
          }
        };
        const timeoutId = setTimeout(updateCloud, 2000); // 2 second debounce for saves
        return () => clearTimeout(timeoutId);
      }
    } catch (e) {
      console.error("Storage quota exceeded likely due to images", e);
    }
  }, [playlist, session]);

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
      theme: { ...item.theme || DEFAULT_THEME }
    };

    setPlaylist(prev => [...prev, newItem]);
  }, [playlist]);

  const stopBackgroundAudio = useCallback(() => setBackgroundAudioItem(null), []);

  const toggleAudioPlayback = useCallback(() => {
    if (!audioIframeRef.current) return;
    const msg = isAudioPlaying ? '{"event":"command","func":"pauseVideo","args":""}' : '{"event":"command","func":"playVideo","args":""}';
    audioIframeRef.current.contentWindow?.postMessage(msg, '*');

    if (isAudioPlaying) {
      // If pausing, save how much time has passed
      setAudioElapsedOffset(prev => prev + (Date.now() - audioStartTime));
    } else {
      // If resuming, reset the base start time to now
      setAudioStartTime(Date.now());
    }

    setIsAudioPlaying(!isAudioPlaying);
  }, [isAudioPlaying, audioStartTime]);

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
    setPlaylist(prev => prev.filter(item => item.id !== id));
    if (activeItemId === id) {
      setActiveItemId(null);
      setActiveSlideIndex(-1);
    }
  };

  // --- CORE UPDATE FUNCTIONS ---

  // Sync staged theme ONLY when active item changes
  const lastActiveItemId = useRef<string | null>(null);
  useEffect(() => {
    if (activeItemId !== lastActiveItemId.current) {
      const activeItem = playlist.find(i => i.id === activeItemId);
      if (activeItem) {
        setStagedTheme(activeItem.theme);
      } else {
        setStagedTheme(DEFAULT_THEME);
      }
      lastActiveItemId.current = activeItemId;
    }
  }, [activeItemId, playlist]);

  const handleUpdateStagedTheme = (newTheme: Theme) => {
    setStagedTheme(newTheme);
  };

  // History System for Undo/Redo
  const [history, setHistory] = useState<Theme[]>([]);
  const [originalThemes, setOriginalThemes] = useState<Record<string, Theme>>({});

  // Update the Theme of the ACTIVE item only (This is the "Apply" logic)
  const handleUpdateActiveItemTheme = (newTheme: Theme) => {
    if (!activeItemId) return;

    const activeItem = playlist.find(i => i.id === activeItemId);
    if (activeItem) {
      // Save current theme to history before updating (limited to 50 steps)
      setHistory(prev => [activeItem.theme, ...prev].slice(0, 50));

      // Save as original if not already saved
      if (!originalThemes[activeItemId]) {
        setOriginalThemes(prev => ({ ...prev, [activeItemId]: activeItem.theme }));
      }
    }

    setPlaylist(prev => prev.map(item =>
      item.id === activeItemId ? { ...item, theme: newTheme } : item
    ));
    // Also sync staged theme
    setStagedTheme(newTheme);
  };

  const handleUndo = () => {
    if (history.length === 0 || !activeItemId) return;
    const lastTheme = history[0];
    setHistory(prev => prev.slice(1));

    setPlaylist(prev => prev.map(item =>
      item.id === activeItemId ? { ...item, theme: lastTheme } : item
    ));
    setStagedTheme(lastTheme);
  };

  const handleRestoreOriginal = () => {
    if (!activeItemId || !originalThemes[activeItemId]) return;
    handleUpdateActiveItemTheme(originalThemes[activeItemId]);
  };

  const handleUpdateItemTitle = (itemId: string, newTitle: string) => {
    setPlaylist(prev => prev.map(item =>
      item.id === itemId ? { ...item, title: newTitle } : item
    ));
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

  const handleUploadImages = async (files: FileList | null, itemId?: string) => {
    if (!files || files.length === 0) return;

    const newSlides: Slide[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      const promise = new Promise<string>((resolve) => {
        reader.onload = (e) => resolve(e.target?.result as string);
      });
      reader.readAsDataURL(file);
      const dataUrl = await promise;

      newSlides.push({
        id: Math.random().toString(36).substr(2, 9),
        type: 'image',
        content: '',
        mediaUrl: dataUrl,
        label: file.name.split('.')[0].toUpperCase()
      });
    }

    if (itemId) {
      setPlaylist(prev => prev.map(item =>
        item.id === itemId ? { ...item, slides: [...item.slides, ...newSlides] } : item
      ));
    } else {
      const newItem: PresentationItem = {
        id: Math.random().toString(36).substr(2, 9),
        title: files.length === 1 ? files[0].name : `Galería (${files.length} fotos)`,
        type: 'custom',
        slides: newSlides,
        theme: stagedTheme
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
        theme: stagedTheme
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
    if (externalWindow) {
      externalWindow.focus();
      return externalWindow;
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
      setTimeout(() => sendSyncState(), 500);

      // Give it a moment to load then try to focus and fullscreen
      setTimeout(() => {
        if (newWindow && !newWindow.closed) {
          newWindow.focus();
          newWindow.postMessage('TOGGLE_FULLSCREEN', '*');
        }
      }, 1000);

      return newWindow;
    }
    return null;
  }, [externalWindow, sendSyncState]);

  const closeProjectorWindow = useCallback(() => {
    if (externalWindow) {
      externalWindow.close();
      setExternalWindow(null);
    }
  }, [externalWindow]);

  const toggleProjectorFullscreen = useCallback(() => {
    if (externalWindow) {
      externalWindow.postMessage('TOGGLE_FULLSCREEN', '*');
      externalWindow.focus();
    } else {
      // If window is closed/null, try to reopen it
      openProjectorWindow();
    }
  }, [externalWindow, openProjectorWindow]);

  const [previewSlide, setPreviewSlide] = useState<Slide | null>(null);

  // --- Derived State ---
  const activeItem = playlist.find(i => i.id === activeItemId);
  const liveItem = playlist.find(i => i.id === liveItemId);

  // 1. DASHBOARD VIEW (Private Staging)
  const currentSlide: Slide | null = activeItem && activeSlideIndex >= 0
    ? activeItem.slides[activeSlideIndex]
    : null;
  const currentTheme = stagedTheme;

  // 2. PROJECTOR VIEW (Public Live)
  const projectorSlide: Slide | null = (liveItem && liveSlideIndex >= 0)
    ? liveItem.slides[liveSlideIndex]
    : null;

  // The projector ONLY shows the already saved theme of the live item.
  // Staging changes will NOT appear here until they are saved/applied.
  const projectorTheme = liveItem ? liveItem.theme : DEFAULT_THEME;

  // Reference for ControlPanel comparison
  const liveTheme = activeItem ? activeItem.theme : DEFAULT_THEME;

  // CONTENT LOGIC:
  // 1. Internal Preview: Show previewSlide (draft) if exists, else current active slide.
  const internalPreviewContent = previewSlide || currentSlide;

  // 2. Projector (External/Live):
  //    Priority: Blackout > Logo > Slide(with ClearText option)
  const projectorContent = isPreviewHidden || isLogoActive ? null : projectorSlide;

  const makeLive = useCallback((itemId?: string, slideIndex?: number) => {
    const targetItemId = itemId !== undefined ? itemId : activeItemId;

    // If we're making a DIFFERENT item live, start at the first slide (0) 
    // unless a specific slide index was provided (via double click).
    let targetSlideIndex = slideIndex;
    if (targetSlideIndex === undefined) {
      targetSlideIndex = (targetItemId !== liveItemId) ? 0 : activeSlideIndex;
    }

    if (targetItemId) {
      setLiveItemId(targetItemId);
      // Also make it active so the user can edit it immediately
      setActiveItemId(targetItemId);
      setLiveSlideIndex(targetSlideIndex);
      if (slideIndex !== undefined) setActiveSlideIndex(targetSlideIndex);
      setIsPreviewHidden(false);
    }
  }, [activeItemId, activeSlideIndex, liveItemId]);

  const stopLive = useCallback(() => {
    setLiveItemId(null);
    setLiveSlideIndex(-1);
  }, []);

  useEffect(() => {
    (window as any).makeLive = makeLive;
    (window as any).stopLive = stopLive;
    (window as any).setBackgroundAudio = setBackgroundAudioItem;
  }, [makeLive, stopLive]);

  // Update slide content for an existing item
  const handleUpdateSlideContent = useCallback((slideId: string, newContent: string) => {
    setPlaylist(prev => prev.map(item => ({
      ...item,
      slides: item.slides.map(s => s.id === slideId ? { ...s, content: newContent } : s)
    })));
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

  const navigateLiveNext = useCallback(() => {
    if (!liveItemId) return;
    const item = playlist.find(p => p.id === liveItemId);
    if (item && liveSlideIndex < item.slides.length - 1) {
      const nextIndex = liveSlideIndex + 1;
      setLiveSlideIndex(nextIndex);
      // If we are currently viewing the live item, move the preview selector too
      if (activeItemId === liveItemId) {
        setActiveSlideIndex(nextIndex);
      }
    }
  }, [liveItemId, liveSlideIndex, activeItemId, playlist]);

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



  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
      switch (e.key) {
        case 'ArrowRight': e.preventDefault(); navigateLiveNext(); break;
        case 'ArrowLeft': e.preventDefault(); navigateLivePrev(); break;
        case 'Enter': case ' ': e.preventDefault(); makeLive(); break;
        case 'Escape': e.preventDefault(); stopLive(); break;
        case 'b': case 'B': case '.': setIsPreviewHidden(prev => !prev); break;
        case 'c': case 'C': setIsTextHidden(prev => !prev); break;
        case 'l': case 'L': setIsLogoActive(prev => !prev); break;
        case 'f': case 'F': case 'F11': e.preventDefault(); toggleFullscreen(); break;
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
                  win.postMessage('TOGGLE_FULLSCREEN', '*');
                }, 600);
              }
            });
          }
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateNext, navigatePrev, toggleFullscreen, toggleProjectorFullscreen, openProjectorWindow, closeProjectorWindow, externalWindow]);

  if (isProjectorMode) {
    return (
      <div
        className="fixed inset-0 w-screen h-screen bg-black overflow-hidden flex flex-col items-center justify-center cursor-none z-[9999]"
        onDoubleClick={() => {
          if (!document.fullscreenElement) {
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
        {!document.fullscreenElement && (
          <div
            className="absolute inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center text-white cursor-pointer group"
            onClick={() => {
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
          <LiveScreen
            slide={projectorContent}
            theme={projectorTheme}
            isFullscreen={true}
            enableOverlay={false}
            hideText={isTextHidden}
            isLogoMode={isLogoActive}
            blackout={isPreviewHidden}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-[100dvh] bg-black text-white font-sans overflow-hidden select-none">
      {/* LEFT: Control Center (30%) */}
      <div className={`${mobileTab === 'control' ? 'flex flex-1 min-h-0 pb-[68px] lg:pb-0' : 'hidden'} lg:flex lg:flex-none w-full lg:w-[30%] flex-shrink-0 scrollbar-hide overflow-hidden bg-gray-950 border-r border-gray-800 flex-col`}>
        <ControlPanel
          onAddItem={handleAddItem}
          onUpdateTheme={handleUpdateActiveItemTheme}
          onUpdatePendingTheme={handleUpdateStagedTheme}
          currentTheme={stagedTheme}
          liveTheme={activeItem ? activeItem.theme : DEFAULT_THEME}
          hasActiveItem={!!activeItemId}
          onAddSlide={handleAddSlideToActiveItem}
          activeSlideType={activeItem?.slides[activeSlideIndex]?.type || 'text'}
          activeSlide={currentSlide}
          onUpdateSlideContent={handleUpdateSlideContent}
          onPreviewSlideUpdate={setPreviewSlide}
          onSetBackgroundAudio={(vid, title) => setBackgroundAudioItem(vid ? { videoId: vid, title } : null)}
          onStopLive={stopLive}
          isLiveActive={!!liveItemId}
          onUndo={handleUndo}
          onRestoreOriginal={handleRestoreOriginal}
          canUndo={history.length > 0}
          onDeselect={() => {
            setActiveItemId(null);
            setActiveSlideIndex(-1);
          }}
          // Passing audio controls
          isAudioPlaying={isAudioPlaying}
          backgroundAudioItem={backgroundAudioItem}
          onToggleAudioPlayback={toggleAudioPlayback}
          onSeekAudio={seekAudio}
        />
      </div>

      {/* MIDDLE: Playlist & Management (45%) */}
      <div className={`${mobileTab === 'playlist' ? 'flex flex-1 min-h-0 pb-[68px] lg:pb-0' : 'hidden'} lg:flex w-full lg:flex-1 flex-col border-r border-gray-800 min-w-0 lg:min-w-[300px] overflow-hidden`}>
        {/* Mobile Header - Compact with Live Status */}
        <div className="lg:hidden bg-gradient-to-r from-gray-900 via-gray-850 to-gray-900 px-4 py-3 border-b border-gray-700 flex justify-between items-center shrink-0">
          <h1 className="text-lg font-black tracking-tight text-indigo-400">Flujo<span className="text-white font-light">Eclesial</span></h1>
          <div className="flex items-center gap-2">
            {session && (
              <button
                onClick={handleSyncCloud}
                disabled={isSyncing}
                className={`p-2 rounded-full bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 transition-all ${isSyncing ? 'animate-spin' : ''}`}
                title="Sincronizar con la nube"
              >
                <RefreshCw size={18} />
              </button>
            )}
            {liveItemId && (
              <div className="flex items-center gap-1.5 bg-red-600/20 border border-red-500/50 rounded-full px-2.5 py-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-black text-red-400 uppercase">VIVO</span>
              </div>
            )}
            {session?.user?.user_metadata?.avatar_url && (
              <img src={session.user.user_metadata.avatar_url} alt="" className="w-8 h-8 rounded-full border-2 border-indigo-500" />
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
        <div className="hidden lg:flex bg-gray-900 px-6 py-4 border-b border-gray-800 justify-between items-center shrink-0">
          <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
              <span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">FlujoEclesial</span>
              <span className="font-light text-gray-400">Studio</span>
            </h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Centro de Control Proyectores</p>
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
              </div>
            ) : (
              <div className="text-xs text-gray-500 italic bg-gray-850 px-3 py-1.5 rounded-lg border border-gray-800">
                Guardado Local Activo
              </div>
            )}
          </div>
        </div>

        <Playlist
          items={playlist}
          activeItemId={activeItemId}
          activeSlideIndex={activeSlideIndex}
          liveItemId={liveItemId}
          liveSlideIndex={liveSlideIndex}
          onSlideClick={handleSlideClick}
          onSlideDoubleClick={(itemId, index) => makeLive(itemId, index)}
          onToggleBackgroundAudio={(vid, title) => setBackgroundAudioItem({ videoId: vid, title })}
          onDeleteItem={handleDeleteItem}
          onDeleteSlide={handleDeleteSlide}
          onRefreshItem={handleRefreshItem}
          onUploadImages={handleUploadImages}
          onUpdateSlideLabel={handleUpdateSlideLabel}
          onUpdateItemTitle={handleUpdateItemTitle}
        />

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
                <span className="text-[8px] text-green-500 flex items-center gap-1">
                  <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" /> Sincronizado
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
          <div className="text-[10px] text-gray-500 italic">
            {isSyncing ? 'Sincronizando...' : 'Nube Activa'}
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

      {/* RIGHT: Live Preview & Presenter Tools (35%) */}
      <div className={`${mobileTab === 'preview' ? 'flex flex-1 min-h-0 pb-[68px] lg:pb-0' : 'hidden'} lg:flex lg:flex-none w-full lg:w-[35%] flex-shrink-0 flex-col bg-gray-950 relative border-l border-gray-800 overflow-hidden`}>

        {/* TOP BAR: Clock and Status - Responsive */}
        <div className="h-11 lg:h-12 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-3 lg:px-4 shrink-0">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs lg:text-sm truncate max-w-[55%] lg:max-w-[50%]">
            <PlayCircle size={14} className="shrink-0" />
            <span className="truncate">{activeItem ? activeItem.title : 'Sin Selección'}</span>
          </div>
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="text-base lg:text-xl font-mono text-gray-300 font-bold flex items-center gap-1.5 lg:gap-2 bg-black px-2 py-0.5 rounded border border-gray-700">
              <Clock size={12} className="text-indigo-500 hidden sm:block" />
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        {/* PREVIEW AREA */}
        <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-gray-900 p-4">

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

          <div ref={liveViewRef} className="w-full h-full flex items-center justify-center relative group">
            {/* Internal Preview renders logic (Always detailed "Staging" view) */}
            <LiveScreen
              slide={currentSlide}
              theme={currentTheme}
              isFullscreen={false}
              enableOverlay={true}
              onUpdateTheme={handleUpdateStagedTheme}
              hideText={isTextHidden && liveItemId === activeItem?.id}
              isLogoMode={isLogoActive && liveItemId === activeItem?.id}
              blackout={isPreviewHidden && liveItemId === activeItem?.id}
              autoPlay={false}
              mute={true}
            />

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
                    isLogoMode={isLogoActive}
                    blackout={isPreviewHidden}
                    autoPlay={false} // PIP is static to avoid sync annoyance
                    mute={true}      // PIP is silent
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
        <div className="bg-gray-900 border-t border-gray-800 flex flex-col shadow-[0_-5px_15px_rgba(0,0,0,0.3)] z-30 shrink-0">

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
          <div className="grid grid-cols-4 gap-1 p-2 border-b border-gray-800">
            <button onClick={() => setIsPreviewHidden(!isPreviewHidden)} className={`flex flex-col items-center justify-center p-3 lg:p-2 rounded-lg lg:rounded transition-all active:scale-95 ${isPreviewHidden ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`}>
              {isPreviewHidden ? <EyeOff size={20} className="lg:w-4 lg:h-4" /> : <Eye size={20} className="lg:w-4 lg:h-4" />}
              <span className="text-[8px] lg:text-[9px] font-bold mt-1">BLACK</span>
            </button>
            <button onClick={() => setIsTextHidden(!isTextHidden)} className={`flex flex-col items-center justify-center p-3 lg:p-2 rounded-lg lg:rounded transition-all active:scale-95 ${isTextHidden ? 'bg-yellow-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`}>
              <Eraser size={20} className="lg:w-4 lg:h-4" />
              <span className="text-[8px] lg:text-[9px] font-bold mt-1">CLEAR</span>
            </button>
            <button onClick={() => { setIsLogoActive(!isLogoActive); setIsPreviewHidden(false); }} className={`flex flex-col items-center justify-center p-3 lg:p-2 rounded-lg lg:rounded transition-all active:scale-95 ${isLogoActive ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`}>
              <Image size={20} className="lg:w-4 lg:h-4" />
              <span className="text-[8px] lg:text-[9px] font-bold mt-1">LOGO</span>
            </button>
            <div className="flex flex-col gap-1">
              {!externalWindow ? (
                <button onClick={openProjectorWindow} className="flex-1 bg-indigo-900/50 hover:bg-indigo-600 active:bg-indigo-600 text-indigo-200 hover:text-white rounded-lg lg:rounded flex items-center justify-center gap-1 text-[8px] lg:text-[9px] font-bold transition-colors active:scale-95">
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
              <button onClick={toggleFullscreen} className="flex-1 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-gray-400 hover:text-white rounded-lg lg:rounded flex items-center justify-center gap-1 text-[8px] lg:text-[9px] font-bold transition-colors active:scale-95">
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
          <div className="h-20 lg:h-24 bg-gray-900 overflow-x-auto no-scrollbar whitespace-nowrap p-2 flex gap-2 items-center" ref={miniGridRef}>
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

      {/* HIDDEN BACKGROUND AUDIO PLAYER */}
      {backgroundAudioItem && (
        <div className="fixed bottom-[-100px] left-[-100px] w-1 h-1 opacity-0 pointer-events-none overflow-hidden">
          <iframe
            ref={audioIframeRef}
            src={`https://www.youtube-nocookie.com/embed/${backgroundAudioItem.videoId}?enablejsapi=1&autoplay=1&mute=0&loop=1&playlist=${backgroundAudioItem.videoId}&origin=${window.location.protocol}//${window.location.host}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          ></iframe>
        </div>
      )}

      {/* MOBILE BOTTOM NAV - Enhanced */}
      <div className="lg:hidden shrink-0 h-[68px] bg-gradient-to-t from-gray-900 via-gray-850 to-gray-800 border-t border-gray-700 flex items-center justify-around z-50 px-2 pb-1 pt-1">
        <button
          onClick={() => setMobileTab('control')}
          className={`flex flex-col items-center justify-center gap-0.5 py-2 flex-1 h-full rounded-2xl transition-all active:scale-95 ${mobileTab === 'control' ? 'text-indigo-400 bg-indigo-900/30 shadow-lg shadow-indigo-500/20' : 'text-gray-500'}`}
        >
          <Edit2 size={22} />
          <span className="text-[9px] font-black uppercase tracking-wide">Editor</span>
        </button>
        <button
          onClick={() => setMobileTab('playlist')}
          className={`flex flex-col items-center justify-center gap-0.5 py-2 flex-1 h-full rounded-2xl transition-all active:scale-95 ${mobileTab === 'playlist' ? 'text-indigo-400 bg-indigo-900/30 shadow-lg shadow-indigo-500/20' : 'text-gray-500'}`}
        >
          <Music size={22} />
          <span className="text-[9px] font-black uppercase tracking-wide">Lista</span>
        </button>
        <button
          onClick={() => setMobileTab('preview')}
          className={`flex flex-col items-center justify-center gap-0.5 py-2 flex-1 h-full rounded-2xl transition-all active:scale-95 relative ${mobileTab === 'preview' ? 'text-indigo-400 bg-indigo-900/30 shadow-lg shadow-indigo-500/20' : 'text-gray-500'}`}
        >
          {liveItemId && (
            <div className="absolute top-1 right-1/4 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border border-red-400" />
          )}
          <PlayCircle size={22} />
          <span className="text-[9px] font-black uppercase tracking-wide">Vivo</span>
        </button>
      </div>
    </div>
  );
};

const MonitorIcon = ({ size }: { size: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="3" rx="2" /><line x1="8" x2="16" y1="21" y2="21" /><line x1="12" x2="12" y1="17" y2="21" /></svg>
);

export default App;