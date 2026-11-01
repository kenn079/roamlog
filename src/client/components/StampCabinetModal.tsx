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
  ShieldCheck,
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

export type BadgeTier = 'gold' | 'silver' | 'bronze';

export function getBadgeTier(badgeId: string): BadgeTier {
  switch (badgeId) {
    // Legendary Grand Master (Gold)
    case 'b-world-citizen':
    case 'b-island-rider':
    case 'b-cloud-walker':
    case 'b-five-thousand-km':
    case 'b-footprint-50':
    case 'b-marathon':
      return 'gold';

    // Veteran Explorer (Silver)
    case 'b-continents':
    case 'b-thousand-km':
    case 'b-polar-circle':
    case 'b-equator-crosser':
    case 'b-tropic-cancer':
    case 'b-four-seasons':
    case 'b-cities-5':
    case 'b-countries-5':
      return 'silver';

    // Pioneer Classic (Bronze)
    default:
      return 'bronze';
  }
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
function getStampIcon(iconKey: string, className = 'w-6 h-6') {
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
 * Generate a 16-lobe rosette path for the medal rim
 */
function generateRosettePath(cx = 36, cy = 36, rOuter = 33, rInner = 29.5, lobes = 16): string {
  const points: string[] = [];
  for (let i = 0; i < lobes * 2; i++) {
    const angle = (i * Math.PI) / lobes - Math.PI / 2;
    const r = i % 2 === 0 ? rOuter : rInner;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  points.push('Z');
  return points.join(' ');
}

const ROSETTE_PATH = generateRosettePath(36, 36, 33, 29.5, 16);

/**
 * Renders an ornate vintage expedition medallion / postal cachet seal
 */
function OrnateStampMedal({
  iconKey,
  isUnlocked,
  badgeId,
  tier,
}: {
  iconKey: string;
  isUnlocked: boolean;
  badgeId: string;
  tier: BadgeTier;
}): React.ReactElement {
  // Deterministic subtle tilt for rubber-stamp tactile feel: -2.5deg to +2.5deg
  const hash = badgeId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const rotation = isUnlocked ? ((hash % 5) - 2) * 1.2 : 0;

  // Tier color styling
  const tierColors = {
    gold: {
      rimStroke: '#f59e0b',
      rimFill: 'var(--medal-gold-rim, rgba(254, 243, 199, 0.9))',
      coreFill: 'var(--medal-gold-core, rgba(253, 230, 138, 0.95))',
      iconText: 'text-amber-600 dark:text-amber-300',
      wreathColor: '#d97706',
      stars: 3,
      shadow: '0 4px 16px -2px rgba(245, 158, 11, 0.35)',
    },
    silver: {
      rimStroke: '#94a3b8',
      rimFill: 'var(--medal-silver-rim, rgba(241, 245, 249, 0.9))',
      coreFill: 'var(--medal-silver-core, rgba(226, 232, 240, 0.95))',
      iconText: 'text-slate-600 dark:text-slate-200',
      wreathColor: '#64748b',
      stars: 2,
      shadow: '0 4px 14px -2px rgba(148, 163, 184, 0.28)',
    },
    bronze: {
      rimStroke: '#ea580c',
      rimFill: 'var(--medal-bronze-rim, rgba(255, 237, 213, 0.9))',
      coreFill: 'var(--medal-bronze-core, rgba(254, 215, 170, 0.95))',
      iconText: 'text-orange-600 dark:text-orange-300',
      wreathColor: '#c2410c',
      stars: 1,
      shadow: '0 4px 14px -2px rgba(234, 88, 12, 0.25)',
    },
  }[tier];

  return (
    <div
      className="relative w-16 h-16 sm:w-18 sm:h-18 shrink-0 flex items-center justify-center transition-transform select-none"
      style={{
        transform: isUnlocked ? `rotate(${rotation}deg)` : 'none',
        filter: isUnlocked ? `drop-shadow(${tierColors.shadow})` : undefined,
      }}
    >
      {/* ── Vector Medallion Frame ── */}
      <svg
        viewBox="0 0 72 72"
        className="absolute inset-0 w-full h-full"
        aria-hidden="true"
      >
        {isUnlocked ? (
          <>
            {/* 1. Outer 16-Lobe Scalloped Rosette */}
            <path
              d={ROSETTE_PATH}
              fill={tierColors.rimFill}
              stroke={tierColors.rimStroke}
              strokeWidth="1.8"
              strokeLinejoin="round"
            />

            {/* 2. Concentric Beaded Mint Coin Ring */}
            <circle
              cx="36"
              cy="36"
              r="27.5"
              fill="none"
              stroke={tierColors.rimStroke}
              strokeWidth="1.2"
              strokeDasharray="1.5 2.5"
              opacity="0.85"
            />

            {/* 3. Core Medal Center Disc */}
            <circle
              cx="36"
              cy="36"
              r="24"
              fill={tierColors.coreFill}
              stroke={tierColors.rimStroke}
              strokeWidth="1.4"
            />

            {/* 4. Ornate Laurel Wreath flanking bottom curve */}
            <path
              d="M 18 46 C 22 55, 29 58, 36 58 C 43 58, 50 55, 54 46"
              fill="none"
              stroke={tierColors.wreathColor}
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.9"
            />
            {/* Laurel leaves left */}
            <path
              d="M 23 50 C 21 48, 20 45, 22 44 C 24 45, 25 48, 23 50 Z"
              fill={tierColors.wreathColor}
              opacity="0.85"
            />
            <path
              d="M 29 55 C 27 53, 27 50, 29 49 C 31 50, 31 53, 29 55 Z"
              fill={tierColors.wreathColor}
              opacity="0.85"
            />
            {/* Laurel leaves right */}
            <path
              d="M 49 50 C 51 48, 52 45, 50 44 C 48 45, 47 48, 49 50 Z"
              fill={tierColors.wreathColor}
              opacity="0.85"
            />
            <path
              d="M 43 55 C 45 53, 45 50, 43 49 C 41 50, 41 53, 43 55 Z"
              fill={tierColors.wreathColor}
              opacity="0.85"
            />

            {/* 5. Top Star Crest */}
            <text
              x="36"
              y="17"
              textAnchor="middle"
              fontSize="7.5"
              fontWeight="900"
              fill={tierColors.wreathColor}
            >
              ★
            </text>
            {tierColors.stars >= 2 && (
              <>
                <text
                  x="29"
                  y="18.5"
                  textAnchor="middle"
                  fontSize="5.5"
                  fontWeight="bold"
                  fill={tierColors.wreathColor}
                  opacity="0.85"
                >
                  ★
                </text>
                <text
                  x="43"
                  y="18.5"
                  textAnchor="middle"
                  fontSize="5.5"
                  fontWeight="bold"
                  fill={tierColors.wreathColor}
                  opacity="0.85"
                >
                  ★
                </text>
              </>
            )}
          </>
        ) : (
          /* ── Locked Architectural Blueprint State ── */
          <>
            <circle
              cx="36"
              cy="36"
              r="31"
              fill="none"
              stroke="currentColor"
              className="text-line/90"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
            <circle
              cx="36"
              cy="36"
              r="25"
              fill="none"
              stroke="currentColor"
              className="text-line/70"
              strokeWidth="1"
            />
            {/* Compass crosshair lines */}
            <line x1="36" y1="7" x2="36" y2="15" stroke="currentColor" className="text-line" strokeWidth="1" />
            <line x1="36" y1="57" x2="36" y2="65" stroke="currentColor" className="text-line" strokeWidth="1" />
            <line x1="7" y1="36" x2="15" y2="36" stroke="currentColor" className="text-line" strokeWidth="1" />
            <line x1="57" y1="36" x2="65" y2="36" stroke="currentColor" className="text-line" strokeWidth="1" />
          </>
        )}
      </svg>

      {/* ── Central Icon ── */}
      <div
        className={`relative z-10 flex items-center justify-center ${
          isUnlocked
            ? `${tierColors.iconText} drop-shadow-xs scale-105`
            : 'text-ink-faint/40'
        }`}
      >
        {getStampIcon(
          iconKey,
          isUnlocked ? 'w-5.5 h-5.5 sm:w-6 sm:h-6 stroke-[2.2]' : 'w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[1.6]'
        )}
      </div>

      {/* ── Locked Lock Badge ── */}
      {!isUnlocked && (
        <div className="absolute -bottom-1 -right-1 z-20 w-5 h-5 rounded-full bg-surface border border-line flex items-center justify-center text-ink-faint shadow-xs">
          <Lock className="w-2.5 h-2.5" />
        </div>
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
              <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                旅行手帳印章館
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-accent/15 text-accent border border-accent/30 hidden sm:inline-block">
                  EXPEDITION MEDALS
                </span>
              </h2>
              <p className="text-xs text-ink-soft">
                探索真實世界、抵達地理里程碑所收集的 24 款華麗手帳鋼印勳章
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
          {filteredBadges.map((def, idx) => {
            const status = badgeMap.get(def.id);
            const isUnlocked = Boolean(status?.unlocked);
            const progress = status ? Math.round(status.progress * 100) : 0;
            const tier = getBadgeTier(def.id);
            const unlockedDate = status?.unlockedAt
              ? new Date(status.unlockedAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                })
              : null;

            const tierMeta = {
              gold: {
                label: '傳奇金章',
                cardBorder: isUnlocked
                  ? 'border-amber-400/60 dark:border-amber-500/50 bg-gradient-to-br from-amber-500/5 via-surface to-yellow-500/5'
                  : 'border-line/70 bg-surface/50',
                badgeBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400/30',
              },
              silver: {
                label: '榮譽銀章',
                cardBorder: isUnlocked
                  ? 'border-slate-300/80 dark:border-slate-500/50 bg-gradient-to-br from-slate-400/5 via-surface to-slate-200/5'
                  : 'border-line/70 bg-surface/50',
                badgeBg: 'bg-slate-400/15 text-slate-700 dark:text-slate-200 border-slate-300/40',
              },
              bronze: {
                label: '行者銅章',
                cardBorder: isUnlocked
                  ? 'border-orange-400/50 dark:border-orange-500/40 bg-gradient-to-br from-orange-500/5 via-surface to-amber-500/5'
                  : 'border-line/70 bg-surface/50',
                badgeBg: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-400/30',
              },
            }[tier];

            return (
              <div
                key={def.id}
                className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all flex flex-col justify-between relative overflow-hidden ${
                  tierMeta.cardBorder
                } ${isUnlocked ? 'shadow-xs hover:scale-[1.01]' : 'opacity-85'}`}
              >
                {/* Top Certificate Header Line */}
                <div className="flex items-center justify-between text-[10px] font-mono mb-2 text-ink-faint">
                  <span>MEDAL-NO. {String(idx + 1).padStart(2, '0')}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold border text-[9px] flex items-center gap-1 ${
                      isUnlocked
                        ? tierMeta.badgeBg
                        : 'bg-surface-2 text-ink-faint border-line'
                    }`}
                  >
                    {isUnlocked && <Sparkles className="w-2.5 h-2.5" />}
                    {tierMeta.label}
                  </span>
                </div>

                {/* Main Body */}
                <div className="flex items-center gap-3.5">
                  <OrnateStampMedal
                    iconKey={def.icon}
                    isUnlocked={isUnlocked}
                    badgeId={def.id}
                    tier={tier}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h3 className="text-sm font-extrabold text-ink truncate flex items-center gap-1.5">
                        {def.title}
                      </h3>
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
                      <div className="mt-2 font-mono text-[10px] text-accent font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        <span>認證於 {unlockedDate} 授印</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Bar for Locked */}
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
          <span>金、銀、銅三階探險鋼印勳章，記錄真實世界的壯遊旅程。</span>
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
