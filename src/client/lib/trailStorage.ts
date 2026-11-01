import type { Trail } from '../../shared/types';
import { simplifyTrailPoints, getTrailFingerprint } from './trailParser';

const STORAGE_KEY = 'roamlog_trails_store_v1';
const DB_NAME = 'roamlog_db';
const DB_STORE = 'trails';

// In-memory cache for fast synchronous reads and Node/test environments
let memoryTrails: Trail[] = [];

/**
 * Open IndexedDB store safely if in browser environment
 */
function openDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(DB_STORE)) {
          db.createObjectStore(DB_STORE, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Save multiple trails to IndexedDB / LocalStorage fallback.
 * Automatically deduplicates identical trails based on geographic/temporal fingerprint.
 */
export async function saveTrails(newTrails: Trail[]): Promise<void> {
  // Ensure existing stored trails are loaded before merging to prevent overwriting
  if (memoryTrails.length === 0) {
    await loadTrails();
  }

  const fingerprintMap = new Map<string, Trail>();
  for (const t of memoryTrails) {
    fingerprintMap.set(getTrailFingerprint(t), t);
  }

  const addedTrails: Trail[] = [];
  for (const t of newTrails) {
    const fp = getTrailFingerprint(t);
    if (!fingerprintMap.has(fp)) {
      fingerprintMap.set(fp, t);
      addedTrails.push(t);
    }
  }

  memoryTrails = Array.from(fingerprintMap.values());

  const db = await openDB();
  if (db) {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      const store = tx.objectStore(DB_STORE);
      for (const trail of addedTrails) {
        store.put(trail);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } else if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryTrails));
    } catch (e) {
      console.warn('LocalStorage quota exceeded for trails, stored in memory only', e);
    }
  }
}

/**
 * Load all stored trails
 */
export async function loadTrails(): Promise<Trail[]> {
  const db = await openDB();
  if (db) {
    return new Promise((resolve) => {
      const tx = db.transaction(DB_STORE, 'readonly');
      const store = tx.objectStore(DB_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const result = (req.result || []) as Trail[];
        memoryTrails = result;
        resolve(result);
      };
      req.onerror = () => resolve(memoryTrails);
    });
  }

  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        memoryTrails = JSON.parse(raw);
        return memoryTrails;
      }
    } catch {}
  }

  return memoryTrails;
}

/**
 * Delete a trail by ID
 */
export async function deleteTrail(id: string): Promise<void> {
  memoryTrails = memoryTrails.filter((t) => t.id !== id);

  const db = await openDB();
  if (db) {
    await new Promise<void>((resolve) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      const store = tx.objectStore(DB_STORE);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } else if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryTrails));
    } catch {}
  }
}

/**
 * Clear all trails (for testing or reset)
 */
export async function clearAllTrails(): Promise<void> {
  memoryTrails = [];

  const db = await openDB();
  if (db) {
    await new Promise<void>((resolve) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      const store = tx.objectStore(DB_STORE);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } else if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }
}

/**
 * Prepare a sync-safe summary of trails that fits within Firestore 1MB / LocalStorage 5MB limits.
 * Downsamples point density if the serialized JSON exceeds maxBytes.
 */
export function exportSyncableTrailsSummary(trails: Trail[], maxBytes = 450000): Trail[] {
  let serialized = JSON.stringify(trails);
  if (serialized.length <= maxBytes) {
    return trails;
  }

  // Iteratively simplify with increasing tolerance
  let tolerance = 25;
  let simplifiedTrails = trails.map((t) => ({ ...t }));

  while (serialized.length > maxBytes && tolerance <= 500) {
    simplifiedTrails = simplifiedTrails.map((t) => {
      if (t.points.length <= 4) return t;
      return {
        ...t,
        points: simplifyTrailPoints(t.points, tolerance),
      };
    });
    serialized = JSON.stringify(simplifiedTrails);
    tolerance *= 2;
  }

  // If still too large, step sample points
  if (serialized.length > maxBytes) {
    let step = 2;
    while (serialized.length > maxBytes && step <= 20) {
      simplifiedTrails = simplifiedTrails.map((t) => {
        if (t.points.length <= 4) return t;
        const downsampled = t.points.filter((_, idx) => idx === 0 || idx === t.points.length - 1 || idx % step === 0);
        return {
          ...t,
          points: downsampled,
        };
      });
      serialized = JSON.stringify(simplifiedTrails);
      step += 1;
    }
  }

  return simplifiedTrails;
}
