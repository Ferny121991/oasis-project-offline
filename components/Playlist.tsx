import React, { useState } from 'react';
import { PresentationItem, Slide } from '../types';
import { Music, BookOpen, Trash2, X, Edit2, Check, Monitor, RefreshCw, Upload } from 'lucide-react';

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
}

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
  onUpdateItemTitle
}) => {
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [tempLabel, setTempLabel] = useState('');
  const [tempTitle, setTempTitle] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [activeUploadItemId, setActiveUploadItemId] = useState<string | undefined>();

  const startEditingSlide = (e: React.MouseEvent, slide: Slide) => {
    e.stopPropagation();
    setEditingSlideId(slide.id);
    setTempLabel(slide.label || '');
  };

  const startEditingItem = (e: React.MouseEvent, item: PresentationItem) => {
    e.stopPropagation();
    setEditingItemId(item.id);
    setTempTitle(item.title);
  };

  const saveLabel = (itemId: string, slideId: string) => {
    onUpdateSlideLabel(itemId, slideId, tempLabel);
    setEditingSlideId(null);
  };

  const saveTitle = (itemId: string) => {
    onUpdateItemTitle(itemId, tempTitle);
    setEditingItemId(null);
  };

  const cancelEditing = () => {
    setEditingSlideId(null);
    setEditingItemId(null);
    setTempLabel('');
    setTempTitle('');
  };

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
    <div className="flex-1 h-full overflow-y-auto p-6 space-y-10 pb-40 bg-gray-950/20 scroll-smooth">
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
      {items.map((item) => (
        <div key={item.id} className="bg-gray-800/40 rounded-2xl border border-gray-700/50 overflow-hidden shadow-2xl hover:border-indigo-500/30 transition-all duration-300">
          {/* Item Header */}
          <div className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex justify-between items-center z-10">
            <div className="flex items-center gap-2 text-indigo-400 flex-1 min-w-0">
              {item.type === 'song' ? <Music size={16} className="shrink-0" /> : <BookOpen size={16} className="shrink-0" />}
              {editingItemId === item.id ? (
                <div className="flex items-center gap-2 flex-1 min-w-0 bg-gray-900 rounded px-2 py-1 border border-indigo-500">
                  <input
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveTitle(item.id);
                      if (e.key === 'Escape') cancelEditing();
                    }}
                    className="flex-1 bg-transparent text-white text-sm outline-none"
                    autoFocus
                  />
                  <div className="flex gap-1">
                    <button onClick={() => saveTitle(item.id)} className="text-green-500 hover:text-green-400"><Check size={14} /></button>
                    <button onClick={cancelEditing} className="text-red-500 hover:text-red-400"><X size={14} /></button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 truncate group/header cursor-pointer" onClick={(e) => startEditingItem(e, item)}>
                  <h3 className="font-bold text-white truncate">{item.title}</h3>
                  <Edit2 size={12} className="text-gray-500 opacity-0 group-hover/header:opacity-100 transition-opacity" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={() => {
                  setActiveUploadItemId(item.id);
                  fileInputRef.current?.click();
                }}
                className="text-gray-500 hover:text-indigo-400 transition-colors p-1"
                title="Subir imágenes a este elemento"
              >
                <Upload size={14} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onRefreshItem(item); }}
                className="text-gray-500 hover:text-indigo-400 transition-colors p-1"
                title="Actualizar / Regenerar contenido"
              >
                <RefreshCw size={14} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onSlideDoubleClick(item.id, 0); }}
                className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded transition-all ${liveItemId === item.id ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-700 text-gray-300 hover:bg-indigo-600 hover:text-white'}`}
                title="Poner esta sección en vivo"
              >
                <Monitor size={12} /> {liveItemId === item.id ? 'LIVE' : 'EN VIVO'}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id); }}
                className="text-gray-500 hover:text-red-400 transition-colors p-1"
                title="Eliminar elemento"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {/* Slides Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-4">
            {item.slides.map((slide, index) => {
              const isActive = activeItemId === item.id && activeSlideIndex === index;
              const isEditing = editingSlideId === slide.id;

              return (
                <div
                  key={slide.id}
                  onClick={() => !isEditing && onSlideClick(item.id, index)}
                  onDoubleClick={() => !isEditing && onSlideDoubleClick(item.id, index)}
                  className={`relative group text-left rounded-lg p-3 h-24 flex flex-col justify-between transition-all duration-200 border-2 cursor-pointer ${activeItemId === item.id && activeSlideIndex === index
                    ? 'bg-indigo-900/30 border-indigo-500 ring-2 ring-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                    : liveItemId === item.id && liveSlideIndex === index
                      ? 'bg-red-900/20 border-red-500/50'
                      : 'bg-gray-900 border-gray-700 hover:border-gray-500'
                    }`}
                >
                  {/* Label or Edit Input */}
                  <div className="absolute top-1 right-1 z-20 w-full flex justify-end">
                    {isEditing ? (
                      <div className="flex items-center gap-1 bg-gray-950 p-1 rounded border border-indigo-500 shadow-lg" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={tempLabel}
                          onChange={(e) => setTempLabel(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveLabel(item.id, slide.id);
                            if (e.key === 'Escape') cancelEditing();
                          }}
                          className="w-20 bg-transparent text-[10px] text-white outline-none"
                          autoFocus
                        />
                        <button onClick={() => saveLabel(item.id, slide.id)} className="text-green-500 hover:text-green-400"><Check size={10} /></button>
                        <button onClick={cancelEditing} className="text-red-500 hover:text-red-400"><X size={10} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        {liveItemId === item.id && liveSlideIndex === index && (
                          <span className="bg-red-600 text-white text-[8px] px-1 rounded-sm font-black mr-1 animate-pulse">LIVE</span>
                        )}
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                          {slide.label || `#${index + 1}`}
                        </div>
                        <button
                          onClick={(e) => startEditingSlide(e, slide)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-indigo-400"
                          title="Editar etiqueta"
                        >
                          <Edit2 size={10} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Delete Slide Button - Absolute Bottom Right Overlay */}
                  {!isEditing && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSlide(item.id, slide.id);
                      }}
                      className="absolute bottom-1 right-1 z-30 p-1.5 rounded-lg text-white bg-red-600/80 hover:bg-red-500 shadow-lg opacity-0 group-hover:opacity-100 transition-all active:scale-95"
                      title="Eliminar diapositiva"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}

                  {/* Slide Content Preview */}
                  <div className={`text-[11px] leading-tight line-clamp-3 mt-4 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}`}>
                    {slide.type === 'youtube' ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-red-400 font-bold italic">
                          <Monitor size={12} /> VIDEO YOUTUBE
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (slide.videoId) onToggleBackgroundAudio?.(slide.videoId, item.title);
                          }}
                          className="bg-gray-800 hover:bg-red-900/40 text-[9px] py-1 px-2 rounded border border-gray-700 hover:border-red-500/50 transition-all flex items-center gap-1 w-fit"
                        >
                          <Music size={10} /> FONDO PERSISTENTE
                        </button>
                      </div>
                    ) : slide.type === 'image' && slide.mediaUrl ? (
                      <div className="absolute inset-0 top-6 flex items-center justify-center bg-black/40 rounded-b-lg overflow-hidden border-t border-white/5 group-hover:bg-black/20 transition-all">
                        <img src={slide.mediaUrl} alt="" className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-all duration-300" />
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent opacity-60"></div>
                        <div className="absolute inset-0 flex items-end p-2 pointer-events-none">
                          <span className="text-[8px] font-black text-white uppercase tracking-widest drop-shadow-md truncate w-full">{slide.label || 'Imagen'}</span>
                        </div>
                      </div>
                    ) : slide.content}
                  </div>

                  {isActive && (
                    <div className="absolute inset-0 rounded-lg border-2 border-indigo-500 pointer-events-none animate-pulse"></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Playlist;