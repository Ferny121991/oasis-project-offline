import React, { useState, useEffect, useRef } from 'react';
import { Slide, Theme } from '../types';
import { Type, AlignLeft, AlignCenter, AlignRight, Image, Plus, Minus } from 'lucide-react';

interface LiveScreenProps {
  slide: Slide | null;
  theme: Theme;
  isFullscreen?: boolean;
  enableOverlay?: boolean;
  onUpdateTheme?: (theme: Theme) => void;
  hideText?: boolean; // New prop to hide text content only
  isLogoMode?: boolean; // New prop for Logo mode
  blackout?: boolean;
}

const LiveScreen: React.FC<LiveScreenProps> = ({
  slide,
  theme,
  isFullscreen,
  enableOverlay = false,
  onUpdateTheme,
  hideText = false,
  isLogoMode = false,
  blackout = false
}) => {
  const [showTools, setShowTools] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseMove = () => {
    if (enableOverlay && isFullscreen) {
      setShowTools(true);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = setTimeout(() => setShowTools(false), 3000);
    }
  };

  useEffect(() => {
    if (!isFullscreen || !enableOverlay) {
      setShowTools(false);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    }
  }, [isFullscreen, enableOverlay]);

  // CSS Animations map
  const getAnimationClass = () => {
    switch (theme.animation) {
      case 'none': return '';
      case 'fade': return 'animate-fade-in';
      case 'fade-slide-up': return 'animate-fade-slide-up';
      case 'fade-slide-down': return 'animate-fade-slide-down';
      case 'fade-slide-left': return 'animate-fade-slide-left';
      case 'fade-slide-right': return 'animate-fade-slide-right';
      case 'zoom-in': return 'animate-zoom-in';
      case 'zoom-out': return 'animate-zoom-out';
      case 'zoom-elastic': return 'animate-zoom-elastic';
      case 'blur-in': return 'animate-blur-in';
      case 'focus-in-expand': return 'animate-focus-in-expand';
      case 'typewriter': return 'animate-fade-in';
      case 'rotate-in': return 'animate-rotate-in';
      case 'flip-in-x': return 'animate-flip-in-x';
      case 'flip-in-y': return 'animate-flip-in-y';
      case 'bounce-in': return 'animate-bounce-in';
      case 'bounce-in-top': return 'animate-bounce-in-top';
      case 'elastic-slide': return 'animate-elastic-slide';
      case 'swing-in': return 'animate-swing-in';
      case 'roll-in': return 'animate-roll-in';
      case 'slit-in-vertical': return 'animate-slit-in-vertical';
      case 'puff-in': return 'animate-puff-in';
      default: return 'animate-fade-in';
    }
  };

  const cycleFontSize = (direction: 'up' | 'down') => {
    if (!onUpdateTheme) return;
    const sizes = ['text-4xl', 'text-5xl', 'text-6xl', 'text-7xl', 'text-8xl', 'text-9xl', 'text-[10rem]', 'text-[12rem]', 'text-[14rem]'];
    const currentIndex = sizes.indexOf(theme.fontSize) === -1 ? 5 : sizes.indexOf(theme.fontSize);
    let nextIndex = direction === 'up' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= sizes.length) nextIndex = sizes.length - 1;
    if (nextIndex < 0) nextIndex = 0;
    onUpdateTheme({ ...theme, fontSize: sizes[nextIndex] });
  };

  const textShadowStyle = theme.shadow ? `${theme.shadowOffsetX}px ${theme.shadowOffsetY}px ${theme.shadowBlur}px ${theme.shadowColor}` : 'none';
  const textStrokeStyle = theme.textStrokeWidth > 0 ? `${theme.textStrokeWidth}px ${theme.textStrokeColor}` : 'none';

  return (
    <div
      className={`w-full h-full flex flex-col justify-center items-center p-0 relative transition-all duration-500 overflow-hidden ${isFullscreen ? 'cursor-none bg-black' : 'bg-gray-950'}`}
      onMouseMove={handleMouseMove}
    >
      {/* 
        ASPECT RATIO CONTAINER 
      */}
      <div
        className="relative overflow-hidden shadow-2xl transition-all duration-500 bg-black"
        style={{
          aspectRatio: isFullscreen ? 'unset' : (theme.aspectRatio || '16/9'),
          width: isFullscreen ? '100%' : 'auto',
          height: isFullscreen ? '100%' : '80%',
          maxWidth: '100%',
          maxHeight: '100%',
          containerType: 'size' as any,
        }}
      >
        {/* Background Layer */}
        {!isLogoMode && (
          <div
            className="absolute inset-0 z-0 transition-all duration-700"
            style={{
              background: theme.background,
              filter: `brightness(${theme.bgBrightness}) blur(${theme.bgImageBlur}px)`,
              transform: 'scale(1.05)',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />
        )}



        {/* Overlay Layer */}
        {!isLogoMode && <div className="absolute inset-0 z-0 transition-opacity duration-300" style={{ backgroundColor: theme.bgOverlayColor, opacity: theme.bgOverlayOpacity }} />}

        {/* Content Layer with Padding Control */}
        <div
          className="absolute inset-0 z-10 flex flex-col justify-center items-center"
          style={{
            padding: `${theme.padding || 4}cqh`,
            '--font-size-multiplier': theme.fontSize === 'text-2xl' ? '0.3' :
              theme.fontSize === 'text-4xl' ? '0.5' :
                theme.fontSize === 'text-6xl' ? '0.7' :
                  theme.fontSize === 'text-8xl' ? '1.0' :
                    theme.fontSize === 'text-9xl' ? '1.2' :
                      theme.fontSize.includes('10rem') ? '1.5' :
                        theme.fontSize.includes('12rem') ? '1.8' :
                          theme.fontSize.includes('14rem') ? '2.1' : '1.0',
            '--base-font-size': '10cqh'
          } as any}
        >
          {/* Blackout State */}
          {blackout && <div className="absolute inset-0 z-50 bg-black transition-opacity duration-500" />}

          {/* MAIN CONTENT RENDERING */}
          {!blackout && (
            <>
              {/* SLIDE CONTENT */}
              {slide && !isLogoMode ? (
                <div key={slide.id} className={`w-full h-full flex flex-col justify-center items-center ${getAnimationClass()}`}>
                  {/* YOUTUBE SLIDE */}
                  {slide.type === 'youtube' && slide.videoId && (
                    <div className="w-full h-full">
                      <iframe
                        className="w-full h-full"
                        src={`https://www.youtube.com/embed/${slide.videoId}?enablejsapi=1&autoplay=1&mute=0&controls=1`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    </div>
                  )}

                  {/* IMAGE SLIDE */}
                  {slide.type === 'image' && slide.mediaUrl && !hideText && (
                    <div className="w-full h-full flex justify-center items-center overflow-hidden">
                      <img
                        src={slide.mediaUrl}
                        alt="Slide Content"
                        className="transition-all duration-300"
                        style={{
                          width: theme.imageContentFit === 'fill' ? '100%' : (theme.imageContentFit === 'cover' ? '100%' : 'auto'),
                          height: theme.imageContentFit === 'fill' ? '100%' : (theme.imageContentFit === 'cover' ? '100%' : 'auto'),
                          maxWidth: theme.imageContentFit === 'contain' ? '100%' : 'none',
                          maxHeight: theme.imageContentFit === 'contain' ? '100%' : 'none',
                          objectFit: theme.imageContentFit || 'contain',
                          transform: `
                            scale(${theme.imageContentScale || 1.0}) 
                            rotate(${theme.imageContentRotation || 0}deg)
                            scaleX(${theme.imageContentFlipH ? -1 : 1})
                            scaleY(${theme.imageContentFlipV ? -1 : 1})
                          `,
                          opacity: theme.imageContentOpacity ?? 1.0,
                          filter: `
                            brightness(${theme.imageContentBrightness ?? 1.0}) 
                            contrast(${theme.imageContentContrast ?? 1.0})
                            saturate(${theme.imageContentSaturate ?? 1.0})
                            grayscale(${theme.imageContentGrayscale || 0})
                            sepia(${theme.imageContentSepia || 0})
                            hue-rotate(${theme.imageContentHueRotate || 0}deg)
                            invert(${theme.imageContentInvert || 0})
                            blur(${theme.imageContentBlur || 0}px)
                          `,
                          borderRadius: `${theme.imageContentRadius || 0}px`,
                          border: theme.imageContentBorderWidth > 0 ? `${theme.imageContentBorderWidth}px solid ${theme.imageContentBorderColor}` : 'none',
                          boxShadow: theme.imageContentShadowBlur > 0 ? `${theme.imageContentShadowOffsetX}px ${theme.imageContentShadowOffsetY}px ${theme.imageContentShadowBlur}px ${theme.imageContentShadowColor}` : 'none',
                          mixBlendMode: theme.imageContentBlendMode as any
                        }}
                      />
                    </div>
                  )}

                  {/* TEXT SLIDE */}
                  {slide.type === 'text' && (
                    <div
                      className={`w-full flex flex-col transition-opacity duration-500 ${hideText ? 'opacity-0' : 'opacity-100'} ${theme.alignment === 'center' ? 'items-center' : theme.alignment === 'right' ? 'items-end' : theme.alignment === 'justify' ? 'text-justify' : 'items-start'}`}
                      style={{
                        fontFamily: theme.fontFamily,
                        color: theme.textColor,
                        opacity: hideText ? 0 : theme.textOpacity,
                        fontWeight: theme.fontWeight,
                        fontStyle: theme.fontStyle,
                        textTransform: theme.textCase === 'none' ? theme.textTransform : theme.textCase,
                        textDecoration: theme.textDecoration,
                        textAlign: theme.alignment as any,
                        lineHeight: theme.lineHeight,
                        letterSpacing: `${theme.letterSpacing}px`,
                        textShadow: textShadowStyle,
                        WebkitTextStroke: textStrokeStyle,
                        whiteSpace: 'pre-wrap',
                        transform: `rotate(${theme.textRotation || 0}deg) skewX(${theme.textSkewX || 0}deg)`,
                      }}
                    >
                      {slide.label && (
                        <div
                          className="opacity-90 mb-[2cqh] font-bold border-b-[0.2cqh] inline-block pb-[1cqh] drop-shadow-md"
                          style={{ fontSize: '3cqh', borderColor: theme.textColor, textTransform: theme.textTransform, letterSpacing: '0.1em' }}
                        >
                          {slide.label}
                        </div>
                      )}
                      <div
                        className="font-scaling-container"
                        style={{
                          backgroundColor: theme.textBackgroundColor,
                          padding: `${theme.textHighlightPadding || 8}px`,
                          borderRadius: `${theme.textHighlightRadius || 4}px`,
                          boxDecorationBreak: 'clone',
                          WebkitBoxDecorationBreak: 'clone',
                          background: theme.textGradient || (theme.textBackgroundColor !== 'transparent' ? theme.textBackgroundColor : 'transparent'),
                          WebkitBackgroundClip: theme.textGradient ? 'text' : 'unset',
                          WebkitTextFillColor: theme.textGradient ? 'transparent' : 'unset',
                          color: theme.textGradient ? 'transparent' : theme.textColor,
                          fontSize: theme.fontSize.includes('text-') ? `calc(var(--base-font-size, 5cqh) * var(--font-size-multiplier, 1))` : theme.fontSize
                        }}
                      >
                        {slide.content}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* FALLBACK LOGO: Shown if isLogoMode is true OR if no slide is provided */
                <div className={`absolute inset-0 bg-white flex flex-col justify-center items-center gap-8 animate-fade-in`}>
                  <div className="relative">
                    <img
                      src="/logo.png"
                      alt="Logo Principal"
                      className="relative z-10 max-h-[60cqh] max-w-[85%] object-contain drop-shadow-xl animate-pulse"
                    />
                  </div>
                  <div className="z-10 text-center" style={{ fontFamily: theme.fontFamily }}>
                    <div className="text-[6cqh] font-black tracking-[0.8cqw] uppercase text-gray-900">
                      Iglesia De Oasis
                    </div>
                    <div className="text-[3cqh] font-bold tracking-[0.4cqw] uppercase text-indigo-900 opacity-70 mt-1">
                      Betania A Sus Pies
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Floating Tools (Fullscreen Only) */}
      {enableOverlay && isFullscreen && onUpdateTheme && (
        <div className={`absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-6 py-3 flex items-center gap-6 transition-opacity duration-300 z-50 ${showTools ? 'opacity-100 cursor-auto' : 'opacity-0 pointer-events-none'}`}>
          <div className="flex items-center gap-2 border-r border-white/20 pr-4">
            <Type size={18} className="text-gray-300" />
            <button onClick={() => cycleFontSize('down')} className="p-2 hover:bg-white/10 rounded-full text-white transition"><Minus size={16} /></button>
            <button onClick={() => cycleFontSize('up')} className="p-2 hover:bg-white/10 rounded-full text-white transition"><Plus size={16} /></button>
          </div>
          <div className="flex items-center gap-1 border-r border-white/20 pr-4">
            <button onClick={() => onUpdateTheme({ ...theme, alignment: 'left' })} className={`p-2 rounded-full transition ${theme.alignment === 'left' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-white/10'}`}><AlignLeft size={18} /></button>
            <button onClick={() => onUpdateTheme({ ...theme, alignment: 'center' })} className={`p-2 rounded-full transition ${theme.alignment === 'center' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-white/10'}`}><AlignCenter size={18} /></button>
            <button onClick={() => onUpdateTheme({ ...theme, alignment: 'right' })} className={`p-2 rounded-full transition ${theme.alignment === 'right' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-white/10'}`}><AlignRight size={18} /></button>
          </div>
        </div>
      )}

      <style>{`
        /* FADE BASICS */
        .animate-fade-in { animation: fadeIn 0.8s ease-out forwards; }
        .animate-fade-slide-up { animation: fadeSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fade-slide-down { animation: fadeSlideDown 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fade-slide-left { animation: fadeSlideLeft 0.6s ease-out forwards; }
        .animate-fade-slide-right { animation: fadeSlideRight 0.6s ease-out forwards; }
        
        /* ZOOMS */
        .animate-zoom-in { animation: zoomIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-zoom-out { animation: zoomOut 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-zoom-elastic { animation: zoomElastic 1s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards; }
        
        /* BLURS & FOCUS */
        .animate-blur-in { animation: blurIn 0.8s ease-out forwards; }
        .animate-focus-in-expand { animation: focusInExpand 0.8s cubic-bezier(0.250, 0.460, 0.450, 0.940) both; }
        
        /* ROTATIONS & FLIPS */
        .animate-rotate-in { animation: rotateIn 0.7s ease-out forwards; }
        .animate-flip-in-x { animation: flipInX 0.8s cubic-bezier(0.215, 0.610, 0.355, 1.000) both; }
        .animate-flip-in-y { animation: flipInY 0.8s cubic-bezier(0.215, 0.610, 0.355, 1.000) both; }
        .animate-roll-in { animation: rollIn 0.6s ease-out both; }
        
        /* BOUNCES & ELASTIC */
        .animate-bounce-in { animation: bounceIn 0.8s cubic-bezier(0.215, 0.610, 0.355, 1.000) both; }
        .animate-bounce-in-top { animation: bounceInTop 0.8s both; }
        .animate-elastic-slide { animation: elasticSlide 1.2s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards; }
        
        /* 3D & EXOTIC */
        .animate-swing-in { animation: swingInTop 0.8s cubic-bezier(0.175, 0.885, 0.320, 1.275) both; }
        .animate-slit-in-vertical { animation: slitInVertical 0.5s ease-out both; }
        .animate-puff-in { animation: puffIn 0.7s cubic-bezier(0.470, 0.000, 0.745, 0.715) both; }


        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeSlideDown { from { opacity: 0; transform: translateY(-40px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeSlideLeft { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeSlideRight { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: translateX(0); } }
        
        @keyframes zoomIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        @keyframes zoomOut { from { opacity: 0; transform: scale(1.1); } to { opacity: 1; transform: scale(1); } }
        @keyframes zoomElastic { 0% { opacity:0; transform: scale(0.3); } 100% { opacity:1; transform: scale(1); } }
        
        @keyframes blurIn { from { opacity: 0; filter: blur(12px); transform: scale(1.02); } to { opacity: 1; filter: blur(0); transform: scale(1); } }
        @keyframes focusInExpand { 0% { letter-spacing: -0.5em; filter: blur(12px); opacity: 0; } 100% { filter: blur(0px); opacity: 1; } }
        
        @keyframes rotateIn { from { opacity: 0; transform: rotate(-180deg) scale(0.5); } to { opacity: 1; transform: rotate(0) scale(1); } }
        @keyframes flipInX { 0% { transform: perspective(400px) rotate3d(1, 0, 0, 90deg); opacity: 0; } 100% { transform: perspective(400px) rotate3d(1, 0, 0, 0deg); opacity: 1; } }
        @keyframes flipInY { 0% { transform: perspective(400px) rotate3d(0, 1, 0, 90deg); opacity: 0; } 100% { transform: perspective(400px) rotate3d(0, 1, 0, 0deg); opacity: 1; } }
        @keyframes rollIn { 0% { transform: translateX(-100%) rotate(-120deg); opacity: 0; } 100% { transform: translateX(0) rotate(0deg); opacity: 1; } }
        
        @keyframes bounceIn { 0% { opacity: 0; transform: scale(.3); } 50% { opacity: 1; transform: scale(1.05); } 70% { transform: scale(.9); } 100% { transform: scale(1); } }
        @keyframes bounceInTop { 0% { transform: translateY(-500px); opacity: 0; } 38% { transform: translateY(0); opacity: 1; } 55% { transform: translateY(-65px); } 72% { transform: translateY(0); } 81% { transform: translateY(-28px); } 90% { transform: translateY(0); } 95% { transform: translateY(-8px); } 100% { transform: translateY(0); } }
        @keyframes elasticSlide { 0% { opacity:0; transform: translateY(100px); } 100% { opacity:1; transform: translateY(0); } }
        
        @keyframes swingInTop { 0% { transform: rotateX(-100deg); transform-origin: top; opacity: 0; } 100% { transform: rotateX(0deg); transform-origin: top; opacity: 1; } }
        @keyframes slitInVertical { 0% { transform: translateZ(-800px) rotateY(90deg); opacity: 0; } 100% { transform: translateZ(0) rotateY(0); opacity: 1; } }
        @keyframes puffIn { 0% { transform: scale(2); filter: blur(4px); opacity: 0; } 100% { transform: scale(1); filter: blur(0px); opacity: 1; } }
      `}</style>
    </div >
  );
};

export default LiveScreen;