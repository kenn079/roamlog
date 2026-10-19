import type { Coordinates, WeatherInfo } from '../shared/types';

export function normalizeVisitDate(visitedAt: string): string {
  const trimmed = (visitedAt || '').trim();
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    return `${trimmed}-01`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

export function wmoCodeToWeather(code: number, tempC: number): WeatherInfo {
  const roundedTemp = Math.round(tempC);
  if (code === 0) {
    return { conditionCode: code, conditionText: '晴朗', tempC: roundedTemp, icon: '☀️' };
  }
  if (code === 1 || code === 2) {
    return { conditionCode: code, conditionText: '晴時多雲', tempC: roundedTemp, icon: '🌤️' };
  }
  if (code === 3) {
    return { conditionCode: code, conditionText: '陰天', tempC: roundedTemp, icon: '☁️' };
  }
  if (code >= 45 && code <= 48) {
    return { conditionCode: code, conditionText: '起霧', tempC: roundedTemp, icon: '🌫️' };
  }
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return { conditionCode: code, conditionText: '降雨', tempC: roundedTemp, icon: '🌧️' };
  }
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) {
    return { conditionCode: code, conditionText: '降雪', tempC: roundedTemp, icon: '❄️' };
  }
  if (code >= 95) {
    return { conditionCode: code, conditionText: '雷雨', tempC: roundedTemp, icon: '⛈️' };
  }
  return { conditionCode: code, conditionText: '多雲', tempC: roundedTemp, icon: '⛅' };
}

export interface ReverseGeoResult {
  countryCode: string;
  countryName: string;
  cityName: string;
  displayName: string;
}

export interface PlaceSearchResult {
  title: string;
  displayName: string;
  coordinates: Coordinates;
  countryCode: string;
  countryName: string;
  cityName: string;
}

export class EnrichmentService {
  private fetchFn: typeof fetch;
  private weatherCache = new Map<string, WeatherInfo | null>();
  private geoCache = new Map<string, ReverseGeoResult | null>();
  private searchCache = new Map<string, PlaceSearchResult[]>();

  constructor(fetchFn: typeof fetch = globalThis.fetch) {
    this.fetchFn = fetchFn;
  }

  async fetchWeatherForVisit(coords: Coordinates, visitedAt: string): Promise<WeatherInfo | null> {
    const dateStr = normalizeVisitDate(visitedAt);
    const cacheKey = `${coords.lat.toFixed(2)},${coords.lng.toFixed(2)}:${dateStr}`;
    if (this.weatherCache.has(cacheKey)) {
      return this.weatherCache.get(cacheKey)!;
    }

    try {
      const visitDateMs = new Date(`${dateStr}T00:00:00Z`).getTime();
      const daysAgo = (Date.now() - visitDateMs) / (1000 * 60 * 60 * 24);
      const isHistorical = daysAgo > 5;

      const baseUrl = isHistorical
        ? 'https://archive-api.open-meteo.com/v1/archive'
        : 'https://api.open-meteo.com/v1/forecast';

      const url = `${baseUrl}?latitude=${coords.lat}&longitude=${coords.lng}&start_date=${dateStr}&end_date=${dateStr}&daily=weather_code,temperature_2m_max&timezone=auto`;

      const res = await this.fetchFn(url, {
        headers: { 'User-Agent': 'TravelFootprintApp/1.0' },
      });
      if (!res || !res.ok) {
        return null;
      }

      const data = (await res.json()) as {
        daily?: {
          weather_code?: Array<number | null>;
          temperature_2m_max?: Array<number | null>;
        };
      };

      const code = data.daily?.weather_code?.[0];
      const temp = data.daily?.temperature_2m_max?.[0];
      if (code === undefined || code === null || temp === undefined || temp === null) {
        return null;
      }

      const info = wmoCodeToWeather(Number(code), Number(temp));
      this.weatherCache.set(cacheKey, info);
      return info;
    } catch {
      return null;
    }
  }

  async reverseGeocode(coords: Coordinates): Promise<ReverseGeoResult | null> {
    const cacheKey = `${coords.lat.toFixed(3)},${coords.lng.toFixed(3)}`;
    if (this.geoCache.has(cacheKey)) {
      return this.geoCache.get(cacheKey)!;
    }

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}&zoom=14&addressdetails=1`;
      const res = await this.fetchFn(url, {
        headers: {
          'User-Agent': 'TravelFootprintApp/1.0',
          'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
        },
      });
      if (!res || !res.ok) {
        return null;
      }

      const data = (await res.json()) as {
        display_name?: string;
        address?: Record<string, string>;
      };

      const addr = data.address ?? {};
      const countryCode = (addr.country_code || '').toUpperCase();
      const countryName = addr.country || '';
      const cityName =
        addr.city ||
        addr.town ||
        addr.county ||
        addr.state ||
        addr.village ||
        addr.municipality ||
        '';

      const result: ReverseGeoResult = {
        countryCode,
        countryName,
        cityName,
        displayName: data.display_name || cityName || countryName,
      };
      this.geoCache.set(cacheKey, result);
      return result;
    } catch {
      return null;
    }
  }

  async searchPlaces(query: string): Promise<PlaceSearchResult[]> {
    const q = query.trim();
    if (!q) return [];
    if (this.searchCache.has(q)) {
      return this.searchCache.get(q)!;
    }

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&q=${encodeURIComponent(q)}`;
      const res = await this.fetchFn(url, {
        headers: {
          'User-Agent': 'TravelFootprintApp/1.0',
          'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
        },
      });
      if (!res || !res.ok) {
        return [];
      }

      const items = (await res.json()) as Array<{
        name?: string;
        display_name?: string;
        lat: string;
        lon: string;
        address?: Record<string, string>;
      }>;

      const results: PlaceSearchResult[] = items.map((item) => {
        const addr = item.address ?? {};
        const firstSegment = (item.display_name || '').split(',')[0]?.trim();
        return {
          title: item.name || firstSegment || q,
          displayName: item.display_name || q,
          coordinates: { lat: Number(item.lat), lng: Number(item.lon) },
          countryCode: (addr.country_code || '').toUpperCase(),
          countryName: addr.country || '',
          cityName:
            addr.city ||
            addr.town ||
            addr.county ||
            addr.state ||
            addr.village ||
            '',
        };
      });

      this.searchCache.set(q, results);
      return results;
    } catch {
      return [];
    }
  }
}
