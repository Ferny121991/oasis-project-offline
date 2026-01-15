import React from 'react';
import { Slide, Theme } from '../types';
import { Minus, Plus, Move } from 'lucide-react';

interface SplitScreenProps {
    leftSlide: Slide | null;
    rightSlide: Slide | null;
    theme: Theme;
    isFullscreen?: boolean;
    showControls?: boolean;
    // Controlled split settings
    splitRatio?: number;
    onSplitRatioChange?: (ratio: number) => void;
    fontScale?: number;
    onFontScaleChange?: (scale: number) => void;
}

const SplitScreen: React.FC<SplitScreenProps> = ({
    leftSlide,
    rightSlide,
    theme,
    isFullscreen = false,
    showControls = true,
    splitRatio = 50,
    onSplitRatioChange,
    fontScale = 0.5,
    onFontScaleChange
}) => {
    const textShadowStyle = theme.shadow
        ? `${theme.shadowOffsetX}px ${theme.shadowOffsetY}px ${theme.shadowBlur}px ${theme.shadowColor}`
        : 'none';

    const textStrokeStyle = theme.textStrokeWidth > 0
        ? `${theme.textStrokeWidth}px ${theme.textStrokeColor}`
        : 'none';

    // Calculate font size based on original theme and scale
    const baseFontSize = parseInt(theme.fontSize) || 48;
    const splitFontSize = Math.max(14, Math.floor(baseFontSize * fontScale));

    const adjustFontScale = (delta: number) => {
        const newScale = Math.min(2.0, Math.max(0.15, fontScale + delta));
        onFontScaleChange?.(newScale);
    };

    const adjustRatio = (newRatio: number) => {
        onSplitRatioChange?.(Math.min(80, Math.max(20, newRatio)));
    };

    const renderSlideContent = (slide: Slide | null, side: 'left' | 'right') => {
        if (!slide) {
            return (
                <div className="w-full h-full flex items-center justify-center bg-black/50">
                    <div className="text-white/40 text-center p-4">
                        <div className="text-2xl mb-1">{side === 'left' ? '⬅️' : '➡️'}</div>
                        <div className="text-[10px] font-bold uppercase tracking-wider">
                            {side === 'left' ? 'Izquierdo' : 'Derecho'}
                        </div>
                    </div>
                </div>
            );
        }

        // Image slide
        if (slide.type === 'image' && slide.mediaUrl) {
            return (
                <div className="w-full h-full relative overflow-hidden">
                    <img
                        src={slide.mediaUrl}
                        alt=""
                        className="w-full h-full transition-all duration-500"
                        style={{
                            objectFit: theme.imageContentFit || 'cover',
                            opacity: theme.imageContentOpacity ?? 1.0,
                            filter: `
                brightness(${theme.imageContentBrightness ?? 1.0}) 
                contrast(${theme.imageContentContrast ?? 1.0})
                saturate(${theme.imageContentSaturate ?? 1.0})
              `,
                            transform: `scale(${theme.imageContentScale || 1.0})`
                        }}
                    />
                    {/* Label overlay */}
                    {slide.label && (
                        <div className="absolute bottom-2 left-2 right-2">
                            <div
                                className="bg-black/70 backdrop-blur-sm px-2 py-1 rounded inline-block"
                                style={{ color: theme.textColor }}
                            >
                                <span className="text-[10px] font-bold uppercase tracking-wider">{slide.label}</span>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        // Text slide with proper sizing
        return (
            <div
                className="w-full h-full flex flex-col justify-center items-center p-3 overflow-hidden relative"
                style={{ background: 'transparent' }}
            >
                {/* Text content */}
                <div
                    className="text-center w-full max-h-full overflow-hidden z-10"
                    style={{
                        fontFamily: theme.fontFamily,
                        color: theme.textColor,
                        fontWeight: theme.fontWeight,
                        fontStyle: theme.fontStyle,
                        textTransform: theme.textCase === 'none' ? theme.textTransform : theme.textCase,
                        lineHeight: theme.lineHeight || 1.2,
                        letterSpacing: `${Math.max(0, (theme.letterSpacing || 0) * 0.3)}px`,
                        textShadow: textShadowStyle,
                        WebkitTextStroke: textStrokeStyle,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                    }}
                >
                    {slide.label && (
                        <div
                            className="opacity-70 mb-1 font-bold border-b inline-block pb-0.5 uppercase tracking-wider"
                            style={{
                                borderColor: theme.textColor,
                                fontSize: `${Math.max(8, splitFontSize * 0.3)}px`
                            }}
                        >
                            {slide.label}
                        </div>
                    )}
                    <div
                        style={{
                            fontSize: `${splitFontSize}px`,
                            backgroundColor: theme.textBackgroundColor !== 'transparent' ? theme.textBackgroundColor : 'transparent',
                            padding: Math.max(2, (theme.textHighlightPadding || 8) * 0.3),
                            borderRadius: theme.textHighlightRadius || 4,
                        }}
                    >
                        {slide.content}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div
            className={`w-full h-full flex flex-col ${isFullscreen ? '' : 'rounded-lg overflow-hidden'}`}
            style={{ background: theme.background }}
        >
            {/* Background Overlay */}
            <div
                className="absolute inset-0 z-0"
                style={{
                    backgroundColor: theme.bgOverlayColor,
                    opacity: theme.bgOverlayOpacity
                }}
            />

            {/* Controls Bar (only when showControls is true) */}
            {showControls && (
                <div className="relative z-30 bg-gray-900/95 backdrop-blur-sm px-2 py-1.5 flex items-center justify-between gap-3 border-b border-gray-700/50">
                    {/* Font Size Control */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-[8px] text-gray-500 uppercase font-bold hidden sm:block">Texto</span>
                        <button
                            onClick={() => adjustFontScale(-0.05)}
                            className="w-5 h-5 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition-colors"
                        >
                            <Minus size={10} />
                        </button>
                        <span className="text-[10px] text-white font-mono w-8 text-center">{Math.round(fontScale * 100)}%</span>
                        <button
                            onClick={() => adjustFontScale(0.05)}
                            className="w-5 h-5 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition-colors"
                        >
                            <Plus size={10} />
                        </button>
                    </div>

                    {/* Split Ratio Slider */}
                    <div className="flex items-center gap-1.5 flex-1 max-w-[150px]">
                        <Move size={10} className="text-gray-500" />
                        <input
                            type="range"
                            min="20"
                            max="80"
                            value={splitRatio}
                            onChange={(e) => adjustRatio(Number(e.target.value))}
                            className="flex-1 h-1 bg-gray-700 rounded-full accent-purple-500 cursor-pointer"
                        />
                        <span className="text-[8px] text-gray-400 font-mono w-10">{splitRatio}/{100 - splitRatio}</span>
                    </div>

                    {/* Quick Presets */}
                    <div className="flex gap-0.5">
                        {[
                            { label: '50', value: 50 },
                            { label: '60', value: 60 },
                            { label: '70', value: 70 },
                        ].map(preset => (
                            <button
                                key={preset.label}
                                onClick={() => adjustRatio(preset.value)}
                                className={`px-1.5 py-0.5 rounded text-[8px] font-bold transition-colors ${splitRatio === preset.value
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-800 text-gray-500 hover:bg-gray-700 hover:text-white'
                                    }`}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Split Content */}
            <div className="flex-1 flex relative z-10 min-h-0 overflow-hidden">
                {/* Left Panel */}
                <div
                    className="h-full overflow-hidden"
                    style={{ width: `${splitRatio}%` }}
                >
                    {renderSlideContent(leftSlide, 'left')}
                </div>

                {/* Divider */}
                <div className="w-0.5 bg-white/30 relative z-20 shrink-0" />

                {/* Right Panel */}
                <div
                    className="h-full overflow-hidden"
                    style={{ width: `${100 - splitRatio}%` }}
                >
                    {renderSlideContent(rightSlide, 'right')}
                </div>
            </div>
        </div>
    );
};

export default SplitScreen;
