import type { Trail, TrailPoint } from '../../shared/types';

/** Earth radius in kilometers for Haversine distance */
const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Calculate distance between two lat/lng points in kilometers using Haversine formula */
export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/** Calculate total distance along a sequence of points */
export function calculateDistanceKm(points: TrailPoint[]): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += haversineDistanceKm(points[i].lat, points[i].lng, points[i + 1].lat, points[i + 1].lng);
  }
  return Math.round(total * 100) / 100;
}

/**
 * Perpendicular distance from point P to line segment AB in meters (approximate planar).
 */
function perpendicularDistanceMeters(p: TrailPoint, a: TrailPoint, b: TrailPoint): number {
  const dX = (b.lng - a.lng) * 111320 * Math.cos(toRadians((a.lat + b.lat) / 2));
  const dY = (b.lat - a.lat) * 110540;
  const lineLenSq = dX * dX + dY * dY;
  if (lineLenSq === 0) {
    const pX = (p.lng - a.lng) * 111320 * Math.cos(toRadians(a.lat));
    const pY = (p.lat - a.lat) * 110540;
    return Math.sqrt(pX * pX + pY * pY);
  }

  const pX = (p.lng - a.lng) * 111320 * Math.cos(toRadians((a.lat + b.lat) / 2));
  const pY = (p.lat - a.lat) * 110540;

  const t = Math.max(0, Math.min(1, (pX * dX + pY * dY) / lineLenSq));
  const projX = t * dX;
  const projY = t * dY;
  const diffX = pX - projX;
  const diffY = pY - projY;
  return Math.sqrt(diffX * diffX + diffY * diffY);
}

/**
 * Douglas-Peucker point simplification algorithm
 * Implemented iteratively with a stack to prevent Call Stack Overflow on large point arrays (>=10,000 points).
 * @param points Array of TrailPoints
 * @param toleranceMeters Tolerance threshold in meters (default: 15m)
 */
export function simplifyTrailPoints(points: TrailPoint[], toleranceMeters = 15): TrailPoint[] {
  if (points.length <= 2) return points;

  const kept = new Uint8Array(points.length);
  kept[0] = 1;
  kept[points.length - 1] = 1;

  // Stack of [startIndex, endIndex]
  const stack: [number, number][] = [[0, points.length - 1]];

  while (stack.length > 0) {
    const [start, end] = stack.pop()!;
    let maxDist = 0;
    let maxIdx = start;

    for (let i = start + 1; i < end; i++) {
      const d = perpendicularDistanceMeters(points[i], points[start], points[end]);
      if (d > maxDist) {
        maxDist = d;
        maxIdx = i;
      }
    }

    if (maxDist > toleranceMeters) {
      kept[maxIdx] = 1;
      if (maxIdx - start > 1) stack.push([start, maxIdx]);
      if (end - maxIdx > 1) stack.push([maxIdx, end]);
    }
  }

  const result: TrailPoint[] = [];
  for (let i = 0; i < points.length; i++) {
    if (kept[i] === 1) {
      result.push(points[i]);
    }
  }
  return result;
}

