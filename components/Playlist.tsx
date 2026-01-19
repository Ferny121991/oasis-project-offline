import React, { useState } from 'react';
import { PresentationItem, Slide } from '../types';
import { Music, BookOpen, Trash2, X, Edit2, Check, Monitor, RefreshCw, Upload, GripVertical, ChevronDown, ChevronRight, Minus, Plus, SeparatorHorizontal, Palette } from 'lucide-react';
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
  onAddDivider: (title: string, color?: string, icon?: string) => void;
  onUpdateDivider?: (itemId: string, title: string, color?: string, icon?: string) => void;
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
  onUpdateLabel?: () => void;
}

const SortableSlide: React.FC<SortableSlideProps> = ({
  slide,
  index,
  isActive,
  isLive,
  onSlideClick,
  onSlideDoubleClick,
  onDeleteSlide,
  onToggleBackgroundAudio,
  isSplitMode,
  onSetSplitLeft,
  onSetSplitRight,
  isLeftSplit,
  isRightSplit,
  onUpdateLabel
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

      {/* Bottom Action Buttons */}
      {!isSplitMode && (
        <div className="absolute bottom-1.5 right-1.5 z-30 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
          {/* Background Audio Button for YouTube */}
          {slide.type === 'youtube' && onToggleBackgroundAudio && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleBackgroundAudio();
              }}
              className="p-1.5 rounded bg-green-600/80 hover:bg-green-500 text-white transition-all"
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
              className="p-1.5 rounded text-white bg-blue-600/80 hover:bg-blue-500 transition-all active:scale-95 shadow-lg shadow-blue-500/20"
              title="Editar nombre"
            >
              <Edit2 size={12} />
            </button>
          )}
          {/* Delete Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteSlide();
            }}
            className="p-1.5 rounded text-white bg-red-600/80 hover:bg-red-500 transition-all"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}

      {/* Content Preview */}
      <div className={`text-[10px] leading-tight line-clamp-3 mt-5 ${isActive ? 'text-white' : 'text-gray-400'}`}>
        {slide.type === 'youtube' ? (
          <div className="flex flex-col items-center justify-center gap-1 text-red-400 font-bold h-full">
            <Monitor size={16} />
            <span className="text-[9px]">VIDEO</span>
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
  onUpdateSlideLabel,
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
            <SortableContext items={item.slides.map(s => s.id)} strategy={rectSortingStrategy}>
              <div className="flex flex-wrap gap-2.5">
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
                    onUpdateLabel={() => onUpdateSlideLabel(item.id, slide.id, slide.label || "")}
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
}

const SortableDividerItem: React.FC<SortableDividerItemProps> = ({
  item,
  onDelete,
  onEdit,
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
        className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
        style={{
          backgroundColor: `${color}15`,
          borderLeft: `4px solid ${color}`,
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

        {/* Icon & Title */}
        <span className="text-xl">{icon}</span>
        <span
          className="font-bold text-sm tracking-wide flex-1"
          style={{ color: color }}
        >
          {item.title}
        </span>

        {/* Divider Line */}
        <div
          className="flex-1 h-[2px] rounded-full opacity-30"
          style={{ backgroundColor: color }}
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
  onRefreshItem,
  onUploadImages,
  onUpdateSlideLabel,
  onUpdateItemTitle,
  onReorderItems,
  onReorderSlides,
  onAddDivider,
  onUpdateDivider,
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
          {items.map((item) => (
            item.type === 'divider' ? (
              // Divider Item Rendering
              <SortableDividerItem
                key={item.id}
                item={item}
                onDelete={() => onDeleteItem(item.id)}
                onEdit={() => openEditDivider(item)}
              />
            ) : (
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
              />
            )
          ))}
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
              <div className="space-y-2">
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
                  className="w-full bg-gray-800 text-white px-4 py-3 rounded-xl border-2 border-transparent focus:border-indigo-500 focus:bg-gray-950 transition-all outline-none text-lg font-medium"
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
                      className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${dividerIcon === icon
                        ? 'bg-indigo-600 ring-2 ring-indigo-400 scale-110'
                        : 'bg-gray-800 hover:bg-gray-700'
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
                  className="p-4 rounded-xl flex items-center gap-3"
                  style={{ backgroundColor: `${dividerColor}20`, borderLeft: `4px solid ${dividerColor}` }}
                >
                  <span className="text-2xl">{dividerIcon}</span>
                  <span className="font-bold text-white text-lg">{dividerTitle || 'Nombre de la sección'}</span>
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
                  className="flex-1 px-4 py-3 rounded-xl text-white font-bold transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: dividerColor }}
                >
                  <Check size={18} />
                  {editingDividerId ? 'GUARDAR' : 'CREAR'}
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