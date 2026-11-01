/**
 * Non-destructive Bidirectional Sync Reconciliation Engine for RoamLog
 * Performs union-based reconciliation across Footprints, Wishes, Trips, Companions, and Trails
 * ensuring no data or photos are lost between mobile and desktop devices,
 * while respecting tombstones (deletedIds) so deleted items are never resurrected.
 */

import type { BackupPayload, Companion, Footprint, PhotoItem, Trip, Wish, Trail } from '../../shared/types';

export interface MergeResult {
  merged: BackupPayload;
  hasChanges: boolean;
  localChanged: boolean;
  remoteChanged: boolean;
}

export function mergeBackupStores(
  local: BackupPayload,
  remote: BackupPayload,
  deletedIds?: Set<string>
): MergeResult {
  const isDeleted = (id: string) => Boolean(deletedIds && deletedIds.has(id));

  const localCompanions = (local.companions || []).filter((c) => !isDeleted(c.id));
  const remoteCompanions = (remote.companions || []).filter((c) => !isDeleted(c.id));
  const mergedCompanions = mergeCompanions(localCompanions, remoteCompanions);

  const localFootprints = (local.footprints || []).filter((f) => !isDeleted(f.id));
  const remoteFootprints = (remote.footprints || []).filter((f) => !isDeleted(f.id));
  const mergedFootprints = mergeFootprints(localFootprints, remoteFootprints);

  const localWishes = (local.wishes || []).filter((w) => !isDeleted(w.id));
  const remoteWishes = (remote.wishes || []).filter((w) => !isDeleted(w.id));
  const mergedWishes = mergeWishes(localWishes, remoteWishes);

  const localTrips = (local.trips || []).filter((t) => !isDeleted(t.id));
  const remoteTrips = (remote.trips || []).filter((t) => !isDeleted(t.id));
  const mergedTrips = mergeTrips(localTrips, remoteTrips);

  const localTrails = (local.trails || []).filter((t) => !isDeleted(t.id));
  const remoteTrails = (remote.trails || []).filter((t) => !isDeleted(t.id));
  const mergedTrails = mergeTrails(localTrails, remoteTrails);

  const merged: BackupPayload = {
    version: Math.max(local.version || 1, remote.version || 1),
    exportedAt: new Date().toISOString(),
    companions: mergedCompanions,
    footprints: mergedFootprints,
    trips: mergedTrips,
    wishes: mergedWishes,
    trails: mergedTrails,
  };

  const localSerialized = serializeForDiff(local);
  const remoteSerialized = serializeForDiff(remote);
  const mergedSerialized = serializeForDiff(merged);

  const localChanged = localSerialized !== mergedSerialized;
  const remoteChanged = remoteSerialized !== mergedSerialized;

  return {
    merged,
    hasChanges: localChanged || remoteChanged,
    localChanged,
    remoteChanged,
  };
}

function serializeForDiff(payload: BackupPayload): string {
  return JSON.stringify({
    companions: (payload.companions || []).map((c) => ({ id: c.id, name: c.name })).sort((a, b) => a.id.localeCompare(b.id)),
    footprints: (payload.footprints || [])
      .map((f) => ({
        id: f.id,
        title: f.title,
        visitedAt: f.visitedAt,
        photosCount: (f.photos || []).length,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    wishes: (payload.wishes || []).map((w) => ({ id: w.id, title: w.title, fulfilled: Boolean(w.fulfilledFootprintId) })).sort((a, b) => a.id.localeCompare(b.id)),
    trips: (payload.trips || []).map((t) => ({ id: t.id, title: t.title })).sort((a, b) => a.id.localeCompare(b.id)),
    trails: (payload.trails || []).map((t) => ({ id: t.id, title: t.title })).sort((a, b) => a.id.localeCompare(b.id)),
  });
}

function mergeCompanions(local: Companion[], remote: Companion[]): Companion[] {
  const map = new Map<string, Companion>();

  for (const c of local) {
    map.set(c.id, { ...c });
  }

  for (const c of remote) {
    if (!map.has(c.id)) {
      map.set(c.id, { ...c });
    } else {
      const existing = map.get(c.id)!;
      map.set(c.id, {
        ...existing,
        name: c.name || existing.name,
        avatarColor: c.avatarColor || existing.avatarColor,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function mergeFootprints(local: Footprint[], remote: Footprint[]): Footprint[] {
  const map = new Map<string, Footprint>();

  for (const f of local) {
    map.set(f.id, { ...f });
  }

  for (const f of remote) {
    if (!map.has(f.id)) {
      map.set(f.id, { ...f });
    } else {
      const existing = map.get(f.id)!;
      const photoMap = new Map<string, PhotoItem>();
      for (const p of existing.photos || []) {
        photoMap.set(p.id, p);
      }
      for (const p of f.photos || []) {
        if (!photoMap.has(p.id)) {
          photoMap.set(p.id, p);
        }
      }

      const companionIds = Array.from(
        new Set([
          ...(existing.companions || []).map((c) => (typeof c === 'string' ? c : c.id)),
          ...(f.companions || []).map((c) => (typeof c === 'string' ? c : c.id)),
        ])
      ).map((id) => {
        const found = (existing.companions || []).find((c) => typeof c !== 'string' && c.id === id) ||
                      (f.companions || []).find((c) => typeof c !== 'string' && c.id === id);
        return found || { id, name: id };
      });

      map.set(f.id, {
        ...existing,
        ...f,
        photos: Array.from(photoMap.values()),
        companions: companionIds,
        note: f.note || existing.note,
        rating: Math.max(existing.rating || 0, f.rating || 0),
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.visitedAt.localeCompare(a.visitedAt));
}

function mergeWishes(local: Wish[], remote: Wish[]): Wish[] {
  const map = new Map<string, Wish>();

  for (const w of local) {
    map.set(w.id, { ...w });
  }

  for (const w of remote) {
    if (!map.has(w.id)) {
      map.set(w.id, { ...w });
    } else {
      const existing = map.get(w.id)!;
      const fulfilledFootprintId = existing.fulfilledFootprintId || w.fulfilledFootprintId || null;
      const isRemoteNewer = (w.createdAt || '') > (existing.createdAt || '');

      map.set(w.id, {
        ...(isRemoteNewer ? w : existing),
        fulfilledFootprintId,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

function mergeTrips(local: Trip[], remote: Trip[]): Trip[] {
  const map = new Map<string, Trip>();

  for (const t of local) {
    map.set(t.id, { ...t });
  }

  for (const t of remote) {
    if (!map.has(t.id)) {
      map.set(t.id, { ...t });
    } else {
      const existing = map.get(t.id)!;
      const daysMap = new Map<string, any>();
      for (const d of existing.days || []) {
        daysMap.set(d.id, d);
      }
      for (const d of t.days || []) {
        if (!daysMap.has(d.id)) {
          daysMap.set(d.id, d);
        }
      }

      map.set(t.id, {
        ...existing,
        ...t,
        days: Array.from(daysMap.values()),
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

function mergeTrails(local: Trail[], remote: Trail[]): Trail[] {
  const map = new Map<string, Trail>();
  for (const t of local) map.set(t.id, { ...t });
  for (const t of remote) {
    if (!map.has(t.id)) {
      map.set(t.id, { ...t });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.id.localeCompare(b.id));
}
