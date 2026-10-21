import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BackupPayload, Footprint, Wish } from '../../src/shared/types';

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn().mockReturnValue({}),
  getApps: vi.fn().mockReturnValue([]),
  getApp: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn().mockReturnValue({}),
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn().mockResolvedValue({
    user: {
      uid: 'user-123',
      displayName: 'Ken',
      email: 'ken@example.com',
      photoURL: 'https://example.com/avatar.jpg',
    },
  }),
  signOut: vi.fn().mockResolvedValue(undefined),
  onAuthStateChanged: vi.fn().mockImplementation((auth, callback) => {
    callback({
      uid: 'user-123',
      displayName: 'Ken',
      email: 'ken@example.com',
      photoURL: 'https://example.com/avatar.jpg',
    });
    return vi.fn();
  }),
}));

vi.mock('firebase/firestore', () => {
  const mockBatch = {
    set: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  };
  return {
    getFirestore: vi.fn().mockReturnValue({}),
    collection: vi.fn().mockReturnValue({}),
    doc: vi.fn().mockReturnValue({}),
    getDocs: vi.fn().mockResolvedValue({
      docs: [
        {
          id: 'fp-1',
          data: () => ({
            id: 'fp-1',
            title: 'Taipei 101',
            coordinates: { lat: 25, lng: 121 },
            visitedAt: '2026-10-21',
            photos: [],
            note: '',
            rating: 5,
            weather: null,
            companions: [],
            tripId: null,
            tripDayId: null,
            extensions: {},
            createdAt: '2026-10-21T00:00:00Z',
          }),
        },
      ],
    }),
    writeBatch: vi.fn().mockReturnValue(mockBatch),
    onSnapshot: vi.fn().mockReturnValue(vi.fn()),
  };
});

import {
  loginWithGoogle,
  logoutFirebase,
  fetchRemoteFirebaseData,
  uploadToFirebase,
} from '../../src/client/lib/firebaseSync';

describe('firebaseSync', () => {
  it('logs in with Google and returns user info', async () => {
    const user = await loginWithGoogle();
    expect(user.uid).toBe('user-123');
    expect(user.email).toBe('ken@example.com');
  });

  it('fetches remote data collections from Firestore', async () => {
    const payload = await fetchRemoteFirebaseData('user-123');
    expect(payload.footprints.length).toBeGreaterThan(0);
    expect(payload.footprints[0].id).toBe('fp-1');
  });

  it('uploads payload to Firestore in batch', async () => {
    const mockPayload: BackupPayload = {
      version: 1,
      exportedAt: '2026-10-21T00:00:00Z',
      companions: [],
      footprints: [
        {
          id: 'fp-1',
          title: 'Taipei 101',
          coordinates: { lat: 25, lng: 121 },
          visitedAt: '2026-10-21',
          photos: [],
          note: '',
          rating: 5,
          weather: null,
          companions: [],
          tripId: null,
          tripDayId: null,
          extensions: {},
          createdAt: '2026-10-21T00:00:00Z',
        },
      ],
      trips: [],
      wishes: [],
    };

    await expect(uploadToFirebase('user-123', mockPayload)).resolves.not.toThrow();
  });
});
