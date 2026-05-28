import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Monitor } from 'lucide-react';
import LiveScreen from './components/LiveScreen';
import SplitScreen from './components/SplitScreen';
import { DEFAULT_THEME } from './constants';
import { PresentationItem, Slide, Theme } from './types';

type LogoSettings = {
  [K in keyof Theme as K extends `logo${string}` ? K : never]: Theme[K];
};

type ProjectorSyncState = {
  liveItemId: string | null;
  activeItemId?: string | null;
  liveSlideIndex: number;
  activeSlideIndex?: number;
  playlist?: PresentationItem[];
  stagedTheme?: Theme;
  isPreviewHidden?: boolean;
  isTextHidden?: boolean;
  isBackgroundHidden?: boolean;
  isLogoActive?: boolean;
  showSplitScreen?: boolean;
  splitLeftSlide?: Slide | null;
  splitRightSlide?: Slide | null;
  splitRatio?: number;
  splitFontScale?: number;
  logoSettings?: LogoSettings;
  frozenLiveItem?: PresentationItem | null;
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

const ProjectorApp: React.FC = () => {
  const syncChannel = useRef<BroadcastChannel | null>(null);
  const lastAppliedSyncStr = useRef('');

  const [playlist, setPlaylist] = useState<PresentationItem[]>([]);
  const [liveItemId, setLiveItemId] = useState<string | null>(null);
  const [liveSlideIndex, setLiveSlideIndex] = useState(-1);
  const [frozenLiveItem, setFrozenLiveItem] = useState<PresentationItem | null>(null);
  const [stagedTheme, setStagedTheme] = useState<Theme>(DEFAULT_THEME);
  const [globalLogoSettings, setGlobalLogoSettings] = useState<LogoSettings>(() => extractLogoSettings(DEFAULT_THEME));
  const [isPreviewHidden, setIsPreviewHidden] = useState(false);
  const [isTextHidden, setIsTextHidden] = useState(false);
  const [isBackgroundHidden, setIsBackgroundHidden] = useState(false);
  const [isLogoActive, setIsLogoActive] = useState(false);
  const [showSplitScreen, setShowSplitScreen] = useState(false);
  const [splitLeftSlide, setSplitLeftSlide] = useState<Slide | null>(null);
  const [splitRightSlide, setSplitRightSlide] = useState<Slide | null>(null);
  const [splitRatio, setSplitRatio] = useState(50);
  const [splitFontScale, setSplitFontScale] = useState(0.5);
  const [isFullscreen, setIsFullscreen] = useState(() => !!document.fullscreenElement);
  const [showStartOverlay, setShowStartOverlay] = useState(() => !document.fullscreenElement);
  const [lastStableSlide, setLastStableSlide] = useState<Slide | null>(null);
  const [lastStableTheme, setLastStableTheme] = useState<Theme>(() => applyLogoSettings(DEFAULT_THEME, extractLogoSettings(DEFAULT_THEME)));

  const liveItem = useMemo(() => {
    return (liveItemId ? playlist.find(item => item.id === liveItemId) : null) || frozenLiveItem;
  }, [frozenLiveItem, liveItemId, playlist]);

  const projectorSlide = liveItem && liveSlideIndex >= 0 ? liveItem.slides[liveSlideIndex] : null;
  const projectorTheme = applyLogoSettings(liveItem ? liveItem.theme : stagedTheme, globalLogoSettings);

  useEffect(() => {
    if (projectorSlide) {
      setLastStableSlide(projectorSlide);
    } else if (!liveItemId) {
      setLastStableSlide(null);
    }
  }, [liveItemId, projectorSlide]);

  useEffect(() => {
    if (liveItem || !liveItemId) {
      setLastStableTheme(prev => JSON.stringify(prev) === JSON.stringify(projectorTheme) ? prev : projectorTheme);
    }
  }, [liveItem, liveItemId, projectorTheme]);

  const projectorContent = isPreviewHidden || isLogoActive ? null : (projectorSlide || (liveItemId ? lastStableSlide : null));
  const displayedTheme = liveItemId && !liveItem ? lastStableTheme : projectorTheme;

  const handleVideoEnd = useCallback(() => {
    syncChannel.current?.postMessage({ type: 'VIDEO_ENDED' });
  }, []);

  useEffect(() => {
    syncChannel.current = new BroadcastChannel('flujo_projector_sync');

    const applyState = (data: ProjectorSyncState) => {
      const incomingSyncStr = JSON.stringify(data);
      if (incomingSyncStr === lastAppliedSyncStr.current) return;
      lastAppliedSyncStr.current = incomingSyncStr;

      setShowStartOverlay(false);
      setLiveItemId(prev => prev === data.liveItemId ? prev : data.liveItemId);
      setLiveSlideIndex(prev => prev === data.liveSlideIndex ? prev : data.liveSlideIndex);
      setPlaylist(prev => JSON.stringify(prev) === JSON.stringify(data.playlist || []) ? prev : data.playlist || []);
      if (data.stagedTheme) {
        setStagedTheme(prev => JSON.stringify(prev) === JSON.stringify(data.stagedTheme) ? prev : data.stagedTheme as Theme);
      }
      if (data.logoSettings) {
        setGlobalLogoSettings(prev => JSON.stringify(prev) === JSON.stringify(data.logoSettings) ? prev : data.logoSettings as LogoSettings);
      }
      setIsPreviewHidden(prev => prev === !!data.isPreviewHidden ? prev : !!data.isPreviewHidden);
      setIsTextHidden(prev => prev === !!data.isTextHidden ? prev : !!data.isTextHidden);
      setIsBackgroundHidden(prev => prev === !!data.isBackgroundHidden ? prev : !!data.isBackgroundHidden);
      setIsLogoActive(prev => prev === !!data.isLogoActive ? prev : !!data.isLogoActive);
      setFrozenLiveItem(prev => JSON.stringify(prev) === JSON.stringify(data.frozenLiveItem || null) ? prev : data.frozenLiveItem || null);
      setShowSplitScreen(prev => prev === !!data.showSplitScreen ? prev : !!data.showSplitScreen);
      if (data.splitLeftSlide !== undefined) setSplitLeftSlide(prev => JSON.stringify(prev) === JSON.stringify(data.splitLeftSlide) ? prev : data.splitLeftSlide || null);
      if (data.splitRightSlide !== undefined) setSplitRightSlide(prev => JSON.stringify(prev) === JSON.stringify(data.splitRightSlide) ? prev : data.splitRightSlide || null);
      if (data.splitRatio !== undefined) setSplitRatio(prev => prev === data.splitRatio ? prev : data.splitRatio as number);
      if (data.splitFontScale !== undefined) setSplitFontScale(prev => prev === data.splitFontScale ? prev : data.splitFontScale as number);
    };

    syncChannel.current.onmessage = (event: MessageEvent) => {
      const { type, data } = event.data || {};
      if (type === 'SYNC_STATE') applyState(data);
      if (type === 'TOGGLE_FULLSCREEN') {
        if (!document.fullscreenElement) {
          setShowStartOverlay(false);
          document.documentElement.requestFullscreen().catch(() => {
            // Browser security blocks automatic fullscreen from window postMessage.
            // We elegantly show the friendly overlay so a single click executes it.
            setShowStartOverlay(true);
          });
        } else {
          document.exitFullscreen?.().catch(() => undefined);
        }
      }
    };

    syncChannel.current.postMessage({ type: 'REQUEST_STATE' });

    return () => {
      syncChannel.current?.close();
    };
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (typeof event.data === 'string' && event.data === 'OASIS_TOGGLE_FULLSCREEN' && !document.fullscreenElement) {
        setShowStartOverlay(false);
        document.documentElement.requestFullscreen().catch(() => undefined);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'f' && event.key !== 'F11') return;
      event.preventDefault();
      if (!document.fullscreenElement) {
        setShowStartOverlay(false);
        document.documentElement.requestFullscreen().catch(() => undefined);
      } else {
        document.exitFullscreen?.();
      }
    };
    const handleFullscreenChange = () => {
      const fullscreen = !!document.fullscreenElement;
      setIsFullscreen(fullscreen);
      if (fullscreen) setShowStartOverlay(false);
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    handleFullscreenChange();

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (!showStartOverlay) return;
    const timer = window.setTimeout(() => setShowStartOverlay(false), 2200);
    return () => window.clearTimeout(timer);
  }, [showStartOverlay]);

  return (
    <div
      className="fixed inset-0 w-screen h-screen bg-black overflow-hidden flex flex-col items-center justify-center cursor-none z-[9999]"
      onDoubleClick={() => {
        if (!document.fullscreenElement) {
          setShowStartOverlay(false);
          document.documentElement.requestFullscreen().catch(() => undefined);
        } else {
          document.exitFullscreen?.();
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
      {showStartOverlay && !isFullscreen && (
        <div
          className="absolute inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center text-white cursor-pointer group"
          onClick={() => {
            setShowStartOverlay(false);
            document.documentElement.requestFullscreen().catch(() => undefined);
          }}
        >
          <div className="p-16 border-4 border-white/20 rounded-[4rem] bg-gray-900 flex flex-col items-center gap-6 transition-all hover:bg-gray-800 hover:border-white/40 shadow-3xl">
            <div className="w-24 h-24 bg-white text-black rounded-full flex items-center justify-center animate-bounce">
              <Monitor size={48} />
            </div>
            <div className="text-center">
              <p className="text-5xl font-black mb-2 tracking-tight">PANTALLA COMPLETA</p>
              <p className="text-xl text-gray-400 font-medium">Haz clic aqui para iniciar la proyeccion</p>
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
            theme={displayedTheme}
            isFullscreen={true}
            showControls={false}
            splitRatio={splitRatio}
            fontScale={splitFontScale}
          />
        ) : (
          <LiveScreen
            slide={projectorContent}
            theme={displayedTheme}
            isFullscreen={true}
            enableOverlay={false}
            hideText={isTextHidden}
            hideBackground={isBackgroundHidden}
            isLogoMode={isLogoActive}
            blackout={isPreviewHidden}
            onVideoEnd={handleVideoEnd}
            disableAnimations={false}
          />
        )}
      </div>
    </div>
  );
};

export default ProjectorApp;
