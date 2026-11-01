import { describe, it, expect } from 'vitest';
import {
  calculateGreatCirclePoints,
  extractFlightArcsFromFootprints,
} from '../../src/client/lib/flightArcs';
import type { Footprint } from '../../src/shared/types';

describe('flightArcs', () => {
  describe('calculateGreatCirclePoints', () => {
    it('generates intermediate curved points between two locations', () => {
      const from = { lat: 25.0339, lng: 121.5644 }; // Taipei
      const to = { lat: 35.6762, lng: 139.6503 }; // Tokyo
      const points = calculateGreatCirclePoints(from, to, 10);
      expect(points.length).toBe(11); // 0 to 10 inclusive
      expect(points[0][0]).toBeCloseTo(121.5644, 2);
      expect(points[0][1]).toBeCloseTo(25.0339, 2);
      expect(points[10][0]).toBeCloseTo(139.6503, 2);
      expect(points[10][1]).toBeCloseTo(35.6762, 2);
    });

    it('handles antimeridian (180th meridian) crossing without horizontal map tears', () => {
      const from = { lat: 35.0, lng: 175.0 };
      const to = { lat: 37.0, lng: -175.0 };
      const points = calculateGreatCirclePoints(from, to, 10);
      expect(points.length).toBe(11);
      // All intermediate points should smoothly transition across the 180° meridian, not jump ~350°
      for (let i = 0; i < points.length - 1; i++) {
        const delta = Math.abs(points[i + 1][0] - points[i][0]);
        // delta in standard longitude step should be small (<30 deg)
        expect(delta).toBeLessThan(30);
      }
    });

    it('returns start and end if distance is zero or negligible', () => {
      const from = { lat: 25.0, lng: 121.0 };
      const to = { lat: 25.0, lng: 121.0 };
      const points = calculateGreatCirclePoints(from, to, 5);
      expect(points.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('extractFlightArcsFromFootprints', () => {
    it('detects international transitions between footprints and generates flight arcs', () => {
      const mockFootprints: Partial<Footprint>[] = [
        {
          id: 'fp-1',
          cityName: 'Taipei',
          countryCode: 'TW',
          coordinates: { lat: 25.0339, lng: 121.5644 },
          visitedAt: '2024-03-01T10:00:00Z',
        },
        {
          id: 'fp-2',
          cityName: 'Kaohsiung',
          countryCode: 'TW',
          coordinates: { lat: 22.6273, lng: 120.3014 },
          visitedAt: '2024-03-03T10:00:00Z',
        },
        {
          id: 'fp-3',
          cityName: 'Tokyo',
          countryCode: 'JP',
          coordinates: { lat: 35.6762, lng: 139.6503 },
          visitedAt: '2024-03-10T10:00:00Z',
        },
        {
          id: 'fp-4',
          cityName: 'Paris',
          countryCode: 'FR',
          coordinates: { lat: 48.8566, lng: 2.3522 },
          visitedAt: '2024-04-01T10:00:00Z',
        },
      ];

      const arcs = extractFlightArcsFromFootprints(mockFootprints as Footprint[]);
      expect(arcs.length).toBe(2);
      expect(arcs[0].fromCity).toBe('Kaohsiung');
      expect(arcs[0].toCity).toBe('Tokyo');
      expect(arcs[1].fromCity).toBe('Tokyo');
      expect(arcs[1].toCity).toBe('Paris');
      expect(arcs[0].points.length).toBeGreaterThan(5);
    });
  });
});
