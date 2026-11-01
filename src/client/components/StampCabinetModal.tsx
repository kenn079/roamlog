import React, { useState } from 'react';
import {
  Award,
  X,
  Check,
  Lock,
  Compass,
  Footprints,
  Map as MapIcon,
  Building2,
  Globe,
  Plane,
  Globe2,
  CloudFog,
  Bike,
  Milestone,
  Train,
  Timer,
  Waves,
  Trees,
  Mountain,
  Navigation,
  Sun,
  Flame,
  Snowflake,
  Anchor,
  Camera,
  Sparkles,
  Moon,
  Flower2,
  Route,
  BookOpen,
} from 'lucide-react';
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

const CATEGORY_TABS: { id: CategoryTab; label: string; icon: React.ReactNode }[] = [
  { id: 'all', label: '全部戳章', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: 'footprint', label: '足跡探索', icon: <Compass className="w-3.5 h-3.5" /> },
  { id: 'distance', label: '軌跡里程', icon: <Route className="w-3.5 h-3.5" /> },
  { id: 'elevation', label: '高山自然', icon: <Mountain className="w-3.5 h-3.5" /> },
  { id: 'geography', label: '極境地理', icon: <Globe2 className="w-3.5 h-3.5" /> },
  { id: 'journal', label: '手帳時光', icon: <BookOpen className="w-3.5 h-3.5" /> },
];

/**
 * Returns a cohesive Lucide icon consistent with RoamLog's warm journal design
 */
function getStampIcon(iconKey: string, className = 'w-5 h-5') {
  switch (iconKey) {
    case 'compass':
      return <Compass className={className} />;
    case 'footprints':
      return <Footprints className={className} />;
    case 'map':
      return <MapIcon className={className} />;
    case 'building':
      return <Building2 className={className} />;
    case 'globe':
      return <Globe className={className} />;
    case 'plane':
      return <Plane className={className} />;
    case 'globe-2':
      return <Globe2 className={className} />;
    case 'cloud-fog':
      return <CloudFog className={className} />;
    case 'bike':
      return <Bike className={className} />;
    case 'milestone':
      return <Milestone className={className} />;
    case 'train':
      return <Train className={className} />;
    case 'timer':
      return <Timer className={className} />;
    case 'waves':
      return <Waves className={className} />;
    case 'trees':
      return <Trees className={className} />;
    case 'mountain':
      return <Mountain className={className} />;
    case 'navigation':
      return <Navigation className={className} />;
    case 'sun':
      return <Sun className={className} />;
    case 'flame':
      return <Flame className={className} />;
    case 'snowflake':
      return <Snowflake className={className} />;
    case 'anchor':
      return <Anchor className={className} />;
    case 'camera':
      return <Camera className={className} />;
    case 'sparkles':
      return <Sparkles className={className} />;
    case 'moon':
      return <Moon className={className} />;
    case 'flower':
      return <Flower2 className={className} />;
    default:
      return <Award className={className} />;
  }
}

/**
 * Renders an authentic vintage expedition passport stamp seal
 */
function StampSeal({
  iconKey,
  isUnlocked,
  badgeId,
}: {
  iconKey: string;
  isUnlocked: boolean;
  badgeId: string;
}): React.ReactElement {
  // Deterministic subtle tilt for rubber-stamp tactile feel: -3deg to +3deg
  const hash = badgeId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const rotation = isUnlocked ? ((hash % 7) - 3) * 1.2 : 0;

  return (
    <div
      className={`relative w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform ${
        isUnlocked
          ? 'bg-accent/12 border-2 border-dashed border-accent/60 shadow-xs'
          : 'bg-surface-2/60 border-2 border-dashed border-line/80'
      }`}
      style={{
        transform: isUnlocked ? `rotate(${rotation}deg)` : 'none',
      }}
    >
      {/* Concentric inner seal ring */}
      <div
        className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center border ${
          isUnlocked
            ? 'border-accent/40 text-accent bg-accent/5'
            : 'border-line/60 text-ink-faint/50'
        }`}
      >
        {getStampIcon(
          iconKey,
          isUnlocked ? 'w-5 h-5 stroke-[2.2]' : 'w-5 h-5 stroke-[1.8]'
        )}
      </div>

      {/* Tiny vintage postal corner stamp mark */}
      {isUnlocked && (
        <span className="absolute -top-1 -right-1 text-[8px] font-black text-accent select-none pointer-events-none">
          ★
        </span>
      )}
    </div>
  );
}

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
                探索真實世界、抵達地理里程碑所收集的 24 款專屬手帳鋼印戳章
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
            const unlockedDate = status?.unlockedAt
              ? new Date(status.unlockedAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                })
              : null;

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
                  <StampSeal
                    iconKey={def.icon}
                    isUnlocked={isUnlocked}
                    badgeId={def.id}
                  />

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

                    {isUnlocked && unlockedDate && (
                      <div className="mt-1.5 font-mono text-[10px] text-accent/80 flex items-center gap-1">
                        <span>★ 點亮於 {unlockedDate}</span>
                      </div>
                    )}
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
          <span>印章鋼印風格與旅行手帳畫布保持一致。</span>
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
