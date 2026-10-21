import { describe, it, expect } from 'vitest';
import type { SyncStatus, SyncManifest, GoogleAuthInfo } from '../../src/shared/types';

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
});
