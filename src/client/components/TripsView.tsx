import React, { useState } from 'react';
import {
  Plus,
  Calendar,
  MapPin,
  CheckCircle2,
  Circle,
  Users,
  Trash2,
  ChevronRight,
  Tent,
  Route,
  Navigation,
  GripVertical,
} from 'lucide-react';
import { api } from '../lib/api';
import { EmptyCamp } from './CampDecor';
import type { Companion, Coordinates, Footprint, Trip, TripItem } from '../../shared/types';

export interface TripsViewProps {
  trips: Trip[];
  companions: Companion[];
  onRefresh: () => void;
  onSelectFootprint: (fp: Footprint) => void;
  onOpenLiveCheckIn?: (tripId: string, tripDayId: string) => void;
  onViewTripOnMap?: (tripId: string, routeCoordinates: Coordinates[]) => void;
}

export function computeTripRouteCoordinates(trip: Trip): Coordinates[] {
  const coords: Coordinates[] = [];
  for (const day of trip.days) {
    for (const item of day.items) {
      const c = item.footprint?.coordinates ?? item.coordinates;
      if (c && typeof c.lat === 'number' && typeof c.lng === 'number') {
        coords.push(c);
      }
    }
  }
  return coords;
}

function formatDaySquircle(tripStartDate?: string, dayDate?: string, dayNumber = 1) {
  let targetDate: Date | null = null;
  if (dayDate) {
    targetDate = new Date(dayDate);
  } else if (tripStartDate) {
    const base = new Date(tripStartDate);
    base.setDate(base.getDate() + (dayNumber - 1));
    targetDate = base;
  }

  if (targetDate && !isNaN(targetDate.getTime())) {
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekday = weekdays[targetDate.getDay()];
    const m = targetDate.getMonth() + 1;
    const d = targetDate.getDate();
    return {
      weekday,
      dateLabel: `${m}/${d}`,
    };
  }

  return {
    weekday: `Day`,
    dateLabel: `${dayNumber}`,
  };
}

