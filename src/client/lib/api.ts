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

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getStats(): Promise<FootprintStats> {
    return requestJson<FootprintStats>('/api/stats');
  },

  listCompanions(): Promise<Companion[]> {
    return requestJson<Companion[]>('/api/companions');
  },

  createCompanion(name: string, avatarColor?: string): Promise<Companion> {
    return requestJson<Companion>('/api/companions', {
      method: 'POST',
      body: JSON.stringify({ name, avatarColor }),
    });
  },

  listFootprints(filter?: FootprintFilter): Promise<Footprint[]> {
    const params = new URLSearchParams();
    if (filter?.year) params.set('year', filter.year);
    if (filter?.countryCode) params.set('countryCode', filter.countryCode);
    if (filter?.companionId) params.set('companionId', filter.companionId);
    if (filter?.tripId) params.set('tripId', filter.tripId);
    const qs = params.toString();
    return requestJson<Footprint[]>(`/api/footprints${qs ? `?${qs}` : ''}`);
  },

  createFootprint(input: CreateFootprintInput): Promise<Footprint> {
    return requestJson<Footprint>('/api/footprints', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  updateFootprint(id: string, patch: Partial<CreateFootprintInput>): Promise<Footprint> {
    return requestJson<Footprint>(`/api/footprints/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },

  deleteFootprint(id: string): Promise<void> {
    return requestJson<{ ok: boolean }>(`/api/footprints/${id}`, {
      method: 'DELETE',
    }).then(() => undefined);
  },

  listTrips(): Promise<Trip[]> {
    return requestJson<Trip[]>('/api/trips');
  },

  getTrip(id: string): Promise<Trip> {
    return requestJson<Trip>(`/api/trips/${id}`);
  },

  createTrip(input: CreateTripInput): Promise<Trip> {
    return requestJson<Trip>('/api/trips', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  updateTrip(id: string, patch: Partial<CreateTripInput>): Promise<Trip> {
    return requestJson<Trip>(`/api/trips/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },

  deleteTrip(id: string): Promise<void> {
    return requestJson<{ ok: boolean }>(`/api/trips/${id}`, {
      method: 'DELETE',
    }).then(() => undefined);
  },

  addTripDay(
    tripId: string,
    input: { dayNumber?: number; date?: string | null; title?: string }
  ): Promise<TripDay> {
    return requestJson<TripDay>(`/api/trips/${tripId}/days`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
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
    return requestJson<TripItem>(`/api/trip-days/${dayId}/items`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  reorderTripItems(dayId: string, orderedItemIds: string[]): Promise<TripItem[]> {
    return requestJson<TripItem[]>(`/api/trip-days/${dayId}/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ orderedItemIds }),
    });
  },

  checkInTripItem(
    itemId: string,
    input: Partial<CreateFootprintInput> & { coordinates: Coordinates; visitedAt: string }
  ): Promise<{ tripItem: TripItem; footprint: Footprint }> {
    return requestJson<{ tripItem: TripItem; footprint: Footprint }>(
      `/api/trip-items/${itemId}/checkin`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      }
    );
  },

  addLiveTripCheckIn(
    dayId: string,
    input: CreateFootprintInput
  ): Promise<{ tripItem: TripItem; footprint: Footprint }> {
    return requestJson<{ tripItem: TripItem; footprint: Footprint }>(
      `/api/trip-days/${dayId}/live-checkin`,
      {
        method: 'POST',
        body: JSON.stringify(input),
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
    return requestJson('/api/enrich', {
      method: 'POST',
      body: JSON.stringify({ coordinates, visitedAt }),
    });
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
    return requestJson(`/api/places/search?q=${encodeURIComponent(query)}`);
  },

  uploadPhoto(dataUrl: string, caption?: string, takenAt?: string): Promise<PhotoItem> {
    return requestJson<PhotoItem>('/api/photos', {
      method: 'POST',
      body: JSON.stringify({ dataUrl, caption, takenAt }),
    });
  },

  exportBackup(): Promise<BackupPayload> {
    return requestJson<BackupPayload>('/api/backup/export');
  },

  importBackup(payload: BackupPayload): Promise<void> {
    return requestJson<{ ok: boolean }>('/api/backup/import', {
      method: 'POST',
      body: JSON.stringify(payload),
    }).then(() => undefined);
  },
};
