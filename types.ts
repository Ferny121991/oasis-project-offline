
export type AnimationType =
  | 'none'
  | 'fade'
  | 'fade-slide-up'
  | 'fade-slide-down'
  | 'fade-slide-left'
  | 'fade-slide-right'
  | 'zoom-in'
  | 'zoom-out'
  | 'zoom-elastic'
  | 'blur-in'
  | 'focus-in-expand'
  | 'typewriter'
  | 'rotate-in'
  | 'flip-in-x'
  | 'flip-in-y'
  | 'bounce-in'
  | 'bounce-in-top'
  | 'elastic-slide'
  | 'swing-in'
  | 'roll-in'
  | 'slit-in-vertical'
  | 'puff-in';

export type BackgroundAnimationType =
  | 'none'
  | 'particles'
  | 'stars'
  | 'waves'
  | 'gradient-pulse'
  | 'fireflies'
  | 'aurora'
  | 'rays'
  | 'bubbles'
  | 'confetti'
  | 'rain'
  | 'snow'
  | 'spiral'
  | 'cross-light'
  | 'matrix'
  | 'nebula'
  | 'dna'
  | 'comet'
  | 'geometric'
  | 'fluid-flow'
  | 'custom';

export interface BackgroundAnimationConfig {
  type: BackgroundAnimationType;
  speed?: number;
  color?: string;
  color2?: string;
  intensity?: number;
  size?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'center' | 'random';
  shape?: 'circle' | 'square' | 'line' | 'cross' | 'diamond';
}

export interface Theme {
  id: string;
  name: string;
  isDefault?: boolean;
  background: string; // CSS background value (color, gradient, or image url)
  aspectRatio: string; // e.g., "16/9", "4/3", "1/1"
  padding: number; // Slide internal padding (margin)

  // Font Basics
  textColor: string;
  textBackgroundColor: string; // Highlight color
  textOpacity: number; // 0 - 1
  fontFamily: string;
  fontSize: string; // Tailwind class or raw value
  fontWeight: string;
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline' | 'line-through' | 'underline line-through';
  textTransform: 'none' | 'uppercase' | 'lowercase';
  alignment: 'left' | 'center' | 'right' | 'justify';

  // Spacing
  lineHeight: number; // 1 - 2.5
  letterSpacing: number; // -2 to 10px

  // Shadow Details
  shadow: boolean;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;

  // Animation
  animation: AnimationType;
  bgAnimation?: BackgroundAnimationConfig;

  // Outline / Stroke
  textStrokeWidth: number; // 0 - 5px
  textStrokeColor: string;

  // Background Image/Overlay
  bgImageBlur: number; // px (0-20)
  bgBrightness: number; // percentage (0.2 - 1.5)
  bgOverlayOpacity: number; // 0 - 0.9
  bgOverlayColor: string; // hex color

  // Special
  bgClip?: string;

  // Expanded Text Styling
  textRotation: number; // -180 to 180
  textSkewX: number; // -45 to 45
  textHighlightPadding: number; // px
  textHighlightRadius: number; // px
  textGradient: string | null; // e.g., "linear-gradient(...)"
  textCase: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  textShadowSpread: number;

  // Image Slide Specifics
  imageContentFit: 'contain' | 'cover' | 'fill';
  imageContentScale: number;
  imageContentOffsetX: number;
  imageContentOffsetY: number;
  imageContentOpacity: number;
  imageContentBrightness: number;
  imageContentContrast: number;
  imageContentSaturate: number; // 0 - 2
  imageContentGrayscale: number; // 0 - 1
  imageContentSepia: number; // 0 - 1
  imageContentHueRotate: number; // 0 - 360
  imageContentInvert: number; // 0 - 1
  imageContentBlur: number; // 0 - 20px
  imageContentRotation: number; // -180 to 180
  imageContentFlipH: boolean;
  imageContentFlipV: boolean;
  imageContentRadius: number;
  imageContentBorderWidth: number;
  imageContentBorderColor: string;
  imageContentShadowBlur: number;
  imageContentShadowColor: string;
  imageContentShadowOffsetX: number;
  imageContentShadowOffsetY: number;
  imageContentBlendMode: string;

  // Projector Logo Mode
  logoUrl?: string;
  logoBackground: string;
  logoSize: number;
  logoOpacity: number;
  logoGlow: boolean;
  logoBgAnimation?: BackgroundAnimationConfig;

