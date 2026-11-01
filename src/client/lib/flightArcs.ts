import type { Coordinates, FlightArc, Footprint } from '../../shared/types';

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Spherical linear interpolation (Slerp) to generate great-circle points between two lat/lng coordinates.
 * Returns an array of [lng, lat] coordinate pairs.
 */
export function calculateGreatCirclePoints(
  from: Coordinates,
  to: Coordinates,
  steps = 30
): [number, number][] {
  if (steps < 1) steps = 1;

  const lat1 = toRad(from.lat);
  const lon1 = toRad(from.lng);
  const lat2 = toRad(to.lat);
  const lon2 = toRad(to.lng);

  // Convert to 3D Cartesian coordinates on unit sphere
  const v1 = [
    Math.cos(lat1) * Math.cos(lon1),
    Math.cos(lat1) * Math.sin(lon1),
    Math.sin(lat1),
  ];
  const v2 = [
    Math.cos(lat2) * Math.cos(lon2),
    Math.cos(lat2) * Math.sin(lon2),
    Math.sin(lat2),
  ];

  // Dot product
  let dot = v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
  dot = Math.max(-1, Math.min(1, dot));

  // If points are identical or near-antipodal (where sin(angle) -> 0 causing division by zero)
  const angle = Math.acos(dot);
  if (angle < 1e-6 || Math.abs(angle - Math.PI) < 1e-6) {
    return [
      [from.lng, from.lat],
      [to.lng, to.lat],
    ];
  }

  const sinAngle = Math.sin(angle);
  const points: [number, number][] = [];

  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const a = Math.sin((1 - f) * angle) / sinAngle;
    const b = Math.sin(f * angle) / sinAngle;

    const x = a * v1[0] + b * v2[0];
    const y = a * v1[1] + b * v2[1];
    const z = a * v1[2] + b * v2[2];

    const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
    let lon = Math.atan2(y, x);

    let latDeg = toDeg(lat);
    let lonDeg = toDeg(lon);

    // Normalize longitude continuity relative to previous point to prevent antimeridian jump
    if (points.length > 0) {
      const prevLon = points[points.length - 1][0];
      while (lonDeg - prevLon > 180) lonDeg -= 360;
      while (lonDeg - prevLon < -180) lonDeg += 360;
    }

    points.push([Number(lonDeg.toFixed(5)), Number(latDeg.toFixed(5))]);
  }

  return points;
}

/**
 * Extract international flight arcs from an array of footprints.
 * Automatically sorts by visitedAt and creates arcs whenever the countryCode changes.
 */
export function extractFlightArcsFromFootprints(footprints: Footprint[]): FlightArc[] {
  if (!footprints || footprints.length < 2) return [];

  // Sort chronological
  const sorted = [...footprints].sort((a, b) => (a.visitedAt > b.visitedAt ? 1 : -1));
  const arcs: FlightArc[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const curr = sorted[i];
    const next = sorted[i + 1];

    if (
      curr.countryCode &&
      next.countryCode &&
      curr.countryCode.toUpperCase() !== next.countryCode.toUpperCase()
    ) {
      const arcId = `arc-${curr.id}-${next.id}`;
      const points = calculateGreatCirclePoints(curr.coordinates, next.coordinates, 30);
      arcs.push({
        id: arcId,
        fromCity: curr.cityName || curr.title || 'Unknown',
        toCity: next.cityName || next.title || 'Unknown',
        fromCoords: curr.coordinates,
        toCoords: next.coordinates,
        points,
      });
    }
  }

  return arcs;
}
