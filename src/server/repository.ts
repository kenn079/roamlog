import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  BackupPayload,
  Companion,
  Coordinates,
  CreateFootprintInput,
  CreateTripInput,
  Footprint,
  FootprintFilter,
  FootprintStats,
  PhotoItem,
  Trip,
  TripDay,
  TripItem,
  TripStatus,
  WeatherInfo,
} from '../shared/types';

export class TravelRepository {
  private db: DatabaseSync;

  constructor(dbPath: string = ':memory:') {
    if (dbPath !== ':memory:') {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
    this.db = new DatabaseSync(dbPath);
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS companions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        avatar_color TEXT
      );

      CREATE TABLE IF NOT EXISTS trips (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        cover_photo TEXT,
        start_date TEXT,
        end_date TEXT,
        status TEXT NOT NULL DEFAULT 'planning',
        summary_note TEXT NOT NULL DEFAULT '',
        extensions TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS trip_days (
        id TEXT PRIMARY KEY,
        trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
        day_number INTEGER NOT NULL,
        date TEXT,
        title TEXT NOT NULL DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS trip_companions (
        trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
        companion_id TEXT NOT NULL REFERENCES companions(id) ON DELETE CASCADE,
        PRIMARY KEY (trip_id, companion_id)
      );

      CREATE TABLE IF NOT EXISTS footprints (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        country_code TEXT NOT NULL DEFAULT '',
        country_name TEXT NOT NULL DEFAULT '',
        city_name TEXT NOT NULL DEFAULT '',
        visited_at TEXT NOT NULL,
        photos TEXT NOT NULL DEFAULT '[]',
        note TEXT NOT NULL DEFAULT '',
        rating INTEGER,
        weather TEXT,
        trip_id TEXT REFERENCES trips(id) ON DELETE SET NULL,
        trip_day_id TEXT REFERENCES trip_days(id) ON DELETE SET NULL,
        extensions TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS footprint_companions (
        footprint_id TEXT NOT NULL REFERENCES footprints(id) ON DELETE CASCADE,
        companion_id TEXT NOT NULL REFERENCES companions(id) ON DELETE CASCADE,
        PRIMARY KEY (footprint_id, companion_id)
      );

      CREATE TABLE IF NOT EXISTS trip_items (
        id TEXT PRIMARY KEY,
        trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
        trip_day_id TEXT NOT NULL REFERENCES trip_days(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        lat REAL,
        lng REAL,
        sort_order INTEGER NOT NULL DEFAULT 1,
        planned_time TEXT,
        note TEXT,
        footprint_id TEXT REFERENCES footprints(id) ON DELETE SET NULL,
        extensions TEXT NOT NULL DEFAULT '{}'
      );
    `);
  }

  createCompanion(name: string, avatarColor: string = '#f59e0b'): Companion {
    const id = randomUUID();
    this.db
      .prepare('INSERT INTO companions (id, name, avatar_color) VALUES (?, ?, ?)')
      .run(id, name.trim(), avatarColor);
    return { id, name: name.trim(), avatarColor };
  }

  listCompanions(): Companion[] {
    const rows = this.db
      .prepare('SELECT id, name, avatar_color FROM companions ORDER BY name ASC')
      .all() as Array<{ id: string; name: string; avatar_color: string | null }>;
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      avatarColor: r.avatar_color ?? undefined,
    }));
  }

  private getCompanionsForFootprint(footprintId: string): Companion[] {
    const rows = this.db
      .prepare(
        `SELECT c.id, c.name, c.avatar_color
         FROM companions c
         JOIN footprint_companions fc ON fc.companion_id = c.id
         WHERE fc.footprint_id = ?
         ORDER BY c.name ASC`
      )
      .all(footprintId) as Array<{ id: string; name: string; avatar_color: string | null }>;
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      avatarColor: r.avatar_color ?? undefined,
    }));
  }

  private getCompanionsForTrip(tripId: string): Companion[] {
    const rows = this.db
      .prepare(
        `SELECT c.id, c.name, c.avatar_color
         FROM companions c
         JOIN trip_companions tc ON tc.companion_id = c.id
         WHERE tc.trip_id = ?
         ORDER BY c.name ASC`
      )
      .all(tripId) as Array<{ id: string; name: string; avatar_color: string | null }>;
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      avatarColor: r.avatar_color ?? undefined,
    }));
  }

  private mapFootprintRow(row: Record<string, unknown>): Footprint {
    const id = String(row.id);
    return {
      id,
      title: String(row.title),
      coordinates: { lat: Number(row.lat), lng: Number(row.lng) },
      countryCode: String(row.country_code || ''),
      countryName: String(row.country_name || ''),
      cityName: String(row.city_name || ''),
      visitedAt: String(row.visited_at),
      photos: JSON.parse(String(row.photos || '[]')) as PhotoItem[],
      note: String(row.note || ''),
      rating: row.rating !== null && row.rating !== undefined ? Number(row.rating) : null,
      weather: row.weather ? (JSON.parse(String(row.weather)) as WeatherInfo) : null,
      companions: this.getCompanionsForFootprint(id),
      tripId: row.trip_id ? String(row.trip_id) : null,
      tripDayId: row.trip_day_id ? String(row.trip_day_id) : null,
      extensions: JSON.parse(String(row.extensions || '{}')) as Record<string, unknown>,
      createdAt: String(row.created_at),
    };
  }

  createFootprint(input: CreateFootprintInput): Footprint {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const countryCode = (input.countryCode || '').toUpperCase();
    const countryName = input.countryName || '';
    const cityName = input.cityName || '';
    const photosJson = JSON.stringify(input.photos ?? []);
    const note = input.note ?? '';
    const rating = input.rating ?? null;
    const weatherJson = input.weather ? JSON.stringify(input.weather) : null;
    const tripId = input.tripId ?? null;
    const tripDayId = input.tripDayId ?? null;
    const extensionsJson = JSON.stringify(input.extensions ?? {});

    this.db
      .prepare(
        `INSERT INTO footprints (
          id, title, lat, lng, country_code, country_name, city_name,
          visited_at, photos, note, rating, weather, trip_id, trip_day_id,
          extensions, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        input.title,
        input.coordinates.lat,
        input.coordinates.lng,
        countryCode,
        countryName,
        cityName,
        input.visitedAt,
        photosJson,
        note,
        rating,
        weatherJson,
        tripId,
        tripDayId,
        extensionsJson,
        createdAt
      );

    if (input.companionIds && input.companionIds.length > 0) {
      const insertComp = this.db.prepare(
        'INSERT OR IGNORE INTO footprint_companions (footprint_id, companion_id) VALUES (?, ?)'
      );
      for (const cid of input.companionIds) {
        insertComp.run(id, cid);
      }
    }

    return this.getFootprint(id)!;
  }

  getFootprint(id: string): Footprint | null {
    const row = this.db.prepare('SELECT * FROM footprints WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined;
    if (!row) return null;
    return this.mapFootprintRow(row);
  }

  updateFootprint(id: string, patch: Partial<CreateFootprintInput>): Footprint | null {
    const existing = this.getFootprint(id);
    if (!existing) return null;

    const updatedTitle = patch.title ?? existing.title;
    const updatedLat = patch.coordinates?.lat ?? existing.coordinates.lat;
    const updatedLng = patch.coordinates?.lng ?? existing.coordinates.lng;
    const updatedCountryCode =
      patch.countryCode !== undefined ? patch.countryCode.toUpperCase() : existing.countryCode;
    const updatedCountryName = patch.countryName ?? existing.countryName;
    const updatedCityName = patch.cityName ?? existing.cityName;
    const updatedVisitedAt = patch.visitedAt ?? existing.visitedAt;
    const updatedPhotos = JSON.stringify(patch.photos ?? existing.photos);
    const updatedNote = patch.note ?? existing.note;
    const updatedRating = patch.rating !== undefined ? patch.rating : existing.rating;
    const updatedWeather =
      patch.weather !== undefined
        ? patch.weather
          ? JSON.stringify(patch.weather)
          : null
        : existing.weather
          ? JSON.stringify(existing.weather)
          : null;
    const updatedTripId = patch.tripId !== undefined ? patch.tripId : existing.tripId;
    const updatedTripDayId = patch.tripDayId !== undefined ? patch.tripDayId : existing.tripDayId;
    const updatedExtensions = JSON.stringify(patch.extensions ?? existing.extensions);

    this.db
      .prepare(
        `UPDATE footprints
         SET title = ?, lat = ?, lng = ?, country_code = ?, country_name = ?, city_name = ?,
             visited_at = ?, photos = ?, note = ?, rating = ?, weather = ?,
             trip_id = ?, trip_day_id = ?, extensions = ?
         WHERE id = ?`
      )
      .run(
        updatedTitle,
        updatedLat,
        updatedLng,
        updatedCountryCode,
        updatedCountryName,
        updatedCityName,
        updatedVisitedAt,
        updatedPhotos,
        updatedNote,
        updatedRating,
        updatedWeather,
        updatedTripId,
        updatedTripDayId,
        updatedExtensions,
        id
      );

    if (patch.companionIds !== undefined) {
      this.db.prepare('DELETE FROM footprint_companions WHERE footprint_id = ?').run(id);
      const insertComp = this.db.prepare(
        'INSERT OR IGNORE INTO footprint_companions (footprint_id, companion_id) VALUES (?, ?)'
      );
      for (const cid of patch.companionIds) {
        insertComp.run(id, cid);
      }
    }

    return this.getFootprint(id);
  }

  deleteFootprint(id: string): boolean {
    const res = this.db.prepare('DELETE FROM footprints WHERE id = ?').run(id);
    return Number(res.changes) > 0;
  }

  listFootprints(filter?: FootprintFilter): Footprint[] {
    const clauses: string[] = [];
    const params: Array<string | number> = [];

    if (filter?.year) {
      clauses.push('substr(f.visited_at, 1, 4) = ?');
      params.push(filter.year);
    }
    if (filter?.countryCode) {
      clauses.push('f.country_code = ?');
      params.push(filter.countryCode.toUpperCase());
    }
    if (filter?.tripId) {
      clauses.push('f.trip_id = ?');
      params.push(filter.tripId);
    }
    if (filter?.companionId) {
      clauses.push(
        'EXISTS (SELECT 1 FROM footprint_companions fc WHERE fc.footprint_id = f.id AND fc.companion_id = ?)'
      );
      params.push(filter.companionId);
    }

    const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = this.db
      .prepare(`SELECT f.* FROM footprints f ${whereSql} ORDER BY f.visited_at DESC, f.created_at DESC`)
      .all(...params) as Array<Record<string, unknown>>;

    return rows.map((r) => this.mapFootprintRow(r));
  }

  getStats(): FootprintStats {
    const rows = this.db
      .prepare('SELECT country_code, city_name, visited_at FROM footprints')
      .all() as Array<{ country_code: string; city_name: string; visited_at: string }>;

    const countrySet = new Set<string>();
    const citySet = new Set<string>();
    const yearSet = new Set<string>();

    for (const r of rows) {
      if (r.country_code && r.country_code.trim()) {
        countrySet.add(r.country_code.trim().toUpperCase());
      }
      if (r.city_name && r.city_name.trim()) {
        citySet.add(`${r.country_code}:${r.city_name.trim()}`);
      }
      const year = r.visited_at ? r.visited_at.slice(0, 4) : '';
      if (/^\d{4}$/.test(year)) {
        yearSet.add(year);
      }
    }

    const visitedCountryCodes = Array.from(countrySet).sort();
    const years = Array.from(yearSet).sort((a, b) => b.localeCompare(a));

    return {
      countryCount: visitedCountryCodes.length,
      cityCount: citySet.size,
      landmarkCount: rows.length,
      visitedCountryCodes,
      years,
    };
  }

  private mapTripItemRow(row: Record<string, unknown>): TripItem {
    const footprintId = row.footprint_id ? String(row.footprint_id) : null;
    const lat = row.lat !== null && row.lat !== undefined ? Number(row.lat) : null;
    const lng = row.lng !== null && row.lng !== undefined ? Number(row.lng) : null;
    return {
      id: String(row.id),
      tripId: String(row.trip_id),
      tripDayId: String(row.trip_day_id),
      title: String(row.title),
      coordinates: lat !== null && lng !== null ? { lat, lng } : null,
      sortOrder: Number(row.sort_order),
      plannedTime: row.planned_time ? String(row.planned_time) : undefined,
      note: row.note ? String(row.note) : undefined,
      footprintId,
      footprint: footprintId ? this.getFootprint(footprintId) : null,
      extensions: JSON.parse(String(row.extensions || '{}')) as Record<string, unknown>,
    };
  }

  private getDaysForTrip(tripId: string): TripDay[] {
    const dayRows = this.db
      .prepare('SELECT * FROM trip_days WHERE trip_id = ? ORDER BY day_number ASC')
      .all(tripId) as Array<Record<string, unknown>>;

    return dayRows.map((d) => {
      const dayId = String(d.id);
      const itemRows = this.db
        .prepare('SELECT * FROM trip_items WHERE trip_day_id = ? ORDER BY sort_order ASC, id ASC')
        .all(dayId) as Array<Record<string, unknown>>;

      return {
        id: dayId,
        tripId: String(d.trip_id),
        dayNumber: Number(d.day_number),
        date: d.date ? String(d.date) : null,
        title: String(d.title || ''),
        items: itemRows.map((ir) => this.mapTripItemRow(ir)),
      };
    });
  }

  createTrip(input: CreateTripInput): Trip {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const status: TripStatus = input.status ?? 'planning';
    const summaryNote = input.summaryNote ?? '';
    const extensionsJson = JSON.stringify(input.extensions ?? {});

    this.db
      .prepare(
        `INSERT INTO trips (id, title, cover_photo, start_date, end_date, status, summary_note, extensions, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        input.title,
        input.coverPhoto ?? null,
        input.startDate ?? null,
        input.endDate ?? null,
        status,
        summaryNote,
        extensionsJson,
        createdAt
      );

    if (input.companionIds && input.companionIds.length > 0) {
      const insertComp = this.db.prepare(
        'INSERT OR IGNORE INTO trip_companions (trip_id, companion_id) VALUES (?, ?)'
      );
      for (const cid of input.companionIds) {
        insertComp.run(id, cid);
      }
    }

    const dayCount = Math.max(1, input.dayCount ?? 1);
    for (let i = 1; i <= dayCount; i++) {
      let dayDate: string | null = null;
      if (input.startDate && /^\d{4}-\d{2}-\d{2}$/.test(input.startDate)) {
        const dt = new Date(`${input.startDate}T00:00:00Z`);
        dt.setUTCDate(dt.getUTCDate() + (i - 1));
        dayDate = dt.toISOString().slice(0, 10);
      }
      this.addTripDay(id, { dayNumber: i, date: dayDate, title: `Day ${i}` });
    }

    return this.getTrip(id)!;
  }

  getTrip(id: string): Trip | null {
    const row = this.db.prepare('SELECT * FROM trips WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined;
    if (!row) return null;

    return {
      id: String(row.id),
      title: String(row.title),
      coverPhoto: row.cover_photo ? String(row.cover_photo) : null,
      startDate: row.start_date ? String(row.start_date) : null,
      endDate: row.end_date ? String(row.end_date) : null,
      status: String(row.status) as TripStatus,
      companions: this.getCompanionsForTrip(String(row.id)),
      summaryNote: String(row.summary_note || ''),
      days: this.getDaysForTrip(String(row.id)),
      extensions: JSON.parse(String(row.extensions || '{}')) as Record<string, unknown>,
      createdAt: String(row.created_at),
    };
  }

  listTrips(): Trip[] {
    const rows = this.db
      .prepare('SELECT id FROM trips ORDER BY COALESCE(start_date, created_at) DESC')
      .all() as Array<{ id: string }>;
    return rows.map((r) => this.getTrip(r.id)!).filter(Boolean);
  }

  updateTrip(
    id: string,
    patch: Partial<{
      title: string;
      coverPhoto: string | null;
      startDate: string | null;
      endDate: string | null;
      status: TripStatus;
      companionIds: string[];
      summaryNote: string;
      extensions: Record<string, unknown>;
    }>
  ): Trip | null {
    const existing = this.getTrip(id);
    if (!existing) return null;

    this.db
      .prepare(
        `UPDATE trips
         SET title = ?, cover_photo = ?, start_date = ?, end_date = ?, status = ?, summary_note = ?, extensions = ?
         WHERE id = ?`
      )
      .run(
        patch.title ?? existing.title,
        patch.coverPhoto !== undefined ? patch.coverPhoto : existing.coverPhoto,
        patch.startDate !== undefined ? patch.startDate : existing.startDate,
        patch.endDate !== undefined ? patch.endDate : existing.endDate,
        patch.status ?? existing.status,
        patch.summaryNote ?? existing.summaryNote,
        JSON.stringify(patch.extensions ?? existing.extensions),
        id
      );

    if (patch.companionIds !== undefined) {
      this.db.prepare('DELETE FROM trip_companions WHERE trip_id = ?').run(id);
      const insertComp = this.db.prepare(
        'INSERT OR IGNORE INTO trip_companions (trip_id, companion_id) VALUES (?, ?)'
      );
      for (const cid of patch.companionIds) {
        insertComp.run(id, cid);
      }
    }

    return this.getTrip(id);
  }

  deleteTrip(id: string): boolean {
    const res = this.db.prepare('DELETE FROM trips WHERE id = ?').run(id);
    return Number(res.changes) > 0;
  }

  addTripDay(
    tripId: string,
    input: { dayNumber?: number; date?: string | null; title?: string }
  ): TripDay {
    const id = randomUUID();
    let dayNumber = input.dayNumber;
    if (!dayNumber) {
      const maxRow = this.db
        .prepare('SELECT COALESCE(MAX(day_number), 0) AS max_day FROM trip_days WHERE trip_id = ?')
        .get(tripId) as { max_day: number };
      dayNumber = Number(maxRow.max_day) + 1;
    }
    const title = input.title ?? `Day ${dayNumber}`;
    this.db
      .prepare('INSERT INTO trip_days (id, trip_id, day_number, date, title) VALUES (?, ?, ?, ?, ?)')
      .run(id, tripId, dayNumber, input.date ?? null, title);

    return {
      id,
      tripId,
      dayNumber,
      date: input.date ?? null,
      title,
      items: [],
    };
  }

  addTripItem(
    tripDayId: string,
    input: {
      title: string;
      coordinates?: Coordinates | null;
      plannedTime?: string;
      note?: string;
      sortOrder?: number;
      extensions?: Record<string, unknown>;
    }
  ): TripItem {
    const dayRow = this.db
      .prepare('SELECT trip_id FROM trip_days WHERE id = ?')
      .get(tripDayId) as { trip_id: string } | undefined;
    if (!dayRow) {
      throw new Error(`TripDay not found: ${tripDayId}`);
    }

    let sortOrder = input.sortOrder;
    if (sortOrder === undefined) {
      const maxRow = this.db
        .prepare('SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM trip_items WHERE trip_day_id = ?')
        .get(tripDayId) as { max_order: number };
      sortOrder = Number(maxRow.max_order) + 1;
    }

    const id = randomUUID();
    this.db
      .prepare(
        `INSERT INTO trip_items (
          id, trip_id, trip_day_id, title, lat, lng, sort_order, planned_time, note, footprint_id, extensions
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`
      )
      .run(
        id,
        dayRow.trip_id,
        tripDayId,
        input.title,
        input.coordinates?.lat ?? null,
        input.coordinates?.lng ?? null,
        sortOrder,
        input.plannedTime ?? null,
        input.note ?? null,
        JSON.stringify(input.extensions ?? {})
      );

    const row = this.db.prepare('SELECT * FROM trip_items WHERE id = ?').get(id) as Record<
      string,
      unknown
    >;
    return this.mapTripItemRow(row);
  }

  reorderTripItems(tripDayId: string, orderedItemIds: string[]): TripItem[] {
    const updateStmt = this.db.prepare(
      'UPDATE trip_items SET sort_order = ? WHERE id = ? AND trip_day_id = ?'
    );
    orderedItemIds.forEach((itemId, index) => {
      updateStmt.run(index + 1, itemId, tripDayId);
    });

    const rows = this.db
      .prepare('SELECT * FROM trip_items WHERE trip_day_id = ? ORDER BY sort_order ASC')
      .all(tripDayId) as Array<Record<string, unknown>>;
    return rows.map((r) => this.mapTripItemRow(r));
  }

  checkInTripItem(
    tripItemId: string,
    visitInput: Omit<CreateFootprintInput, 'tripId' | 'tripDayId' | 'title'> & { title?: string }
  ): { tripItem: TripItem; footprint: Footprint } {
    const itemRow = this.db
      .prepare('SELECT * FROM trip_items WHERE id = ?')
      .get(tripItemId) as Record<string, unknown> | undefined;
    if (!itemRow) {
      throw new Error(`TripItem not found: ${tripItemId}`);
    }

    const tripId = String(itemRow.trip_id);
    const tripDayId = String(itemRow.trip_day_id);
    const inheritedCompanionIds =
      visitInput.companionIds !== undefined
        ? visitInput.companionIds
        : this.getCompanionsForTrip(tripId).map((c) => c.id);

    const footprint = this.createFootprint({
      ...visitInput,
      title: visitInput.title ?? String(itemRow.title),
      companionIds: inheritedCompanionIds,
      tripId,
      tripDayId,
    });

    this.db
      .prepare('UPDATE trip_items SET footprint_id = ?, lat = ?, lng = ? WHERE id = ?')
      .run(
        footprint.id,
        visitInput.coordinates.lat,
        visitInput.coordinates.lng,
        tripItemId
      );

    const updatedItemRow = this.db
      .prepare('SELECT * FROM trip_items WHERE id = ?')
      .get(tripItemId) as Record<string, unknown>;
    return {
      tripItem: this.mapTripItemRow(updatedItemRow),
      footprint,
    };
  }

  addLiveTripCheckIn(
    tripDayId: string,
    visitInput: Omit<CreateFootprintInput, 'tripId' | 'tripDayId'>
  ): { tripItem: TripItem; footprint: Footprint } {
    const item = this.addTripItem(tripDayId, {
      title: visitInput.title,
      coordinates: visitInput.coordinates,
      note: visitInput.note,
    });
    return this.checkInTripItem(item.id, visitInput);
  }

  exportBackup(): BackupPayload {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      companions: this.listCompanions(),
      footprints: this.listFootprints(),
      trips: this.listTrips(),
    };
  }

  importBackup(payload: BackupPayload): void {
    this.db.exec('BEGIN TRANSACTION;');
    try {
      this.db.exec(`
        DELETE FROM trip_items;
        DELETE FROM footprint_companions;
        DELETE FROM footprints;
        DELETE FROM trip_companions;
        DELETE FROM trip_days;
        DELETE FROM trips;
        DELETE FROM companions;
      `);

      const insertCompanion = this.db.prepare(
        'INSERT INTO companions (id, name, avatar_color) VALUES (?, ?, ?)'
      );
      for (const c of payload.companions ?? []) {
        insertCompanion.run(c.id, c.name, c.avatarColor ?? null);
      }

      const insertTrip = this.db.prepare(
        `INSERT INTO trips (id, title, cover_photo, start_date, end_date, status, summary_note, extensions, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      const insertTripComp = this.db.prepare(
        'INSERT OR IGNORE INTO trip_companions (trip_id, companion_id) VALUES (?, ?)'
      );
      const insertTripDay = this.db.prepare(
        'INSERT INTO trip_days (id, trip_id, day_number, date, title) VALUES (?, ?, ?, ?, ?)'
      );

      for (const t of payload.trips ?? []) {
        insertTrip.run(
          t.id,
          t.title,
          t.coverPhoto ?? null,
          t.startDate ?? null,
          t.endDate ?? null,
          t.status,
          t.summaryNote ?? '',
          JSON.stringify(t.extensions ?? {}),
          t.createdAt
        );
        for (const c of t.companions ?? []) {
          insertTripComp.run(t.id, c.id);
        }
        for (const d of t.days ?? []) {
          insertTripDay.run(d.id, t.id, d.dayNumber, d.date ?? null, d.title ?? '');
        }
      }

      const insertFootprint = this.db.prepare(
        `INSERT INTO footprints (
          id, title, lat, lng, country_code, country_name, city_name,
          visited_at, photos, note, rating, weather, trip_id, trip_day_id,
          extensions, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      const insertFpComp = this.db.prepare(
        'INSERT OR IGNORE INTO footprint_companions (footprint_id, companion_id) VALUES (?, ?)'
      );

      for (const f of payload.footprints ?? []) {
        insertFootprint.run(
          f.id,
          f.title,
          f.coordinates.lat,
          f.coordinates.lng,
          f.countryCode ?? '',
          f.countryName ?? '',
          f.cityName ?? '',
          f.visitedAt,
          JSON.stringify(f.photos ?? []),
          f.note ?? '',
          f.rating ?? null,
          f.weather ? JSON.stringify(f.weather) : null,
          f.tripId ?? null,
          f.tripDayId ?? null,
          JSON.stringify(f.extensions ?? {}),
          f.createdAt
        );
        for (const c of f.companions ?? []) {
          insertFpComp.run(f.id, c.id);
        }
      }

      const insertTripItem = this.db.prepare(
        `INSERT INTO trip_items (
          id, trip_id, trip_day_id, title, lat, lng, sort_order, planned_time, note, footprint_id, extensions
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      for (const t of payload.trips ?? []) {
        for (const d of t.days ?? []) {
          for (const item of d.items ?? []) {
            insertTripItem.run(
              item.id,
              t.id,
              d.id,
              item.title,
              item.coordinates?.lat ?? null,
              item.coordinates?.lng ?? null,
              item.sortOrder,
              item.plannedTime ?? null,
              item.note ?? null,
              item.footprintId ?? null,
              JSON.stringify(item.extensions ?? {})
            );
          }
        }
      }

      this.db.exec('COMMIT;');
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
  }

  close(): void {
    this.db.close();
  }
}
