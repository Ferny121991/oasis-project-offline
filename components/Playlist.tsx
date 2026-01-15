import React, { useState } from 'react';
import { PresentationItem, Slide } from '../types';
import { Music, BookOpen, Trash2, X, Edit2, Check, Monitor, RefreshCw, Upload, GripVertical, ChevronDown, ChevronRight } from 'lucide-react';
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
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
  onRefreshItem: (item: PresentationItem) => void;
  onUploadImages: (files: FileList | null, itemId?: string) => void;
  onUpdateSlideLabel: (itemId: string, slideId: string, newLabel: string) => void;
  onUpdateItemTitle: (itemId: string, newTitle: string) => void;
  onReorderItems: (newItems: PresentationItem[]) => void;
  onReorderSlides: (itemId: string, newSlides: Slide[]) => void;
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
  onToggleBackgroundAudio?: () => void;
  itemTitle: string;
  // Split Screen
  isSplitMode?: boolean;
  onSetSplitLeft?: (slide: Slide) => void;
  onSetSplitRight?: (slide: Slide) => void;
  isLeftSplit?: boolean;
  isRightSplit?: boolean;
}

const SortableSlide: React.FC<SortableSlideProps> = ({
  slide,
  index,
  isActive,
  isLive,
  onSlideClick,
  onSlideDoubleClick,
  onDeleteSlide,
  isSplitMode,
  onSetSplitLeft,
  onSetSplitRight,
  isLeftSplit,
  isRightSplit,
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
      className={`relative group text-left rounded-xl p-2.5 h-24 flex flex-col justify-between transition-all duration-200 border-2 cursor-pointer shrink-0 w-32 ${isActive
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
        className="absolute top-1 left-1 z-20 cursor-grab active:cursor-grabbing text-gray-500 hover:text-indigo-400 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical size={12} />
      </div>

      {/* Label */}
      <div className="absolute top-1 right-1 flex items-center gap-1">
        {isLive && (
          <span className="bg-red-600 text-white text-[7px] px-1 rounded-sm font-black animate-pulse">LIVE</span>
        )}
        {isLeftSplit && (
          <span className="bg-purple-600 text-white text-[7px] px-1 rounded-sm font-black">L</span>
        )}
        {isRightSplit && (
          <span className="bg-pink-600 text-white text-[7px] px-1 rounded-sm font-black">R</span>
        )}
        <span className="text-[8px] font-bold text-gray-400 uppercase truncate max-w-[40px]">
          {slide.label || `#${index + 1}`}
        </span>
      </div>

      {/* Split Mode Buttons */}
      {isSplitMode && (
        <div className="absolute bottom-1 left-1 z-30 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSetSplitLeft?.(slide);
            }}
            className={`p-1 rounded text-[8px] font-bold transition-all ${isLeftSplit ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-purple-600 hover:text-white'}`}
            title="Panel Izquierdo"
          >
            ⬅️
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSetSplitRight?.(slide);
            }}
            className={`p-1 rounded text-[8px] font-bold transition-all ${isRightSplit ? 'bg-pink-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-pink-600 hover:text-white'}`}
            title="Panel Derecho"
          >
            ➡️
          </button>
        </div>
      )}

      {/* Delete Button */}
      {!isSplitMode && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteSlide();
          }}
          className="absolute bottom-1 right-1 z-30 p-1 rounded text-white bg-red-600/80 hover:bg-red-500 opacity-0 group-hover:opacity-100 transition-all"
        >
          <Trash2 size={10} />
        </button>
      )}

      {/* Content Preview */}
      <div className={`text-[9px] leading-tight line-clamp-2 mt-4 ${isActive ? 'text-white' : 'text-gray-400'}`}>
        {slide.type === 'youtube' ? (
          <div className="flex items-center gap-1 text-red-400 font-bold">
            <Monitor size={10} /> VIDEO
          </div>
        ) : slide.type === 'image' && slide.mediaUrl ? (
          <div className="absolute inset-0 top-4 rounded-b overflow-hidden">
            <img src={slide.mediaUrl} alt="" className="w-full h-full object-cover opacity-60" />
          </div>
        ) : (
          <span className="line-clamp-2">{slide.content?.substring(0, 40)}</span>
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
  onRefreshItem,
  onUploadClick,
  onUpdateItemTitle,
  onReorderSlides,
  isExpanded,
  onToggleExpand,
  isSplitMode,
  onSetSplitLeft,
  onSetSplitRight,
  splitLeftSlide,
  splitRightSlide
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
      style={style}
      className={`rounded-xl border-2 overflow-hidden transition-all duration-300 ${isDragging ? 'border-indigo-500 shadow-lg shadow-indigo-500/20' :
        isItemLive ? 'border-red-500/60 bg-red-950/30' :
          isItemActive ? 'border-indigo-500/60 bg-indigo-950/30' :
            'border-gray-700/60 bg-gray-800/50 hover:border-gray-500'
        }`}
    >
      {/* Collapsible Header */}
      <div
        className={`px-4 py-3.5 flex items-center gap-3 cursor-pointer transition-colors ${isItemLive ? 'bg-red-900/40' : isItemActive ? 'bg-indigo-900/40' : 'bg-gray-800/90 hover:bg-gray-700/80'
          }`}
        onClick={onToggleExpand}
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

        {/* Expand/Collapse Icon */}
        {isExpanded ? <ChevronDown size={18} className="text-gray-300" /> : <ChevronRight size={18} className="text-gray-300" />}

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

        {/* Slide Count Badge */}
        <span className="text-xs bg-gray-700 text-gray-200 px-2 py-1 rounded-lg font-bold">
          {item.slides.length}
        </span>

        {/* Live Badge */}
        {isItemLive && (
          <span className="flex items-center gap-1.5 text-xs bg-red-600 text-white px-2.5 py-1 rounded-lg font-bold animate-pulse">
            <div className="w-2 h-2 bg-white rounded-full" /> LIVE
          </span>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onSlideDoubleClick(item.id, 0)}
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
        <div className="p-4 bg-gray-900/60">
          <DndContext sensors={slideSensors} collisionDetection={closestCenter} onDragEnd={handleSlideDragEnd}>
            <SortableContext items={item.slides.map(s => s.id)} strategy={horizontalListSortingStrategy}>
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
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
                    onToggleBackgroundAudio={slide.videoId ? () => onToggleBackgroundAudio?.(slide.videoId!, item.title) : undefined}
                    itemTitle={item.title}
                    isSplitMode={isSplitMode}
                    onSetSplitLeft={onSetSplitLeft}
                    onSetSplitRight={onSetSplitRight}
                    isLeftSplit={splitLeftSlide?.id === slide.id}
                    isRightSplit={splitRightSlide?.id === slide.id}
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
  onRefreshItem,
  onUploadImages,
  onUpdateSlideLabel,
  onUpdateItemTitle,
  onReorderItems,
  onReorderSlides,
  isSplitMode,
  onSetSplitLeft,
  onSetSplitRight,
  splitLeftSlide,
  splitRightSlide
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [activeUploadItemId, setActiveUploadItemId] = useState<string | undefined>();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(() => {
    // Start with active item expanded
    return new Set(activeItemId ? [activeItemId] : []);
  });

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
      <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8 text-center relative">
        <div className="bg-gray-800 p-4 rounded-full mb-4">
          <Music className="opacity-20" size={32} />
        </div>
        <p className="text-sm">Tu lista está vacía.</p>
        <p className="text-xs mt-1 mb-6">Usa el panel izquierdo o sube imágenes directamente.</p>

        <button
          onClick={() => {
            setActiveUploadItemId(undefined);
            fileInputRef.current?.click();
          }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold transition-all shadow-lg active:scale-95"
        >
          <Upload size={18} /> SUBIR IMÁGENES
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
        accept="image/*"
        multiple
        onChange={(e) => {
          onUploadImages(e.target.files, activeUploadItemId);
          setActiveUploadItemId(undefined);
          if (e.target) e.target.value = '';
        }}
      />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
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
              onRefreshItem={onRefreshItem}
              onUploadClick={handleUploadClick}
              onUpdateSlideLabel={onUpdateSlideLabel}
              onUpdateItemTitle={onUpdateItemTitle}
              onReorderSlides={onReorderSlides}
              isExpanded={expandedItems.has(item.id)}
              onToggleExpand={() => toggleExpand(item.id)}
              isSplitMode={isSplitMode}
              onSetSplitLeft={onSetSplitLeft}
              onSetSplitRight={onSetSplitRight}
              splitLeftSlide={splitLeftSlide}
              splitRightSlide={splitRightSlide}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default Playlist;