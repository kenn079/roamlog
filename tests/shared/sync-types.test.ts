import { describe, it, expect } from 'vitest';
import type {
  SyncStatus,
  SyncManifest,
  GoogleAuthInfo,
  Trail,
  TrailPoint,
  FlightArc,
  BadgeDefinition,
  UserBadge,
} from '../../src/shared/types';

describe('Sync Types', () => {
  it('validates sync manifest structure', () => {
    const manifest: SyncManifest = {
      version: 1,
      lastModified: '2026-10-21T00:00:00Z',
      deviceId: 'client-desktop-1',
      dataHash: 'hash-abc',
      photoCount: 5,
    };
    expect(manifest.version).toBe(1);
    expect(manifest.photoCount).toBe(5);
  });

  it('validates google auth info structure', () => {
    const auth: GoogleAuthInfo = {
      accessToken: 'token-123',
      expiresAt: Date.now() + 3600000,
      email: 'traveler@example.com',
      name: 'Traveler',
    };
    expect(auth.accessToken).toBe('token-123');
  });

  it('validates sync status enum values', () => {
    const statuses: SyncStatus[] = ['idle', 'syncing', 'synced', 'error', 'offline'];
    expect(statuses.length).toBe(5);
  });

  it('validates Trail and TrailPoint structure', () => {
    const point: TrailPoint = {
      lat: 25.0339,
      lng: 121.5644,
      elevation: 50,
      time: '2026-11-01T08:00:00Z',
    };
    const trail: Trail = {
      id: 't-1',
      title: 'Taipei 101 Trail',
      color: '#f97316',
      points: [point],
      distanceKm: 3.5,
      startTime: '2026-11-01T08:00:00Z',
      endTime: '2026-11-01T09:00:00Z',
      tripId: null,
      source: 'google-timeline',
      createdAt: '2026-11-01T09:00:00Z',
    };
    expect(trail.points.length).toBe(1);
    expect(trail.source).toBe('google-timeline');
    expect(trail.distanceKm).toBe(3.5);
  });

  it('validates FlightArc and Badge structures', () => {
    const arc: FlightArc = {
      id: 'arc-1',
      fromCity: 'Taipei',
      toCity: 'Tokyo',
      fromCoords: { lat: 25.03, lng: 121.56 },
      toCoords: { lat: 35.68, lng: 139.69 },
      points: [[121.56, 25.03], [130.0, 30.0], [139.69, 35.68]],
    };
    expect(arc.points.length).toBe(3);

    const badgeDef: BadgeDefinition = {
      id: 'b-origin',
      title: '大地起點',
      description: '完成第 1 次足跡打卡',
      icon: '🧭',
      category: 'footprint',
    };
    const userBadge: UserBadge = {
      badgeId: badgeDef.id,
      unlockedAt: '2026-11-01T00:00:00Z',
      progress: 1,
      unlocked: true,
    };
    expect(userBadge.unlocked).toBe(true);
  });
});
