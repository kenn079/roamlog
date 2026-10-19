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
  Compass,
} from 'lucide-react';
import { api } from '../lib/api';
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
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Compass className="w-5 h-5 text-amber-400" />
            獨立旅程本 ({trips.length})
          </h2>
          <button
            type="button"
            onClick={() => setShowNewTripForm((v) => !v)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            建立新旅程
          </button>
        </div>

        {showNewTripForm && (
          <form
            onSubmit={handleCreateTrip}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3"
          >
            <div>
              <label className="block text-xs text-slate-400 mb-1">旅程名稱 *</label>
              <input
                type="text"
                required
                value={newTripTitle}
                onChange={(e) => setNewTripTitle(e.target.value)}
                placeholder="例如：2025 京都賞楓 5 日行"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-sm text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-slate-400 mb-1">出發日期</label>
                <input
                  type="date"
                  value={newTripStartDate}
                  onChange={(e) => setNewTripStartDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">預計天數</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={newTripDayCount}
                  onChange={(e) => setNewTripDayCount(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>

            {companions.length > 0 && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">同行旅伴（打卡自動帶入）</label>
                <div className="flex flex-wrap gap-1.5">
                  {companions.map((c) => {
                    const active = newTripCompanionIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() =>
                          setNewTripCompanionIds((prev) =>
                            prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id]
                          )
                        }
                        className={`px-2 py-0.5 rounded-full text-xs cursor-pointer ${
                          active ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'
                        }`}
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
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-xs text-slate-300 cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold cursor-pointer"
              >
                建立旅程
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2">
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
                    ? 'bg-slate-800/90 border-amber-500/60 shadow-lg'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="min-w-0">
                  <div className="font-bold text-sm text-white truncate">{trip.title}</div>
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
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
                    <div className="flex items-center gap-1 mt-1.5 text-[11px] text-amber-300">
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
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Content: Selected Trip Day-by-Day Live Journal */}
      <div className="lg:col-span-8">
        {!activeTrip ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center text-slate-400">
            尚未選擇或建立旅程。點擊左側「建立新旅程」，即可開始規劃每日行程並在旅途中即時打卡！
          </div>
        ) : (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">{activeTrip.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
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
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-300 text-xs font-semibold cursor-pointer"
                  >
                    🗺️ 在地圖檢視路線軌跡 ({computeTripRouteCoordinates(activeTrip).length} 點)
                  </button>
                )}

                {activeDay && onOpenLiveCheckIn && (
                  <button
                    type="button"
                    onClick={() => onOpenLiveCheckIn(activeTrip.id, activeDay.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer self-start"
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
                    onClick={() => setSelectedDayId(d.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition cursor-pointer ${
                      isDayActive
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    第 {d.dayNumber} 天
                    {d.date ? ` (${d.date.slice(5)})` : ''}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={handleAddDay}
                className="px-3 py-1.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-dashed border-slate-700 text-xs text-slate-300 shrink-0 cursor-pointer"
              >
                + 新增天數
              </button>
            </div>

            {/* Active Day Timeline */}
            {activeDay && (
              <div className="space-y-4">
                <div className="text-sm font-semibold text-amber-300">
                  Day {activeDay.dayNumber} · {activeDay.title}
                </div>

                {activeDay.items.length === 0 ? (
                  <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-6 text-center text-xs text-slate-400">
                    這一天還沒有排定或打卡的行程節點。可在下方新增預定行程，或直接點擊右上角「＋新增即時踩點」。
                  </div>
                ) : (
                  <div className="space-y-3 relative before:absolute before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
                    {activeDay.items.map((item) => {
                      const isVisited = Boolean(item.footprintId);
                      return (
                        <div
                          key={item.id}
                          className="relative pl-10 flex items-center justify-between gap-3 bg-slate-800/60 border border-slate-700/70 rounded-xl p-3.5"
                        >
                          <div className="absolute left-2.5 top-4">
                            {isVisited ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 bg-slate-900 rounded-full" />
                            ) : (
                              <Circle className="w-4 h-4 text-slate-500 bg-slate-900 rounded-full" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {item.plannedTime && (
                                <span className="text-xs font-mono text-amber-400">
                                  {item.plannedTime}
                                </span>
                              )}
                              <span className="font-bold text-sm text-white">{item.title}</span>
                              {isVisited && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  已踩點同步至總足跡
                                </span>
                              )}
                            </div>
                            {item.note && (
                              <p className="text-xs text-slate-400 mt-1">{item.note}</p>
                            )}
                          </div>

                          <div className="shrink-0">
                            {isVisited && item.footprint ? (
                              <button
                                type="button"
                                onClick={() => onSelectFootprint(item.footprint!)}
                                className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs text-amber-300 font-medium cursor-pointer"
                              >
                                查看拍立得
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleQuickCheckInStop(item)}
                                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer"
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
                  className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row gap-2"
                >
                  <input
                    type="time"
                    value={newStopTime}
                    onChange={(e) => setNewStopTime(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white sm:w-28"
                  />
                  <input
                    type="text"
                    value={newStopTitle}
                    onChange={(e) => setNewStopTitle(e.target.value)}
                    placeholder="新增預定景點（如：伏見稻荷大社）..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={newStopNote}
                    onChange={(e) => setNewStopNote(e.target.value)}
                    placeholder="備註（選填）"
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white sm:w-44"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-amber-300 shrink-0 cursor-pointer"
                  >
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
