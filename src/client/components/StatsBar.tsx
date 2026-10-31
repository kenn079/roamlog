import React from 'react';
import { Tent, Trees, Plus, ImagePlus, Filter, Star } from 'lucide-react';
import { CampScene } from './CampDecor';
import type { Companion, FootprintFilter, FootprintStats } from '../../shared/types';

export interface StatsBarProps {
  stats: FootprintStats;
  wishCount?: number;
  companions: Companion[];
  filter: FootprintFilter;
  onFilterChange: (nextFilter: FootprintFilter) => void;
  onOpenCheckIn: () => void;
  onOpenRetroImport: () => void;
  onOpenAddWish?: () => void;
}

const REGION_DISPLAY =
  typeof Intl !== 'undefined' && typeof Intl.DisplayNames !== 'undefined'
    ? new Intl.DisplayNames(['zh-Hant', 'en'], { type: 'region' })
    : null;

function formatCountryOption(code: string): string {
  try {
    const name = REGION_DISPLAY?.of(code.toUpperCase());
    if (name && name.toUpperCase() !== code.toUpperCase()) {
      return `${name} (${code})`;
    }
  } catch {
    // Fallback to raw code
  }
  return code;
}

export function StatsBar({
  stats,
  wishCount = 0,
  companions,
  filter,
  onFilterChange,
  onOpenCheckIn,
  onOpenRetroImport,
  onOpenAddWish,
}: StatsBarProps): React.ReactElement {
  return (
    <div className="panel overflow-hidden border-2 border-amber-200/60 dark:border-amber-700/35 shadow-soft">
      {/* Geometric Yuru-Camp Mountain & Tent Scene Strip */}
      <div className="relative h-14 sm:h-16 w-full overflow-hidden border-b border-line">
        <CampScene className="w-full h-full block" />
      </div>

      <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Achievement Counters - Styled like reference summary metrics */}
        <div className="flex items-center gap-6 sm:gap-8 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-accent/30 flex items-center justify-center text-accent shadow-xs">
              <Tent className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-ink-soft">已點亮國家</div>
              <div
                data-testid="stat-countries"
                className="font-display text-2xl font-black text-accent tracking-tight leading-none mt-0.5"
              >
                {stats.countryCount}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-moss/30 flex items-center justify-center text-moss shadow-xs">
              <Trees className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-ink-soft">探索城市</div>
              <div
                data-testid="stat-cities"
                className="font-display text-2xl font-black text-ink tracking-tight leading-none mt-0.5"
              >
                {stats.cityCount}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-400/15 border border-sun/30 flex items-center justify-center text-sun shadow-xs">
              <Star className="w-5 h-5 fill-sun/30" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-ink-soft">待訪心願</div>
              <div
                data-testid="stat-wishes"
                className="font-display text-2xl font-black text-ink tracking-tight leading-none mt-0.5"
              >
                {wishCount}
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Quick Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 bg-surface-2 border border-line rounded-full px-3.5 py-1.5 text-xs sm:text-sm text-ink shadow-xs">
            <Filter className="w-3.5 h-3.5 text-ink-soft shrink-0" />
            <select
              aria-label="篩選年份"
              value={filter.year ?? ''}
              onChange={(e) =>
                onFilterChange({ ...filter, year: e.target.value || undefined })
              }
              className="bg-transparent text-ink focus:outline-none cursor-pointer text-xs font-semibold"
            >
              <option value="">所有年份</option>
              {stats.years.map((y) => (
                <option key={y} value={y}>
                  {y} 年
                </option>
              ))}
            </select>

            <span className="text-line">|</span>

            <select
              aria-label="篩選國家"
              value={filter.countryCode ?? ''}
              onChange={(e) =>
                onFilterChange({ ...filter, countryCode: e.target.value || undefined })
              }
              className="bg-transparent text-ink focus:outline-none cursor-pointer text-xs font-semibold"
            >
              <option value="">所有國家</option>
              {stats.visitedCountryCodes.map((code) => (
                <option key={code} value={code}>
                  {formatCountryOption(code)}
                </option>
              ))}
            </select>

            <span className="text-line">|</span>

            <select
              aria-label="篩選旅伴"
              value={filter.companionId ?? ''}
              onChange={(e) =>
                onFilterChange({ ...filter, companionId: e.target.value || undefined })
              }
              className="bg-transparent text-ink focus:outline-none cursor-pointer text-xs font-semibold"
            >
              <option value="">所有旅伴</option>
              {companions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {filter.tripId && (
              <>
                <span className="text-line">|</span>
                <button
                  type="button"
                  onClick={() => onFilterChange({ ...filter, tripId: undefined })}
                  className="px-2.5 py-0.5 rounded-full bg-accent/15 hover:bg-accent/25 text-xs text-accent font-semibold cursor-pointer"
                >
                  清除旅程篩選 ×
                </button>
              </>
            )}
          </div>

          {onOpenAddWish && (
            <button
              type="button"
              onClick={onOpenAddWish}
              className="btn-soft px-3.5 py-2 text-xs sm:text-sm border-sun/50 hover:border-sun text-ink flex items-center gap-1.5 cursor-pointer shadow-xs rounded-full font-semibold"
              style={{ backgroundColor: 'color-mix(in srgb, var(--sun) 18%, var(--surface))' }}
            >
              <Star className="w-4 h-4 text-sun fill-sun" />
              <span>新增心願</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenRetroImport}
            className="btn-soft px-3.5 py-2 text-xs sm:text-sm rounded-full font-semibold"
          >
            <ImagePlus className="w-4 h-4 text-moss" />
            舊照補登
          </button>

          <button
            type="button"
            onClick={onOpenCheckIn}
            className="btn-cta-gradient px-4 py-2 text-xs sm:text-sm rounded-full"
          >
            <Plus className="w-4 h-4" />
            打卡踩點
          </button>
        </div>
      </div>
    </div>
  );
}
