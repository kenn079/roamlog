import type {
  BackupPayload,
  Companion,
  Coordinates,
  CreateFootprintInput,
  CreateTripInput,
  Footprint,
  FootprintFilter,
  FootprintStats,
  PhotoItem,
  Trip,
  TripDay,
  TripItem,
  WeatherInfo,
} from '../../shared/types';

const STORAGE_KEY = 'roamlog_static_store_v1';

interface LocalStore {
  companions: Companion[];
  footprints: Footprint[];
  trips: Trip[];
}

function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadStore(): LocalStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { companions: [], footprints: [], trips: [] };
    const parsed = JSON.parse(raw) as Partial<LocalStore>;
    return {
      companions: Array.isArray(parsed.companions) ? parsed.companions : [],
      footprints: Array.isArray(parsed.footprints) ? parsed.footprints : [],
      trips: Array.isArray(parsed.trips) ? parsed.trips : [],
    };
  } catch {
    return { companions: [], footprints: [], trips: [] };
  }
}

function saveStore(store: LocalStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore quota errors
  }
}

function normalizeDate(visitedAt: string): string {
  const trimmed = (visitedAt || '').trim();
  if (/^\d{4}-\d{2}$/.test(trimmed)) return `${trimmed}-01`;
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  const d = new Date(trimmed);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

function wmoToWeather(code: number, tempC: number): WeatherInfo {
  const rounded = Math.round(tempC);
  if (code === 0) return { conditionCode: code, conditionText: '晴朗', tempC: rounded, icon: '☀️' };
  if (code === 1 || code === 2)
    return { conditionCode: code, conditionText: '晴時多雲', tempC: rounded, icon: '🌤️' };
  if (code === 3) return { conditionCode: code, conditionText: '陰天', tempC: rounded, icon: '☁️' };
  if (code >= 45 && code <= 48)
    return { conditionCode: code, conditionText: '起霧', tempC: rounded, icon: '🌫️' };
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82))
    return { conditionCode: code, conditionText: '降雨', tempC: rounded, icon: '🌧️' };
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86))
    return { conditionCode: code, conditionText: '降雪', tempC: rounded, icon: '❄️' };
  if (code >= 95) return { conditionCode: code, conditionText: '雷雨', tempC: rounded, icon: '⛈️' };
  return { conditionCode: code, conditionText: '多雲', tempC: rounded, icon: '⛅' };
}

async function browserEnrich(coordinates: Coordinates, visitedAt: string) {
  const dateStr = normalizeDate(visitedAt);
  let weather: WeatherInfo | null = null;
  let geo: {
    countryCode: string;
    countryName: string;
    cityName: string;
    displayName: string;
  } | null = null;

  try {
    const visitMs = new Date(`${dateStr}T00:00:00Z`).getTime();
    const daysAgo = (Date.now() - visitMs) / (1000 * 60 * 60 * 24);
    const baseUrl =
      daysAgo > 5
        ? 'https://archive-api.open-meteo.com/v1/archive'
        : 'https://api.open-meteo.com/v1/forecast';
    const wRes = await fetch(
      `${baseUrl}?latitude=${coordinates.lat}&longitude=${coordinates.lng}&start_date=${dateStr}&end_date=${dateStr}&daily=weather_code,temperature_2m_max&timezone=auto`
    );
    if (wRes.ok) {
      const wData = await wRes.json();
      const code = wData.daily?.weather_code?.[0];
      const temp = wData.daily?.temperature_2m_max?.[0];
      if (code !== undefined && code !== null && temp !== undefined && temp !== null) {
        weather = wmoToWeather(Number(code), Number(temp));
      }
    }
  } catch {
    // Ignore weather error
  }

  try {
    const gRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coordinates.lat}&lon=${coordinates.lng}&zoom=14&addressdetails=1&accept-language=zh-TW,zh,en`
    );
    if (gRes.ok) {
      const gData = await gRes.json();
      const addr = gData.address ?? {};
      const countryCode = (addr.country_code || '').toUpperCase();
      const countryName = addr.country || '';
      const cityName =
        addr.city || addr.town || addr.county || addr.state || addr.village || '';
      geo = {
        countryCode,
        countryName,
        cityName,
        displayName: gData.display_name || cityName || countryName,
      };
    }
  } catch {
    // Ignore reverse geocode error
  }

  return { weather, geo };
}

async function browserSearchPlaces(query: string) {
  const q = query.trim();
  if (!q) return [];
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&accept-language=zh-TW,zh,en&q=${encodeURIComponent(q)}`
    );
    if (!res.ok) return [];
    const items = (await res.json()) as Array<{
      name?: string;
      display_name?: string;
      lat: string;
      lon: string;
      address?: Record<string, string>;
    }>;
    return items.map((item) => {
      const addr = item.address ?? {};
      const firstSegment = (item.display_name || '').split(',')[0]?.trim();
      return {
        title: item.name || firstSegment || q,
        displayName: item.display_name || q,
        coordinates: { lat: Number(item.lat), lng: Number(item.lon) },
        countryCode: (addr.country_code || '').toUpperCase(),
        countryName: addr.country || '',
        cityName:
          addr.city || addr.town || addr.county || addr.state || addr.village || '',
      };
    });
  } catch {
    return [];
  }
}