/** Parse coordinates from degree strings (e.g. "25.03396°, 121.56447°"), geo URIs, or coordinate objects */
export function parseLatLngString(coord: unknown): { lat: number; lng: number } | null {
  if (!coord) return null;

  if (typeof coord === 'object') {
    const obj = coord as Record<string, any>;
    if (obj.latitudeE7 != null && obj.longitudeE7 != null) {
      const lat = Number(obj.latitudeE7) / 1e7;
      const lng = Number(obj.longitudeE7) / 1e7;
      if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }
    if (obj.latE7 != null && obj.lngE7 != null) {
      const lat = Number(obj.latE7) / 1e7;
      const lng = Number(obj.lngE7) / 1e7;
      if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }
    if (obj.latitude != null && obj.longitude != null) {
      const lat = Number(obj.latitude);
      const lng = Number(obj.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }
    if (obj.lat != null && obj.lng != null) {
      const lat = Number(obj.lat);
      const lng = Number(obj.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }
    if (obj.latLng) return parseLatLngString(obj.latLng);
    if (obj.LatLng) return parseLatLngString(obj.LatLng);
    if (obj.point) return parseLatLngString(obj.point);
    if (obj.placeLocation) return parseLatLngString(obj.placeLocation);
    if (obj.start) return parseLatLngString(obj.start);
    if (obj.end) return parseLatLngString(obj.end);
    return null;
  }

  if (typeof coord !== 'string') return null;
  const trimmed = coord.trim();
  if (!trimmed) return null;

  let clean = trimmed;
  if (clean.toLowerCase().startsWith('geo:')) {
    clean = clean.slice(4).split('?')[0].trim();
  }

  // Remove degree symbol
  clean = clean.replace(/°/g, '');

  const parts = clean.split(',').map((p) => p.trim());
  if (parts.length < 2) return null;

  let lat = parseFloat(parts[0]);
  let lng = parseFloat(parts[1]);

  if (parts[0].toUpperCase().includes('S')) lat = -Math.abs(lat);
  if (parts[0].toUpperCase().includes('N')) lat = Math.abs(lat);
  if (parts[1].toUpperCase().includes('W')) lng = -Math.abs(lng);
  if (parts[1].toUpperCase().includes('E')) lng = Math.abs(lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return { lat, lng };
}

/** Detect input file format */
export function detectFileFormat(
  content: string | object
): 'google-records' | 'google-semantic' | 'google-on-device' | 'geojson' | 'gpx' | 'unknown' {
  if (typeof content === 'string') {
    const trimmed = content.trim();
    if (trimmed.startsWith('<') && (trimmed.includes('<gpx') || trimmed.includes('<trk'))) {
      return 'gpx';
    }
    try {
      const parsed = JSON.parse(trimmed);
      return detectFileFormat(parsed);
    } catch {
      return 'unknown';
    }
  }

  if (content && typeof content === 'object') {
    const obj = content as Record<string, any>;
    if (Array.isArray(obj.semanticSegments) || Array.isArray(obj.rawSignals)) {
      return 'google-on-device';
    }
    if (Array.isArray(obj.locations)) {
      return 'google-records';
    }
    if (Array.isArray(obj.timelineObjects)) {
      return 'google-semantic';
    }
    if (obj.type === 'FeatureCollection' || obj.type === 'Feature') {
      return 'geojson';
    }
  }

  return 'unknown';
}

function generateTrailId(): string {
  return 'tr-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
}

/**
 * Generate a deterministic fingerprint for a trail based on its source, time bounds, and endpoints
 * to deduplicate identical trail imports.
 */
export function getTrailFingerprint(trail: Partial<Trail>): string {
  const start = trail.points?.[0];
  const end = trail.points?.[trail.points.length - 1];
  const sLat = start?.lat != null ? start.lat.toFixed(4) : '';
  const sLng = start?.lng != null ? start.lng.toFixed(4) : '';
  const eLat = end?.lat != null ? end.lat.toFixed(4) : '';
  const eLng = end?.lng != null ? end.lng.toFixed(4) : '';
  const len = trail.points?.length || 0;
  return `${trail.source || 'trail'}_${trail.startTime || ''}_${trail.endTime || ''}_${sLat},${sLng}_${eLat},${eLng}_${len}`;
}

/**
 * Parse Google Takeout Records.json (Location History)
 * Handles latitudeE7 / longitudeE7 conversion, splits segments on gaps (>2hr or >30km).
 */
export function parseGoogleTakeoutRecords(json: any, titlePrefix = 'Google Timeline'): Trail[] {
  if (!json || !Array.isArray(json.locations)) return [];

  const rawLocations = json.locations;
  const validPoints: TrailPoint[] = [];

  for (const loc of rawLocations) {
    if (!loc || typeof loc !== 'object') continue;
    if (loc.latitudeE7 == null || loc.longitudeE7 == null) continue;

    const latE7 = Number(loc.latitudeE7);
    const lngE7 = Number(loc.longitudeE7);
    if (!Number.isFinite(latE7) || !Number.isFinite(lngE7)) continue;

    const lat = latE7 / 1e7;
    const lng = lngE7 / 1e7;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;

    let time: string | undefined = typeof loc.timestamp === 'string' ? loc.timestamp : undefined;
    if (!time && loc.timestampMs != null) {
      const ms = Number(loc.timestampMs);
      if (Number.isFinite(ms)) {
        const d = new Date(ms);
        if (!isNaN(d.getTime())) {
          time = d.toISOString();
        }
      }
    }

    validPoints.push({
      lat,
      lng,
      elevation: typeof loc.altitude === 'number' && Number.isFinite(loc.altitude) ? loc.altitude : undefined,
      time,
    });
  }

  if (validPoints.length === 0) return [];

  // Sort chronologically if timestamps are present
  if (validPoints[0].time && validPoints[validPoints.length - 1].time) {
    validPoints.sort((a, b) => (a.time! > b.time! ? 1 : -1));
  }

  // Segment splitting
  const segments: TrailPoint[][] = [];
  let currentSegment: TrailPoint[] = [validPoints[0]];

  for (let i = 1; i < validPoints.length; i++) {
    const prev = validPoints[i - 1];
    const curr = validPoints[i];

    let split = false;

    // Check time delta > 2 hours
    if (prev.time && curr.time) {
      const dt = Math.abs(new Date(curr.time).getTime() - new Date(prev.time).getTime());
      if (dt > 2 * 60 * 60 * 1000) {
        split = true;
      }
    }

    // Check distance jump > 30km
    if (!split) {
      const dist = haversineDistanceKm(prev.lat, prev.lng, curr.lat, curr.lng);
      if (dist > 30) {
        split = true;
      }
    }

    if (split) {
      if (currentSegment.length >= 2) {
        segments.push(currentSegment);
      }
      currentSegment = [curr];
    } else {
      currentSegment.push(curr);
    }
  }

  if (currentSegment.length >= 2) {
    segments.push(currentSegment);
  } else if (segments.length === 0 && currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  const trails: Trail[] = [];
  segments.forEach((seg, idx) => {
    const simplified = seg.length > 10 ? simplifyTrailPoints(seg, 15) : seg;
    const distanceKm = calculateDistanceKm(simplified);
    const dateStr = simplified[0]?.time ? simplified[0].time.slice(0, 10) : '';

    trails.push({
      id: generateTrailId(),
      title: `${titlePrefix} ${dateStr ? dateStr + ' ' : ''}#${idx + 1}`.trim(),
      points: simplified,
      distanceKm,
      startTime: simplified[0]?.time,
      endTime: simplified[simplified.length - 1]?.time,
      tripId: null,
      source: 'google-timeline',
      createdAt: new Date().toISOString(),
    });
  });

  return trails;
}

/**
 * Parse Google Semantic Timeline JSON (contains timelineObjects)
 */
export function parseGoogleSemanticTimeline(json: any, titlePrefix = 'Timeline'): Trail[] {
  if (!json || !Array.isArray(json.timelineObjects)) return [];

  const trails: Trail[] = [];

  json.timelineObjects.forEach((item: any, idx: number) => {
    if (!item) return;
    const points: TrailPoint[] = [];

    // Activity segment
    if (item.activitySegment) {
      const seg = item.activitySegment;
      if (seg.simplifiedRawPath && Array.isArray(seg.simplifiedRawPath.points)) {
        for (const p of seg.simplifiedRawPath.points) {
          if (p.latE7 == null || p.lngE7 == null) continue;
          const lat = Number(p.latE7) / 1e7;
          const lng = Number(p.lngE7) / 1e7;
          if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            points.push({ lat, lng, time: p.timestamp });
          }
        }
      } else if (seg.startLocation && seg.endLocation) {
        const sLat = Number(seg.startLocation.latitudeE7) / 1e7;
        const sLng = Number(seg.startLocation.longitudeE7) / 1e7;
        const eLat = Number(seg.endLocation.latitudeE7) / 1e7;
        const eLng = Number(seg.endLocation.longitudeE7) / 1e7;
        if (Number.isFinite(sLat) && Number.isFinite(sLng)) points.push({ lat: sLat, lng: sLng });
        if (Number.isFinite(eLat) && Number.isFinite(eLng)) points.push({ lat: eLat, lng: eLng });
      }
    }

    if (points.length >= 2) {
      const distanceKm = calculateDistanceKm(points);
      trails.push({
        id: generateTrailId(),
        title: `${titlePrefix} #${idx + 1}`,
        points,
        distanceKm,
        startTime: points[0]?.time,
        endTime: points[points.length - 1]?.time,
        tripId: null,
        source: 'google-timeline',
        createdAt: new Date().toISOString(),
      });
    }
  });

  return trails;
}


/**
 * Parse Google on-device exported Timeline.json
 * Handles semanticSegments (activity, timelinePath, visits) as well as rawSignals GPS breadcrumbs.
 */
export function parseGoogleOnDeviceTimeline(json: any, titlePrefix = 'Timeline'): Trail[] {
  if (!json || typeof json !== 'object') return [];

  const trails: Trail[] = [];
  const segments = Array.isArray(json.semanticSegments) ? json.semanticSegments : [];
  const standaloneVisitPoints: TrailPoint[] = [];

  // 1. Process semanticSegments
  segments.forEach((seg: any, idx: number) => {
    if (!seg || typeof seg !== 'object') return;

    const points: TrailPoint[] = [];

    // Check timelinePath in segment root or activity
    const timelinePath = Array.isArray(seg.timelinePath)
      ? seg.timelinePath
      : Array.isArray(seg.activity?.timelinePath)
      ? seg.activity.timelinePath
      : Array.isArray(seg.activitySegment?.timelinePath)
      ? seg.activitySegment.timelinePath
      : null;

    if (timelinePath && timelinePath.length > 0) {
      for (const p of timelinePath) {
        if (!p) continue;
        const coord = parseLatLngString(p.point || p.latLng || p.LatLng || p);
        if (coord) {
          points.push({
            lat: coord.lat,
            lng: coord.lng,
            time: typeof p.time === 'string' ? p.time : typeof p.timestamp === 'string' ? p.timestamp : undefined,
          });
        }
      }
    }

    // Check simplifiedRawPath (some takeouts have it inside activitySegment)
    const rawPath = seg.activitySegment?.simplifiedRawPath?.points || seg.activity?.simplifiedRawPath?.points;
    if (points.length < 2 && Array.isArray(rawPath)) {
      for (const p of rawPath) {
        const coord = parseLatLngString(p);
        if (coord) {
          points.push({
            lat: coord.lat,
            lng: coord.lng,
            time: typeof p.timestamp === 'string' ? p.timestamp : undefined,
          });
        }
      }
    }

    // Check activity start and end points
    const act = seg.activity || seg.activitySegment;
    if (points.length < 2 && act && typeof act === 'object') {
      const startCoord = parseLatLngString(act.start || act.startLocation);
      const endCoord = parseLatLngString(act.end || act.endLocation);

      if (startCoord) {
        points.push({ lat: startCoord.lat, lng: startCoord.lng, time: seg.startTime });
      }
      if (endCoord) {
        points.push({ lat: endCoord.lat, lng: endCoord.lng, time: seg.endTime });
      }
    }

    // Check visit / placeVisit
    const visit = seg.visit || seg.placeVisit;
    if (visit && typeof visit === 'object') {
      const visitCoord = parseLatLngString(
        visit.topCandidate?.placeLocation ||
        visit.location ||
        visit.center ||
        visit.latLng ||
        visit.point
      );
      if (visitCoord) {
        standaloneVisitPoints.push({
          lat: visitCoord.lat,
          lng: visitCoord.lng,
          time: seg.startTime || seg.endTime,
        });
      }
    }

    if (points.length >= 2) {
      const simplified = points.length > 10 ? simplifyTrailPoints(points, 15) : points;
      const distanceKm = calculateDistanceKm(simplified);
      const dateStr = (seg.startTime || simplified[0]?.time || '').slice(0, 10);

      trails.push({
        id: generateTrailId(),
        title: `${titlePrefix} ${dateStr ? dateStr + ' ' : ''}#${idx + 1}`.trim(),
        points: simplified,
        distanceKm,
        startTime: simplified[0]?.time || seg.startTime,
        endTime: simplified[simplified.length - 1]?.time || seg.endTime,
        tripId: null,
        source: 'google-timeline',
        createdAt: new Date().toISOString(),
      });
    }
  });

  // If semantic movements yielded trails, return them
  if (trails.length > 0) {
    return trails;
  }

  // 2. If no trails from activities, check rawSignals (GPS breadcrumbs)
  if (Array.isArray(json.rawSignals) && json.rawSignals.length > 0) {
    const rawPoints: TrailPoint[] = [];

    for (const sig of json.rawSignals) {
      if (!sig || typeof sig !== 'object') continue;
      const pos = sig.position || sig;
      const coord = parseLatLngString(pos.LatLng || pos.latLng || pos.point || pos);
      if (coord) {
        const time = typeof pos.timestamp === 'string' ? pos.timestamp : typeof sig.timestamp === 'string' ? sig.timestamp : undefined;
        rawPoints.push({
          lat: coord.lat,
          lng: coord.lng,
          elevation: typeof pos.altitudeMeters === 'number' && Number.isFinite(pos.altitudeMeters) ? pos.altitudeMeters : undefined,
          time,
        });
      }
    }

    if (rawPoints.length >= 2) {
      // Split raw points into segments if time delta > 2 hours or distance > 30km
      const segments: TrailPoint[][] = [];
      let cur: TrailPoint[] = [rawPoints[0]];

      for (let i = 1; i < rawPoints.length; i++) {
        const prev = rawPoints[i - 1];
        const next = rawPoints[i];
        let split = false;

        if (prev.time && next.time) {
          const dt = Math.abs(new Date(next.time).getTime() - new Date(prev.time).getTime());
          if (dt > 2 * 60 * 60 * 1000) split = true;
        }

        if (!split) {
          const dist = haversineDistanceKm(prev.lat, prev.lng, next.lat, next.lng);
          if (dist > 30) split = true;
        }

        if (split) {
          if (cur.length >= 2) segments.push(cur);
          cur = [next];
        } else {
          cur.push(next);
        }
      }
      if (cur.length >= 2) segments.push(cur);

      segments.forEach((seg, idx) => {
        const simplified = seg.length > 10 ? simplifyTrailPoints(seg, 15) : seg;
        const distanceKm = calculateDistanceKm(simplified);
        const dateStr = simplified[0]?.time ? simplified[0].time.slice(0, 10) : '';

        trails.push({
          id: generateTrailId(),
          title: `${titlePrefix} ${dateStr ? dateStr + ' ' : ''}#${idx + 1}`.trim(),
          points: simplified,
          distanceKm,
          startTime: simplified[0]?.time,
          endTime: simplified[simplified.length - 1]?.time,
          tripId: null,
          source: 'google-timeline',
          createdAt: new Date().toISOString(),
        });
      });

      if (trails.length > 0) {
        return trails;
      }
    }
  }

  // 3. Fallback: If only standalone visits exist and there are at least 2 points, connect them as a journey
  if (standaloneVisitPoints.length >= 2) {
    const simplified = standaloneVisitPoints.length > 10 ? simplifyTrailPoints(standaloneVisitPoints, 15) : standaloneVisitPoints;
    const distanceKm = calculateDistanceKm(simplified);
    const dateStr = standaloneVisitPoints[0]?.time ? standaloneVisitPoints[0].time.slice(0, 10) : '';

    trails.push({
      id: generateTrailId(),
      title: `${titlePrefix} ${dateStr ? dateStr + ' ' : ''}Visits`.trim(),
      points: simplified,
      distanceKm,
      startTime: standaloneVisitPoints[0]?.time,
      endTime: standaloneVisitPoints[standaloneVisitPoints.length - 1]?.time,
      tripId: null,
      source: 'google-timeline',
      createdAt: new Date().toISOString(),
    });
  }

  return trails;
}

/**
 * Parse GeoJSON FeatureCollection or Feature containing LineString / MultiLineString
 */
export function parseGeoJSONTracks(geojson: any, defaultTitle = 'GeoJSON Track'): Trail[] {
  if (!geojson) return [];
  const trails: Trail[] = [];

  const features = geojson.type === 'FeatureCollection' ? geojson.features : [geojson];
  if (!Array.isArray(features)) return [];

  for (const feat of features) {
    if (!feat || !feat.geometry) continue;
    const geom = feat.geometry;
    const title = feat.properties?.name || feat.properties?.title || defaultTitle;

    if (geom.type === 'LineString' && Array.isArray(geom.coordinates)) {
      const points: TrailPoint[] = geom.coordinates
        .filter((coord: any) => Array.isArray(coord) && coord.length >= 2)
        .map((coord: any) => ({
          lng: Number(coord[0]),
          lat: Number(coord[1]),
          elevation: coord.length >= 3 ? Number(coord[2]) : undefined,
        }));

      if (points.length >= 2) {
        trails.push({
          id: generateTrailId(),
          title,
          points,
          distanceKm: calculateDistanceKm(points),
          source: 'geojson',
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  return trails;
}

/**
 * Parse GPX XML text into Trails
 */
export function parseGPXString(gpxText: string, defaultTitle = 'GPX Trail'): Trail[] {
  if (!gpxText) return [];
  const trails: Trail[] = [];

  const trkNameMatch = gpxText.match(/<name>(.*?)<\/name>/i);
  const trackName = trkNameMatch ? trkNameMatch[1].trim() : defaultTitle;

  const trkptRegex = /<trkpt\s+[^>]*lat=["']([^"']+)["'][^>]*lon=["']([^"']+)["'][^>]*>([\s\S]*?)<\/trkpt>/gi;
  const points: TrailPoint[] = [];

  let match;
  while ((match = trkptRegex.exec(gpxText)) !== null) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    const inner = match[3] || '';

    let elevation: number | undefined;
    const eleMatch = inner.match(/<ele>(.*?)<\/ele>/i);
    if (eleMatch) {
      const parsedEle = parseFloat(eleMatch[1]);
      if (Number.isFinite(parsedEle)) elevation = parsedEle;
    }

    let time: string | undefined;
    const timeMatch = inner.match(/<time>(.*?)<\/time>/i);
    if (timeMatch) {
      time = timeMatch[1].trim();
    }

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      points.push({ lat, lng, elevation, time });
    }
  }

  if (points.length >= 2) {
    trails.push({
      id: generateTrailId(),
      title: trackName,
      points,
      distanceKm: calculateDistanceKm(points),
      startTime: points[0]?.time,
      endTime: points[points.length - 1]?.time,
      source: 'gpx',
      createdAt: new Date().toISOString(),
    });
  }

  return trails;
}
