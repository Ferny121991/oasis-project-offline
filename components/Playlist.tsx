import React, { useState, useEffect } from 'react';
import { PresentationItem, Slide } from '../types';
import { Music, BookOpen, Trash2, X, Edit2, Check, Monitor, RefreshCw, Upload, GripVertical, ChevronDown, ChevronUp, ChevronRight, Minus, Plus, SeparatorHorizontal, Palette, Copy, Play, Video } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { isIdbMediaUrl, getSlideIdFromIdbUrl, getMediaBlobUrl } from '../services/mediaBlobStore';

interface PlaylistProps {
  items: PresentationItem[];
  activeItemId: string | null;
  activeSlideIndex: number;
  liveItemId: string | null;
  liveSlideIndex: number;
  onSlideClick: (itemId: string, index: number) => void;
  onSlideDoubleClick: (itemId: string, index: number) => void;
  onToggleBackgroundAudio?: (videoId: string, title: string) => void;
  onDeleteItem: (id: string) => void;
  onDeleteSlide: (itemId: string, slideId: string) => void;
  onDuplicateSlide?: (itemId: string, slideId: string) => void;
  onDuplicateItem?: (itemId: string) => void;
  onRefreshItem: (item: PresentationItem) => void;
  onUploadImages: (files: FileList | null, itemId?: string) => void;
  onUpdateSlideLabel: (itemId: string, slideId: string, newLabel: string) => void;
  onUpdateItemTitle: (itemId: string, newTitle: string) => void;
  onReorderItems: (newItems: PresentationItem[]) => void;
  onReorderSlides: (itemId: string, newSlides: Slide[]) => void;
  onAddDivider: (title: string, color?: string, icon?: string) => void;
  onUpdateDivider?: (itemId: string, title: string, color?: string, icon?: string) => void;
  onUpdateSlideNotes?: (itemId: string, slideId: string, notes: string) => void;
  // Split Screen
  isSplitMode?: boolean;
  onSetSplitLeft?: (slide: Slide) => void;
  onSetSplitRight?: (slide: Slide) => void;
  splitLeftSlide?: Slide | null;
  splitRightSlide?: Slide | null;
}

// Sortable Slide Component
interface SortableSlideProps {
  slide: Slide;
  index: number;
  itemId: string;
  isActive: boolean;
  isLive: boolean;
  onSlideClick: () => void;
  onSlideDoubleClick: () => void;
  onDeleteSlide: () => void;
  onDuplicateSlide?: () => void;
  onToggleBackgroundAudio?: () => void;
  itemTitle: string;
  // Split Screen
  isSplitMode?: boolean;
  onSetSplitLeft?: (slide: Slide) => void;
  onSetSplitRight?: (slide: Slide) => void;
  isLeftSplit?: boolean;
  isRightSplit?: boolean;
  onUpdateLabel?: () => void;
  onOpenNotes?: () => void;
};

// Tiny helper component to resolve idb: video URLs for thumbnails
const VideoThumbnail: React.FC<{ mediaUrl: string }> = ({ mediaUrl }) => {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(
    isIdbMediaUrl(mediaUrl) ? null : mediaUrl
  );
  useEffect(() => {
    if (isIdbMediaUrl(mediaUrl)) {
      const slideId = getSlideIdFromIdbUrl(mediaUrl);
      let cancelled = false;
      getMediaBlobUrl(slideId).then(url => {
        if (!cancelled) setResolvedUrl(url);
      });
      return () => { cancelled = true; };
    } else {
      setResolvedUrl(mediaUrl);
    }
  }, [mediaUrl]);

  if (!resolvedUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-800">
        <Video size={18} className="text-gray-500 animate-pulse" />
      </div>
    );
  }
  return <video src={resolvedUrl} className="w-full h-full object-cover opacity-80" muted preload="metadata" />;
};

