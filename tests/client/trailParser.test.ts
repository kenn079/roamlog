import { describe, it, expect } from 'vitest';
import {
  parseGoogleTakeoutRecords,
  parseGoogleSemanticTimeline,
  parseGoogleOnDeviceTimeline,
  parseLatLngString,
  parseGeoJSONTracks,
  parseGPXString,
  simplifyTrailPoints,
  detectFileFormat,
  calculateDistanceKm,
} from '../../src/client/lib/trailParser';

describe('trailParser', () => {
  describe('detectFileFormat', () => {
    it('detects Google Takeout Records format', () => {
      const obj = { locations: [{ latitudeE7: 250339640, longitudeE7: 1215644680, timestamp: '2024-03-01T00:00:00Z' }] };
      expect(detectFileFormat(obj)).toBe('google-records');
    });

    it('detects Google Semantic Timeline format', () => {
      const obj = { timelineObjects: [{ activitySegment: {} }] };
      expect(detectFileFormat(obj)).toBe('google-semantic');
    });

    it('detects Google on-device Timeline format (Timeline.json)', () => {
      const obj = { semanticSegments: [] };
      expect(detectFileFormat(obj)).toBe('google-on-device');
    });

    it('detects GeoJSON FeatureCollection format', () => {
      const obj = { type: 'FeatureCollection', features: [] };
      expect(detectFileFormat(obj)).toBe('geojson');
    });

    it('detects GPX xml string format', () => {
      const gpx = '<?xml version="1.0"?><gpx version="1.1"><trk><trkseg><trkpt lat="25.0" lon="121.5"></trkpt></trkseg></trk></gpx>';
      expect(detectFileFormat(gpx)).toBe('gpx');
    });

    it('returns unknown for unrecognized format', () => {
      expect(detectFileFormat({ foo: 'bar' })).toBe('unknown');
    });
  });

  describe('parseGoogleTakeoutRecords', () => {
    it('parses location points and converts lat/lng E7 to decimals', () => {
      const raw = {
        locations: [
          { latitudeE7: 250339640, longitudeE7: 1215644680, timestamp: '2024-03-01T08:00:00Z' },
          { latitudeE7: 250400000, longitudeE7: 1215700000, timestamp: '2024-03-01T08:15:00Z' },
        ],
      };
      const trails = parseGoogleTakeoutRecords(raw, 'Takeout Test');
      expect(trails.length).toBe(1);
      expect(trails[0].points.length).toBe(2);
      expect(trails[0].points[0].lat).toBeCloseTo(25.033964, 5);
      expect(trails[0].points[0].lng).toBeCloseTo(121.564468, 5);
      expect(trails[0].distanceKm).toBeGreaterThan(0);
      expect(trails[0].source).toBe('google-timeline');
    });

    it('splits segments when time delta > 2 hours or distance > 30km', () => {
      const raw = {
        locations: [
          { latitudeE7: 250339640, longitudeE7: 1215644680, timestamp: '2024-03-01T08:00:00Z' },
          { latitudeE7: 250350000, longitudeE7: 1215650000, timestamp: '2024-03-01T08:10:00Z' },
          // Gap > 2 hours:
          { latitudeE7: 250360000, longitudeE7: 1215660000, timestamp: '2024-03-01T12:00:00Z' },
          { latitudeE7: 250370000, longitudeE7: 1215670000, timestamp: '2024-03-01T12:10:00Z' },
        ],
      };
      const trails = parseGoogleTakeoutRecords(raw);
      expect(trails.length).toBe(2);
      expect(trails[0].points.length).toBe(2);
      expect(trails[1].points.length).toBe(2);
    });

    it('gracefully handles missing or corrupted location entries', () => {
      const raw = {
        locations: [
          { latitudeE7: null, longitudeE7: 121.5 },
          { latitudeE7: 250339640, longitudeE7: 1215644680, timestamp: '2024-03-01T08:00:00Z' },
          null,
          { latitudeE7: 'bad', longitudeE7: 'bad' },
          { latitudeE7: 250350000, longitudeE7: 1215650000, timestamp: '2024-03-01T08:05:00Z' },
        ],
      };
      const trails = parseGoogleTakeoutRecords(raw);
      expect(trails.length).toBe(1);
      expect(trails[0].points.length).toBe(2);
    });
  });

  describe('parseGoogleSemanticTimeline', () => {
    it('extracts activitySegment and placeVisit raw paths', () => {
      const raw = {
        timelineObjects: [
          {
            activitySegment: {
              startLocation: { latitudeE7: 250339640, longitudeE7: 1215644680 },
              endLocation: { latitudeE7: 250400000, longitudeE7: 1215700000 },
              simplifiedRawPath: {
                points: [
                  { latE7: 250339640, lngE7: 1215644680, timestamp: '2024-03-01T08:00:00Z' },
                  { latE7: 250400000, lngE7: 1215700000, timestamp: '2024-03-01T08:15:00Z' },
                ],
              },
            },
          },
        ],
      };
      const trails = parseGoogleSemanticTimeline(raw, 'Semantic');
      expect(trails.length).toBe(1);
      expect(trails[0].points.length).toBe(2);
    });
  });

  describe('parseLatLngString', () => {
    it('parses degree formatted coordinates string', () => {
      const res = parseLatLngString('25.03396°, 121.56447°');
      expect(res).not.toBeNull();
      expect(res?.lat).toBeCloseTo(25.03396, 5);
      expect(res?.lng).toBeCloseTo(121.56447, 5);
    });

    it('parses geo URI coordinate string', () => {
      const res = parseLatLngString('geo:25.03396,121.56447?z=15');
      expect(res).not.toBeNull();
      expect(res?.lat).toBeCloseTo(25.03396, 5);
      expect(res?.lng).toBeCloseTo(121.56447, 5);
    });

    it('parses plain comma-separated decimal string', () => {
      const res = parseLatLngString('-33.8688, 151.2093');
      expect(res).not.toBeNull();
      expect(res?.lat).toBeCloseTo(-33.8688, 4);
      expect(res?.lng).toBeCloseTo(151.2093, 4);
    });

    it('returns null for invalid coordinate string', () => {
      expect(parseLatLngString('invalid,string')).toBeNull();
      expect(parseLatLngString('')).toBeNull();
    });
  });

  describe('parseGoogleOnDeviceTimeline', () => {
    it('parses semanticSegments with timelinePath points', () => {
      const raw = {
        semanticSegments: [
          {
            startTime: '2024-05-01T10:00:00.000Z',
            endTime: '2024-05-01T10:30:00.000Z',
            timelinePath: [
              { point: '25.0330°, 121.5640°', time: '2024-05-01T10:00:00.000Z' },
              { point: '25.0350°, 121.5660°', time: '2024-05-01T10:15:00.000Z' },
              { point: '25.0380°, 121.5690°', time: '2024-05-01T10:30:00.000Z' },
            ],
          },
        ],
      };

      const trails = parseGoogleOnDeviceTimeline(raw, 'Timeline');
      expect(trails.length).toBe(1);
      expect(trails[0].points.length).toBe(3);
      expect(trails[0].points[0].lat).toBeCloseTo(25.033, 3);
      expect(trails[0].points[0].lng).toBeCloseTo(121.564, 3);
      expect(trails[0].distanceKm).toBeGreaterThan(0);
      expect(trails[0].startTime).toBe('2024-05-01T10:00:00.000Z');
      expect(trails[0].source).toBe('google-timeline');
    });

    it('parses semanticSegments with activity start and end points', () => {
      const raw = {
        semanticSegments: [
          {
            startTime: '2024-05-02T14:00:00.000Z',
            endTime: '2024-05-02T14:45:00.000Z',
            activity: {
              start: { latLng: '25.0400°, 121.5700°' },
              end: { latLng: '25.0500°, 121.5800°' },
              topCandidate: { type: 'WALKING' },
            },
          },
        ],
      };

      const trails = parseGoogleOnDeviceTimeline(raw, 'Timeline');
      expect(trails.length).toBe(1);
      expect(trails[0].points.length).toBe(2);
      expect(trails[0].points[0].lat).toBeCloseTo(25.04, 2);
      expect(trails[0].points[1].lat).toBeCloseTo(25.05, 2);
    });

    it('gracefully skips empty or invalid segments', () => {
      const raw = {
        semanticSegments: [
          null,
          {
            startTime: '2024-05-03T10:00:00.000Z',
            timelinePath: [{ point: 'invalid' }],
          },
        ],
      };

      const trails = parseGoogleOnDeviceTimeline(raw);
      expect(trails.length).toBe(0);
    });
  });

  describe('parseGPXString & parseGeoJSONTracks', () => {
    it('parses GPX trkpt coordinates and elevation', () => {
      const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Strava">
  <trk>
    <name>Yangmingshan Trail</name>
    <trkseg>
      <trkpt lat="25.15" lon="121.55"><ele>820</ele><time>2024-03-01T08:00:00Z</time></trkpt>
      <trkpt lat="25.16" lon="121.56"><ele>950</ele><time>2024-03-01T08:30:00Z</time></trkpt>
      <trkpt lat="25.17" lon="121.57"><ele>1120</ele><time>2024-03-01T09:00:00Z</time></trkpt>
    </trkseg>
  </trk>
</gpx>`;
      const trails = parseGPXString(gpx);
      expect(trails.length).toBe(1);
      expect(trails[0].title).toBe('Yangmingshan Trail');
      expect(trails[0].points.length).toBe(3);
      expect(trails[0].points[2].elevation).toBe(1120);
      expect(trails[0].source).toBe('gpx');
    });

    it('parses GeoJSON LineString feature', () => {
      const geojson = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { name: 'Bicycle Path' },
            geometry: {
              type: 'LineString',
              coordinates: [
                [121.50, 25.05],
                [121.52, 25.06],
                [121.54, 25.07],
              ],
            },
          },
        ],
      };
      const trails = parseGeoJSONTracks(geojson);
      expect(trails.length).toBe(1);
      expect(trails[0].points.length).toBe(3);
      expect(trails[0].points[0].lng).toBe(121.50);
      expect(trails[0].points[0].lat).toBe(25.05);
      expect(trails[0].source).toBe('geojson');
    });
  });

  describe('simplifyTrailPoints', () => {
    it('simplifies collinear points and retains endpoints', () => {
      const points = [
        { lat: 25.0, lng: 121.0 },
        { lat: 25.000001, lng: 121.000001 }, // almost exactly on line
        { lat: 25.000002, lng: 121.000002 },
        { lat: 25.01, lng: 121.01 },
      ];
      const simplified = simplifyTrailPoints(points, 20); // 20m tolerance
      expect(simplified.length).toBeLessThan(points.length);
      expect(simplified[0]).toEqual(points[0]);
      expect(simplified[simplified.length - 1]).toEqual(points[points.length - 1]);
    });
  });
});
