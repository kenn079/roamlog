import React from 'react';
import { X, Star, Trash2, MapPin, CheckCircle2 } from 'lucide-react';
import type { Wish } from '../../shared/types';
import { WISH_CATEGORY_LABELS } from '../../shared/types';

export interface WishCardModalProps {
  wish: Wish;
  onClose: () => void;
  onDelete: (id: string) => void;
  onFulfill: (wish: Wish) => void;
}

export function WishCardModal({
  wish,
  onClose,
  onDelete,
  onFulfill,
}: WishCardModalProps): React.ReactElement {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay backdrop-blur-sm p-4">
      <div className="w-full max-w-sm panel p-6 text-ink shadow-soft border-2 border-sun/40 bg-surface">
        {/* Header Badge */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-sun/15 text-sun text-xs font-bold">
            <Star className="w-3.5 h-3.5 fill-sun" />
            <span>想去心願 (To-Go)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost p-1.5 text-ink-faint hover:text-ink"
            aria-label="關閉"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Title & Category */}
        <div className="space-y-1.5 mb-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-xl font-bold text-ink leading-snug">{wish.title}</h3>
            <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-surface-2 border border-line text-xs font-medium text-ink-soft">
              {WISH_CATEGORY_LABELS[wish.category] || wish.category}
            </span>
          </div>

          {(wish.cityName || wish.countryName) && (
            <div className="flex items-center gap-1 text-xs text-ink-soft">
              <MapPin className="w-3.5 h-3.5 text-sun" />
              <span>
                {[wish.cityName, wish.countryName].filter(Boolean).join(' · ')}
              </span>
            </div>
          )}
        </div>

        {/* Note */}
        {wish.note ? (
          <div className="p-3.5 bg-surface-2 border border-line rounded-xl text-xs text-ink leading-relaxed mb-4 whitespace-pre-wrap">
            {wish.note}
          </div>
        ) : (
          <div className="p-3 bg-surface-2/60 border border-line/60 rounded-xl text-xs text-ink-faint italic mb-4">
            尚無備註隨筆
          </div>
        )}

        {/* Coordinates */}
        <div className="text-[11px] font-mono text-ink-faint mb-5">
          座標：{wish.coordinates.lat.toFixed(4)}, {wish.coordinates.lng.toFixed(4)}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-line">
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`確定要刪除「${wish.title}」這項心願嗎？`)) {
                onDelete(wish.id);
                onClose();
              }
            }}
            className="btn-ghost p-2 text-danger hover:bg-danger/10"
            title="刪除心願"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-soft px-3.5 py-2 text-xs"
            >
              稍後再說
            </button>
            <button
              type="button"
              onClick={() => onFulfill(wish)}
              className="btn-primary px-4 py-2 text-xs shadow-sm flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>實地踩點解鎖</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
