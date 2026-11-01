import { describe, it, expect } from 'vitest';
import {
  generateFogMaskGeoJSON,
  getFogLayerStyle,
  createCircleHoleCoordinates,
} from '../../src/client/components/FogLayer';
import type { Footprint, Trail } from '../../src/shared/types';

describe('FogLayer', () => {
  it('returns appropriate fog styling for light and dark themes', () => {
    const lightStyle = getFogLayerStyle('light');
    expect(lightStyle.fillColor).toBe('#faf6ed');
    expect(lightStyle.fillOpacity).toBeGreaterThan(0.5);

    const darkStyle = getFogLayerStyle('dark');
    expect(darkStyle.fillColor).toBe('#0e131f');
    expect(darkStyle.fillOpacity).toBeGreaterThan(0.6);
  });

  it('creates circle hole coordinates with requested radius and vertices', () => {
    const circle = createCircleHoleCoordinates(121.56, 25.03, 25, 16);
    expect(circle.length).toBe(17); // 16 vertices + 1 closed loop point
    expect(circle[0][0]).toBeCloseTo(circle[16][0], 4);
    expect(circle[0][1]).toBeCloseTo(circle[16][1], 4);
  });

  it('generates a world polygon with holes for each footprint and trail', () => {
    const footprints: Partial<Footprint>[] = [
      { id: '1', coordinates: { lat: 25.03, lng: 121.56 }, visitedAt: '2024-03-01T00:00:00Z' },
      { id: '2', coordinates: { lat: 35.68, lng: 139.69 }, visitedAt: '2024-03-02T00:00:00Z' },
    ];
    const trails: Partial<Trail>[] = [
      {
        id: 't-1',
        points: [
          { lat: 25.0, lng: 121.5 },
          { lat: 25.1, lng: 121.6 },
        ],
        distanceKm: 15,
      },
    ];

    const geojson = generateFogMaskGeoJSON(footprints as Footprint[], trails as Trail[]);
    expect(geojson.type).toBe('FeatureCollection');
    expect(geojson.features.length).toBe(1);

    const feature = geojson.features[0];
    expect(feature.geometry.type).toBe('Polygon');
    const rings = (feature.geometry as GeoJSON.Polygon).coordinates;
    // Ring 0 is the world outer boundary
    expect(rings.length).toBeGreaterThanOrEqual(3); // outer ring + 2 footprint holes + trail holes
  });

  it('handles empty footprints and trails returning unbroken world fog', () => {
    const geojson = generateFogMaskGeoJSON([], []);
    expect(geojson.features.length).toBe(1);
    const rings = (geojson.features[0].geometry as GeoJSON.Polygon).coordinates;
    expect(rings.length).toBe(1); // Only outer ring, complete fog
  });
});
