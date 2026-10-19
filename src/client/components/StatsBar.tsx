import React from 'react';
import { Globe, Building2, MapPin, Plus, ImagePlus, Filter } from 'lucide-react';
import type { Companion, FootprintFilter, FootprintStats } from '../../shared/types';

export interface StatsBarProps {
  stats: FootprintStats;
  companions: Companion[];
  filter: FootprintFilter;
  onFilterChange: (nextFilter: FootprintFilter) => void;
  onOpenCheckIn: () => void;
  onOpenRetroImport: () => void;
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
    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-xl text-slate-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      {/* Achievement Counters */}
      <div className="flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400">已點亮國家</div>
            <div data-testid="stat-countries" className="text-xl font-bold text-amber-300">
              {stats.countryCount}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400">探索城市</div>
            <div data-testid="stat-cities" className="text-xl font-bold text-sky-300">
              {stats.cityCount}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400">踩點地標</div>
            <div data-testid="stat-landmarks" className="text-xl font-bold text-emerald-300">
              {stats.landmarkCount}
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Quick Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-1.5 text-sm">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            aria-label="篩選年份"
            value={filter.year ?? ''}
            onChange={(e) =>
              onFilterChange({ ...filter, year: e.target.value || undefined })
            }
            className="bg-transparent text-slate-200 focus:outline-none"
          >
            <option value="" className="bg-slate-900">所有年份</option>
            {stats.years.map((y) => (
              <option key={y} value={y} className="bg-slate-900">
                {y} 年
              </option>
            ))}
          </select>

          <span className="text-slate-600">|</span>

          <select
            aria-label="篩選國家"
            value={filter.countryCode ?? ''}
            onChange={(e) =>
              onFilterChange({ ...filter, countryCode: e.target.value || undefined })
            }
            className="bg-transparent text-slate-200 focus:outline-none"
          >
            <option value="" className="bg-slate-900">所有國家</option>
            {stats.visitedCountryCodes.map((code) => (
              <option key={code} value={code} className="bg-slate-900">
                {code}
              </option>
            ))}
          </select>

          <span className="text-slate-600">|</span>

          <select
            aria-label="篩選旅伴"
            value={filter.companionId ?? ''}
            onChange={(e) =>
              onFilterChange({ ...filter, companionId: e.target.value || undefined })
            }
            className="bg-transparent text-slate-200 focus:outline-none"
          >
            <option value="" className="bg-slate-900">所有旅伴</option>
            {companions.map((c) => (
              <option key={c.id} value={c.id} className="bg-slate-900">
                {c.name}
              </option>
            ))}
          </select>

          {filter.tripId && (
            <>
              <span className="text-slate-600">|</span>
              <button
                type="button"
                onClick={() => onFilterChange({ ...filter, tripId: undefined })}
                className="px-2 py-0.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-xs text-sky-300 font-semibold cursor-pointer"
              >
                清除旅程篩選 ×
              </button>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenRetroImport}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm font-medium text-slate-200 transition cursor-pointer"
        >
          <ImagePlus className="w-4 h-4 text-amber-400" />
          舊照批次補登
        </button>

        <button
          type="button"
          onClick={onOpenCheckIn}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold shadow-lg shadow-amber-500/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          打卡踩點
        </button>
      </div>
    </div>
  );
}
