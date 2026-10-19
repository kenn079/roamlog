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
  landmarkCount: number;
  visitedCountryCodes: string[];
  years: string[];
}

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

export interface BackupPayload {
  version: number;
  exportedAt: string;
  companions: Companion[];
  footprints: Footprint[];
  trips: Trip[];
}
