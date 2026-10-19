import React, { useEffect, useState } from 'react';
import {
  X,
  Search,
  MapPin,
  Navigation,
  Star,
  Plus,
  Camera,
  CloudSun,
  Users,
} from 'lucide-react';
import { api } from '../lib/api';
import type {
  Companion,
  Coordinates,
  PhotoItem,
  Trip,
  WeatherInfo,
} from '../../shared/types';

export interface CheckInModalProps {
  companions: Companion[];
  trips: Trip[];
  initialCoordinates?: Coordinates | null;
  preselectedTripDay?: { tripId: string; tripDayId: string } | null;
  onCreated: () => void;
  onCompanionCreated: (c: Companion) => void;
  onClose: () => void;
}

export function CheckInModal({
  companions,
  trips,
  initialCoordinates,
  preselectedTripDay,
  onCreated,
  onCompanionCreated,
  onClose,
}: CheckInModalProps): React.ReactElement {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<
    Array<{
      title: string;
      displayName: string;
      coordinates: Coordinates;
      countryCode: string;
      countryName: string;
      cityName: string;
    }>
  >([]);
  const [searching, setSearching] = useState(false);

  const [title, setTitle] = useState('');
  const [coordinates, setCoordinates] = useState<Coordinates>(
    initialCoordinates ?? { lat: 25.0339, lng: 121.5645 }
  );
  const [countryCode, setCountryCode] = useState('');
  const [countryName, setCountryName] = useState('');
  const [cityName, setCityName] = useState('');
  const [monthOnlyMode, setMonthOnlyMode] = useState(false);
  const [visitedAt, setVisitedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [note, setNote] = useState('');
  const [rating, setRating] = useState<number | null>(5);
  const [selectedCompanionIds, setSelectedCompanionIds] = useState<string[]>([]);
  const [newCompanionName, setNewCompanionName] = useState('');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>(
    preselectedTripDay?.tripId ?? ''
  );
  const [selectedTripDayId, setSelectedTripDayId] = useState<string>(
    preselectedTripDay?.tripDayId ?? ''
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialCoordinates) {
      setCoordinates(initialCoordinates);
      triggerEnrich(initialCoordinates, visitedAt);
    }
  }, [initialCoordinates]);

  async function triggerEnrich(coords: Coordinates, dateStr: string) {
    try {
      const res = await api.enrich(coords, dateStr);
      if (res.weather) setWeather(res.weather);
      if (res.geo) {
        if (res.geo.countryCode) setCountryCode(res.geo.countryCode);
        if (res.geo.countryName) setCountryName(res.geo.countryName);
        if (res.geo.cityName) setCityName(res.geo.cityName);
      }
    } catch {
      // Ignore enrichment error in offline mode
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const list = await api.searchPlaces(searchQuery);
      setSearchResults(list);
    } finally {
      setSearching(false);
    }
  }

  async function handleSelectPlace(place: {
    title: string;
    displayName: string;
    coordinates: Coordinates;
    countryCode: string;
    countryName: string;
    cityName: string;
  }) {
    setTitle(place.title);
    setCoordinates(place.coordinates);
    setCountryCode(place.countryCode);
    setCountryName(place.countryName);
    setCityName(place.cityName);
    setSearchResults([]);
    await triggerEnrich(place.coordinates, visitedAt);
  }

  function handleUseCurrentGps() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const coords = {
        lat: Number(pos.coords.latitude.toFixed(6)),
        lng: Number(pos.coords.longitude.toFixed(6)),
      };
      setCoordinates(coords);
      triggerEnrich(coords, visitedAt);
    });
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = String(reader.result || '');
        if (!dataUrl) return;
        try {
          const uploaded = await api.uploadPhoto(dataUrl, file.name);
          setPhotos((prev) => [...prev, uploaded]);
        } catch {
          setPhotos((prev) => [
            ...prev,
            { id: `local-${Date.now()}`, url: dataUrl, caption: file.name },
          ]);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleAddCompanion() {
    if (!newCompanionName.trim()) return;
    const created = await api.createCompanion(newCompanionName.trim());
    onCompanionCreated(created);
    setSelectedCompanionIds((prev) => [...prev, created.id]);
    setNewCompanionName('');
  }

  function toggleCompanion(id: string) {
    setSelectedCompanionIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const finalTitle = title.trim() || searchQuery.trim() || '未命名地標';
    setSaving(true);
    try {
      if (selectedTripDayId) {
        await api.addLiveTripCheckIn(selectedTripDayId, {
          title: finalTitle,
          coordinates,
          countryCode,
          countryName,
          cityName,
          visitedAt,
          photos,
          note,
          rating,
          weather,
          companionIds: selectedCompanionIds.length > 0 ? selectedCompanionIds : undefined,
        });
      } else {
        await api.createFootprint({
          title: finalTitle,
          coordinates,
          countryCode,
          countryName,
          cityName,
          visitedAt,
          photos,
          note,
          rating,
          weather,
          companionIds: selectedCompanionIds,
          tripId: selectedTripId || null,
          tripDayId: selectedTripDayId || null,
        });
      }
      onCreated();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const activeTrip = trips.find((t) => t.id === selectedTripId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 shadow-2xl my-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <MapPin className="w-5 h-5 text-amber-400" />
            打卡踩點 / 新增地標回憶
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Place Search Bar */}
        <div className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋地標名稱（如：清水寺、巴黎鐵塔）..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-400"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={searching}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <Search className="w-4 h-4 text-amber-400" />
              搜尋
            </button>
            <button
              type="button"
              onClick={handleUseCurrentGps}
              title="使用目前 GPS 定位"
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm flex items-center cursor-pointer"
            >
              <Navigation className="w-4 h-4 text-sky-400" />
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-2 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden divide-y divide-slate-700/60 max-h-44 overflow-y-auto">
              {searchResults.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPlace(item)}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-slate-700/70 transition flex flex-col cursor-pointer"
                >
                  <span className="text-sm font-semibold text-amber-300">{item.title}</span>
                  <span className="text-xs text-slate-400 truncate">{item.displayName}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Title & Location Badge */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">地標名稱 *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="輸入地標名稱"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-slate-400">造訪日期</label>
                <button
                  type="button"
                  onClick={() => {
                    const nextMode = !monthOnlyMode;
                    setMonthOnlyMode(nextMode);
                    setVisitedAt((prev) => (nextMode ? prev.slice(0, 7) : `${prev.slice(0, 7)}-01`));
                  }}
                  className="text-[11px] text-amber-400 hover:underline cursor-pointer"
                >
                  {monthOnlyMode ? '切換完整日期' : '只記得年月'}
                </button>
              </div>
              <input
                type={monthOnlyMode ? 'month' : 'date'}
                value={visitedAt}
                onChange={(e) => {
                  setVisitedAt(e.target.value);
                  triggerEnrich(coordinates, e.target.value);
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
              />
            </div>
          </div>

          {/* Auto Weather & Location Info Strip */}
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-3 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>
                {[cityName, countryName || countryCode].filter(Boolean).join(' · ') ||
                  `${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}`}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-amber-300 font-medium">
              <CloudSun className="w-4 h-4" />
              {weather ? (
                <span>
                  {weather.icon} {weather.tempC}°C {weather.conditionText}
                </span>
              ) : (
                <span className="text-slate-400">自動抓取天氣中 / 可選填</span>
              )}
            </div>
          </div>

          {/* Photo Upload & Preview */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">拍立得照片</label>
            <div className="flex items-center gap-2 flex-wrap">
              {photos.map((p) => (
                <div key={p.id} className="w-16 h-16 rounded-lg overflow-hidden border border-slate-700">
                  <img src={p.url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
              <label className="w-16 h-16 rounded-lg border border-dashed border-slate-600 hover:border-amber-400 flex flex-col items-center justify-center text-slate-400 hover:text-amber-300 cursor-pointer transition">
                <Camera className="w-5 h-5" />
                <span className="text-[10px] mt-0.5">新增照片</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Note & Star Rating */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-slate-400">隨筆短評</label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="cursor-pointer"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        (rating ?? 0) >= star
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="寫下一兩句當下的心情或特別回憶..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500"
            />
          </div>

          {/* Companions Selector */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              同行旅伴
            </label>
            <div className="flex items-center gap-1.5 flex-wrap mb-2">
              {companions.map((c) => {
                const active = selectedCompanionIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCompanion(c.id)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                      active
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCompanionName}
                onChange={(e) => setNewCompanionName(e.target.value)}
                placeholder="新增旅伴標籤（如：家人、小美、獨旅）"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
              />
              <button
                type="button"
                onClick={handleAddCompanion}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-amber-300 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                新增旅伴
              </button>
            </div>
          </div>

          {/* Optional Link to Trip */}
          {trips.length > 0 && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="block text-xs text-slate-400 mb-1">歸屬旅程（選填）</label>
                <select
                  value={selectedTripId}
                  onChange={(e) => {
                    setSelectedTripId(e.target.value);
                    setSelectedTripDayId('');
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="">獨立足跡（不歸屬特定旅程）</option>
                  {trips.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>

              {activeTrip && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">旅程天數</label>
                  <select
                    value={selectedTripDayId}
                    onChange={(e) => setSelectedTripDayId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="">不指定天數</option>
                    {activeTrip.days.map((d) => (
                      <option key={d.id} value={d.id}>
                        Day {d.dayNumber} {d.title ? `· ${d.title}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm text-slate-300 cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer"
            >
              {saving ? '儲存中...' : '儲存踩點'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
