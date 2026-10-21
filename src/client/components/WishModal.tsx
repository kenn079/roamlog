import React, { useEffect, useState } from 'react';
import { X, Search, Navigation, Star, Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import type { Coordinates, WishCategory } from '../../shared/types';
import { WISH_CATEGORY_LABELS } from '../../shared/types';

export interface WishModalProps {
  initialCoordinates?: Coordinates | null;
  onCreated: () => void;
  onClose: () => void;
}

const CATEGORIES: WishCategory[] = ['attraction', 'food', 'cafe', 'nature', 'shopping', 'other'];

export function WishModal({
  initialCoordinates,
  onCreated,
  onClose,
}: WishModalProps): React.ReactElement {
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
  const [category, setCategory] = useState<WishCategory>('attraction');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialCoordinates) {
      setCoordinates(initialCoordinates);
      triggerEnrich(initialCoordinates);
    }
  }, [initialCoordinates]);

  async function triggerEnrich(coords: Coordinates) {
    try {
      const res = await api.enrich(coords, new Date().toISOString().slice(0, 10));
      if (res.geo) {
        if (res.geo.countryCode) setCountryCode(res.geo.countryCode);
        if (res.geo.countryName) setCountryName(res.geo.countryName);
        if (res.geo.cityName) setCityName(res.geo.cityName);
      }
    } catch {
      // Ignore enrichment error
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
    await triggerEnrich(place.coordinates);
  }

  function handleUseCurrentGps() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setCoordinates(coords);
      triggerEnrich(coords);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await api.createWish({
        title: title.trim(),
        coordinates,
        countryCode: countryCode || undefined,
        countryName: countryName || undefined,
        cityName: cityName || undefined,
        category,
        note: note.trim(),
      });
      onCreated();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-md panel p-6 text-ink my-8 shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-bold flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-sun/15 flex items-center justify-center text-sun">
              <Star className="w-4 h-4 fill-sun" />
            </div>
            新增想去心願（To-Go）
          </h2>
          <button type="button" onClick={onClose} className="btn-ghost p-1.5" aria-label="關閉">
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
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              placeholder="搜尋想去的景點或餐廳..."
              className="field flex-1 px-3.5 py-2 text-sm"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={searching}
              className="btn-soft px-3.5 py-2 text-sm"
            >
              <Search className="w-4 h-4 text-sun" />
              搜尋
            </button>
            <button
              type="button"
              onClick={handleUseCurrentGps}
              title="使用目前 GPS 定位"
              className="btn-soft px-3 py-2 text-sm"
            >
              <Navigation className="w-4 h-4 text-moss" />
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-2 bg-surface-2 border border-line rounded-2xl overflow-hidden divide-y divide-line max-h-44 overflow-y-auto">
              {searchResults.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPlace(item)}
                  className="w-full text-left px-3.5 py-2 hover:bg-surface text-xs transition cursor-pointer"
                >
                  <div className="font-semibold text-ink">{item.title}</div>
                  <div className="text-[11px] text-ink-faint truncate">{item.displayName}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-ink-soft block mb-1.5">
              心願名稱 <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：清水寺、金閣寺、HARBS 蛋糕"
              className="field w-full px-3.5 py-2 text-sm"
            />
          </div>

          {/* Location Badge */}
          <div className="p-2.5 bg-surface-2 border border-line rounded-xl flex items-center justify-between text-xs text-ink-soft">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sun" />
              <span>{cityName || countryName ? `${cityName || ''} ${countryName || ''}` : '座標定位'}</span>
            </span>
            <span className="font-mono text-[11px] text-ink-faint">
              {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
            </span>
          </div>

          {/* Category Chips */}
          <div>
            <label className="text-xs font-semibold text-ink-soft block mb-1.5">分類標籤</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => {
                const active = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer border ${
                      active
                        ? 'bg-sun text-ink border-sun shadow-xs font-bold'
                        : 'bg-surface-2 text-ink-soft border-line hover:border-ink-faint'
                    }`}
                  >
                    {WISH_CATEGORY_LABELS[cat]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="text-xs font-semibold text-ink-soft block mb-1.5">
              備註短記（選填）
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="例如：朋友推薦的抹茶冰淇淋、記得預約入園門票..."
              className="field w-full px-3.5 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-line">
            <button type="button" onClick={onClose} className="btn-soft px-4 py-2 text-xs">
              取消
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="btn-primary px-5 py-2 text-xs shadow-sm cursor-pointer"
              style={{ backgroundColor: 'var(--sun)', color: 'var(--paper-ink)' }}
            >
              {saving ? '儲存中...' : '⭐ 加入心願清單'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
