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
  Layers,
} from 'lucide-react';
import { BADGE_DEFINITIONS, evaluateBadges } from '../lib/badges';
import type { Footprint, Trail, Wish, BadgeDefinition } from '../../shared/types';

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
    case 'b-world-citizen':
    case 'b-island-rider':
    case 'b-cloud-walker':
    case 'b-five-thousand-km':
    case 'b-footprint-50':
    case 'b-marathon':
      return 'gold';

    case 'b-continents':
    case 'b-thousand-km':
    case 'b-polar-circle':
    case 'b-equator-crosser':
    case 'b-tropic-cancer':
    case 'b-four-seasons':
    case 'b-cities-5':
    case 'b-countries-5':
      return 'silver';

    default:
      return 'bronze';
  }
}

function getStampIcon(iconKey: string, className = 'w-6 h-6') {
  switch (iconKey) {
    case 'compass': return <Compass className={className} />;
    case 'footprints': return <Footprints className={className} />;
    case 'map': return <MapIcon className={className} />;
    case 'building': return <Building2 className={className} />;
    case 'globe': return <Globe className={className} />;
    case 'plane': return <Plane className={className} />;
    case 'globe-2': return <Globe2 className={className} />;
    case 'cloud-fog': return <CloudFog className={className} />;
    case 'bike': return <Bike className={className} />;
    case 'milestone': return <Milestone className={className} />;
    case 'train': return <Train className={className} />;
    case 'timer': return <Timer className={className} />;
    case 'waves': return <Waves className={className} />;
    case 'trees': return <Trees className={className} />;
    case 'mountain': return <Mountain className={className} />;
    case 'navigation': return <Navigation className={className} />;
    case 'sun': return <Sun className={className} />;
    case 'flame': return <Flame className={className} />;
    case 'snowflake': return <Snowflake className={className} />;
    case 'anchor': return <Anchor className={className} />;
    case 'camera': return <Camera className={className} />;
    case 'sparkles': return <Sparkles className={className} />;
    case 'moon': return <Moon className={className} />;
    case 'flower': return <Flower2 className={className} />;
    default: return <Award className={className} />;
  }
}

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
      shadow: '0 4px 14px -2px rgba(245, 158, 11, 0.35)',
    },
    silver: {
      rimStroke: '#94a3b8',
      rimFill: 'var(--medal-silver-rim, rgba(241, 245, 249, 0.95))',
      coreFill: 'var(--medal-silver-core, rgba(226, 232, 240, 0.95))',
      iconText: 'text-slate-600 dark:text-slate-200',
      wreathColor: '#64748b',
      stars: 2,
      shadow: '0 4px 12px -2px rgba(148, 163, 184, 0.28)',
    },
    bronze: {
      rimStroke: '#ea580c',
      rimFill: 'var(--medal-bronze-rim, rgba(255, 237, 213, 0.95))',
      coreFill: 'var(--medal-bronze-core, rgba(254, 215, 170, 0.95))',
      iconText: 'text-orange-600 dark:text-orange-300',
      wreathColor: '#c2410c',
      stars: 1,
      shadow: '0 4px 12px -2px rgba(234, 88, 12, 0.25)',
    },
  }[tier];

  return (
    <div
      className="relative w-13 h-13 sm:w-14 sm:h-14 shrink-0 flex items-center justify-center transition-transform select-none"
      style={{
        transform: isUnlocked ? `rotate(${rotation}deg)` : 'none',
        filter: isUnlocked ? `drop-shadow(${tierColors.shadow})` : undefined,
      }}
    >
      <svg viewBox="0 0 72 72" className="absolute inset-0 w-full h-full" aria-hidden="true">
        {isUnlocked ? (
          <>
            <path d={ROSETTE_PATH} fill={tierColors.rimFill} stroke={tierColors.rimStroke} strokeWidth="1.8" strokeLinejoin="round" />
            <circle cx="36" cy="36" r="27.5" fill="none" stroke={tierColors.rimStroke} strokeWidth="1.2" strokeDasharray="1.5 2.5" opacity="0.85" />
            <circle cx="36" cy="36" r="24" fill={tierColors.coreFill} stroke={tierColors.rimStroke} strokeWidth="1.4" />
            <path d="M 18 46 C 22 55, 29 58, 36 58 C 43 58, 50 55, 54 46" fill="none" stroke={tierColors.wreathColor} strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
            <path d="M 23 50 C 21 48, 20 45, 22 44 C 24 45, 25 48, 23 50 Z" fill={tierColors.wreathColor} opacity="0.85" />
            <path d="M 29 55 C 27 53, 27 50, 29 49 C 31 50, 31 53, 29 55 Z" fill={tierColors.wreathColor} opacity="0.85" />
            <path d="M 49 50 C 51 48, 52 45, 50 44 C 48 45, 47 48, 49 50 Z" fill={tierColors.wreathColor} opacity="0.85" />
            <path d="M 43 55 C 45 53, 45 50, 43 49 C 41 50, 41 53, 43 55 Z" fill={tierColors.wreathColor} opacity="0.85" />
            <text x="36" y="17" textAnchor="middle" fontSize="7.5" fontWeight="900" fill={tierColors.wreathColor}>★</text>
            {tierColors.stars >= 2 && (
              <>
                <text x="29" y="18.5" textAnchor="middle" fontSize="5.5" fontWeight="bold" fill={tierColors.wreathColor} opacity="0.85">★</text>
                <text x="43" y="18.5" textAnchor="middle" fontSize="5.5" fontWeight="bold" fill={tierColors.wreathColor} opacity="0.85">★</text>
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
        {getStampIcon(iconKey, isUnlocked ? 'w-5 h-5 stroke-[2.2]' : 'w-4 h-4 stroke-[1.6]')}
      </div>
      {!isUnlocked && (
        <div className="absolute -bottom-1 -right-1 z-20 w-4.5 h-4.5 rounded-full bg-surface border border-line flex items-center justify-center text-ink-faint shadow-xs">
          <Lock className="w-2.5 h-2.5" />
        </div>
      )}
    </div>
  );
}

function BadgeItemCard({
  def,
  badgeMap,
}: {
  def: BadgeDefinition;
  badgeMap: Map<string, any>;
}): React.ReactElement {
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
      className={`p-2.5 rounded-xl border-2 transition-all flex flex-col justify-between relative overflow-hidden ${
        tierMeta.cardBorder
      } ${isUnlocked ? 'shadow-xs hover:scale-[1.01]' : 'opacity-85'}`}
    >
      <div className="flex items-center justify-between text-[9px] font-mono mb-1 text-ink-faint">
        <span>STAMP · {def.id.replace('b-', '').toUpperCase()}</span>
        <span
          className={`px-1.5 py-0.2 rounded-full font-bold border text-[8px] flex items-center gap-0.5 ${
            isUnlocked ? tierMeta.badgeBg : 'bg-surface-2 text-ink-faint border-line'
          }`}
        >
          {isUnlocked && <Sparkles className="w-2 h-2" />}
          {tierMeta.label}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <OrnateStampMedal iconKey={def.icon} isUnlocked={isUnlocked} badgeId={def.id} tier={tier} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <h4 className="text-xs sm:text-sm font-extrabold text-ink truncate">{def.title}</h4>
            {isUnlocked ? (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-moss/20 text-moss-soft shrink-0">
                <Check className="w-2.5 h-2.5" />
                已解鎖
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-surface text-ink-faint border border-line shrink-0">
                <Lock className="w-2 h-2" />
                {progress}%
              </span>
            )}
          </div>
          <p className="text-[10px] sm:text-[11px] text-ink-soft mt-0.5 leading-snug line-clamp-2">
            {def.description}
          </p>
          {isUnlocked && unlockedDate && (
            <div className="mt-1 font-mono text-[9px] text-accent font-semibold flex items-center gap-1">
              <ShieldCheck className="w-2.5 h-2.5" />
              <span>授印於 {unlockedDate}</span>
            </div>
          )}
        </div>
      </div>

      {!isUnlocked && (
        <div className="w-full bg-line/60 h-1.5 rounded-full mt-1.5 overflow-hidden">
          <div className="bg-accent/80 h-full transition-all duration-300" style={{ width: `${progress}%` }} />
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
  // 4 Spreads:
  // Spread 0: 全篇探險手帳 (Spread 0 Left: Badges 0-11, Right: Badges 12-23)
  // Spread 1: 🧭 足跡漫遊 (Left: 7) & 🛤️ 萬里征途 (Right: 5)
  // Spread 2: ⛰️ 山海自然 (Left: 3) & 🌏 極境地理 (Right: 5)
  // Spread 3: 📸 手帳光影 (Left: 4) & 📜 探險家授印證書 (Right: Passport Credential)
  const [currentSpread, setCurrentSpread] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  const [flippingState, setFlippingState] = useState<{
    isFlipping: boolean;
    direction: 'next' | 'prev';
    fromSpread: number;
    toSpread: number;
  } | null>(null);

  const userBadges = evaluateBadges(footprints, trails, wishes);
  const badgeMap = new Map(userBadges.map((b) => [b.badgeId, b]));
  const unlockedCount = userBadges.filter((b) => b.unlocked).length;

  const footprintBadges = BADGE_DEFINITIONS.filter((b) => b.category === 'footprint');
  const distanceBadges = BADGE_DEFINITIONS.filter((b) => b.category === 'distance');
  const elevationBadges = BADGE_DEFINITIONS.filter((b) => b.category === 'elevation');
  const geographyBadges = BADGE_DEFINITIONS.filter((b) => b.category === 'geography' || b.category === 'special');
  const journalBadges = BADGE_DEFINITIONS.filter((b) => b.category === 'journal');

  const TOTAL_SPREADS = 4;

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === 'ArrowRight') {
        flipToSpread((currentSpread + 1) % TOTAL_SPREADS, 'next');
      } else if (e.key === 'ArrowLeft') {
        flipToSpread((currentSpread - 1 + TOTAL_SPREADS) % TOTAL_SPREADS, 'prev');
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentSpread, flippingState]);

  if (!isOpen && !isClosing) return null;

  function flipToSpread(target: number, forcedDirection?: 'next' | 'prev') {
    if (target === currentSpread || flippingState) return;
    const dir = forcedDirection || (target > currentSpread ? 'next' : 'prev');
    setFlippingState({
      isFlipping: true,
      direction: dir,
      fromSpread: currentSpread,
      toSpread: target,
    });

    setTimeout(() => {
      setCurrentSpread(target);
      setFlippingState(null);
    }, 520);
  }

  function handleClose() {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 320);
  }

  // Left page renderer for each spread
  function renderLeftPage(spreadIdx: number) {
    switch (spreadIdx) {
      case 0: {
        // Spread 0 Left: All Badges (First 12: includes b-origin, b-continents, b-thousand-km)
        const leftHalf = BADGE_DEFINITIONS.slice(0, 12);
        return (
          <div className="flex flex-col h-full p-3 sm:p-4">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-line">
              <h3 className="text-xs sm:text-sm font-bold text-ink flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-accent" />
                全編探險印章錄 · 上冊
              </h3>
              <span className="text-[10px] font-mono text-ink-soft">
                {leftHalf.filter((b) => badgeMap.get(b.id)?.unlocked).length} / 12 已授印
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {leftHalf.map((def) => (
                <BadgeItemCard key={def.id} def={def} badgeMap={badgeMap} />
              ))}
            </div>
          </div>
        );
      }

      case 1: // Spread 1 Left: 🧭 足跡漫遊記
        return (
          <div className="flex flex-col h-full p-3 sm:p-4">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-line">
              <h3 className="text-xs sm:text-sm font-bold text-ink flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-accent" />
                第一篇章 · 足跡漫遊記
              </h3>
              <span className="text-[10px] font-mono text-ink-soft">
                {footprintBadges.filter((b) => badgeMap.get(b.id)?.unlocked).length} / {footprintBadges.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {footprintBadges.map((def) => (
                <BadgeItemCard key={def.id} def={def} badgeMap={badgeMap} />
              ))}
            </div>
          </div>
        );

      case 2: // Spread 2 Left: ⛰️ 山海自然吟
        return (
          <div className="flex flex-col h-full p-3 sm:p-4">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-line">
              <h3 className="text-xs sm:text-sm font-bold text-ink flex items-center gap-1.5">
                <Mountain className="w-4 h-4 text-accent" />
                第三篇章 · 山海自然吟
              </h3>
              <span className="text-[10px] font-mono text-ink-soft">
                {elevationBadges.filter((b) => badgeMap.get(b.id)?.unlocked).length} / {elevationBadges.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {elevationBadges.map((def) => (
                <BadgeItemCard key={def.id} def={def} badgeMap={badgeMap} />
              ))}
            </div>
          </div>
        );

      case 3: // Spread 3 Left: 📸 手帳光影冊
        return (
          <div className="flex flex-col h-full p-3 sm:p-4">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-line">
              <h3 className="text-xs sm:text-sm font-bold text-ink flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-accent" />
                第五篇章 · 手帳光影冊
              </h3>
              <span className="text-[10px] font-mono text-ink-soft">
                {journalBadges.filter((b) => badgeMap.get(b.id)?.unlocked).length} / {journalBadges.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {journalBadges.map((def) => (
                <BadgeItemCard key={def.id} def={def} badgeMap={badgeMap} />
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  // Right page renderer for each spread
  function renderRightPage(spreadIdx: number) {
    switch (spreadIdx) {
      case 0: {
        // Spread 0 Right: All Badges (Second 12: includes b-cloud-walker, b-island-rider)
        const rightHalf = BADGE_DEFINITIONS.slice(12, 24);
        return (
          <div className="flex flex-col h-full p-3 sm:p-4">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-line">
              <h3 className="text-xs sm:text-sm font-bold text-ink flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-accent" />
                全編探險印章錄 · 下冊
              </h3>
              <span className="text-[10px] font-mono text-ink-soft">
                {rightHalf.filter((b) => badgeMap.get(b.id)?.unlocked).length} / 12 已授印
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {rightHalf.map((def) => (
                <BadgeItemCard key={def.id} def={def} badgeMap={badgeMap} />
              ))}
            </div>
          </div>
        );
      }

      case 1: // Spread 1 Right: 🛤️ 萬里征途志
        return (
          <div className="flex flex-col h-full p-3 sm:p-4">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-line">
              <h3 className="text-xs sm:text-sm font-bold text-ink flex items-center gap-1.5">
                <Route className="w-4 h-4 text-accent" />
                第二篇章 · 萬里征途志
              </h3>
              <span className="text-[10px] font-mono text-ink-soft">
                {distanceBadges.filter((b) => badgeMap.get(b.id)?.unlocked).length} / {distanceBadges.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {distanceBadges.map((def) => (
                <BadgeItemCard key={def.id} def={def} badgeMap={badgeMap} />
              ))}
            </div>
          </div>
        );

      case 2: // Spread 2 Right: 🌏 極境地理考
        return (
          <div className="flex flex-col h-full p-3 sm:p-4">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-line">
              <h3 className="text-xs sm:text-sm font-bold text-ink flex items-center gap-1.5">
                <Globe2 className="w-4 h-4 text-accent" />
                第四篇章 · 極境地理考
              </h3>
              <span className="text-[10px] font-mono text-ink-soft">
                {geographyBadges.filter((b) => badgeMap.get(b.id)?.unlocked).length} / {geographyBadges.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {geographyBadges.map((def) => (
                <BadgeItemCard key={def.id} def={def} badgeMap={badgeMap} />
              ))}
            </div>
          </div>
        );

      case 3: // Spread 3 Right: 📜 探險家授印證書
        return (
          <div className="flex flex-col justify-between h-full p-4 sm:p-5">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-accent/15 border-2 border-dashed border-accent flex items-center justify-center text-accent mb-2.5 shadow-xs">
                <Award className="w-8 h-8" />
              </div>
              <span className="text-[10px] font-mono tracking-widest text-accent font-bold uppercase">
                Official Credential
              </span>
              <h3 className="text-sm sm:text-base font-black text-ink mt-0.5">
                探險家授印總證書
              </h3>
              <p className="text-xs text-ink-soft max-w-xs mt-1">
                記錄真實世界的地理里程碑，蓋滿每一片探索足跡的專屬手帳
              </p>
            </div>

            <div className="my-2.5 p-3 rounded-xl border border-line bg-surface/60 flex items-center justify-around text-center">
              <div>
                <span className="text-[10px] text-ink-soft font-mono">已授印勳章</span>
                <div className="text-lg font-black text-accent mt-0.5">
                  {unlockedCount} <span className="text-xs text-ink-faint font-normal">/ 24</span>
                </div>
              </div>
              <div className="w-px h-7 bg-line" />
              <div>
                <span className="text-[10px] text-ink-soft font-mono">探索進度</span>
                <div className="text-lg font-black text-moss-soft mt-0.5">
                  {Math.round((unlockedCount / 24) * 100)}%
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
              <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-400/30">
                <span className="text-[9px] text-amber-700 dark:text-amber-300 font-bold block">🥇 傳奇金</span>
                <span className="font-mono font-bold text-ink text-xs">
                  {BADGE_DEFINITIONS.filter((b) => getBadgeTier(b.id) === 'gold' && badgeMap.get(b.id)?.unlocked).length} / 6
                </span>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-300/15 border border-slate-300/40">
                <span className="text-[9px] text-slate-700 dark:text-slate-300 font-bold block">🥈 榮譽銀</span>
                <span className="font-mono font-bold text-ink text-xs">
                  {BADGE_DEFINITIONS.filter((b) => getBadgeTier(b.id) === 'silver' && badgeMap.get(b.id)?.unlocked).length} / 8
                </span>
              </div>
              <div className="p-1.5 rounded-lg bg-orange-500/10 border border-orange-400/30">
                <span className="text-[9px] text-orange-700 dark:text-orange-300 font-bold block">🥉 行者銅</span>
                <span className="font-mono font-bold text-ink text-xs">
                  {BADGE_DEFINITIONS.filter((b) => getBadgeTier(b.id) === 'bronze' && badgeMap.get(b.id)?.unlocked).length} / 10
                </span>
              </div>
            </div>

            <div className="pt-2.5 border-t border-line text-center text-[10px] font-mono text-ink-faint">
              ★ ROAMLOG PASSPORT NO. {new Date().getFullYear()}-EXPLORER ★
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  const activeLeft = renderLeftPage(currentSpread);
  const activeRight = renderRightPage(currentSpread);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-overlay/85 backdrop-blur-sm transition-opacity duration-300 ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      {/* ── Realistic Open Book Wrapper ── */}
      <div
        className={`relative w-full max-w-5xl flex items-center justify-center ${
          isClosing ? 'journal-put-away-anim' : 'journal-pull-out-anim'
        }`}
      >
        {/* Protruding Leather Index Tabs on Right Edge */}
        <div className="hidden md:flex flex-col gap-2 absolute -right-10 top-16 z-30">
          {[
            { label: '全覽', spread: 0, icon: <Layers className="w-3.5 h-3.5" /> },
            { label: '足跡', spread: 1, icon: <Compass className="w-3.5 h-3.5" /> },
            { label: '山海', spread: 2, icon: <Mountain className="w-3.5 h-3.5" /> },
            { label: '光影', spread: 3, icon: <BookOpen className="w-3.5 h-3.5" /> },
          ].map((tab, idx) => {
            const isActive = currentSpread === tab.spread;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => flipToSpread(tab.spread)}
                className={`flex items-center gap-1.5 pl-2.5 pr-3 py-2.5 rounded-r-xl text-xs font-bold transition-all shadow-md cursor-pointer border-y border-r ${
                  isActive
                    ? 'bg-accent text-on-accent translate-x-2 border-accent-hover shadow-lg scale-105'
                    : 'bg-surface-2 text-ink-soft hover:text-ink hover:translate-x-1 border-line/80'
                }`}
              >
                <span>{tab.icon}</span>
                <span className="tracking-widest text-[11px]">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Physical Leather / Hardcover Outer Binding ── */}
        <div className="w-full rounded-2xl sm:rounded-3xl p-2 sm:p-3.5 bg-[#2b1d14] dark:bg-[#090e1a] shadow-2xl border-2 border-amber-900/40 dark:border-amber-500/20 relative overflow-visible">
          {/* Decorative Brass Metal Corner Brackets */}
          <div className="absolute top-1.5 left-1.5 w-6 h-6 border-t-2 border-l-2 border-amber-500/80 rounded-tl-md pointer-events-none" />
          <div className="absolute top-1.5 right-1.5 w-6 h-6 border-t-2 border-r-2 border-amber-500/80 rounded-tr-md pointer-events-none" />
          <div className="absolute bottom-1.5 left-1.5 w-6 h-6 border-b-2 border-l-2 border-amber-500/80 rounded-bl-md pointer-events-none" />
          <div className="absolute bottom-1.5 right-1.5 w-6 h-6 border-b-2 border-r-2 border-amber-500/80 rounded-br-md pointer-events-none" />

          {/* Crimson Ribbon Bookmark dangling from spine top */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-9 bg-rose-700 dark:bg-rose-800 rounded-b-xs shadow-md border-x border-rose-900/30 flex items-end justify-center pb-0.5 pointer-events-none z-40">
            <Bookmark className="w-2.5 h-2.5 text-white/80" />
          </div>

          {/* ── Open Book Double-Page Surface (Two-Page Spread) ── */}
          <div className="w-full rounded-xl sm:rounded-2xl bg-canvas text-ink journal-paper-stack border border-line flex flex-col relative overflow-hidden">
            {/* Top Navigation & Status Bar */}
            <div className="px-4 sm:px-6 py-2.5 border-b border-line bg-canvas/90 backdrop-blur-xs flex items-center justify-between gap-3 z-20">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-accent/15 text-accent rounded-lg">
                  <Award className="w-4 h-4" />
                </span>
                <h2 className="text-sm sm:text-base font-extrabold text-ink">旅行手帳印章館</h2>
                <span className="text-[10px] text-ink-soft font-mono ml-2 hidden sm:inline">
                  SPREAD {currentSpread + 1} OF {TOTAL_SPREADS}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <span className="text-[10px] text-ink-soft font-mono">已解鎖成就</span>
                  <span className="text-sm font-black text-accent ml-1.5">
                    {unlockedCount} / {BADGE_DEFINITIONS.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-1.5 text-ink-soft hover:text-ink hover:bg-surface-2 rounded-lg transition cursor-pointer"
                  title="闔上手帳 (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── Two-Page Open Spread Area with Center Spine ── */}
            <div className="relative w-full h-[66vh] sm:h-[68vh] flex overflow-hidden bg-journal-canvas">
              {/* Static Left Page (Verso) */}
              <div
                className="w-full sm:w-1/2 h-full border-r border-line/60 overflow-hidden relative cursor-pointer"
                onClick={() => {
                  if (currentSpread > 0) flipToSpread(currentSpread - 1, 'prev');
                }}
                title={currentSpread > 0 ? '點擊翻回上一跨頁' : undefined}
              >
                {flippingState && flippingState.direction === 'prev'
                  ? renderLeftPage(flippingState.toSpread)
                  : activeLeft}
              </div>

              {/* Central Spine Gutter (Book binding seam & fold shadow) */}
              <div className="hidden sm:block absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-6 bg-gradient-to-r from-black/10 via-black/25 to-black/10 border-x border-black/15 shadow-inner z-20 pointer-events-none" />

              {/* Static Right Page (Recto) */}
              <div
                className="hidden sm:block w-1/2 h-full border-l border-line/60 overflow-hidden relative cursor-pointer"
                onClick={() => {
                  if (currentSpread < TOTAL_SPREADS - 1) flipToSpread(currentSpread + 1, 'next');
                }}
                title={currentSpread < TOTAL_SPREADS - 1 ? '點擊翻至下一跨頁' : undefined}
              >
                {flippingState && flippingState.direction === 'next'
                  ? renderRightPage(flippingState.toSpread)
                  : activeRight}
              </div>

              {/* ── Real 3D Turning Page Leaf (Flipping Forward: Right to Left) ── */}
              {flippingState && flippingState.direction === 'next' && (
                <div
                  className="hidden sm:block absolute top-0 bottom-0 left-1/2 w-1/2 h-full z-30 book-flip-r2l-anim"
                  style={{
                    transformStyle: 'preserve-3d',
                  }}
                >
                  {/* Front Face: outgoing right page */}
                  <div className="absolute inset-0 w-full h-full bg-journal-canvas border-l border-line backface-hidden overflow-hidden">
                    {renderRightPage(flippingState.fromSpread)}
                  </div>
                  {/* Back Face: incoming left page */}
                  <div
                    className="absolute inset-0 w-full h-full bg-journal-canvas border-r border-line backface-hidden overflow-hidden"
                    style={{ transform: 'rotateY(180deg)' }}
                  >
                    {renderLeftPage(flippingState.toSpread)}
                  </div>
                </div>
              )}

              {/* ── Real 3D Turning Page Leaf (Flipping Backward: Left to Right) ── */}
              {flippingState && flippingState.direction === 'prev' && (
                <div
                  className="hidden sm:block absolute top-0 bottom-0 left-0 w-1/2 h-full z-30 book-flip-l2r-anim"
                  style={{
                    transformStyle: 'preserve-3d',
                  }}
                >
                  {/* Front Face: outgoing left page */}
                  <div className="absolute inset-0 w-full h-full bg-journal-canvas border-r border-line backface-hidden overflow-hidden">
                    {renderLeftPage(flippingState.fromSpread)}
                  </div>
                  {/* Back Face: incoming right page */}
                  <div
                    className="absolute inset-0 w-full h-full bg-journal-canvas border-l border-line backface-hidden overflow-hidden"
                    style={{ transform: 'rotateY(180deg)' }}
                  >
                    {renderRightPage(flippingState.toSpread)}
                  </div>
                </div>
              )}
            </div>

            {/* ── Book Bottom Navigation Toolbar ── */}
            <div className="px-4 sm:px-6 py-2.5 border-t border-line bg-canvas/95 backdrop-blur-xs flex items-center justify-between gap-2 z-20">
              <button
                type="button"
                onClick={() => flipToSpread((currentSpread - 1 + TOTAL_SPREADS) % TOTAL_SPREADS, 'prev')}
                disabled={Boolean(flippingState)}
                className="px-3 py-1.5 rounded-xl border border-line bg-surface hover:bg-surface-2 transition flex items-center gap-1 text-xs font-bold text-ink-soft hover:text-ink cursor-pointer disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>上一跨頁</span>
              </button>

              <div className="flex items-center gap-2">
                {[0, 1, 2, 3].map((idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => flipToSpread(idx)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      idx === currentSpread ? 'w-6 bg-accent' : 'w-2 bg-line hover:bg-ink-faint'
                    }`}
                    title={`翻至跨頁 ${idx + 1}`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => flipToSpread((currentSpread + 1) % TOTAL_SPREADS, 'next')}
                  disabled={Boolean(flippingState)}
                  className="px-3 py-1.5 rounded-xl border border-line bg-surface hover:bg-surface-2 transition flex items-center gap-1 text-xs font-bold text-ink-soft hover:text-ink cursor-pointer disabled:opacity-50"
                >
                  <span>下一跨頁</span>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-accent text-on-accent hover:bg-accent-hover transition shadow-xs cursor-pointer ml-1"
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