const SortableSlide: React.FC<SortableSlideProps> = ({
  slide,
  index,
  isActive,
  isLive,
  onSlideClick,
  onSlideDoubleClick,
  onDeleteSlide,
  onDuplicateSlide,
  onToggleBackgroundAudio,
  isSplitMode,
  onSetSplitLeft,
  onSetSplitRight,
  isLeftSplit,
  isRightSplit,
  onUpdateLabel,
  onOpenNotes
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slide.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSlideClick}
      onDoubleClick={onSlideDoubleClick}
      className={`relative group text-left rounded-xl p-3 h-28 flex flex-col justify-between transition-all duration-200 border-2 cursor-pointer shrink-0 w-36 ${isActive
        ? 'bg-indigo-900/40 border-indigo-500 ring-2 ring-indigo-500/30'
        : isLive
          ? 'bg-red-900/30 border-red-500/60'
          : isLeftSplit || isRightSplit
            ? 'bg-purple-900/30 border-purple-500/50'
            : 'bg-gray-900 border-gray-700 hover:border-gray-500'
        }`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-1.5 left-1.5 z-20 cursor-grab active:cursor-grabbing text-gray-500 hover:text-indigo-400 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical size={14} />
      </div>

      {/* Label & Badges */}
      <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
        {isLive && (
          <span className="bg-red-600 text-white text-[8px] px-1.5 py-0.5 rounded font-black animate-pulse">LIVE</span>
        )}
        {isLeftSplit && (
          <span className="bg-purple-600 text-white text-[8px] px-1.5 py-0.5 rounded font-black">L</span>
        )}
        {isRightSplit && (
          <span className="bg-pink-600 text-white text-[8px] px-1.5 py-0.5 rounded font-black">R</span>
        )}
        <span className="text-[9px] font-bold text-gray-400 uppercase truncate max-w-[85px]">
          {slide.label || `#${index + 1}`}
        </span>
      </div>

      {/* Split Mode Buttons */}
      {isSplitMode && (
        <div className="absolute bottom-1.5 left-1.5 z-30 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSetSplitLeft?.(slide);
            }}
            className={`p-1.5 rounded text-xs font-bold transition-all ${isLeftSplit ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-purple-600 hover:text-white'}`}
            title="Panel Izquierdo"
          >
            ⬅️
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSetSplitRight?.(slide);
            }}
            className={`p-1.5 rounded text-xs font-bold transition-all ${isRightSplit ? 'bg-pink-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-pink-600 hover:text-white'}`}
            title="Panel Derecho"
          >
            ➡️
          </button>
        </div>
      )}

      {/* Premium Hover Overlay Actions */}
      {!isSplitMode && (
        <div 
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200 z-30 flex flex-col justify-center items-center gap-2.5 p-2 select-none" 
          onClick={(e) => {
            e.stopPropagation();
            onSlideClick();
          }}
        >
          {/* Main Play Button (Go Live) - Prominent and Centered */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSlideDoubleClick();
            }}
            className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/20 transform hover:scale-110 active:scale-95 transition-all"
            title="Transmitir en vivo"
          >
            <Play size={18} fill="currentColor" />
          </button>

          {/* Secondary Actions Row */}
          <div className="flex items-center justify-center gap-1.5 w-full flex-wrap">
            {/* Background Audio Button for YouTube */}
            {slide.type === 'youtube' && onToggleBackgroundAudio && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleBackgroundAudio();
                }}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-green-600/30 hover:text-green-400 text-slate-300 flex items-center justify-center transition-all active:scale-90"
                title="Reproducir audio en fondo"
              >
                <Music size={12} />
              </button>
            )}

            {/* Edit Label Button */}
            {onUpdateLabel && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateLabel();
                }}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-blue-600/30 hover:text-blue-400 text-slate-300 flex items-center justify-center transition-all active:scale-90"
                title="Editar nombre"
              >
                <Edit2 size={12} />
              </button>
            )}

            {/* Duplicate Button */}
            {onDuplicateSlide && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicateSlide();
                }}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-purple-600/30 hover:text-purple-400 text-slate-300 flex items-center justify-center transition-all active:scale-90"
                title="Duplicar slide"
              >
                <Copy size={12} />
              </button>
            )}

            {/* Notes Button */}
            {onOpenNotes && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenNotes();
                }}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-90 ${
                  slide.operatorNotes 
                    ? 'bg-amber-600/30 text-amber-400 hover:bg-amber-500/40' 
                    : 'bg-white/10 text-slate-300 hover:bg-amber-600/30 hover:text-amber-400'
                }`}
                title={slide.operatorNotes ? 'Ver/Editar nota' : 'Agregar nota'}
              >
                <span className="text-[10px]">📝</span>
              </button>
            )}

            {/* Delete Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteSlide();
              }}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-red-600/30 hover:text-red-400 text-slate-300 flex items-center justify-center transition-all active:scale-90"
              title="Eliminar slide"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Content Preview */}
      <div className={`text-[10px] leading-tight line-clamp-3 mt-5 ${isActive ? 'text-white' : 'text-gray-400'}`}>
        {slide.type === 'youtube' ? (
          <div className="flex flex-col items-center justify-center gap-1 text-red-400 font-bold h-full w-full px-1">
            <Monitor size={16} className="shrink-0" />
            <span className="text-[9px] truncate max-w-[120px] font-bold text-center uppercase leading-none">{slide.label || 'YOUTUBE'}</span>
          </div>
        ) : slide.type === 'video' && slide.mediaUrl ? (
          <div className="absolute inset-0 top-5 rounded-b-lg overflow-hidden bg-black">
            <VideoThumbnail mediaUrl={slide.mediaUrl} />
            <div className="absolute inset-0 flex items-center justify-center">
              <Video size={18} className="text-white drop-shadow" />
            </div>
          </div>
        ) : slide.type === 'image' && slide.mediaUrl ? (
          <div className="absolute inset-0 top-5 rounded-b-lg overflow-hidden">
            <img src={slide.mediaUrl} alt="" className="w-full h-full object-cover opacity-70" />
          </div>
        ) : (
          <span className="line-clamp-3">{slide.content?.substring(0, 60)}</span>
        )}
      </div>
    </div>
  );
};

// Sortable Item Component (Collapsible)
interface SortableItemProps {
  item: PresentationItem;
  activeItemId: string | null;
  activeSlideIndex: number;
  liveItemId: string | null;
  liveSlideIndex: number;
  onSlideClick: (itemId: string, index: number) => void;
  onSlideDoubleClick: (itemId: string, index: number) => void;
  onToggleBackgroundAudio?: (videoId: string, title: string) => void;
  onDeleteItem: (id: string) => void;
  onDeleteSlide: (itemId: string, slideId: string) => void;
  onDuplicateSlide?: (itemId: string, slideId: string) => void;
  onDuplicateItem?: (itemId: string) => void;
  onUpdateDivider?: (itemId: string, title: string, color?: string, icon?: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRefreshItem: (item: PresentationItem) => void;
  onUploadClick: (itemId: string) => void;
  onUpdateSlideLabel: (itemId: string, slideId: string, newLabel: string) => void;
  onUpdateItemTitle: (itemId: string, newTitle: string) => void;
  onReorderSlides: (itemId: string, newSlides: Slide[]) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  // Split Screen
  isSplitMode?: boolean;
  onSetSplitLeft?: (slide: Slide) => void;
  onSetSplitRight?: (slide: Slide) => void;
  splitLeftSlide?: Slide | null;
  splitRightSlide?: Slide | null;
  onOpenNotes: (itemId: string, slideId: string, notes: string) => void;
}

const SortablePlaylistItem: React.FC<SortableItemProps> = ({
  item,
  activeItemId,
  activeSlideIndex,
  liveItemId,
  liveSlideIndex,
  onSlideClick,
  onSlideDoubleClick,
  onToggleBackgroundAudio,
  onDeleteItem,
  onDeleteSlide,
  onDuplicateSlide,
  onDuplicateItem,
  onUpdateDivider,
  onMoveUp,
  onMoveDown,
  onRefreshItem,
  onUploadClick,
  onUpdateSlideLabel,
  onUpdateItemTitle,
  onReorderSlides,
  isExpanded,
  onToggleExpand,
  isSplitMode,
  onSetSplitLeft,
  onSetSplitRight,
  splitLeftSlide,
  splitRightSlide,
  onOpenNotes
}) => {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState('');

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 'auto',
  };

  // Sensors for slide reordering
  const slideSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleSlideDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = item.slides.findIndex(s => s.id === active.id);
      const newIndex = item.slides.findIndex(s => s.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorderSlides(item.id, arrayMove(item.slides, oldIndex, newIndex));
      }
    }
  };

  const startEditingItem = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItemId(item.id);
    setTempTitle(item.title);
  };

  const saveTitle = () => {
    onUpdateItemTitle(item.id, tempTitle);
    setEditingItemId(null);
  };

  const isItemLive = liveItemId === item.id;
  const isItemActive = activeItemId === item.id;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        borderLeft: item.dividerColor ? `5px solid ${item.dividerColor}` : undefined
      }}
      className={`rounded-2xl border overflow-hidden transition-all duration-300 shadow-xl ${isDragging ? 'border-indigo-400 shadow-indigo-500/20' :
        isItemLive ? 'border-red-400/70 bg-gradient-to-br from-red-950/70 to-slate-950 shadow-red-950/30' :
          isItemActive ? 'border-indigo-400/60 bg-gradient-to-br from-indigo-950/70 to-slate-950 shadow-indigo-950/30' :
            'border-white/10 bg-white/[0.04] hover:border-indigo-400/30 hover:bg-white/[0.06]'
        }`}
    >
      {/* Collapsible Header */}
      <div
        className={`px-4 py-3.5 flex items-center gap-3 cursor-pointer transition-colors group ${isItemLive ? 'bg-red-500/10' : isItemActive ? 'bg-indigo-500/10' : 'bg-slate-900/80 hover:bg-slate-800/90'
          }`}
        onClick={() => {
          onToggleExpand();
          onSlideClick(item.id, 0);
        }}
      >
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-indigo-400"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={18} />
        </div>

        {/* Quick Reorder Arrows (▲ / ▼) */}
        <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none group-hover:pointer-events-auto shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onMoveUp}
            className="p-0.5 text-gray-500 hover:text-cyan-400 hover:bg-white/5 rounded transition-all active:scale-90"
            title="Mover arriba"
          >
            <ChevronUp size={12} />
          </button>
          <button
            onClick={onMoveDown}
            className="p-0.5 text-gray-500 hover:text-cyan-400 hover:bg-white/5 rounded transition-all active:scale-90"
            title="Mover abajo"
          >
            <ChevronDown size={12} />
          </button>
        </div>

        {/* Expand/Collapse Icon */}
        {isExpanded ? <ChevronDown size={18} className="text-gray-300 animate-pulse" /> : <ChevronRight size={18} className="text-gray-300" />}

        {/* Icon & Title */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {item.type === 'song' ? <Music size={18} className="text-pink-400 shrink-0" /> : <BookOpen size={18} className="text-blue-400 shrink-0" />}

          {editingItemId === item.id ? (
            <div className="flex items-center gap-2 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveTitle();
                  if (e.key === 'Escape') setEditingItemId(null);
                }}
                className="flex-1 bg-gray-900 text-white text-sm px-3 py-1.5 rounded-lg border border-indigo-500 outline-none"
                autoFocus
              />
              <button onClick={saveTitle} className="text-green-500 hover:text-green-400"><Check size={16} /></button>
              <button onClick={() => setEditingItemId(null)} className="text-red-500 hover:text-red-400"><X size={16} /></button>
            </div>
          ) : (
            <span
              className="font-bold text-white text-sm truncate flex-1 hover:text-indigo-300 transition-colors"
              onClick={(e) => { e.stopPropagation(); startEditingItem(e); }}
            >
              {item.title}
            </span>
          )}
        </div>

        {/* Quick Color Pills Selector */}
        <div className="hidden sm:flex items-center gap-1 bg-black/40 backdrop-blur-md px-2 py-1 rounded-full border border-white/5 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none group-hover:pointer-events-auto shrink-0" onClick={(e) => e.stopPropagation()}>
          {[
            { value: '#6366f1', label: 'Indigo' },
            { value: '#10b981', label: 'Verde' },
            { value: '#f43f5e', label: 'Rosa' },
            { value: '#f59e0b', label: 'Naranja' },
            { value: '#06b6d4', label: 'Celeste' },
          ].map((col) => (
            <button
              key={col.value}
              onClick={() => onUpdateDivider?.(item.id, item.title, item.dividerColor === col.value ? undefined : col.value, item.dividerIcon)}
              className={`w-3 h-3 rounded-full border transition-all hover:scale-125 ${
                item.dividerColor === col.value 
                  ? 'border-white scale-110 shadow-[0_0_8px_rgba(255,255,255,0.6)]' 
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
              style={{ backgroundColor: col.value }}
              title={col.label}
            />
          ))}
          {item.dividerColor && (
            <button
              onClick={() => onUpdateDivider?.(item.id, item.title, undefined, item.dividerIcon)}
              className="text-[8px] text-gray-500 hover:text-white px-1 font-bold"
              title="Quitar color"
            >
              ✕
            </button>
          )}
        </div>

        {/* Slide Count Badge */}
        <span className="text-xs bg-white/10 text-slate-200 px-2 py-1 rounded-lg font-bold border border-white/10">
          {item.slides.length}
        </span>

        {/* Live Badge */}
        {isItemLive && (
          <span className="flex items-center gap-1.5 text-xs bg-red-600 text-white px-2.5 py-1 rounded-full font-bold animate-pulse shadow-lg shadow-red-600/20">
            <div className="w-2 h-2 bg-white rounded-full" /> LIVE
          </span>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none group-hover:pointer-events-auto shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onSlideDoubleClick(item.id, isItemActive ? activeSlideIndex : 0)}
            className={`p-1.5 rounded-lg transition-colors ${isItemLive ? 'text-red-400 bg-red-900/30' : 'text-gray-400 hover:text-green-400 hover:bg-green-900/20'}`}
            title="En Vivo"
          >
            <Monitor size={16} />
          </button>
          <button
            onClick={() => onUploadClick(item.id)}
            className="p-1.5 text-gray-400 hover:text-indigo-400 hover:bg-indigo-900/20 rounded-lg transition-colors"
            title="Subir imágenes"
          >
            <Upload size={16} />
          </button>
          <button
            onClick={() => onRefreshItem(item)}
            className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-900/20 rounded-lg transition-colors"
            title="Actualizar"
          >
            <RefreshCw size={16} />
          </button>
          {onDuplicateItem && (
            <button
              onClick={() => onDuplicateItem(item.id)}
              className="p-1.5 text-gray-400 hover:text-purple-400 hover:bg-purple-900/20 rounded-lg transition-colors"
              title="Duplicar item"
            >
              <Copy size={16} />
            </button>
          )}
          <button
            onClick={() => onDeleteItem(item.id)}
            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
            title="Eliminar"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Collapsible Slides (Horizontal Scroll with Drag & Drop) */}
      {isExpanded && (
        <div className="p-4 bg-slate-950/70 border-t border-white/10">
          <DndContext sensors={slideSensors} collisionDetection={closestCenter} onDragEnd={handleSlideDragEnd}>
            <SortableContext items={item.slides.map(s => s.id)} strategy={rectSortingStrategy}>
              <div className="flex flex-row overflow-x-auto lg:flex-wrap gap-2.5 no-scrollbar pb-2 pt-1 scroll-smooth max-w-full">
                {item.slides.map((slide, index) => (
                  <SortableSlide
                    key={slide.id}
                    slide={slide}
                    index={index}
                    itemId={item.id}
                    isActive={activeItemId === item.id && activeSlideIndex === index}
                    isLive={liveItemId === item.id && liveSlideIndex === index}
                    onSlideClick={() => onSlideClick(item.id, index)}
                    onSlideDoubleClick={() => onSlideDoubleClick(item.id, index)}
                    onDeleteSlide={() => onDeleteSlide(item.id, slide.id)}
                    onDuplicateSlide={onDuplicateSlide ? () => onDuplicateSlide(item.id, slide.id) : undefined}
                    onToggleBackgroundAudio={slide.videoId ? () => onToggleBackgroundAudio?.(slide.videoId!, slide.label || slide.content || item.title) : undefined}
                    itemTitle={item.title}
                    isSplitMode={isSplitMode}
                    onSetSplitLeft={onSetSplitLeft}
                    onSetSplitRight={onSetSplitRight}
                    isLeftSplit={splitLeftSlide?.id === slide.id}
                    isRightSplit={splitRightSlide?.id === slide.id}
                    onUpdateLabel={() => onUpdateSlideLabel(item.id, slide.id, slide.label || "")}
                    onOpenNotes={() => onOpenNotes(item.id, slide.id, slide.operatorNotes || '')}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
};

// Sortable Divider Item Component
interface SortableDividerItemProps {
  item: PresentationItem;
  onDelete: () => void;
  onEdit: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const SortableDividerItem: React.FC<SortableDividerItemProps> = ({
  item,
  onDelete,
  onEdit,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 'auto',
  };

  const color = item.dividerColor || '#6366f1';
  const icon = item.dividerIcon || '📋';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative"
    >
      <div
        className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-white/5 bg-slate-900/40 relative overflow-hidden transition-all duration-300 hover:bg-white/[0.02]"
        style={{
          borderLeft: `4px solid ${color}`,
          boxShadow: `inset 2px 0 8px ${color}10`,
        }}
      >
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-gray-500 hover:text-white transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={16} />
        </div>

        {/* Expand/Collapse Section Arrow */}
        {onToggleCollapse && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse();
            }}
            className="p-1 hover:bg-white/5 rounded text-gray-400 hover:text-white transition-all active:scale-90 flex items-center justify-center shrink-0"
            title={isCollapsed ? "Expandir sección" : "Colapsar sección"}
          >
            {isCollapsed ? <ChevronRight size={14} className="text-cyan-400 animate-pulse" /> : <ChevronDown size={14} className="text-gray-400" />}
          </button>
        )}

        {/* Icon & Title */}
        <span className="text-xl flex items-center justify-center filter drop-shadow">{icon}</span>
        <span
          className="font-black text-xs tracking-widest uppercase flex-1 truncate filter drop-shadow"
          style={{ color: color }}
        >
          {item.title}
        </span>

        {/* Divider Line with Gradient Fade */}
        <div
          className="flex-1 h-[1.5px] rounded-full transition-all duration-300"
          style={{ background: `linear-gradient(to right, ${color}60, transparent)` }}
        />

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-indigo-400 hover:bg-indigo-900/20 rounded-lg transition-all"
            title="Editar sección"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all"
            title="Eliminar sección"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Playlist Component

const Playlist: React.FC<PlaylistProps> = ({
  items,
  activeItemId,
  activeSlideIndex,
  liveItemId,
  liveSlideIndex,
  onSlideClick,
  onSlideDoubleClick,
  onToggleBackgroundAudio,
  onDeleteItem,
  onDeleteSlide,
  onDuplicateSlide,
  onDuplicateItem,
  onRefreshItem,
  onUploadImages,
  onUpdateSlideLabel,
  onUpdateItemTitle,
  onReorderItems,
  onReorderSlides,
  onAddDivider,
  onUpdateDivider,
  onUpdateSlideNotes,
  isSplitMode,
  onSetSplitLeft,
  onSetSplitRight,
  splitLeftSlide,
  splitRightSlide
}) => {
  const moveItemUp = (itemId: string) => {
    const index = items.findIndex(i => i.id === itemId);
    if (index > 0) {
      const newItems = [...items];
      const temp = newItems[index];
      newItems[index] = newItems[index - 1];
      newItems[index - 1] = temp;
      onReorderItems(newItems);
    }
  };

  const moveItemDown = (itemId: string) => {
    const index = items.findIndex(i => i.id === itemId);
    if (index < items.length - 1) {
      const newItems = [...items];
      const temp = newItems[index];
      newItems[index] = newItems[index + 1];
      newItems[index + 1] = temp;
      onReorderItems(newItems);
    }
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [activeUploadItemId, setActiveUploadItemId] = useState<string | undefined>();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(() => {
    // Start with active item expanded
    return new Set(activeItemId ? [activeItemId] : []);
  });

  const [collapsedDividers, setCollapsedDividers] = useState<Set<string>>(new Set());

  const toggleCollapseDivider = (dividerId: string) => {
    setCollapsedDividers(prev => {
      const next = new Set(prev);
      if (next.has(dividerId)) {
        next.delete(dividerId);
      } else {
        next.add(dividerId);
      }
      return next;
    });
  };

  // Edit Modal State
  const [editModal, setEditModal] = useState<{
    itemId: string;
    slideId: string;
    initialValue: string;
  } | null>(null);

  const [editValue, setEditValue] = useState('');

  // Divider Modal State
  const [showDividerModal, setShowDividerModal] = useState(false);
  const [dividerTitle, setDividerTitle] = useState('');
  const [dividerColor, setDividerColor] = useState('#6366f1');
  const [dividerIcon, setDividerIcon] = useState('📋');
  const [editingDividerId, setEditingDividerId] = useState<string | null>(null);

  // Notes Modal State
  const [notesModal, setNotesModal] = useState<{
    itemId: string;
    slideId: string;
    notes: string;
  } | null>(null);
  const [notesValue, setNotesValue] = useState('');

  const DIVIDER_COLORS = [
    { name: 'Índigo', value: '#6366f1' },
    { name: 'Rosa', value: '#ec4899' },
    { name: 'Verde', value: '#22c55e' },
    { name: 'Naranja', value: '#f97316' },
    { name: 'Cian', value: '#06b6d4' },
    { name: 'Púrpura', value: '#a855f7' },
    { name: 'Rojo', value: '#ef4444' },
    { name: 'Amarillo', value: '#eab308' },
  ];

  const DIVIDER_ICONS = ['📋', '🎵', '📖', '🙏', '✝️', '🎤', '💬', '🎹', '⭐', '🔔', '❤️', '🕊️'];

  // Handle opening the edit modal
  const handleEditLabel = (itemId: string, slideId: string, currentLabel: string) => {
    setEditValue(currentLabel);
    setEditModal({ itemId, slideId, initialValue: currentLabel });
  };

  const saveEdit = () => {
    if (editModal) {
      onUpdateSlideLabel(editModal.itemId, editModal.slideId, editValue);
      setEditModal(null);
    }
  };

  const handleAddDivider = () => {
    if (dividerTitle.trim()) {
      if (editingDividerId && onUpdateDivider) {
        onUpdateDivider(editingDividerId, dividerTitle.trim(), dividerColor, dividerIcon);
      } else {
        onAddDivider(dividerTitle.trim(), dividerColor, dividerIcon);
      }
      setShowDividerModal(false);
      setDividerTitle('');
      setDividerColor('#6366f1');
      setDividerIcon('📋');
      setEditingDividerId(null);
    }
  };

  const openEditDivider = (item: PresentationItem) => {
    setEditingDividerId(item.id);
    setDividerTitle(item.title);
    setDividerColor(item.dividerColor || '#6366f1');
    setDividerIcon(item.dividerIcon || '📋');
    setShowDividerModal(true);
  };


  // DnD Kit Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex(item => item.id === active.id);
      const newIndex = items.findIndex(item => item.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorderItems(arrayMove(items, oldIndex, newIndex));
      }
    }
  };

  const handleUploadClick = (itemId: string) => {
    setActiveUploadItemId(itemId);
    fileInputRef.current?.click();
  };

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  // Auto-expand active item
  React.useEffect(() => {
    if (activeItemId && !expandedItems.has(activeItemId)) {
      setExpandedItems(prev => new Set([...prev, activeItemId]));
    }
  }, [activeItemId]);

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative overflow-y-auto">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*,video/*,.pptx,.pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/pdf"
          multiple
          onChange={(e) => {
            onUploadImages(e.target.files, activeUploadItemId);
            setActiveUploadItemId(undefined);
            if (e.target) e.target.value = '';
          }}
        />
        {/* Add Section Button even when empty */}
        <div className="w-full max-w-sm mb-8">
          <button
            onClick={() => {
              setEditingDividerId(null);
              setDividerTitle('');
              setDividerColor('#6366f1');
              setDividerIcon('📋');
              setShowDividerModal(true);
            }}
            className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-gray-600 hover:border-indigo-500 bg-gray-800/50 hover:bg-indigo-900/20 text-gray-400 hover:text-indigo-300 font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <SeparatorHorizontal size={18} />
            Agregar Sección / Divisor
          </button>
        </div>

        <div className="bg-gray-800 p-4 rounded-full mb-4">
          <Music className="opacity-20" size={32} />
        </div>
        <p className="text-sm text-gray-500">Tu lista está vacía.</p>
        <p className="text-xs text-gray-600 mt-1 mb-6">Usa el panel izquierdo o sube imágenes, videos, PowerPoint o PDF.</p>

        <button
          onClick={() => {
            setActiveUploadItemId(undefined);
            fileInputRef.current?.click();
          }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold transition-all shadow-lg active:scale-95"
        >
          <Upload size={18} /> SUBIR ARCHIVOS
        </button>
      </div>
    );
  }


  return (
    <div className="flex-1 h-full overflow-y-auto p-4 space-y-2 pb-40 bg-gray-950/20 scroll-smooth">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*,video/*,.pptx,.pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/pdf"
        multiple
        onChange={(e) => {
          onUploadImages(e.target.files, activeUploadItemId);
          setActiveUploadItemId(undefined);
          if (e.target) e.target.value = '';
        }}
      />

      {/* Add Section Button */}
      <button
        onClick={() => {
          setEditingDividerId(null);
          setDividerTitle('');
          setDividerColor('#6366f1');
          setDividerIcon('📋');
          setShowDividerModal(true);
        }}
        className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-gray-600 hover:border-indigo-500 bg-gray-800/50 hover:bg-indigo-900/20 text-gray-400 hover:text-indigo-300 font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
      >
        <SeparatorHorizontal size={18} />
        Agregar Sección / Divisor
      </button>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {(() => {
            let isCurrentSectionCollapsed = false;
            return items.map((item) => {
              if (item.type === 'divider') {
                isCurrentSectionCollapsed = collapsedDividers.has(item.id);
                return (
                  <SortableDividerItem
                    key={item.id}
                    item={item}
                    onDelete={() => onDeleteItem(item.id)}
                    onEdit={() => openEditDivider(item)}
                    isCollapsed={isCurrentSectionCollapsed}
                    onToggleCollapse={() => toggleCollapseDivider(item.id)}
                  />
                );
              }

              if (isCurrentSectionCollapsed) {
                return null;
              }

              return (
                <SortablePlaylistItem
                  key={item.id}
                  item={item}
                  activeItemId={activeItemId}
                  activeSlideIndex={activeSlideIndex}
                  liveItemId={liveItemId}
                  liveSlideIndex={liveSlideIndex}
                  onSlideClick={onSlideClick}
                  onSlideDoubleClick={onSlideDoubleClick}
                  onToggleBackgroundAudio={onToggleBackgroundAudio}
                  onDeleteItem={onDeleteItem}
                  onDeleteSlide={onDeleteSlide}
                  onDuplicateSlide={onDuplicateSlide}
                  onDuplicateItem={onDuplicateItem}
                  onUpdateDivider={onUpdateDivider}
                  onMoveUp={() => moveItemUp(item.id)}
                  onMoveDown={() => moveItemDown(item.id)}
                  onRefreshItem={onRefreshItem}
                  onUploadClick={handleUploadClick}
                  onUpdateSlideLabel={handleEditLabel}
                  onUpdateItemTitle={onUpdateItemTitle}
                  onReorderSlides={onReorderSlides}
                  isExpanded={expandedItems.has(item.id)}
                  onToggleExpand={() => toggleExpand(item.id)}
                  isSplitMode={isSplitMode}
                  onSetSplitLeft={onSetSplitLeft}
                  onSetSplitRight={onSetSplitRight}
                  splitLeftSlide={splitLeftSlide}
                  splitRightSlide={splitRightSlide}
                  onOpenNotes={(itemId, slideId, notes) => {
                    setNotesModal({ itemId, slideId, notes });
                    setNotesValue(notes);
                  }}
                />
              );
            });
          })()}
        </SortableContext>
      </DndContext>

      {/* Modern Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setEditModal(null)}
          />
          <div className="relative bg-gray-900 border border-gray-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Edit2 size={18} />
                Editar Etiqueta
              </h3>
              <button
                onClick={() => setEditModal(null)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Nombre de la diapositiva
                </label>
                <input
                  autoFocus
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit();
                    if (e.key === 'Escape') setEditModal(null);
                  }}
                  placeholder="Ej: Verso 1, Coro..."
                  className="w-full bg-gray-800 text-white px-4 py-3 rounded-xl border-2 border-transparent focus:border-indigo-500 focus:bg-gray-950 transition-all outline-none text-lg font-medium"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEditModal(null)}
                  className="flex-1 px-4 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold transition-all active:scale-95"
                >
                  CANCELAR
                </button>
                <button
                  onClick={saveEdit}
                  className="flex-1 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-2"
                >
                  <Check size={18} />
                  GUARDAR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Divider Modal */}
      {showDividerModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowDividerModal(false)}
          />
          <div className="relative bg-gray-900 border border-gray-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 flex items-center justify-between" style={{ background: `linear-gradient(135deg, ${dividerColor} 0%, ${dividerColor}88 100%)` }}>
              <h3 className="text-white font-bold flex items-center gap-2">
                <SeparatorHorizontal size={18} />
                {editingDividerId ? 'Editar Sección' : 'Nueva Sección'}
              </h3>
              <button
                onClick={() => setShowDividerModal(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Title Input */}
              <div className="space-y-2 animate-in fade-in duration-300">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Nombre de la Sección
                </label>
                <input
                  autoFocus
                  type="text"
                  value={dividerTitle}
                  onChange={(e) => setDividerTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddDivider();
                    if (e.key === 'Escape') setShowDividerModal(false);
                  }}
                  placeholder="Ej: Devocional, Alabanza, Predicación..."
                  style={{
                    borderColor: dividerTitle.trim() ? `${dividerColor}40` : 'transparent',
                    boxShadow: dividerTitle.trim() ? `0 0 14px ${dividerColor}15` : undefined
                  }}
                  className="w-full bg-gray-800 text-white px-4 py-3 rounded-xl border-2 transition-all outline-none text-lg font-medium focus:bg-gray-950 focus:border-indigo-500"
                />
              </div>

              {/* Icon Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Ícono
                </label>
                <div className="flex flex-wrap gap-2">
                  {DIVIDER_ICONS.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setDividerIcon(icon)}
                      style={{
                        backgroundColor: dividerIcon === icon ? dividerColor : undefined,
                        boxShadow: dividerIcon === icon ? `0 4px 10px ${dividerColor}35` : undefined
                      }}
                      className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${dividerIcon === icon
                        ? 'ring-2 ring-white/40 scale-110'
                        : 'bg-gray-800 hover:bg-gray-700 hover:scale-105'
                        }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Palette size={14} /> Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {DIVIDER_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setDividerColor(color.value)}
                      className={`w-8 h-8 rounded-full transition-all ${dividerColor === color.value
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900 scale-110'
                        : 'hover:scale-105'
                        }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Vista Previa
                </label>
                <div
                  className="p-4 rounded-xl flex items-center gap-3 border border-white/5 bg-slate-900/40 relative overflow-hidden transition-all duration-300 shadow-inner"
                  style={{
                    borderLeft: `4px solid ${dividerColor}`,
                    boxShadow: `inset 2px 0 8px ${dividerColor}10`,
                  }}
                >
                  <span className="text-2xl flex items-center justify-center filter drop-shadow">{dividerIcon}</span>
                  <span
                    className="font-black text-xs tracking-widest uppercase flex-1 truncate filter drop-shadow animate-pulse"
                    style={{ color: dividerColor }}
                  >
                    {dividerTitle || 'VISTA PREVIA'}
                  </span>
                  {/* Divider Line with Gradient Fade */}
                  <div
                    className="flex-1 h-[1.5px] rounded-full transition-all duration-300"
                    style={{ background: `linear-gradient(to right, ${dividerColor}60, transparent)` }}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowDividerModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold transition-all active:scale-95"
                >
                  CANCELAR
                </button>
                <button
                  onClick={handleAddDivider}
                  disabled={!dividerTitle.trim()}
                  className="flex-1 px-4 py-3 rounded-xl text-white font-bold transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: dividerColor,
                    boxShadow: dividerTitle.trim() ? `0 4px 14px ${dividerColor}40` : undefined
                  }}
                >
                  <Check size={18} />
                  {editingDividerId ? 'GUARDAR' : 'CREAR'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {notesModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-xl shadow-2xl border border-gray-700 w-full max-w-md">
            <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-3 rounded-t-xl flex items-center justify-between">
              <h3 className="text-white font-bold flex items-center gap-2">
                📝 Notas del Operador
              </h3>
              <button onClick={() => setNotesModal(null)} className="text-white/80 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="p-4">
              <p className="text-xs text-gray-400 mb-2">Estas notas solo las ves tú, no aparecen en el proyector.</p>
              <textarea
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                placeholder="Ej: Recordar subir volumen aquí..."
                className="w-full bg-gray-800 rounded-lg px-4 py-3 text-white border border-gray-600 focus:border-amber-500 outline-none h-32 resize-none"
                autoFocus
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setNotesModal(null)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg font-medium transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (notesModal && onUpdateSlideNotes) {
                      onUpdateSlideNotes(notesModal.itemId, notesModal.slideId, notesValue);
                    }
                    setNotesModal(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <Check size={16} />
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

};

export default Playlist;
