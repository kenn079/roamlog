import React from 'react';
import { Tent, Trees, Plus, ImagePlus, Filter } from 'lucide-react';
import { CampScene } from './CampDecor';
import type { Companion, FootprintFilter, FootprintStats } from '../../shared/types';

export interface StatsBarProps {
  stats: FootprintStats;
  companions: Companion[];
  filter: FootprintFilter;
  onFilterChange: (nextFilter: FootprintFilter) => void;
  onOpenCheckIn: () => void;
  onOpenRetroImport: () => void;
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
  companions,
  filter,
  onFilterChange,
  onOpenCheckIn,
  onOpenRetroImport,
}: StatsBarProps): React.ReactElement {
  return (
    <div className="panel overflow-hidden">
      {/* Geometric Yuru-Camp Mountain & Tent Scene Strip */}
      <div className="relative h-14 sm:h-16 w-full overflow-hidden border-b border-line">
        <CampScene className="w-full h-full block" />
      </div>

      <div className="p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Achievement Counters */}
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-surface-2 border border-line flex items-center justify-center text-accent">
              <Tent className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-ink-soft">已點亮國家</div>
              <div
                data-testid="stat-countries"
                className="font-display text-xl font-bold text-ink"
              >
                {stats.countryCount}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-surface-2 border border-line flex items-center justify-center text-moss">
              <Trees className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-ink-soft">探索城市</div>
              <div
                data-testid="stat-cities"
                className="font-display text-xl font-bold text-ink"
              >
                {stats.cityCount}
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Quick Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 bg-surface-2 border border-line rounded-full px-3.5 py-1.5 text-xs sm:text-sm text-ink">
            <Filter className="w-3.5 h-3.5 text-ink-soft shrink-0" />
            <select
              aria-label="篩選年份"
              value={filter.year ?? ''}
              onChange={(e) =>
                onFilterChange({ ...filter, year: e.target.value || undefined })
              }
              className="bg-transparent text-ink focus:outline-none cursor-pointer"
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
              className="bg-transparent text-ink focus:outline-none cursor-pointer"
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
              className="bg-transparent text-ink focus:outline-none cursor-pointer"
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

          <button
            type="button"
            onClick={onOpenRetroImport}
            className="btn-soft px-3.5 py-2 text-xs sm:text-sm"
          >
            <ImagePlus className="w-4 h-4 text-moss" />
            舊照批次補登
          </button>

          <button
            type="button"
            onClick={onOpenCheckIn}
            className="btn-primary px-4 py-2 text-xs sm:text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            打卡踩點
          </button>
        </div>
      </div>
    </div>
  );
}
