import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveTrails,
  loadTrails,
  deleteTrail,
  clearAllTrails,
  exportSyncableTrailsSummary,
} from '../../src/client/lib/trailStorage';
import type { Trail } from '../../src/shared/types';

describe('trailStorage', () => {
  beforeEach(async () => {
    await clearAllTrails();
  });

  const mockTrail: Trail = {
    id: 't-test-1',
    title: 'Test Hiking Route',
    points: [
      { lat: 25.0, lng: 121.0 },
      { lat: 25.01, lng: 121.01 },
      { lat: 25.02, lng: 121.02 },
    ],
    distanceKm: 3.2,
    source: 'gpx',
    createdAt: '2026-11-01T08:00:00Z',
  };

  it('saves and loads trails from storage', async () => {
    await saveTrails([mockTrail]);
    const loaded = await loadTrails();
    expect(loaded.length).toBe(1);
    expect(loaded[0].id).toBe('t-test-1');
    expect(loaded[0].points.length).toBe(3);
  });

  it('deletes a trail by id', async () => {
    await saveTrails([mockTrail]);
    await deleteTrail('t-test-1');
    const loaded = await loadTrails();
    expect(loaded.length).toBe(0);
  });

  it('exportSyncableTrailsSummary downsamples large trails to protect cloud sync payload', () => {
    // Generate a trail with 5,000 points
    const largePoints = [];
    for (let i = 0; i < 5000; i++) {
      largePoints.push({ lat: 25.0 + i * 0.0001, lng: 121.0 + i * 0.0001 });
    }
    const hugeTrail: Trail = {
      ...mockTrail,
      id: 'huge-1',
      points: largePoints,
    };

    const rawJson = JSON.stringify([hugeTrail]);
    expect(rawJson.length).toBeGreaterThan(100000); // > 100KB

    // Compress to under 40KB
    const syncable = exportSyncableTrailsSummary([hugeTrail], 40000);
    const syncableJson = JSON.stringify(syncable);
    expect(syncableJson.length).toBeLessThanOrEqual(40000);
    expect(syncable[0].points.length).toBeLessThan(largePoints.length);
    expect(syncable[0].points.length).toBeGreaterThanOrEqual(2);
  });
});
