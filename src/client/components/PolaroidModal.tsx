import React, { useState } from 'react';
import { X, Trash2, MapPin, Calendar, Star, Users } from 'lucide-react';
import type { Footprint } from '../../shared/types';

export interface PolaroidModalProps {
  footprint: Footprint;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export function PolaroidModal({
  footprint,
  onClose,
  onDelete,
}: PolaroidModalProps): React.ReactElement {
  const [photoIndex, setPhotoIndex] = useState(0);
  const currentPhoto = footprint.photos[photoIndex] ?? null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-[#faf6f0] text-slate-900 rounded-sm p-4 pb-7 shadow-2xl border border-stone-200 transform rotate-[-0.5deg] transition"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Controls */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-stone-500">
            <MapPin className="w-3.5 h-3.5 text-amber-600" />
            <span>
              {[footprint.cityName, footprint.countryName || footprint.countryCode]
                .filter(Boolean)
                .join(' · ') || `${footprint.coordinates.lat.toFixed(3)}, ${footprint.coordinates.lng.toFixed(3)}`}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="刪除足跡"
              onClick={() => onDelete(footprint.id)}
              className="p-1.5 rounded-full text-stone-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="關閉卡片"
              onClick={onClose}
              className="p-1.5 rounded-full text-stone-500 hover:text-stone-900 hover:bg-stone-200/60 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Polaroid Photo Area */}
        <div className="relative aspect-[4/3] w-full bg-stone-900 rounded-xs overflow-hidden shadow-inner mb-4 flex items-center justify-center">
          {currentPhoto ? (
            <img
              src={currentPhoto.url}
              alt={footprint.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-stone-400 p-6 text-center">
              <MapPin className="w-10 h-10 text-amber-400 mb-2 opacity-80" />
              <span className="text-sm font-medium text-stone-300">{footprint.title}</span>
              <span className="text-xs text-stone-500 mt-1">已解鎖地標回憶</span>
            </div>
          )}

          {/* Weather Stamp Overlay */}
          {footprint.weather && (
            <div className="absolute top-3 right-3 bg-black/65 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 shadow">
              <span>{footprint.weather.icon}</span>
              <span>{footprint.weather.tempC}°C</span>
              <span className="opacity-80">{footprint.weather.conditionText}</span>
            </div>
          )}

          {/* Photo Carousel Dots */}
          {footprint.photos.length > 1 && (
            <div className="absolute bottom-2.5 inset-x-0 flex justify-center gap-1.5">
              {footprint.photos.map((p, idx) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPhotoIndex(idx)}
                  className={`w-2 h-2 rounded-full transition ${
                    idx === photoIndex ? 'bg-amber-400 scale-125' : 'bg-white/60'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Polaroid Caption & Story Area */}
        <div className="px-2 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-xl font-bold text-stone-900 tracking-tight">
              {footprint.title}
            </h3>
            {footprint.rating !== null && (
              <div className="flex items-center gap-0.5 text-amber-500 shrink-0">
                {Array.from({ length: footprint.rating }).map((_, idx) => (
                  <Star key={idx} className="w-4 h-4 fill-amber-400 text-amber-500" />
                ))}
              </div>
            )}
          </div>

          {footprint.note && (
            <p className="text-stone-700 text-sm leading-relaxed whitespace-pre-wrap italic bg-stone-100/80 p-3 rounded border-l-2 border-amber-500">
              {footprint.note}
            </p>
          )}

          {/* Date & Companions Footer */}
          <div className="pt-2 border-t border-stone-200/80 flex items-center justify-between flex-wrap gap-2 text-xs text-stone-500">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-stone-400" />
              <span>{footprint.visitedAt.slice(0, 10)}</span>
            </div>

            {footprint.companions.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <Users className="w-3.5 h-3.5 text-stone-400" />
                {footprint.companions.map((c) => (
                  <span
                    key={c.id}
                    className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-medium"
                  >
                    {c.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
