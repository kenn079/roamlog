import { describe, it, expect } from 'vitest';
import { mergeBackupStores } from '../../src/client/lib/syncEngine';
import type { BackupPayload, Footprint, Wish } from '../../src/shared/types';

describe('mergeBackupStores', () => {
  it('combines items from both local and remote without losing either (union)', () => {
    const localFp: Footprint = {
      id: 'fp-1',
      title: 'Local Place',
      coordinates: { lat: 25.033, lng: 121.565 },
      visitedAt: '2026-10-21',
      photos: [],
      note: 'Local note',
      rating: 5,
      weather: null,
      companions: [],
      tripId: null,
      tripDayId: null,
      extensions: {},
      createdAt: '2026-10-21T00:00:00Z',
    };

    const remoteFp: Footprint = {
      id: 'fp-2',
      title: 'Remote Place',
      coordinates: { lat: 35.676, lng: 139.650 },
      visitedAt: '2026-10-21',
      photos: [],
      note: 'Remote note',
      rating: 4,
      weather: null,
      companions: [],
      tripId: null,
      tripDayId: null,
      extensions: {},
      createdAt: '2026-10-21T01:00:00Z',
    };

    const local: BackupPayload = {
      version: 1,
      exportedAt: '2026-10-21T00:00:00Z',
      companions: [],
      footprints: [localFp],
      trips: [],
      wishes: [],
    };

    const remote: BackupPayload = {
      version: 1,
      exportedAt: '2026-10-21T01:00:00Z',
      companions: [],
      footprints: [remoteFp],
      trips: [],
      wishes: [],
    };

    const { merged, localChanged, remoteChanged } = mergeBackupStores(local, remote);
    expect(merged.footprints.length).toBe(2);
    expect(merged.footprints.map((f) => f.id)).toContain('fp-1');
    expect(merged.footprints.map((f) => f.id)).toContain('fp-2');
    expect(localChanged).toBe(true);
    expect(remoteChanged).toBe(true);
  });

  it('preserves fulfilledFootprintId on wishes when merging', () => {
    const localWish: Wish = {
      id: 'w1',
      title: '清水寺',
      coordinates: { lat: 34.994, lng: 135.785 },
      countryCode: 'JP',
      countryName: 'Japan',
      cityName: 'Kyoto',
      category: 'attraction',
      note: '想去踩點',
      fulfilledFootprintId: 'fp-fulfilled-1',
      extensions: {},
      createdAt: '2026-10-20T00:00:00Z',
    };

    const remoteWish: Wish = {
      id: 'w1',
      title: '清水寺',
      coordinates: { lat: 34.994, lng: 135.785 },
      countryCode: 'JP',
      countryName: 'Japan',
      cityName: 'Kyoto',
      category: 'attraction',
      note: '想去踩點',
      fulfilledFootprintId: null, // remote was not yet marked fulfilled
      extensions: {},
      createdAt: '2026-10-20T00:00:00Z',
    };

    const local: BackupPayload = {
      version: 1,
      exportedAt: '2026-10-21T00:00:00Z',
      companions: [],
      footprints: [],
      trips: [],
      wishes: [localWish],
    };

    const remote: BackupPayload = {
      version: 1,
      exportedAt: '2026-10-21T00:00:00Z',
      companions: [],
      footprints: [],
      trips: [],
      wishes: [remoteWish],
    };

    const { merged } = mergeBackupStores(local, remote);
    expect(merged.wishes?.[0]?.fulfilledFootprintId).toBe('fp-fulfilled-1');
  });

  it('merges footprint photos without dropping distinct photos', () => {
    const localFp: Footprint = {
      id: 'fp-same',
      title: 'Tokyo Tower',
      coordinates: { lat: 35, lng: 139 },
      visitedAt: '2026-10-21',
      photos: [{ id: 'p1', dataUrl: 'data:image/jpeg;base64,aaa' }],
      note: '',
      rating: 5,
      weather: null,
      companions: [],
      tripId: null,
      tripDayId: null,
      extensions: {},
      createdAt: '2026-10-21T00:00:00Z',
    };

    const remoteFp: Footprint = {
      id: 'fp-same',
      title: 'Tokyo Tower',
      coordinates: { lat: 35, lng: 139 },
      visitedAt: '2026-10-21',
      photos: [{ id: 'p2', dataUrl: 'data:image/jpeg;base64,bbb' }],
      note: 'Added notes from phone',
      rating: 5,
      weather: null,
      companions: [],
      tripId: null,
      tripDayId: null,
      extensions: {},
      createdAt: '2026-10-21T00:00:00Z',
    };

    const local: BackupPayload = {
      version: 1,
      exportedAt: '2026-10-21T00:00:00Z',
      companions: [],
      footprints: [localFp],
      trips: [],
      wishes: [],
    };

    const remote: BackupPayload = {
      version: 1,
      exportedAt: '2026-10-21T00:00:00Z',
      companions: [],
      footprints: [remoteFp],
      trips: [],
      wishes: [],
    };

    const { merged } = mergeBackupStores(local, remote);
    expect(merged.footprints.length).toBe(1);
    expect(merged.footprints[0].photos.length).toBe(2);
    expect(merged.footprints[0].note).toBe('Added notes from phone');
  });
});