function isStaticHost(): boolean {
  return (
    typeof window !== 'undefined' &&
    (window.location.hostname.endsWith('github.io') || window.location.protocol === 'file:')
  );
}

async function requestOrFallback<T>(
  url: string,
  init: RequestInit | undefined,
  fallbackFn: () => T | Promise<T>
): Promise<T> {
  if (isStaticHost()) {
    return fallbackFn();
  }
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      ...init,
    });
    if (!res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (res.status === 404 && !contentType.includes('application/json')) {
        return fallbackFn();
      }
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `Request failed: ${res.status}`);
    }
    return (await res.json()) as T;
  } catch {
    return fallbackFn();
  }
}

function localCreateFootprint(store: LocalStore, input: CreateFootprintInput): Footprint {
  const comps = store.companions.filter((c) => (input.companionIds ?? []).includes(c.id));
  const fp: Footprint = {
    id: uid(),
    title: input.title,
    coordinates: input.coordinates,
    countryCode: (input.countryCode || '').toUpperCase(),
    countryName: input.countryName || '',
    cityName: input.cityName || '',
    visitedAt: input.visitedAt,
    photos: input.photos ?? [],
    note: input.note ?? '',
    rating: input.rating ?? null,
    weather: input.weather ?? null,
    companions: comps,
    tripId: input.tripId ?? null,
    tripDayId: input.tripDayId ?? null,
    extensions: input.extensions ?? {},
    createdAt: new Date().toISOString(),
  };
  store.footprints.unshift(fp);
  saveStore(store);
  return fp;
}

