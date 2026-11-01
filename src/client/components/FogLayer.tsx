import type { Footprint, Trail, FlightArc } from '../../shared/types';

export interface FogStyle {
  fillColor: string;
  fillOpacity: number;
  outlineColor: string;
}

export function getFogLayerStyle(theme: 'light' | 'dark'): FogStyle {
  if (theme === 'dark') {
    return {
      fillColor: '#0e131f',
      fillOpacity: 0.88,
      outlineColor: '#1e2942',
    };
  }
  return {
    fillColor: '#faf6ed',
    fillOpacity: 0.82,
    outlineColor: '#ede4d1',
  };
}

/**
 * Generate a polygon ring (clockwise/counter-clockwise loop) for a circular cleared hole
 */
export function createCircleHoleCoordinates(
  centerLng: number,
  centerLat: number,
  radiusKm = 25,
  steps = 16
): [number, number][] {
  const coords: [number, number][] = [];
  const kmToDegLat = radiusKm / 110.574;
  const kmToDegLng = radiusKm / (111.32 * Math.cos((centerLat * Math.PI) / 180));

  for (let i = 0; i <= steps; i++) {
    const angle = (i * 2 * Math.PI) / steps;
    // Mapbox/MapLibre polygon inner ring holes are standard loops
    const lat = centerLat + kmToDegLat * Math.sin(angle);
    const lng = centerLng + kmToDegLng * Math.cos(angle);
    coords.push([Number(lng.toFixed(5)), Number(lat.toFixed(5))]);
  }

  return coords;
}

/**
 * Create a corridor buffer polygon around a trail segment
 */
function createTrailBufferHole(points: { lat: number; lng: number }[], bufferKm = 2): [number, number][] {
  if (points.length < 2) return [];

  const leftSide: [number, number][] = [];
  const rightSide: [number, number][] = [];

  for (let i = 0; i < points.length; i++) {
    const curr = points[i];
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];

    const dLng = next.lng - prev.lng;
    const dLat = next.lat - prev.lat;
    const len = Math.sqrt(dLng * dLng + dLat * dLat) || 1;

    // Normal vector
    const nLng = -dLat / len;
    const nLat = dLng / len;

    const latOffset = (bufferKm / 110.574) * nLat;
    const lngOffset = (bufferKm / (111.32 * Math.cos((curr.lat * Math.PI) / 180))) * nLng;

    leftSide.push([Number((curr.lng + lngOffset).toFixed(5)), Number((curr.lat + latOffset).toFixed(5))]);
    rightSide.unshift([Number((curr.lng - lngOffset).toFixed(5)), Number((curr.lat - latOffset).toFixed(5))]);
  }

  const loop = [...leftSide, ...rightSide];
  if (loop.length > 0) loop.push(loop[0]); // close ring
  return loop;
}

/**
 * Generate inverted mask GeoJSON for MapLibre.
 * The outer ring covers the globe; inner rings are holes cleared by footprints and trails.
 */
export function generateFogMaskGeoJSON(
  footprints: Footprint[],
  trails: Trail[],
  options?: { footprintRadiusKm?: number; trailBufferKm?: number }
): GeoJSON.FeatureCollection {
  const radius = options?.footprintRadiusKm ?? 25;
  const trailBuffer = options?.trailBufferKm ?? 3;

  // Huge outer polygon covering the world
  const outerWorldRing: [number, number][] = [
    [-180, -85],
    [180, -85],
    [180, 85],
    [-180, 85],
    [-180, -85],
  ];

  const holes: [number, number][][] = [];

  // Footprints circular holes
  for (const fp of footprints) {
    if (fp.coordinates && Number.isFinite(fp.coordinates.lat) && Number.isFinite(fp.coordinates.lng)) {
      const circle = createCircleHoleCoordinates(fp.coordinates.lng, fp.coordinates.lat, radius, 18);
      holes.push(circle);
    }
  }

  // Trails corridor holes
  for (const t of trails) {
    if (t.points && t.points.length >= 2) {
      // Subsample trail points if very dense to keep polygon performance fast
      const step = Math.max(1, Math.floor(t.points.length / 50));
      const sampled = t.points.filter((_, idx) => idx === 0 || idx === t.points.length - 1 || idx % step === 0);
      const corridor = createTrailBufferHole(sampled, trailBuffer);
      if (corridor.length >= 4) {
        holes.push(corridor);
      }
    }
  }

  const polygonCoordinates: [number, number][][] = [outerWorldRing, ...holes];

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: polygonCoordinates,
        },
      },
    ],
  };
}

/**
 * GeoJSON generator for flight arcs
 */
export function generateFlightArcsGeoJSON(arcs: FlightArc[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: arcs.map((arc) => ({
      type: 'Feature',
      properties: {
        id: arc.id,
        fromCity: arc.fromCity,
        toCity: arc.toCity,
      },
      geometry: {
        type: 'LineString',
        coordinates: arc.points,
      },
    })),
  };
}

/**
 * GeoJSON generator for raw trail polylines
 */
export function generateTrailsGeoJSON(trails: Trail[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: trails.map((t) => ({
      type: 'Feature',
      properties: {
        id: t.id,
        title: t.title,
        color: t.color || '#f97316',
      },
      geometry: {
        type: 'LineString',
        coordinates: t.points.map((p) => [p.lng, p.lat]),
      },
    })),
  };
}
