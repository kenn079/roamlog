import { describe, it, expect, vi } from 'vitest';
import { EnrichmentService, normalizeVisitDate, wmoCodeToWeather } from '../../src/server/enrichment';

describe('EnrichmentService', () => {
  it('normalizes full ISO dates and partial YYYY-MM dates into YYYY-MM-DD', () => {
    expect(normalizeVisitDate('2024-11-15T18:30:00Z')).toBe('2024-11-15');
    expect(normalizeVisitDate('2019-04')).toBe('2019-04-01');
  });

  it('maps WMO codes to human-readable Traditional Chinese labels and icons', () => {
    expect(wmoCodeToWeather(0, 24.6)).toEqual({
      conditionCode: 0,
      conditionText: '晴朗',
      tempC: 25,
      icon: '☀️',
    });
    expect(wmoCodeToWeather(61, 16.2).icon).toBe('🌧️');
  });

  it('fetches historical weather from Open-Meteo archive API and caches repeated requests', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        daily: {
          weather_code: [1],
          temperature_2m_max: [21.8],
        },
      }),
    });

    const service = new EnrichmentService(mockFetch as unknown as typeof fetch);
    const w1 = await service.fetchWeatherForVisit({ lat: 35.0, lng: 135.7 }, '2019-04');
    const w2 = await service.fetchWeatherForVisit({ lat: 35.0, lng: 135.7 }, '2019-04');

    expect(w1).toEqual({
      conditionCode: 1,
      conditionText: '晴時多雲',
      tempC: 22,
      icon: '🌤️',
    });
    expect(w2).toEqual(w1);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toContain('start_date=2019-04-01');
  });

  it('returns null gracefully when Open-Meteo or Nominatim fails (Review Focus #4)', async () => {
    const failingFetch = vi.fn().mockRejectedValue(new Error('Network offline'));
    const service = new EnrichmentService(failingFetch as unknown as typeof fetch);

    const weather = await service.fetchWeatherForVisit({ lat: 25.0, lng: 121.5 }, '2024-10-01');
    const geo = await service.reverseGeocode({ lat: 25.0, lng: 121.5 });
    const places = await service.searchPlaces('Tokyo Tower');

    expect(weather).toBeNull();
    expect(geo).toBeNull();
    expect(places).toEqual([]);
  });
});
