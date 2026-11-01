import React from 'react';
import { Award, X, Check, Lock } from 'lucide-react';
import { BADGE_DEFINITIONS, evaluateBadges } from '../lib/badges';
import type { Footprint, Trail } from '../../shared/types';

interface StampCabinetModalProps {
  isOpen: boolean;
  onClose: () => void;
  footprints: Footprint[];
  trails: Trail[];
}

export function StampCabinetModal({
  isOpen,
  onClose,
  footprints,
  trails,
}: StampCabinetModalProps): React.ReactElement | null {
  if (!isOpen) return null;

  const userBadges = evaluateBadges(footprints, trails);
  const badgeMap = new Map(userBadges.map((b) => [b.badgeId, b]));

  const unlockedCount = userBadges.filter((b) => b.unlocked).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay backdrop-blur-xs">
      <div className="w-full max-w-2xl panel p-6 rounded-2xl shadow-xl flex flex-col gap-5 relative max-h-[90vh] overflow-hidden">
        {/* Header */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-ink-soft hover:text-ink rounded-lg transition-colors"
          title="關閉"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-between pr-8">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-accent/15 text-accent rounded-xl">
              <Award className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-ink">旅行手帳印章館</h2>
              <p className="text-xs text-ink-soft">
                探索真實世界、抵達地理里程碑所收集的專屬手帳戳章
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-ink-soft">已解鎖成就</span>
            <div className="text-lg font-extrabold text-accent">
              {unlockedCount} / {BADGE_DEFINITIONS.length}
            </div>
          </div>
        </div>

        {/* Stamps Grid */}
        <div className="overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-3.5 my-1">
          {BADGE_DEFINITIONS.map((def) => {
            const status = badgeMap.get(def.id);
            const isUnlocked = Boolean(status?.unlocked);
            const progress = status ? Math.round(status.progress * 100) : 0;

            return (
              <div
                key={def.id}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col justify-between relative overflow-hidden ${
                  isUnlocked
                    ? 'bg-surface-2/60 border-accent/40 shadow-xs'
                    : 'bg-surface/40 border-line/70 opacity-75'
                }`}
              >
                {/* Vintage postal stamp scalloped look */}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 shadow-xs border ${
                      isUnlocked
                        ? 'bg-accent/15 border-accent/30'
                        : 'bg-surface-2 border-line text-ink-faint grayscale'
                    }`}
                  >
                    {def.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h3 className="text-sm font-bold text-ink truncate">{def.title}</h3>
                      {isUnlocked ? (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-moss/20 text-moss-soft">
                          <Check className="w-3 h-3" />
                          已解鎖
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface text-ink-faint border border-line">
                          <Lock className="w-2.5 h-2.5" />
                          {progress}%
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-soft mt-1 leading-relaxed line-clamp-2">
                      {def.description}
                    </p>
                  </div>
                </div>

                {!isUnlocked && (
                  <div className="w-full bg-line/60 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div
                      className="bg-accent/80 h-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-line">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-accent text-on-accent hover:bg-accent-hover transition-colors shadow-xs"
          >
            收起手帳
          </button>
        </div>
      </div>
    </div>
  );
}