export function TripsView({
  trips,
  companions,
  onRefresh,
  onSelectFootprint,
  onOpenLiveCheckIn,
  onViewTripOnMap,
}: TripsViewProps): React.ReactElement {
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [showNewTripForm, setShowNewTripForm] = useState(false);
  const [newTripTitle, setNewTripTitle] = useState('');
  const [newTripStartDate, setNewTripStartDate] = useState('');
  const [newTripDayCount, setNewTripDayCount] = useState(3);
  const [newTripCompanionIds, setNewTripCompanionIds] = useState<string[]>([]);

  const [newStopTitle, setNewStopTitle] = useState('');
  const [newStopTime, setNewStopTime] = useState('');
  const [newStopNote, setNewStopNote] = useState('');

  const activeTrip = trips.find((t) => t.id === selectedTripId) ?? null;
  const activeDay =
    activeTrip?.days.find((d) => d.id === selectedDayId) ?? activeTrip?.days[0] ?? null;

  async function handleCreateTrip(e: React.FormEvent) {
    e.preventDefault();
    if (!newTripTitle.trim()) return;
    const created = await api.createTrip({
      title: newTripTitle.trim(),
      startDate: newTripStartDate || null,
      status: 'active',
      dayCount: newTripDayCount,
      companionIds: newTripCompanionIds,
    });
    setNewTripTitle('');
    setShowNewTripForm(false);
    setSelectedTripId(created.id);
    setSelectedDayId(created.days[0]?.id ?? null);
    onRefresh();
  }

  async function handleAddPlannedStop(e: React.FormEvent) {
    e.preventDefault();
    if (!activeDay || !newStopTitle.trim()) return;
    await api.addTripItem(activeDay.id, {
      title: newStopTitle.trim(),
      plannedTime: newStopTime || undefined,
      note: newStopNote || undefined,
    });
    setNewStopTitle('');
    setNewStopTime('');
    setNewStopNote('');
    onRefresh();
  }

  async function handleQuickCheckInStop(item: TripItem) {
    let coords: Coordinates | null = item.coordinates;
    let countryCode: string | undefined;
    let countryName: string | undefined;
    let cityName: string | undefined;

    if (!coords) {
      try {
        const found = await api.searchPlaces(item.title);
        if (found.length > 0) {
          coords = found[0].coordinates;
          countryCode = found[0].countryCode;
          countryName = found[0].countryName;
          cityName = found[0].cityName;
        }
      } catch {
        // Fallback if search fails offline
      }
    }

    const finalCoords: Coordinates = coords ?? { lat: 25.0339, lng: 121.5645 };
    const visitedAt = activeDay?.date || new Date().toISOString().slice(0, 10);
    await api.checkInTripItem(item.id, {
      title: item.title,
      coordinates: finalCoords,
      countryCode,
      countryName,
      cityName,
      visitedAt,
      note: item.note ?? '',
    });
    onRefresh();
  }

  async function handleAddDay() {
    if (!activeTrip) return;
    const day = await api.addTripDay(activeTrip.id, {});
    setSelectedDayId(day.id);
    onRefresh();
  }

  async function handleDeleteTrip(tripId: string) {
    await api.deleteTrip(tripId);
    if (selectedTripId === tripId) {
      setSelectedTripId(null);
    }
    onRefresh();
  }

  async function handleDeleteTripItem(itemId: string) {
    await api.deleteTripItem(itemId);
    onRefresh();
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Sidebar: Trip Books List */}
      <div className="lg:col-span-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-ink flex items-center gap-2">
            <Tent className="w-5 h-5 text-accent" />
            獨立旅程本 ({trips.length})
          </h2>
          <button
            type="button"
            onClick={() => setShowNewTripForm((v) => !v)}
            className="btn-primary px-3 py-1.5 text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            建立新旅程
          </button>
        </div>

        {showNewTripForm && (
          <form onSubmit={handleCreateTrip} className="panel p-4 space-y-3">
            <div>
              <label className="block text-xs text-ink-soft mb-1">旅程名稱 *</label>
              <input
                type="text"
                required
                value={newTripTitle}
                onChange={(e) => setNewTripTitle(e.target.value)}
                placeholder="例如：2025 京都賞楓 5 日行"
                className="field w-full px-3 py-1.5 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-ink-soft mb-1">出發日期</label>
                <input
                  type="date"
                  value={newTripStartDate}
                  onChange={(e) => setNewTripStartDate(e.target.value)}
                  className="field w-full px-2.5 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-ink-soft mb-1">預計天數</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={newTripDayCount}
                  onChange={(e) => setNewTripDayCount(Number(e.target.value))}
                  className="field w-full px-2.5 py-1.5 text-xs"
                />
              </div>
            </div>

            {companions.length > 0 && (
              <div>
                <label className="block text-xs text-ink-soft mb-1">同行旅伴（打卡自動帶入）</label>
                <div className="flex flex-wrap gap-1.5">
                  {companions.map((c) => {
                    const active = newTripCompanionIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        data-active={active}
                        onClick={() =>
                          setNewTripCompanionIds((prev) =>
                            prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id]
                          )
                        }
                        className="chip px-2.5 py-0.5 text-xs"
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewTripForm(false)}
                className="btn-soft px-3 py-1.5 text-xs"
              >
                取消
              </button>
              <button type="submit" className="btn-primary px-4 py-1.5 text-xs">
                建立旅程
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2.5">
          {trips.map((trip) => {
            const isSelected = activeTrip?.id === trip.id;
            const visitedCount = trip.days.reduce(
              (acc, d) => acc + d.items.filter((i) => i.footprintId !== null).length,
              0
            );
            const totalStops = trip.days.reduce((acc, d) => acc + d.items.length, 0);

            return (
              <div
                key={trip.id}
                onClick={() => {
                  setSelectedTripId(trip.id);
                  setSelectedDayId(trip.days[0]?.id ?? null);
                }}
                className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-surface border-accent shadow-soft'
                    : 'bg-surface/80 border-line hover:border-ink-faint'
                }`}
              >
                <div className="min-w-0">
                  <div className="font-display font-bold text-sm text-ink truncate">
                    {trip.title}
                  </div>
                  <div className="text-xs text-ink-soft mt-1 flex items-center gap-3">
                    {trip.startDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {trip.startDate}
                      </span>
                    )}
                    <span>
                      {trip.days.length} 天 · 已踩點 {visitedCount}/{totalStops}
                    </span>
                  </div>
                  {trip.companions.length > 0 && (
                    <div className="flex items-center gap-1 mt-1.5 text-[11px] text-moss">
                      <Users className="w-3 h-3" />
                      <span>{trip.companions.map((c) => c.name).join(', ')}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="刪除旅程"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTrip(trip.id);
                    }}
                    className="p-1.5 rounded-full text-ink-faint hover:text-danger hover:bg-danger/10 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-ink-faint" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Content: Selected Trip Day-by-Day Live Journal */}
      <div className="lg:col-span-8">
        {!activeTrip ? (
          <div className="panel p-10">
            <EmptyCamp message="尚未選擇或建立旅程。點擊左側「建立新旅程」，即可開始規劃每日行程並在旅途中即時打卡！" />
          </div>
        ) : (
          <div className="panel p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-line pb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-ink">{activeTrip.title}</h3>
                <p className="text-xs text-ink-soft mt-0.5">
                  在行程中打卡的任何景點，都會自動同步點亮頂層的「世界總足跡庫」
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {onViewTripOnMap && (
                  <button
                    type="button"
                    onClick={() =>
                      onViewTripOnMap(activeTrip.id, computeTripRouteCoordinates(activeTrip))
                    }
                    className="btn-soft px-3 py-2 text-xs"
                  >
                    <Route className="w-3.5 h-3.5 text-moss" />
                    在地圖檢視路線軌跡 ({computeTripRouteCoordinates(activeTrip).length} 點)
                  </button>
                )}

                {activeDay && onOpenLiveCheckIn && (
                  <button
                    type="button"
                    onClick={() => onOpenLiveCheckIn(activeTrip.id, activeDay.id)}
                    className="btn-primary px-3.5 py-2 text-xs self-start"
                  >
                    <MapPin className="w-4 h-4" />
                    ＋新增即時踩點 (Day {activeDay.dayNumber})
                  </button>
                )}
              </div>
            </div>

            {/* Day Date Squircle Carousel - from Reference UI */}
            <div className="flex items-center gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-none">
              {activeTrip.days.map((d) => {
                const isDayActive = activeDay?.id === d.id;
                const { weekday, dateLabel } = formatDaySquircle(
                  activeTrip.startDate,
                  d.date,
                  d.dayNumber
                );

                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedDayId(d.id)}
                    className={`min-w-[50px] h-[64px] rounded-2xl flex flex-col items-center justify-center gap-0.5 transition cursor-pointer border shrink-0 ${
                      isDayActive
                        ? 'bg-gradient-to-b from-orange-500 to-amber-600 text-white border-accent shadow-md scale-102 font-bold'
                        : 'bg-surface hover:bg-surface-2 border-line text-ink-soft hover:text-ink shadow-xs'
                    }`}
                  >
                    <span className={`text-[10px] font-semibold ${isDayActive ? 'text-white/90' : 'text-ink-faint'}`}>
                      {weekday}
                    </span>
                    <span className="font-display text-base font-extrabold leading-none">
                      {dateLabel}
                    </span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={handleAddDay}
                className="min-w-[50px] h-[64px] rounded-2xl flex flex-col items-center justify-center gap-1 border-2 border-dashed border-line hover:border-accent text-ink-soft hover:text-accent transition cursor-pointer shrink-0 bg-surface/50 text-xs font-semibold"
                title="新增天數"
              >
                <Plus className="w-4 h-4" />
                <span className="text-[10px]">加一天</span>
              </button>
            </div>

            {/* Active Day Timeline */}
            {activeDay && (
              <div className="space-y-4">
                {/* Day Header with Reference Pill Badges */}
                <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-accent" />
                    <span className="font-display text-sm font-extrabold text-ink">
                      Day {activeDay.dayNumber} 當日行程
                    </span>
                    {activeDay.date && (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/15 text-accent font-semibold border border-accent/20">
                        {activeDay.date}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-ink-faint">
                    共 {activeDay.items.length} 個站點
                  </span>
                </div>

                {activeDay.items.length === 0 ? (
                  <div className="bg-surface-2/60 border border-line rounded-2xl p-6 text-center text-xs text-ink-soft leading-relaxed">
                    這一天還沒有排定行程。可在下方「✎ 新增預定站點」快速加入，或直接點擊右上角「＋新增即時踩點」。
                  </div>
                ) : (
                  <div className="space-y-3 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:border-l-2 before:border-dashed before:border-amber-300 dark:before:border-amber-700/60">
                    {activeDay.items.map((item) => {
                      const isVisited = Boolean(item.footprintId);
                      const coords = item.footprint?.coordinates ?? item.coordinates;

                      return (
                        <div
                          key={item.id}
                          className="relative pl-9 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface border border-line hover:border-accent/40 rounded-2xl p-4 shadow-xs transition"
                        >
                          {/* Camp Triangle Marker from Reference */}
                          <div className="absolute left-2 top-4 flex items-center justify-center">
                            {isVisited ? (
                              <CheckCircle2 className="w-4 h-4 text-moss bg-surface rounded-full shadow-xs" />
                            ) : (
                              <span className="text-accent text-xs font-black select-none">▲</span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {item.plannedTime ? (
                                <span className="text-xs font-black font-mono px-2 py-0.5 rounded-md bg-surface-2 text-accent border border-line">
                                  {item.plannedTime}
                                </span>
                              ) : (
                                <span className="text-[10px] text-ink-faint font-semibold px-1.5 py-0.5 rounded bg-surface-2">
                                  行程
                                </span>
                              )}
                              <span className="font-display font-bold text-sm sm:text-base text-ink">
                                {item.title}
                              </span>
                              {isVisited && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-moss/15 text-moss border border-moss/30 font-medium">
                                  已打卡同步
                                </span>
                              )}
                            </div>
                            {item.note && (
                              <p className="text-xs text-ink-soft mt-1 leading-relaxed">{item.note}</p>
                            )}
                          </div>

                          <div className="shrink-0 flex items-center gap-1.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-line/60">
                            {coords && onViewTripOnMap && (
                              <button
                                type="button"
                                title="在地圖上定位此點"
                                onClick={() => onViewTripOnMap(activeTrip.id, [coords])}
                                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50/90 hover:bg-blue-100 text-blue-600 border border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40 transition cursor-pointer flex items-center gap-1 shadow-xs"
                              >
                                <Navigation className="w-3 h-3" />
                                <span>導航</span>
                              </button>
                            )}

                            {isVisited && item.footprint ? (
                              <button
                                type="button"
                                onClick={() => onSelectFootprint(item.footprint!)}
                                className="btn-soft px-3 py-1.5 text-xs rounded-full shadow-xs font-semibold"
                              >
                                查看拍立得
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleQuickCheckInStop(item)}
                                className="btn-cta-gradient px-3 py-1.5 text-xs rounded-full font-semibold"
                              >
                                打卡踩點
                              </button>
                            )}

                            <button
                              type="button"
                              aria-label={`刪除 ${item.title}`}
                              title="刪除此行程踩點"
                              onClick={() => handleDeleteTripItem(item.id)}
                              className="p-1.5 rounded-full text-ink-faint hover:text-danger hover:bg-danger/10 transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add Planned Stop Form - Styled like reference "記一筆" */}
                <form
                  onSubmit={handleAddPlannedStop}
                  className="bg-surface border-2 border-amber-200/50 dark:border-amber-700/30 rounded-2xl p-4 space-y-3 shadow-xs"
                >
                  <div className="flex items-center gap-2 text-xs font-extrabold text-ink">
                    <span className="text-accent">✎</span>
                    <span>新增預定行程站點</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    <div className="sm:col-span-3">
                      <input
                        type="time"
                        value={newStopTime}
                        onChange={(e) => setNewStopTime(e.target.value)}
                        className="field w-full px-3 py-2 text-xs font-mono font-semibold"
                        placeholder="時間"
                      />
                    </div>
                    <div className="sm:col-span-5">
                      <input
                        type="text"
                        required
                        value={newStopTitle}
                        onChange={(e) => setNewStopTitle(e.target.value)}
                        placeholder="站點名稱（例如：伏見稻荷大社、一蘭拉麵）"
                        className="field w-full px-3 py-2 text-xs"
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        value={newStopNote}
                        onChange={(e) => setNewStopNote(e.target.value)}
                        placeholder="備註 / 交通方式（選填）"
                        className="field w-full px-3 py-2 text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="btn-cta-gradient px-5 py-2 text-xs rounded-xl w-full sm:w-auto font-bold"
                    >
                      ✓ 加入這站記錄
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
