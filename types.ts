
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

export interface Theme {
  id: string;
  name: string;
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

  // Outline / Stroke
  textStrokeWidth: number; // 0 - 5px
  textStrokeColor: string;

  // Background Image/Overlay
  animation: AnimationType;
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
}

export interface Slide {
  id: string;
  type: 'text' | 'image' | 'youtube';
  content: string; // The text lyrics or caption
  mediaUrl?: string; // URL/Base64 for image slides
  videoId?: string; // YouTube Video ID
  label?: string; // e.g., "Coro", "Verso 1"
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
  playlist: PresentationItem[];
  customThemes?: Theme[];
}
