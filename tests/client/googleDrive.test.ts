import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoogleDriveClient } from '../../src/client/lib/googleDrive';
import type { GoogleAuthInfo, BackupPayload, SyncManifest } from '../../src/shared/types';

describe('GoogleDriveClient', () => {
  let client: GoogleDriveClient;
  const mockAuth: GoogleAuthInfo = {
    accessToken: 'test-token-123',
    expiresAt: Date.now() + 3600000,
    email: 'traveler@example.com',
  };

  beforeEach(() => {
    client = new GoogleDriveClient();
    vi.restoreAllMocks();
  });

  it('instantiates client and exports methods', () => {
    expect(typeof client.fetchRemoteData).toBe('function');
    expect(typeof client.uploadRemoteData).toBe('function');
    expect(typeof client.uploadPhotoToDrive).toBe('function');
    expect(typeof client.findAppDataFile).toBe('function');
  });

  it('fetches remote data and returns null when no file exists in appDataFolder', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ files: [] }),
    } as Response);

    const result = await client.fetchRemoteData(mockAuth);
    expect(result.data).toBeNull();
    expect(result.manifest).toBeNull();
  });

  it('fetches and parses existing remote data file', async () => {
    const mockBackup: BackupPayload = {
      version: 1,
      exportedAt: '2026-10-21T00:00:00Z',
      companions: [],
      footprints: [],
      trips: [],
      wishes: [],
    };
    const mockManifest: SyncManifest = {
      version: 1,
      lastModified: '2026-10-21T00:00:00Z',
      deviceId: 'device-test',
      photoCount: 0,
    };

    // 1st fetch: list files
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          files: [{ id: 'file-xyz', name: 'roamlog_data.json' }],
        }),
      } as Response)
      // 2nd fetch: get file media
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          manifest: mockManifest,
          data: mockBackup,
        }),
      } as Response);

    const result = await client.fetchRemoteData(mockAuth);
    expect(result.fileId).toBe('file-xyz');
    expect(result.manifest?.deviceId).toBe('device-test');
    expect(result.data?.version).toBe(1);
  });

  it('uploads remote data via multipart when file does not exist', async () => {
    const mockBackup: BackupPayload = {
      version: 1,
      exportedAt: '2026-10-21T00:00:00Z',
      companions: [],
      footprints: [],
      trips: [],
      wishes: [],
    };
    const mockManifest: SyncManifest = {
      version: 1,
      lastModified: '2026-10-21T00:00:00Z',
      deviceId: 'device-test',
      photoCount: 0,
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'new-file-id' }),
    } as Response);

    const res = await client.uploadRemoteData(mockAuth, mockBackup, mockManifest);
    expect(res.fileId).toBe('new-file-id');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('uploadType=multipart'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token-123',
        }),
      })
    );
  });

  it('updates existing remote data file with PATCH', async () => {
    const mockBackup: BackupPayload = {
      version: 1,
      exportedAt: '2026-10-21T00:00:00Z',
      companions: [],
      footprints: [],
      trips: [],
      wishes: [],
    };
    const mockManifest: SyncManifest = {
      version: 1,
      lastModified: '2026-10-21T00:00:00Z',
      deviceId: 'device-test',
      photoCount: 0,
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'existing-id' }),
    } as Response);

    const res = await client.uploadRemoteData(mockAuth, mockBackup, mockManifest, 'existing-id');
    expect(res.fileId).toBe('existing-id');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/existing-id?uploadType=media'),
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token-123',
        }),
      })
    );
  });
});
