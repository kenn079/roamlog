export interface Coordinates {
  lat: number;
  lng: number;
}

export interface WeatherInfo {
  conditionCode: number;
  conditionText: string;
  tempC: number;
  icon: string;
}

export interface PhotoItem {
  id: string;
  url: string;
  caption?: string;
  takenAt?: string;
}

export interface Companion {
  id: string;
  name: string;
  avatarColor?: string;
}

export interface Footprint {
  id: string;
  title: string;
  coordinates: Coordinates;
  countryCode: string;
  countryName: string;
  cityName: string;
  visitedAt: string;
  photos: PhotoItem[];
  note: string;
  rating: number | null;
  weather: WeatherInfo | null;
  companions: Companion[];
  tripId: string | null;
  tripDayId: string | null;
  extensions: Record<string, unknown>;
  createdAt: string;
}

export interface CreateFootprintInput {
  title: string;
  coordinates: Coordinates;
  countryCode?: string;
  countryName?: string;
  cityName?: string;
  visitedAt: string;
  photos?: PhotoItem[];
  note?: string;
  rating?: number | null;
  weather?: WeatherInfo | null;
  companionIds?: string[];
  tripId?: string | null;
  tripDayId?: string | null;
  extensions?: Record<string, unknown>;
}

export interface FootprintFilter {
  year?: string;
  countryCode?: string;
  companionId?: string;
  tripId?: string;
}

export interface FootprintStats {
  countryCount: number;
  cityCount: number;
  visitedCountryCodes: string[];
  years: string[];
}

export type IlluminationMode = 'city' | 'country';

export type TripStatus = 'planning' | 'active' | 'completed';

export interface TripItem {
  id: string;
  tripId: string;
  tripDayId: string;
  title: string;
  coordinates: Coordinates | null;
  sortOrder: number;
  plannedTime?: string;
  note?: string;
  footprintId: string | null;
  footprint?: Footprint | null;
  extensions: Record<string, unknown>;
}

export interface TripDay {
  id: string;
  tripId: string;
  dayNumber: number;
  date: string | null;
  title: string;
  items: TripItem[];
}

export interface Trip {
  id: string;
  title: string;
  coverPhoto: string | null;
  startDate: string | null;
  endDate: string | null;
  status: TripStatus;
  companions: Companion[];
  summaryNote: string;
  days: TripDay[];
  extensions: Record<string, unknown>;
  createdAt: string;
}

export interface CreateTripInput {
  title: string;
  coverPhoto?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: TripStatus;
  companionIds?: string[];
  summaryNote?: string;
  dayCount?: number;
  extensions?: Record<string, unknown>;
}

// ─── Wish (To-Go Wishlist) ───────────────────────────────────────

export type WishCategory = 'attraction' | 'food' | 'cafe' | 'nature' | 'shopping' | 'other';

export const WISH_CATEGORY_LABELS: Record<WishCategory, string> = {
  attraction: '🏛️ 景點',
  food: '🍜 美食',
  cafe: '☕ 咖啡廳',
  nature: '🌿 自然',
  shopping: '🛍️ 購物',
  other: '📌 其他',
};

export interface Wish {
  id: string;
  title: string;
  coordinates: Coordinates;
  countryCode: string;
  countryName: string;
  cityName: string;
  category: WishCategory;
  note: string;
  fulfilledFootprintId: string | null;
  extensions: Record<string, unknown>;
  createdAt: string;
}

export interface CreateWishInput {
  title: string;
  coordinates: Coordinates;
  countryCode?: string;
  countryName?: string;
  cityName?: string;
  category?: WishCategory;
  note?: string;
  extensions?: Record<string, unknown>;
}

// ─── Backup ──────────────────────────────────────────────────────

export interface BackupPayload {
  version: number;
  exportedAt: string;
  companions: Companion[];
  footprints: Footprint[];
  trips: Trip[];
  wishes?: Wish[];
}

// ─── Google Cloud Sync ──────────────────────────────────────────

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

export interface GoogleAuthInfo {
  accessToken: string;
  expiresAt: number;
  email?: string;
  name?: string;
  picture?: string;
}

export interface SyncManifest {
  version: number;
  lastModified: string;
  deviceId: string;
  dataHash?: string;
  photoCount: number;
}

export interface SyncState {
  status: SyncStatus;
  auth: GoogleAuthInfo | null;
  lastSyncAt: string | null;
  errorMessage?: string;
}