  // Projector Logo Mode - Text & Formatting
  logoText?: string;
  logoTextFontFamily?: string;
  logoTextFontSize?: number;
  logoTextColor?: string;
  logoTextBold?: boolean;
  logoTextItalic?: boolean;
  logoTextUnderline?: boolean;
  logoTextAlignment?: 'left' | 'center' | 'right' | 'justify';
  logoTextShadow?: boolean;
  logoTextShadowColor?: string;
  logoTextShadowBlur?: number;
  logoTextShadowOffsetX?: number;
  logoTextShadowOffsetY?: number;
  logoTextStrokeWidth?: number;
  logoTextStrokeColor?: string;
  logoTextLineHeight?: number;
  logoTextLetterSpacing?: number;
  logoTextGradient?: string | null;

  // 30 Nuevas funciones de control de Logo, Texto y Escala
  logoRotation?: number; // 0 - 360
  logoBorderRadius?: number; // 0 - 100px
  logoBorderWidth?: number; // 0 - 10px
  logoBorderColor?: string;
  logoShadowBlur?: number; // 0 - 50px
  logoShadowColor?: string;
  logoGrayscale?: number; // 0 - 100%
  logoSepia?: number; // 0 - 100%
  logoHueRotate?: number; // 0 - 360
  logoInvert?: number; // 0 - 100%
  logoBlur?: number; // 0 - 20px
  logoBrightness?: number; // 50 - 150%
  logoContrast?: number; // 50 - 150%
  logoSaturation?: number; // 0 - 200%
  logoBgOverlayOpacity?: number; // 0 - 100%
  
  logoAnimationType?: string; // 20 presets
  logoAnimationSpeed?: number; // 0.5 - 10s
  
  logoTextAnimationType?: string; // 20 presets
  logoTextAnimationSpeed?: number; // 0.5 - 10s
  
  logoScaleAnimationType?: string; // 20 presets
  logoScaleAnimationSpeed?: number; // 0.5 - 10s
  
  logoTextSkewX?: number; // -45 to 45
  logoTextRotation?: number; // -180 to 180
  logoTextOpacity?: number; // 0.2 - 1
  logoTextHighlightColor?: string;
  logoTextHighlightPadding?: number; // 0 - 24px
  logoTextHighlightRadius?: number; // 0 - 20px
  
  logo3DTiltX?: number; // -45 to 45
  logo3DTiltY?: number; // -45 to 45
  logoReflection?: boolean;
}

export interface Slide {
  id: string;
  type: 'text' | 'image' | 'youtube' | 'video';
  content: string; // The text lyrics or caption (fallback si no hay segments)
  segments?: TextSegment[]; // Para texto enriquecido con estilos por palabra
  mediaUrl?: string; // URL/Base64 for image and local video slides
  videoId?: string; // YouTube Video ID
  label?: string; // e.g., "Coro", "Verso 1"
  operatorNotes?: string; // Internal notes visible only to the operator, not on projector
}

// Segmento de texto con estilos individuales para edición rica
export interface TextSegment {
  id: string;
  text: string;
  // Override styles (undefined = usar tema global del slide)
  color?: string;
  fontSize?: string;
  fontWeight?: string;
  fontFamily?: string;
  gradient?: string;
  animation?: AnimationType;
  shadowColor?: string;
  shadowBlur?: number;
  textStrokeWidth?: number;
  textStrokeColor?: string;
  italic?: boolean;
  underline?: boolean;
  letterSpacing?: number; // em or px
  rotation?: number; // degrees
  scale?: number; // 0.5 = 50%, 1 = 100%, 2 = 200%
  customFontSize?: number; // exacto en pixeles o porcentaje
}

export interface PresentationItem {
  id: string;
  title: string;
  type: 'song' | 'scripture' | 'custom' | 'image-deck' | 'divider';
  slides: Slide[];
  theme: Theme; // Theme is now specific to the item
  query?: string; // Original search query for refreshing
  density?: 'impact' | 'classic' | 'strophe' | 'reading';
  bibleVersion?: string;
  // Divider specific
  dividerColor?: string; // Color for the divider line/section
  dividerIcon?: string; // Emoji or icon name for the section
}

export interface AppState {
  playlist: PresentationItem[];
  activeItemId: string | null;
  activeSlideIndex: number;
  isLive: boolean;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  scheduledDate?: string; // ISO string for calendar
  playlist: PresentationItem[];
  customThemes?: Theme[];
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  description: string;
  data: Theme;
}
