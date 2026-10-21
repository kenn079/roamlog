import React, { useState } from 'react';
import { X, Trash2, MapPin, Calendar, Star, Users, Tent } from 'lucide-react';
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md polaroid rounded-sm p-4 pb-7 border border-line transform rotate-[-0.5deg] transition"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Controls */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-paper-ink/70">
            <MapPin className="w-3.5 h-3.5 text-accent" />
            <span>
              {[footprint.cityName, footprint.countryName || footprint.countryCode]
                .filter(Boolean)
                .join(' · ') ||
                `${footprint.coordinates.lat.toFixed(3)}, ${footprint.coordinates.lng.toFixed(3)}`}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="刪除足跡"
              onClick={() => onDelete(footprint.id)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-danger bg-danger/10 hover:bg-danger/20 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>刪除</span>
            </button>
            <button
              type="button"
              aria-label="關閉卡片"
              onClick={onClose}
              className="p-1.5 rounded-full text-paper-ink/60 hover:text-paper-ink hover:bg-paper-ink/10 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Polaroid Photo Area */}
        <div className="relative aspect-[4/3] w-full bg-surface-2 rounded-xs overflow-hidden shadow-inner mb-4 flex items-center justify-center">
          {currentPhoto ? (
            <img
              src={currentPhoto.url}
              alt={footprint.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-ink-soft p-6 text-center">
              <Tent className="w-10 h-10 text-accent mb-2 opacity-85" />
              <span className="font-display text-sm font-medium text-ink">{footprint.title}</span>
              <span className="text-xs text-ink-faint mt-1">已解鎖地標回憶</span>
            </div>
          )}

          {/* Weather Stamp Overlay */}
          {footprint.weather && (
            <div className="absolute top-3 right-3 bg-paper/90 backdrop-blur-md text-paper-ink px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-sm">
              <span>{footprint.weather.icon}</span>
              <span>{footprint.weather.tempC}°C</span>
              <span className="opacity-75">{footprint.weather.conditionText}</span>
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
                  className={`w-2 h-2 rounded-full transition cursor-pointer ${
                    idx === photoIndex ? 'bg-accent scale-125' : 'bg-paper/70'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Polaroid Caption & Story Area */}
        <div className="px-2 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-xl font-bold text-paper-ink tracking-tight">
              {footprint.title}
            </h3>
            {footprint.rating !== null && (
              <div className="flex items-center gap-0.5 text-sun shrink-0">
                {Array.from({ length: footprint.rating }).map((_, idx) => (
                  <Star key={idx} className="w-4 h-4 fill-sun text-sun" />
                ))}
              </div>
            )}
          </div>

          {footprint.note && (
            <p className="text-paper-ink/85 text-sm leading-relaxed whitespace-pre-wrap bg-paper-ink/5 p-3 rounded-lg border-l-2 border-accent">
              {footprint.note}
            </p>
          )}

          {/* Date & Companions Footer */}
          <div className="pt-2 border-t border-paper-ink/15 flex items-center justify-between flex-wrap gap-2 text-xs text-paper-ink/70">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-paper-ink/50" />
              <span>{footprint.visitedAt.slice(0, 10)}</span>
            </div>

            {footprint.companions.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <Users className="w-3.5 h-3.5 text-paper-ink/50" />
                {footprint.companions.map((c) => (
                  <span
                    key={c.id}
                    className="px-2 py-0.5 rounded-full bg-accent/15 text-paper-ink font-medium"
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
