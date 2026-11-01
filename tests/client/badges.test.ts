import { describe, it, expect } from 'vitest';
import { BADGE_DEFINITIONS, evaluateBadges } from '../../src/client/lib/badges';
import type { Footprint, Trail } from '../../src/shared/types';

describe('badges engine', () => {
  it('exposes exactly 5 core travel badge definitions', () => {
    expect(BADGE_DEFINITIONS.length).toBe(5);
    const ids = BADGE_DEFINITIONS.map((b) => b.id);
    expect(ids).toContain('b-origin');
    expect(ids).toContain('b-continents');
    expect(ids).toContain('b-thousand-km');
    expect(ids).toContain('b-cloud-walker');
    expect(ids).toContain('b-island-rider');
  });

  it('evaluates b-origin (大地起點) when at least 1 footprint exists', () => {
    const emptyResult = evaluateBadges([], []);
    const emptyOrigin = emptyResult.find((b) => b.badgeId === 'b-origin');
    expect(emptyOrigin?.unlocked).toBe(false);

    const fp: Partial<Footprint> = {
      id: 'fp-1',
      title: 'First Step',
      countryCode: 'TW',
      coordinates: { lat: 25.0, lng: 121.5 },
      visitedAt: '2024-03-01T00:00:00Z',
    };
    const unlockedResult = evaluateBadges([fp as Footprint], []);
    const unlockedOrigin = unlockedResult.find((b) => b.badgeId === 'b-origin');
    expect(unlockedOrigin?.unlocked).toBe(true);
    expect(unlockedOrigin?.progress).toBe(1);
  });

  it('evaluates b-continents (環球飛躍) when footprints span 2+ continents', () => {
    const asiaOnly: Partial<Footprint>[] = [
      { id: '1', countryCode: 'TW', coordinates: { lat: 25.0, lng: 121.5 }, visitedAt: '2024-01-01T00:00:00Z' },
      { id: '2', countryCode: 'JP', coordinates: { lat: 35.6, lng: 139.6 }, visitedAt: '2024-01-02T00:00:00Z' },
    ];
    let result = evaluateBadges(asiaOnly as Footprint[], []);
    let continentBadge = result.find((b) => b.badgeId === 'b-continents');
    expect(continentBadge?.unlocked).toBe(false);

    const multiContinent: Partial<Footprint>[] = [
      ...asiaOnly,
      { id: '3', countryCode: 'FR', coordinates: { lat: 48.8, lng: 2.3 }, visitedAt: '2024-02-01T00:00:00Z' }, // Europe
    ];
    result = evaluateBadges(multiContinent as Footprint[], []);
    continentBadge = result.find((b) => b.badgeId === 'b-continents');
    expect(continentBadge?.unlocked).toBe(true);
  });

  it('evaluates b-thousand-km (千哩長征) when total trail distance reaches 1000km', () => {
    const shortTrail: Partial<Trail> = {
      id: 'tr-1',
      distanceKm: 450,
      points: [],
      source: 'gpx',
    };
    let result = evaluateBadges([], [shortTrail as Trail]);
    let distBadge = result.find((b) => b.badgeId === 'b-thousand-km');
    expect(distBadge?.unlocked).toBe(false);
    expect(distBadge?.progress).toBeCloseTo(0.45, 2);

    const longTrails: Partial<Trail>[] = [
      shortTrail,
      { id: 'tr-2', distanceKm: 600, points: [], source: 'gpx' },
    ];
    result = evaluateBadges([], longTrails as Trail[]);
    distBadge = result.find((b) => b.badgeId === 'b-thousand-km');
    expect(distBadge?.unlocked).toBe(true);
    expect(distBadge?.progress).toBe(1);
  });

  it('evaluates b-cloud-walker (雲端客) when altitude exceeds 3000m', () => {
    const lowTrail: Partial<Trail> = {
      id: 'tr-1',
      points: [{ lat: 25.0, lng: 121.5, elevation: 1500 }],
      distanceKm: 10,
    };
    let result = evaluateBadges([], [lowTrail as Trail]);
    let cloudBadge = result.find((b) => b.badgeId === 'b-cloud-walker');
    expect(cloudBadge?.unlocked).toBe(false);

    const highFootprint: Partial<Footprint> = {
      id: 'fp-jade',
      title: 'Yushan Peak',
      coordinates: { lat: 23.47, lng: 120.95 },
      visitedAt: '2024-03-01T00:00:00Z',
      countryCode: 'TW',
      extensions: { elevation: 3952 },
    };
    result = evaluateBadges([highFootprint as Footprint], []);
    cloudBadge = result.find((b) => b.badgeId === 'b-cloud-walker');
    expect(cloudBadge?.unlocked).toBe(true);
  });

  it('evaluates b-island-rider (環島騎士) when all 4 Taiwan extreme points are visited', () => {
    // 4 extremes: Fugui Cape (N), San Diao (E), Eluanbi (S), Guosheng (W)
    const partialPoints: Partial<Footprint>[] = [
      { id: 'n', countryCode: 'TW', coordinates: { lat: 25.298, lng: 121.538 }, visitedAt: '2024-01-01T00:00:00Z' },
      { id: 'e', countryCode: 'TW', coordinates: { lat: 25.008, lng: 122.001 }, visitedAt: '2024-01-02T00:00:00Z' },
      { id: 's', countryCode: 'TW', coordinates: { lat: 21.902, lng: 120.852 }, visitedAt: '2024-01-03T00:00:00Z' },
    ];
    let result = evaluateBadges(partialPoints as Footprint[], []);
    let islandBadge = result.find((b) => b.badgeId === 'b-island-rider');
    expect(islandBadge?.unlocked).toBe(false);
    expect(islandBadge?.progress).toBe(0.75);

    const fullPoints: Partial<Footprint>[] = [
      ...partialPoints,
      { id: 'w', countryCode: 'TW', coordinates: { lat: 23.101, lng: 120.035 }, visitedAt: '2024-01-04T00:00:00Z' },
    ];
    result = evaluateBadges(fullPoints as Footprint[], []);
    islandBadge = result.find((b) => b.badgeId === 'b-island-rider');
    expect(islandBadge?.unlocked).toBe(true);
    expect(islandBadge?.progress).toBe(1);
  });
});
