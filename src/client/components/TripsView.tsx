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

            {/* Day Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {activeTrip.days.map((d) => {
                const isDayActive = activeDay?.id === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    data-active={isDayActive}
                    onClick={() => setSelectedDayId(d.id)}
                    className="chip px-3.5 py-1.5 text-xs font-semibold shrink-0"
                  >
                    第 {d.dayNumber} 天
                    {d.date ? ` (${d.date.slice(5)})` : ''}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={handleAddDay}
                className="px-3 py-1.5 rounded-full bg-surface-2 hover:border-ink-faint border border-dashed border-line text-xs text-ink-soft shrink-0 cursor-pointer"
              >
                + 新增天數
              </button>
            </div>

            {/* Active Day Timeline */}
            {activeDay && (
              <div className="space-y-4">
                <div className="font-display text-sm font-semibold text-accent">
                  Day {activeDay.dayNumber} · {activeDay.title}
                </div>

                {activeDay.items.length === 0 ? (
                  <div className="bg-surface-2/60 border border-line rounded-2xl p-6 text-center text-xs text-ink-soft">
                    這一天還沒有排定或打卡的行程節點。可在下方新增預定行程，或直接點擊右上角「＋新增即時踩點」。
                  </div>
                ) : (
                  <div className="space-y-3 relative before:absolute before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-line">
                    {activeDay.items.map((item) => {
                      const isVisited = Boolean(item.footprintId);
                      return (
                        <div
                          key={item.id}
                          className="relative pl-10 flex items-center justify-between gap-3 bg-surface-2/65 border border-line rounded-2xl p-3.5"
                        >
                          <div className="absolute left-2.5 top-4">
                            {isVisited ? (
                              <CheckCircle2 className="w-4 h-4 text-moss bg-surface rounded-full" />
                            ) : (
                              <Circle className="w-4 h-4 text-ink-faint bg-surface rounded-full" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {item.plannedTime && (
                                <span className="text-xs font-mono text-accent">
                                  {item.plannedTime}
                                </span>
                              )}
                              <span className="font-display font-bold text-sm text-ink">
                                {item.title}
                              </span>
                              {isVisited && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-moss/15 text-moss border border-moss/30 font-medium">
                                  已踩點同步至總足跡
                                </span>
                              )}
                            </div>
                            {item.note && (
                              <p className="text-xs text-ink-soft mt-1">{item.note}</p>
                            )}
                          </div>

                          <div className="shrink-0">
                            {isVisited && item.footprint ? (
                              <button
                                type="button"
                                onClick={() => onSelectFootprint(item.footprint!)}
                                className="btn-soft px-3 py-1.5 text-xs"
                              >
                                查看拍立得
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleQuickCheckInStop(item)}
                                className="btn-primary px-3 py-1.5 text-xs"
                              >
                                打卡踩點
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add Planned Stop Form */}
                <form
                  onSubmit={handleAddPlannedStop}
                  className="bg-surface-2/50 border border-line rounded-2xl p-3 flex flex-col sm:flex-row gap-2"
                >
                  <input
                    type="time"
                    value={newStopTime}
                    onChange={(e) => setNewStopTime(e.target.value)}
                    className="field px-2.5 py-1.5 text-xs sm:w-28"
                  />
                  <input
                    type="text"
                    value={newStopTitle}
                    onChange={(e) => setNewStopTitle(e.target.value)}
                    placeholder="新增預定景點（如：伏見稻荷大社）..."
                    className="field flex-1 px-3 py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    value={newStopNote}
                    onChange={(e) => setNewStopNote(e.target.value)}
                    placeholder="備註（選填）"
                    className="field px-3 py-1.5 text-xs sm:w-44"
                  />
                  <button type="submit" className="btn-soft px-3.5 py-1.5 text-xs shrink-0">
                    ＋排入行程
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