export const api = {
  getStats(): Promise<FootprintStats> {
    return requestOrFallback('/api/stats', undefined, () => {
      const store = loadStore();
      const countrySet = new Set<string>();
      const citySet = new Set<string>();
      const yearSet = new Set<string>();
      for (const f of store.footprints) {
        if (f.countryCode?.trim()) countrySet.add(f.countryCode.trim().toUpperCase());
        if (f.cityName?.trim()) citySet.add(`${f.countryCode}:${f.cityName.trim()}`);
        const yr = f.visitedAt?.slice(0, 4) || '';
        if (/^\d{4}$/.test(yr)) yearSet.add(yr);
      }
      const visitedCountryCodes = Array.from(countrySet).sort();
      const years = Array.from(yearSet).sort((a, b) => b.localeCompare(a));
      return {
        countryCount: visitedCountryCodes.length,
        cityCount: citySet.size,
        visitedCountryCodes,
        years,
      };
    });
  },

  listCompanions(): Promise<Companion[]> {
    return requestOrFallback('/api/companions', undefined, () => loadStore().companions);
  },

  createCompanion(name: string, avatarColor: string = '#f59e0b'): Promise<Companion> {
    return requestOrFallback(
      '/api/companions',
      { method: 'POST', body: JSON.stringify({ name, avatarColor }) },
      () => {
        const store = loadStore();
        const c: Companion = { id: uid(), name: name.trim(), avatarColor };
        store.companions.push(c);
        saveStore(store);
        return c;
      }
    );
  },

  listFootprints(filter?: FootprintFilter): Promise<Footprint[]> {
    const params = new URLSearchParams();
    if (filter?.year) params.set('year', filter.year);
    if (filter?.countryCode) params.set('countryCode', filter.countryCode);
    if (filter?.companionId) params.set('companionId', filter.companionId);
    if (filter?.tripId) params.set('tripId', filter.tripId);
    const qs = params.toString();
    return requestOrFallback(`/api/footprints${qs ? `?${qs}` : ''}`, undefined, () => {
      const store = loadStore();
      return store.footprints.filter((f) => {
        if (filter?.year && f.visitedAt.slice(0, 4) !== filter.year) return false;
        if (filter?.countryCode && f.countryCode.toUpperCase() !== filter.countryCode.toUpperCase())
          return false;
        if (filter?.tripId && f.tripId !== filter.tripId) return false;
        if (filter?.companionId && !f.companions.some((c) => c.id === filter.companionId))
          return false;
        return true;
      });
    });
  },

  createFootprint(input: CreateFootprintInput): Promise<Footprint> {
    return requestOrFallback(
      '/api/footprints',
      { method: 'POST', body: JSON.stringify(input) },
      async () => {
        let enrichedInput = { ...input };
        if (!enrichedInput.countryCode || !enrichedInput.weather) {
          const enriched = await browserEnrich(enrichedInput.coordinates, enrichedInput.visitedAt);
          if (!enrichedInput.weather && enriched.weather) {
            enrichedInput.weather = enriched.weather;
          }
          if (enriched.geo) {
            if (!enrichedInput.countryCode) enrichedInput.countryCode = enriched.geo.countryCode;
            if (!enrichedInput.countryName) enrichedInput.countryName = enriched.geo.countryName;
            if (!enrichedInput.cityName) enrichedInput.cityName = enriched.geo.cityName;
          }
        }
        const store = loadStore();
        return localCreateFootprint(store, enrichedInput);
      }
    );
  },

  updateFootprint(id: string, patch: Partial<CreateFootprintInput>): Promise<Footprint> {
    return requestOrFallback(
      `/api/footprints/${id}`,
      { method: 'PATCH', body: JSON.stringify(patch) },
      () => {
        const store = loadStore();
        const idx = store.footprints.findIndex((f) => f.id === id);
        if (idx === -1) throw new Error('Footprint not found');
        const prev = store.footprints[idx];
        const updated: Footprint = {
          ...prev,
          title: patch.title ?? prev.title,
          coordinates: patch.coordinates ?? prev.coordinates,
          countryCode: patch.countryCode !== undefined ? patch.countryCode.toUpperCase() : prev.countryCode,
          countryName: patch.countryName ?? prev.countryName,
          cityName: patch.cityName ?? prev.cityName,
          visitedAt: patch.visitedAt ?? prev.visitedAt,
          photos: patch.photos ?? prev.photos,
          note: patch.note ?? prev.note,
          rating: patch.rating !== undefined ? patch.rating : prev.rating,
          weather: patch.weather !== undefined ? patch.weather : prev.weather,
          companions:
            patch.companionIds !== undefined
              ? store.companions.filter((c) => patch.companionIds!.includes(c.id))
              : prev.companions,
        };
        store.footprints[idx] = updated;
        saveStore(store);
        return updated;
      }
    );
  },

  deleteFootprint(id: string): Promise<void> {
    return requestOrFallback(
      `/api/footprints/${id}`,
      { method: 'DELETE' },
      () => {
        const store = loadStore();
        store.footprints = store.footprints.filter((f) => f.id !== id);
        for (const t of store.trips) {
          for (const d of t.days) {
            for (const item of d.items) {
              if (item.footprintId === id) {
                item.footprintId = null;
                item.footprint = null;
              }
            }
          }
        }
        saveStore(store);
        return { ok: true };
      }
    ).then(() => undefined);
  },

  listTrips(): Promise<Trip[]> {
    return requestOrFallback('/api/trips', undefined, () => loadStore().trips);
  },

  getTrip(id: string): Promise<Trip> {
    return requestOrFallback(`/api/trips/${id}`, undefined, () => {
      const found = loadStore().trips.find((t) => t.id === id);
      if (!found) throw new Error('Trip not found');
      return found;
    });
  },

  createTrip(input: CreateTripInput): Promise<Trip> {
    return requestOrFallback(
      '/api/trips',
      { method: 'POST', body: JSON.stringify(input) },
      () => {
        const store = loadStore();
        const tripId = uid();
        const dayCount = Math.max(1, input.dayCount ?? 1);
        const days: TripDay[] = [];
        for (let i = 1; i <= dayCount; i++) {
          let dayDate: string | null = null;
          if (input.startDate && /^\d{4}-\d{2}-\d{2}$/.test(input.startDate)) {
            const dt = new Date(`${input.startDate}T00:00:00Z`);
            dt.setUTCDate(dt.getUTCDate() + (i - 1));
            dayDate = dt.toISOString().slice(0, 10);
          }
          days.push({
            id: uid(),
            tripId,
            dayNumber: i,
            date: dayDate,
            title: `Day ${i}`,
            items: [],
          });
        }
        const trip: Trip = {
          id: tripId,
          title: input.title,
          coverPhoto: input.coverPhoto ?? null,
          startDate: input.startDate ?? null,
          endDate: input.endDate ?? null,
          status: input.status ?? 'planning',
          companions: store.companions.filter((c) => (input.companionIds ?? []).includes(c.id)),
          summaryNote: input.summaryNote ?? '',
          days,
          extensions: input.extensions ?? {},
          createdAt: new Date().toISOString(),
        };
        store.trips.unshift(trip);
        saveStore(store);
        return trip;
      }
    );
  },

  updateTrip(id: string, patch: Partial<CreateTripInput>): Promise<Trip> {
    return requestOrFallback(
      `/api/trips/${id}`,
      { method: 'PATCH', body: JSON.stringify(patch) },
      () => {
        const store = loadStore();
        const idx = store.trips.findIndex((t) => t.id === id);
        if (idx === -1) throw new Error('Trip not found');
        store.trips[idx] = {
          ...store.trips[idx],
          title: patch.title ?? store.trips[idx].title,
          status: patch.status ?? store.trips[idx].status,
          summaryNote: patch.summaryNote ?? store.trips[idx].summaryNote,
        };
        saveStore(store);
        return store.trips[idx];
      }
    );
  },

  deleteTrip(id: string): Promise<void> {
    return requestOrFallback(
      `/api/trips/${id}`,
      { method: 'DELETE' },
      () => {
        const store = loadStore();
        store.trips = store.trips.filter((t) => t.id !== id);
        for (const f of store.footprints) {
          if (f.tripId === id) {
            f.tripId = null;
            f.tripDayId = null;
          }
        }
        saveStore(store);
        return { ok: true };
      }
    ).then(() => undefined);
  },

  addTripDay(
    tripId: string,
    input: { dayNumber?: number; date?: string | null; title?: string }
  ): Promise<TripDay> {
    return requestOrFallback(
      `/api/trips/${tripId}/days`,
      { method: 'POST', body: JSON.stringify(input) },
      () => {
        const store = loadStore();
        const trip = store.trips.find((t) => t.id === tripId);
        if (!trip) throw new Error('Trip not found');
        const nextNum = input.dayNumber ?? trip.days.length + 1;
        const day: TripDay = {
          id: uid(),
          tripId,
          dayNumber: nextNum,
          date: input.date ?? null,
          title: input.title ?? `Day ${nextNum}`,
          items: [],
        };
        trip.days.push(day);
        saveStore(store);
        return day;
      }
    );
  },

  addTripItem(
    dayId: string,
    input: {
      title: string;
      coordinates?: Coordinates | null;
      plannedTime?: string;
      note?: string;
    }
  ): Promise<TripItem> {
    return requestOrFallback(
      `/api/trip-days/${dayId}/items`,
      { method: 'POST', body: JSON.stringify(input) },
      () => {
        const store = loadStore();
        for (const trip of store.trips) {
          const day = trip.days.find((d) => d.id === dayId);
          if (day) {
            const item: TripItem = {
              id: uid(),
              tripId: trip.id,
              tripDayId: day.id,
              title: input.title,
              coordinates: input.coordinates ?? null,
              sortOrder: day.items.length + 1,
              plannedTime: input.plannedTime,
              note: input.note,
              footprintId: null,
              footprint: null,
              extensions: {},
            };
            day.items.push(item);
            saveStore(store);
            return item;
          }
        }
        throw new Error('TripDay not found');
      }
    );
  },

  reorderTripItems(dayId: string, orderedItemIds: string[]): Promise<TripItem[]> {
    return requestOrFallback(
      `/api/trip-days/${dayId}/reorder`,
      { method: 'PUT', body: JSON.stringify({ orderedItemIds }) },
      () => {
        const store = loadStore();
        for (const trip of store.trips) {
          const day = trip.days.find((d) => d.id === dayId);
          if (day) {
            day.items.sort(
              (a, b) => orderedItemIds.indexOf(a.id) - orderedItemIds.indexOf(b.id)
            );
            day.items.forEach((it, idx) => {
              it.sortOrder = idx + 1;
            });
            saveStore(store);
            return day.items;
          }
        }
        return [];
      }
    );
  },

  checkInTripItem(
    itemId: string,
    input: Partial<CreateFootprintInput> & { coordinates: Coordinates; visitedAt: string }
  ): Promise<{ tripItem: TripItem; footprint: Footprint }> {
    return requestOrFallback(
      `/api/trip-items/${itemId}/checkin`,
      { method: 'POST', body: JSON.stringify(input) },
      async () => {
        const store = loadStore();
        for (const trip of store.trips) {
          for (const day of trip.days) {
            const item = day.items.find((i) => i.id === itemId);
            if (item) {
              const enriched = await browserEnrich(input.coordinates, input.visitedAt);
              const fp = localCreateFootprint(store, {
                title: input.title ?? item.title,
                coordinates: input.coordinates,
                countryCode: input.countryCode || enriched.geo?.countryCode,
                countryName: input.countryName || enriched.geo?.countryName,
                cityName: input.cityName || enriched.geo?.cityName,
                visitedAt: input.visitedAt,
                photos: input.photos ?? [],
                note: input.note ?? item.note ?? '',
                rating: input.rating ?? 5,
                weather: input.weather ?? enriched.weather,
                companionIds:
                  input.companionIds ?? trip.companions.map((c) => c.id),
                tripId: trip.id,
                tripDayId: day.id,
              });
              item.footprintId = fp.id;
              item.footprint = fp;
              item.coordinates = input.coordinates;
              saveStore(store);
              return { tripItem: item, footprint: fp };
            }
          }
        }
        throw new Error('TripItem not found');
      }
    );
  },

  addLiveTripCheckIn(
    dayId: string,
    input: CreateFootprintInput
  ): Promise<{ tripItem: TripItem; footprint: Footprint }> {
    return requestOrFallback(
      `/api/trip-days/${dayId}/live-checkin`,
      { method: 'POST', body: JSON.stringify(input) },
      async () => {
        const store = loadStore();
        for (const trip of store.trips) {
          const day = trip.days.find((d) => d.id === dayId);
          if (day) {
            const enriched = await browserEnrich(input.coordinates, input.visitedAt);
            const fp = localCreateFootprint(store, {
              ...input,
              countryCode: input.countryCode || enriched.geo?.countryCode,
              countryName: input.countryName || enriched.geo?.countryName,
              cityName: input.cityName || enriched.geo?.cityName,
              weather: input.weather ?? enriched.weather,
              companionIds:
                input.companionIds ?? trip.companions.map((c) => c.id),
              tripId: trip.id,
              tripDayId: day.id,
            });
            const item: TripItem = {
              id: uid(),
              tripId: trip.id,
              tripDayId: day.id,
              title: input.title,
              coordinates: input.coordinates,
              sortOrder: day.items.length + 1,
              note: input.note,
              footprintId: fp.id,
              footprint: fp,
              extensions: {},
            };
            day.items.push(item);
            saveStore(store);
            return { tripItem: item, footprint: fp };
          }
        }
        throw new Error('TripDay not found');
      }
    );
  },

  enrich(
    coordinates: Coordinates,
    visitedAt: string
  ): Promise<{
    weather: WeatherInfo | null;
    geo: {
      countryCode: string;
      countryName: string;
      cityName: string;
      displayName: string;
    } | null;
  }> {
    return requestOrFallback(
      '/api/enrich',
      { method: 'POST', body: JSON.stringify({ coordinates, visitedAt }) },
      () => browserEnrich(coordinates, visitedAt)
    );
  },

  searchPlaces(
    query: string
  ): Promise<
    Array<{
      title: string;
      displayName: string;
      coordinates: Coordinates;
      countryCode: string;
      countryName: string;
      cityName: string;
    }>
  > {
    return requestOrFallback(
      `/api/places/search?q=${encodeURIComponent(query)}`,
      undefined,
      () => browserSearchPlaces(query)
    );
  },

  uploadPhoto(dataUrl: string, caption?: string, takenAt?: string): Promise<PhotoItem> {
    return requestOrFallback(
      '/api/photos',
      { method: 'POST', body: JSON.stringify({ dataUrl, caption, takenAt }) },
      () => ({
        id: uid(),
        url: dataUrl,
        caption,
        takenAt,
      })
    );
  },

  exportBackup(): Promise<BackupPayload> {
    return requestOrFallback('/api/backup/export', undefined, () => {
      const store = loadStore();
      return {
        version: 1,
        exportedAt: new Date().toISOString(),
        companions: store.companions,
        footprints: store.footprints,
        trips: store.trips,
      };
    });
  },

  importBackup(payload: BackupPayload): Promise<void> {
    return requestOrFallback(
      '/api/backup/import',
      { method: 'POST', body: JSON.stringify(payload) },
      () => {
        saveStore({
          companions: payload.companions ?? [],
          footprints: payload.footprints ?? [],
          trips: payload.trips ?? [],
        });
        return { ok: true };
      }
    ).then(() => undefined);
  },
};

