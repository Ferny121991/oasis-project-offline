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

  const enterFullscreen = useCallback(() => {
    if (document.fullscreenElement) return;
    document.documentElement.requestFullscreen().catch(() => setShowStartOverlay(true));
  }, []);

  const handleVideoEnd = useCallback(() => {
    syncChannel.current?.postMessage({ type: 'VIDEO_ENDED' });
  }, []);

  useEffect(() => {
    syncChannel.current = new BroadcastChannel('flujo_projector_sync');

    const applyState = (data: ProjectorSyncState) => {
      const incomingSyncStr = JSON.stringify(data);
      if (incomingSyncStr === lastAppliedSyncStr.current) return;
      lastAppliedSyncStr.current = incomingSyncStr;

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
      if (type === 'TOGGLE_FULLSCREEN' || type === 'ENTER_FULLSCREEN') enterFullscreen();
    };

    syncChannel.current.postMessage({ type: 'REQUEST_STATE' });

    return () => {
      syncChannel.current?.close();
    };
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.opener) return;
      if (event.data === 'OASIS_ENTER_FULLSCREEN' || event.data === 'OASIS_TOGGLE_FULLSCREEN') enterFullscreen();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      if (!['p', 'f', 'Enter'].includes(event.key.length === 1 ? event.key.toLowerCase() : event.key)) return;
      event.preventDefault();
      enterFullscreen();
    };
    const handleFullscreenChange = () => {
      const fullscreen = !!document.fullscreenElement;
      setIsFullscreen(fullscreen);
      window.opener?.postMessage({type: 'PROJECTOR_FULLSCREEN_STATUS', fullscreen}, location.origin);
      setShowStartOverlay(!fullscreen);
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

  return (
    <div
      className="fixed inset-0 w-screen h-screen bg-black overflow-hidden flex flex-col items-center justify-center cursor-none z-[9999]"
      onDoubleClick={enterFullscreen}
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
        <div className="projector-start" role="region" aria-label="Activar proyector">
          <Monitor size={24} />
          <div><strong>Proyector listo</strong><p>Pulsa Ampliar proyector en el escritorio, o usa P o este botón.</p></div>
          <button onClick={enterFullscreen}>Pantalla completa</button>
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
