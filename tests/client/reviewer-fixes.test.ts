import { describe, it, expect } from 'vitest';
import {
  simplifyTrailPoints,
  parseGoogleTakeoutRecords,
  getTrailFingerprint,
} from '../../src/client/lib/trailParser';
import { calculateGreatCirclePoints } from '../../src/client/lib/flightArcs';
import { saveTrails, loadTrails, clearAllTrails, exportSyncableTrailsSummary } from '../../src/client/lib/trailStorage';
import { evaluateBadges } from '../../src/client/lib/badges';
import type { Footprint, Trail } from '../../src/shared/types';

describe('Reviewer Fixes Validation', () => {
  it('Douglas-Peucker handles 20,000 points without stack overflow', () => {
    const hugePoints = [];
    for (let i = 0; i < 20000; i++) {
      hugePoints.push({ lat: 25.0 + i * 0.00005, lng: 121.0 + i * 0.00005 });
    }
    // Should not throw RangeError: Maximum call stack size exceeded
    const simplified = simplifyTrailPoints(hugePoints, 20);
    expect(simplified.length).toBeLessThan(hugePoints.length);
    expect(simplified.length).toBeGreaterThanOrEqual(2);
  });

  it('parseGoogleTakeoutRecords handles null coordinates and invalid timestampMs safely', () => {
    const raw = {
      locations: [
        { latitudeE7: null, longitudeE7: 1215644680, timestampMs: 'invalid-not-number' },
        { latitudeE7: 250339640, longitudeE7: null, timestamp: '2024-03-01T08:00:00Z' },
        { latitudeE7: 250339640, longitudeE7: 1215644680, timestampMs: '1709280000000' },
        { latitudeE7: 250349640, longitudeE7: 1215654680, timestampMs: '1709280600000' },
      ],
    };
    const trails = parseGoogleTakeoutRecords(raw);
    expect(trails.length).toBe(1);
    expect(trails[0].points.length).toBe(2);
  });

  it('calculateGreatCirclePoints handles antipodal points safely without NaN', () => {
    const p1 = { lat: 45.0, lng: 0.0 };
    const p2 = { lat: -45.0, lng: 180.0 }; // antipodal
    const arc = calculateGreatCirclePoints(p1, p2, 10);
    expect(arc.length).toBeGreaterThanOrEqual(2);
    for (const pt of arc) {
      expect(Number.isFinite(pt[0])).toBe(true);
      expect(Number.isFinite(pt[1])).toBe(true);
    }
  });

  it('saveTrails deduplicates identical trails based on fingerprint', async () => {
    await clearAllTrails();
    const trail1: Trail = {
      id: 't-1',
      title: 'Taipei Route',
      points: [{ lat: 25.0, lng: 121.0 }, { lat: 25.1, lng: 121.1 }],
      distanceKm: 15,
      startTime: '2024-03-01T08:00:00Z',
      endTime: '2024-03-01T09:00:00Z',
      source: 'gpx',
      createdAt: '2024-03-01T09:00:00Z',
    };
    const trail2SameData: Trail = {
      ...trail1,
      id: 't-2-different-id',
    };

    await saveTrails([trail1]);
    await saveTrails([trail2SameData]); // should be recognized as duplicate

    const loaded = await loadTrails();
    expect(loaded.length).toBe(1);
  });

  it('evaluateBadges does not count unrecognized country codes towards b-continents', () => {
    const footprints: Partial<Footprint>[] = [
      { id: '1', countryCode: 'TW', coordinates: { lat: 25.0, lng: 121.5 }, visitedAt: '2024-01-01T00:00:00Z' },
      { id: '2', countryCode: 'XX', coordinates: { lat: 0.0, lng: 0.0 }, visitedAt: '2024-01-02T00:00:00Z' },
    ];
    const badges = evaluateBadges(footprints as Footprint[], []);
    const continentBadge = badges.find((b) => b.badgeId === 'b-continents');
    expect(continentBadge?.unlocked).toBe(false);
  });

  it('exportSyncableTrailsSummary keeps serialized payload within limit', () => {
    const hugeTrail: Trail = {
      id: 't-huge',
      title: 'Long Journey',
      points: Array.from({ length: 15000 }, (_, i) => ({
        lat: 25.0 + i * 0.0001,
        lng: 121.0 + i * 0.0001,
      })),
      distanceKm: 500,
      startTime: '2024-03-01T08:00:00Z',
      endTime: '2024-03-01T18:00:00Z',
      source: 'timeline_json',
      createdAt: '2024-03-01T18:00:00Z',
    };
    const summarized = exportSyncableTrailsSummary([hugeTrail], 50000);
    const serialized = JSON.stringify(summarized);
    expect(serialized.length).toBeLessThanOrEqual(50000);
  });
});
