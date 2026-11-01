import React, { useState } from 'react';
import { Award, X, Check, Lock } from 'lucide-react';
import { BADGE_DEFINITIONS, evaluateBadges } from '../lib/badges';
import type { Footprint, Trail, Wish } from '../../shared/types';

interface StampCabinetModalProps {
  isOpen: boolean;
  onClose: () => void;
  footprints: Footprint[];
  trails: Trail[];
  wishes?: Wish[];
}

type CategoryTab = 'all' | 'footprint' | 'distance' | 'elevation' | 'geography' | 'journal';

const CATEGORY_TABS: { id: CategoryTab; label: string; icon: string }[] = [
  { id: 'all', label: '全部戳章', icon: '✨' },
  { id: 'footprint', label: '足跡探索', icon: '🧭' },
  { id: 'distance', label: '軌跡里程', icon: '🛤️' },
  { id: 'elevation', label: '高山自然', icon: '⛰️' },
  { id: 'geography', label: '極境地理', icon: '🌏' },
  { id: 'journal', label: '手帳時光', icon: '📸' },
];

export function StampCabinetModal({
  isOpen,
  onClose,
  footprints,
  trails,
  wishes = [],
}: StampCabinetModalProps): React.ReactElement | null {
  const [activeTab, setActiveTab] = useState<CategoryTab>('all');

  if (!isOpen) return null;

  const userBadges = evaluateBadges(footprints, trails, wishes);
  const badgeMap = new Map(userBadges.map((b) => [b.badgeId, b]));

  const unlockedCount = userBadges.filter((b) => b.unlocked).length;

  const filteredBadges = BADGE_DEFINITIONS.filter((def) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'geography') {
      return def.category === 'geography' || def.category === 'special';
    }
    return def.category === activeTab;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-overlay backdrop-blur-xs">
      <div className="w-full max-w-3xl panel p-5 sm:p-6 rounded-2xl shadow-xl flex flex-col gap-4 relative max-h-[92vh] overflow-hidden">
        {/* Header */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-ink-soft hover:text-ink rounded-lg transition-colors cursor-pointer"
          title="關閉"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-between pr-8">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-accent/15 text-accent rounded-xl shadow-xs">
              <Award className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-ink">旅行手帳印章館</h2>
              <p className="text-xs text-ink-soft">
                探索真實世界、抵達地理里程碑所收集的 24 款專屬手帳郵戳
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

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-line text-xs font-semibold scrollbar-none">
          {CATEGORY_TABS.map((tab) => {
            const countInCat = BADGE_DEFINITIONS.filter((def) => {
              if (tab.id === 'all') return true;
              if (tab.id === 'geography') return def.category === 'geography' || def.category === 'special';
              return def.category === tab.id;
            });
            const unlockedInCat = countInCat.filter((def) => badgeMap.get(def.id)?.unlocked).length;
            const active = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 transition shrink-0 cursor-pointer ${
                  active
                    ? 'bg-accent text-on-accent shadow-xs'
                    : 'bg-surface-2 text-ink-soft hover:text-ink hover:bg-surface-2/80'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    active ? 'bg-black/15 text-white' : 'bg-line/70 text-ink-faint'
                  }`}
                >
                  {unlockedInCat}/{countInCat.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Stamps Grid */}
        <div className="overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-3.5 my-1 max-h-[58vh]">
          {filteredBadges.map((def) => {
            const status = badgeMap.get(def.id);
            const isUnlocked = Boolean(status?.unlocked);
            const progress = status ? Math.round(status.progress * 100) : 0;

            return (
              <div
                key={def.id}
                className={`p-3.5 sm:p-4 rounded-xl border-2 transition-all flex flex-col justify-between relative overflow-hidden ${
                  isUnlocked
                    ? 'bg-surface-2/60 border-accent/40 shadow-xs'
                    : 'bg-surface/40 border-line/70 opacity-80'
                }`}
              >
                {/* Vintage postal stamp scalloped look */}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 shadow-xs border ${
                      isUnlocked
                        ? 'bg-accent/15 border-accent/30 scale-105 transition-transform'
                        : 'bg-surface-2 border-line text-ink-faint grayscale'
                    }`}
                  >
                    {def.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h3 className="text-sm font-bold text-ink truncate">{def.title}</h3>
                      {isUnlocked ? (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-moss/20 text-moss-soft shrink-0">
                          <Check className="w-3 h-3" />
                          已解鎖
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface text-ink-faint border border-line shrink-0">
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
        <div className="flex justify-between items-center pt-2 border-t border-line text-xs text-ink-soft">
          <span>解鎖條件涵蓋打卡、里程、大洲、高度、海濱與極境。</span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-accent text-on-accent hover:bg-accent-hover transition-colors shadow-xs cursor-pointer"
          >
            收起手帳
          </button>
        </div>
      </div>
    </div>
  );
}
