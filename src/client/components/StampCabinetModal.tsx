import React, { useState, useEffect } from 'react';
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
  ChevronLeft,
  ChevronRight,
  Bookmark,
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

interface JournalPageMeta {
  id: CategoryTab;
  tabLabel: string;
  chapterTitle: string;
  chapterSubtitle: string;
  icon: React.ReactNode;
}

const JOURNAL_PAGES: JournalPageMeta[] = [
  {
    id: 'all',
    tabLabel: '全編',
    chapterTitle: '全境探險總覽目錄',
    chapterSubtitle: '收集於世界各地的 24 枚特製手帳探險鋼印勳章',
    icon: <Sparkles className="w-3.5 h-3.5" />,
  },
  {
    id: 'footprint',
    tabLabel: '足跡',
    chapterTitle: '第一篇章 · 足跡漫遊記',
    chapterSubtitle: '用步伐丈量城市與大洲，開啟地球壯遊',
    icon: <Compass className="w-3.5 h-3.5" />,
  },
  {
    id: 'distance',
    tabLabel: '里程',
    chapterTitle: '第二篇章 · 萬里征途志',
    chapterSubtitle: 'GPS 軌跡走廊與穿越千里的大洋破霧紀錄',
    icon: <Route className="w-3.5 h-3.5" />,
  },
  {
    id: 'elevation',
    tabLabel: '高山',
    chapterTitle: '第三篇章 · 山海自然吟',
    chapterSubtitle: '從海平面浪花到標高三千公尺雲端高峰',
    icon: <Mountain className="w-3.5 h-3.5" />,
  },
  {
    id: 'geography',
    tabLabel: '極境',
    chapterTitle: '第四篇章 · 極境地理考',
    chapterSubtitle: '探訪台灣四極、回歸線、赤道與極圈之界',
    icon: <Globe2 className="w-3.5 h-3.5" />,
  },
  {
    id: 'journal',
    tabLabel: '時光',
    chapterTitle: '第五篇章 · 手帳光影冊',
    chapterSubtitle: '珍藏旅途照片、實現心願與四季晨昏時光',
    icon: <BookOpen className="w-3.5 h-3.5" />,
  },
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
  const hash = badgeId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const rotation = isUnlocked ? ((hash % 5) - 2) * 1.2 : 0;

  const tierColors = {
    gold: {
      rimStroke: '#f59e0b',
      rimFill: 'var(--medal-gold-rim, rgba(254, 243, 199, 0.95))',
      coreFill: 'var(--medal-gold-core, rgba(253, 230, 138, 0.95))',
      iconText: 'text-amber-600 dark:text-amber-300',
      wreathColor: '#d97706',
      stars: 3,
      shadow: '0 4px 16px -2px rgba(245, 158, 11, 0.35)',
    },
    silver: {
      rimStroke: '#94a3b8',
      rimFill: 'var(--medal-silver-rim, rgba(241, 245, 249, 0.95))',
      coreFill: 'var(--medal-silver-core, rgba(226, 232, 240, 0.95))',
      iconText: 'text-slate-600 dark:text-slate-200',
      wreathColor: '#64748b',
      stars: 2,
      shadow: '0 4px 14px -2px rgba(148, 163, 184, 0.28)',
    },
    bronze: {
      rimStroke: '#ea580c',
      rimFill: 'var(--medal-bronze-rim, rgba(255, 237, 213, 0.95))',
      coreFill: 'var(--medal-bronze-core, rgba(254, 215, 170, 0.95))',
      iconText: 'text-orange-600 dark:text-orange-300',
      wreathColor: '#c2410c',
      stars: 1,
      shadow: '0 4px 14px -2px rgba(234, 88, 12, 0.25)',
    },
  }[tier];

  return (
    <div
      className="relative w-15 h-15 sm:w-17 sm:h-17 shrink-0 flex items-center justify-center transition-transform select-none"
      style={{
        transform: isUnlocked ? `rotate(${rotation}deg)` : 'none',
        filter: isUnlocked ? `drop-shadow(${tierColors.shadow})` : undefined,
      }}
    >
      <svg viewBox="0 0 72 72" className="absolute inset-0 w-full h-full" aria-hidden="true">
        {isUnlocked ? (
          <>
            <path
              d={ROSETTE_PATH}
              fill={tierColors.rimFill}
              stroke={tierColors.rimStroke}
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
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
            <circle
              cx="36"
              cy="36"
              r="24"
              fill={tierColors.coreFill}
              stroke={tierColors.rimStroke}
              strokeWidth="1.4"
            />
            <path
              d="M 18 46 C 22 55, 29 58, 36 58 C 43 58, 50 55, 54 46"
              fill="none"
              stroke={tierColors.wreathColor}
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.9"
            />
            <path d="M 23 50 C 21 48, 20 45, 22 44 C 24 45, 25 48, 23 50 Z" fill={tierColors.wreathColor} opacity="0.85" />
            <path d="M 29 55 C 27 53, 27 50, 29 49 C 31 50, 31 53, 29 55 Z" fill={tierColors.wreathColor} opacity="0.85" />
            <path d="M 49 50 C 51 48, 52 45, 50 44 C 48 45, 47 48, 49 50 Z" fill={tierColors.wreathColor} opacity="0.85" />
            <path d="M 43 55 C 45 53, 45 50, 43 49 C 41 50, 41 53, 43 55 Z" fill={tierColors.wreathColor} opacity="0.85" />
            <text x="36" y="17" textAnchor="middle" fontSize="7.5" fontWeight="900" fill={tierColors.wreathColor}>
              ★
            </text>
            {tierColors.stars >= 2 && (
              <>
                <text x="29" y="18.5" textAnchor="middle" fontSize="5.5" fontWeight="bold" fill={tierColors.wreathColor} opacity="0.85">
                  ★
                </text>
                <text x="43" y="18.5" textAnchor="middle" fontSize="5.5" fontWeight="bold" fill={tierColors.wreathColor} opacity="0.85">
                  ★
                </text>
              </>
            )}
          </>
        ) : (
          <>
            <circle cx="36" cy="36" r="31" fill="none" stroke="currentColor" className="text-line/90" strokeWidth="1.5" strokeDasharray="3 3" />
            <circle cx="36" cy="36" r="25" fill="none" stroke="currentColor" className="text-line/70" strokeWidth="1" />
            <line x1="36" y1="7" x2="36" y2="15" stroke="currentColor" className="text-line" strokeWidth="1" />
            <line x1="36" y1="57" x2="36" y2="65" stroke="currentColor" className="text-line" strokeWidth="1" />
            <line x1="7" y1="36" x2="15" y2="36" stroke="currentColor" className="text-line" strokeWidth="1" />
            <line x1="57" y1="36" x2="65" y2="36" stroke="currentColor" className="text-line" strokeWidth="1" />
          </>
        )}
      </svg>

      <div className={`relative z-10 flex items-center justify-center ${isUnlocked ? `${tierColors.iconText} drop-shadow-xs scale-105` : 'text-ink-faint/40'}`}>
        {getStampIcon(iconKey, isUnlocked ? 'w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[2.2]' : 'w-4.5 h-4.5 stroke-[1.6]')}
      </div>

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
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null);

  // Keyboard navigation for page flip & escape
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === 'ArrowRight') {
        goToPage((currentPageIndex + 1) % JOURNAL_PAGES.length, 'next');
      } else if (e.key === 'ArrowLeft') {
        goToPage((currentPageIndex - 1 + JOURNAL_PAGES.length) % JOURNAL_PAGES.length, 'prev');
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentPageIndex]);

  if (!isOpen && !isClosing) return null;

  const userBadges = evaluateBadges(footprints, trails, wishes);
  const badgeMap = new Map(userBadges.map((b) => [b.badgeId, b]));
  const unlockedCount = userBadges.filter((b) => b.unlocked).length;

  const currentPage = JOURNAL_PAGES[currentPageIndex];

  function goToPage(targetIndex: number, direction?: 'next' | 'prev') {
    if (targetIndex === currentPageIndex) return;
    const dir = direction || (targetIndex > currentPageIndex ? 'next' : 'prev');
    setFlipDirection(dir);
    setCurrentPageIndex(targetIndex);
    // Reset flip animation class after it plays
    setTimeout(() => {
      setFlipDirection(null);
    }, 400);
  }

  function handleClose() {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 320);
  }

  // Filtered badges for the current page
  const pageBadges = BADGE_DEFINITIONS.filter((def) => {
    if (currentPage.id === 'all') return true;
    if (currentPage.id === 'geography') return def.category === 'geography' || def.category === 'special';
    return def.category === currentPage.id;
  });

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-overlay/85 backdrop-blur-sm transition-opacity duration-300 ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      {/* ── Realistic Traveler's Journal Shell ── */}
      <div
        className={`relative w-full max-w-4xl flex items-center justify-center ${
          isClosing ? 'journal-put-away-anim' : 'journal-pull-out-anim'
        }`}
      >
        {/* Physical Protruding Index Tabs on the Right Side (Desktop / Tablet) */}
        <div className="hidden sm:flex flex-col gap-2 absolute -right-9 top-14 z-30">
          {JOURNAL_PAGES.map((page, idx) => {
            const countInPage = BADGE_DEFINITIONS.filter((def) => {
              if (page.id === 'all') return true;
              if (page.id === 'geography') return def.category === 'geography' || def.category === 'special';
              return def.category === page.id;
            });
            const unlockedInPage = countInPage.filter((def) => badgeMap.get(def.id)?.unlocked).length;
            const isActive = currentPageIndex === idx;

            return (
              <button
                key={page.id}
                type="button"
                onClick={() => goToPage(idx)}
                title={page.chapterTitle}
                className={`flex items-center gap-1.5 pl-2.5 pr-3 py-2 rounded-r-xl text-xs font-bold transition-all shadow-md cursor-pointer border-y border-r ${
                  isActive
                    ? 'bg-accent text-on-accent translate-x-2 border-accent-hover shadow-lg scale-105'
                    : 'bg-surface-2 text-ink-soft hover:text-ink hover:translate-x-1 border-line/80'
                }`}
              >
                <span>{page.icon}</span>
                <span className="writing-vertical tracking-wider text-[11px]">{page.tabLabel}</span>
                <span
                  className={`text-[9px] px-1 py-0.5 rounded-full font-mono ${
                    isActive ? 'bg-black/20 text-white' : 'bg-surface text-ink-faint'
                  }`}
                >
                  {unlockedInPage}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Physical Leather / Hardcover Outer Jacket ── */}
        <div className="w-full rounded-2xl sm:rounded-3xl p-2 sm:p-3.5 bg-[#2b1d14] dark:bg-[#090e1a] shadow-2xl border-2 border-amber-900/40 dark:border-amber-500/20 relative overflow-visible">
          {/* Decorative Brass Corner Protectors */}
          <div className="absolute top-1.5 left-1.5 w-6 h-6 border-t-2 border-l-2 border-amber-500/80 rounded-tl-md pointer-events-none" />
          <div className="absolute top-1.5 right-1.5 w-6 h-6 border-t-2 border-r-2 border-amber-500/80 rounded-tr-md pointer-events-none" />
          <div className="absolute bottom-1.5 left-1.5 w-6 h-6 border-b-2 border-l-2 border-amber-500/80 rounded-bl-md pointer-events-none" />
          <div className="absolute bottom-1.5 right-1.5 w-6 h-6 border-b-2 border-r-2 border-amber-500/80 rounded-br-md pointer-events-none" />

          {/* Hanging Crimson Silk Bookmark Ribbon */}
          <div className="absolute -top-3 left-12 sm:left-20 w-4 h-9 bg-rose-700 dark:bg-rose-800 rounded-b-xs shadow-md border-x border-rose-900/30 flex items-end justify-center pb-0.5 pointer-events-none z-40">
            <Bookmark className="w-2.5 h-2.5 text-white/80" />
          </div>

          {/* ── Inner Paper Booklet ── */}
          <div className="w-full rounded-xl sm:rounded-2xl bg-canvas text-ink journal-paper-stack border border-line flex flex-col relative overflow-hidden max-h-[88vh] sm:max-h-[85vh]">
            {/* Left Binding Spine Margin & Stitches */}
            <div className="absolute top-0 bottom-0 left-0 w-3.5 sm:w-5 bg-black/5 dark:bg-black/25 border-r border-line/80 flex flex-col justify-around items-center py-4 z-20 pointer-events-none">
              <span className="w-1.5 h-1.5 rounded-full bg-line/80" />
              <span className="w-1.5 h-1.5 rounded-full bg-line/80" />
              <span className="w-1.5 h-1.5 rounded-full bg-line/80" />
              <span className="w-1.5 h-1.5 rounded-full bg-line/80" />
            </div>

            {/* Top Navigation & Journal Header */}
            <div className="pl-6 sm:pl-9 pr-4 sm:pr-6 pt-3.5 pb-2.5 border-b border-line bg-canvas/90 backdrop-blur-xs flex items-center justify-between gap-3 z-10">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="p-2 bg-accent/15 text-accent rounded-xl shadow-xs shrink-0">
                  <Award className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-extrabold text-ink truncate">
                      旅行手帳印章館
                    </h2>
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-mono font-bold bg-accent/15 text-accent border border-accent/30 hidden md:inline-block">
                      EXPEDITION LOGBOOK
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-soft truncate font-mono">
                    PAGE {String(currentPageIndex + 1).padStart(2, '0')} / {String(JOURNAL_PAGES.length).padStart(2, '0')} · {currentPage.chapterTitle}
                  </p>
                </div>
              </div>

              {/* Header Right: Stats and Close */}
              <div className="flex items-center gap-3">
                <div className="text-right hidden xs:block">
                  <span className="text-[10px] text-ink-soft font-mono">已解鎖成就</span>
                  <div className="text-base font-extrabold text-accent leading-none">
                    {unlockedCount} / {BADGE_DEFINITIONS.length}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  className="p-1.5 sm:p-2 text-ink-soft hover:text-ink hover:bg-surface-2 rounded-xl transition cursor-pointer"
                  title="闔上手帳 (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Mobile Top Tabs (Visible when screen width is narrow) */}
            <div className="flex sm:hidden items-center gap-1 overflow-x-auto pl-5 pr-3 py-1.5 border-b border-line bg-surface-2/40 text-xs font-semibold scrollbar-none">
              {JOURNAL_PAGES.map((page, idx) => {
                const isActive = currentPageIndex === idx;
                return (
                  <button
                    key={page.id}
                    type="button"
                    onClick={() => goToPage(idx)}
                    className={`px-2.5 py-1 rounded-full flex items-center gap-1 transition shrink-0 cursor-pointer text-[11px] ${
                      isActive ? 'bg-accent text-on-accent font-bold shadow-xs' : 'bg-surface text-ink-soft'
                    }`}
                  >
                    <span>{page.icon}</span>
                    <span>{page.tabLabel}</span>
                  </button>
                );
              })}
            </div>

            {/* ── Flippable Journal Page Content ── */}
            <div
              className={`flex-1 overflow-y-auto pl-6 sm:pl-9 pr-3 sm:pr-6 py-4 flex flex-col gap-4 bg-journal-canvas ${
                flipDirection === 'next' ? 'page-turn-next-anim' : flipDirection === 'prev' ? 'page-turn-prev-anim' : ''
              }`}
            >
              {/* Chapter Header Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 sm:p-4 rounded-xl border border-line bg-surface/75 shadow-xs">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-ink flex items-center gap-2">
                    <span>{currentPage.icon}</span>
                    <span>{currentPage.chapterTitle}</span>
                  </h3>
                  <p className="text-xs text-ink-soft mt-0.5">
                    {currentPage.chapterSubtitle}
                  </p>
                </div>
                <div className="text-xs font-mono text-ink-faint shrink-0">
                  收錄 {pageBadges.length} 枚勳章
                </div>
              </div>

              {/* Medallions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pb-2">
                {pageBadges.map((def, idx) => {
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
                        ? 'border-amber-400/60 dark:border-amber-500/50 bg-gradient-to-br from-amber-500/8 via-surface to-yellow-500/5'
                        : 'border-line/70 bg-surface/50',
                      badgeBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400/30',
                    },
                    silver: {
                      label: '榮譽銀章',
                      cardBorder: isUnlocked
                        ? 'border-slate-300/80 dark:border-slate-500/50 bg-gradient-to-br from-slate-400/8 via-surface to-slate-200/5'
                        : 'border-line/70 bg-surface/50',
                      badgeBg: 'bg-slate-400/15 text-slate-700 dark:text-slate-200 border-slate-300/40',
                    },
                    bronze: {
                      label: '行者銅章',
                      cardBorder: isUnlocked
                        ? 'border-orange-400/50 dark:border-orange-500/40 bg-gradient-to-br from-orange-500/8 via-surface to-amber-500/5'
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
                            isUnlocked ? tierMeta.badgeBg : 'bg-surface-2 text-ink-faint border-line'
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
                            <h4 className="text-sm font-extrabold text-ink truncate">
                              {def.title}
                            </h4>
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
            </div>

            {/* ── Journal Bottom Page Turning Footer ── */}
            <div className="pl-6 sm:pl-9 pr-4 sm:pr-6 py-2.5 border-t border-line bg-canvas/95 backdrop-blur-xs flex items-center justify-between gap-3 text-xs font-semibold z-10">
              <button
                type="button"
                onClick={() => goToPage((currentPageIndex - 1 + JOURNAL_PAGES.length) % JOURNAL_PAGES.length, 'prev')}
                className="px-3 py-1.5 rounded-xl border border-line bg-surface hover:bg-surface-2 transition flex items-center gap-1 text-ink-soft hover:text-ink cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden xs:inline">上一篇章</span>
              </button>

              <div className="flex items-center gap-1.5 text-ink-soft font-mono text-xs">
                {JOURNAL_PAGES.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => goToPage(i)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      i === currentPageIndex ? 'w-6 bg-accent' : 'w-2 bg-line hover:bg-ink-faint'
                    }`}
                    title={`翻至第 ${i + 1} 篇章`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => goToPage((currentPageIndex + 1) % JOURNAL_PAGES.length, 'next')}
                  className="px-3 py-1.5 rounded-xl border border-line bg-surface hover:bg-surface-2 transition flex items-center gap-1 text-ink-soft hover:text-ink cursor-pointer"
                >
                  <span className="hidden xs:inline">下一篇章</span>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-accent text-on-accent hover:bg-accent-hover transition shadow-xs cursor-pointer ml-1"
                >
                  闔上手帳
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
