# Travel Footprint & Trip Journal App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal, dual-layer travel footprint and live trip journal web application (Mobile PWA + Desktop) that illuminates visited countries/regions on an interactive world map, displays Polaroid story cards with automatic weather/time/companion metadata, supports retroactive batch EXIF photo import + manual search pinning, and manages day-by-day trip itineraries that automatically sync into the lifetime footprints library.

**Architecture:** A TypeScript full-stack workspace powered by a lightweight Node.js + Express + built-in `node:sqlite` backend (storing structured data in a local SQLite file and photos on disk) paired with a React 18 + Vite + Tailwind CSS + MapLibre GL JS responsive frontend. Two loosely coupled domain aggregates—`Footprint` (lifetime place visits) and `Trip` (`Trip` → `TripDay` → `TripItem`)—are linked via optional foreign keys (`tripId`, `tripDayId`, `footprintId`) and open `extensions` JSON objects for future extensibility.

**Tech Stack:** Node.js 24 (`node:sqlite`), TypeScript, Express, React 18, Vite, Tailwind CSS, MapLibre GL JS, `exifr` (EXIF GPS/date extraction), Vitest, Supertest, React Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-19-travel-tracker-design.md`

## Global Constraints

- Dual-layer decoupling: Users can log a standalone `Footprint` without creating a `Trip`; logging or checking in a visited stop inside a `Trip` automatically creates/links a `Footprint` in the global library without duplicate entry.
- Fast check-in anti-goal: Only `title`, `coordinates` (`lat`, `lng`), and `visitedAt` are required to save a `Footprint`; all other fields (`photos`, `note`, `rating`, `weather`, `companions`, `tripId`, `tripDayId`) are optional with sensible defaults.
- Zero paid API keys: Map rendering uses MapLibre GL JS with free OpenStreetMap/Carto tiles and bundled/fetched Natural Earth country GeoJSON; geocoding uses Nominatim; current and historical weather uses Open-Meteo Forecast & Archive APIs.
- Data ownership: Full JSON + photo metadata export and import must be supported so user memories are never locked in.
- Extensibility: `Footprint`, `Trip`, and `TripItem` entities must persist an `extensions: Record<string, unknown>` JSON column.

## Review Focus

1. **Month-only retroactive dates (`YYYY-MM`)**: When a user logs a historical visit remembering only year and month (e.g. `"2019-04"`), year filtering, chronological sorting, and Open-Meteo date normalization (`"2019-04"` → `"2019-04-01"`) must succeed without throwing `Invalid Date`. (Tested in Task 1 & Task 2)
2. **Deleting a `Trip` linked to visited `Footprint`s**: Deleting a `Trip` or `TripDay` must set `tripId = null` and `tripDayId = null` on associated `Footprint` records (`ON DELETE SET NULL`) rather than deleting the user's lifetime landmark memories. (Tested in Task 1)
3. **Check-in from a `TripItem` inherits `Trip.companions`**: When checking in a planned `TripItem` (or adding a live check-in to a `TripDay`) without explicitly overriding `companions`, the created `Footprint` must automatically inherit the parent `Trip`'s `companions` list. (Tested in Task 1 & Task 3)
4. **External weather/geocoding API failure or timeout**: When Open-Meteo or Nominatim returns a non-200 response or rejects, enrichment must resolve with `weather: null` or fallback location strings rather than failing the check-in flow. (Tested in Task 2)
5. **Batch import photos lacking EXIF GPS or date**: When `exifr` parses an image with no GPS or timestamp tags, the parser must return `coordinates: null` and `visitedAt: null` alongside the file preview so the user can manually pin or skip it without crashing the batch import. (Tested in Task 4)

---

## File Structure

- `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `public/manifest.json` — Project configuration, dependencies, and PWA manifest
- `src/shared/types.ts` — Shared TypeScript interfaces (`Coordinates`, `WeatherInfo`, `PhotoItem`, `Companion`, `Footprint`, `FootprintFilter`, `FootprintStats`, `Trip`, `TripDay`, `TripItem`, `BackupPayload`)
- `src/server/repository.ts` — SQLite (`node:sqlite`) data access layer for companions, footprints, trips, trip days, trip items, stats, and full backup export/import
- `src/server/enrichment.ts` — Open-Meteo current/historical weather client, WMO weather code mapper, Nominatim search/reverse-geocoding client, and SQLite response cache
- `src/server/app.ts` — Express application factory with REST API routes for footprints, stats, companions, trips, check-ins, enrichment, photo upload, and backup export/import
- `src/server/index.ts` — HTTP server entry point
- `src/client/lib/exif.ts` — Browser EXIF GPS and timestamp extractor using `exifr`
- `src/client/lib/api.ts` — Typed frontend API client
- `src/client/components/StatsBar.tsx` — Floating achievement counter capsule (countries, cities, landmarks) and filter bar (year, country, companion)
- `src/client/components/PolaroidModal.tsx` — Polaroid story card modal displaying photo frame, note, star rating, weather badge, companion tags, and edit/delete controls
- `src/client/components/WorldMapView.tsx` — Interactive MapLibre GL world map with illuminated visited countries GeoJSON layer, photo pin markers, and trip route polylines
- `src/client/components/CheckInModal.tsx` — Fast landmark check-in form with GPS/place search, auto weather/location enrichment, companion tags, and optional active trip link
- `src/client/components/RetroImportModal.tsx` — Dual-track retroactive import wizard (batch EXIF photo dropzone + manual search/pin fallback)
- `src/client/components/TripsView.tsx` — Independent Trips & Live Journal view (Trip cards, Day 1/Day 2 timeline, planned vs. visited stops, one-click check-in, and route map)
- `src/client/App.tsx`, `src/client/main.tsx`, `src/client/index.css` — Top-level responsive application shell and navigation

---

### Task 1: Project Scaffolding, Shared Domain Types & SQLite Repository Layer

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `src/shared/types.ts`
- Create: `src/server/repository.ts`
- Test: `tests/server/repository.test.ts`

**Interfaces:**
- Consumes: Node.js built-in `node:sqlite` (`DatabaseSync`) and `node:crypto` (`randomUUID`)
- Produces:
  - `src/shared/types.ts`:
    - `Coordinates { lat: number; lng: number }`
    - `WeatherInfo { conditionCode: number; conditionText: string; tempC: number; icon: string }`
    - `PhotoItem { id: string; url: string; caption?: string; takenAt?: string }`
    - `Companion { id: string; name: string; avatarColor?: string }`
    - `Footprint { id: string; title: string; coordinates: Coordinates; countryCode: string; countryName: string; cityName: string; visitedAt: string; photos: PhotoItem[]; note: string; rating: number | null; weather: WeatherInfo | null; companions: Companion[]; tripId: string | null; tripDayId: string | null; extensions: Record<string, unknown>; createdAt: string }`
    - `CreateFootprintInput { title: string; coordinates: Coordinates; countryCode?: string; countryName?: string; cityName?: string; visitedAt: string; photos?: PhotoItem[]; note?: string; rating?: number | null; weather?: WeatherInfo | null; companionIds?: string[]; tripId?: string | null; tripDayId?: string | null; extensions?: Record<string, unknown> }`
    - `FootprintFilter { year?: string; countryCode?: string; companionId?: string; tripId?: string }`
    - `FootprintStats { countryCount: number; cityCount: number; landmarkCount: number; visitedCountryCodes: string[]; years: string[] }`
    - `TripStatus = 'planning' | 'active' | 'completed'`
    - `TripItem { id: string; tripId: string; tripDayId: string; title: string; coordinates: Coordinates | null; sortOrder: number; plannedTime?: string; note?: string; footprintId: string | null; footprint?: Footprint | null; extensions: Record<string, unknown> }`
    - `TripDay { id: string; tripId: string; dayNumber: number; date: string | null; title: string; items: TripItem[] }`
    - `Trip { id: string; title: string; coverPhoto: string | null; startDate: string | null; endDate: string | null; status: TripStatus; companions: Companion[]; summaryNote: string; days: TripDay[]; extensions: Record<string, unknown>; createdAt: string }`
    - `BackupPayload { version: number; exportedAt: string; companions: Companion[]; footprints: Footprint[]; trips: Trip[] }`
  - `src/server/repository.ts`:
    - `class TravelRepository`
      - `constructor(dbPath?: string)` (defaults to `':memory:'` in tests)
      - `createCompanion(name: string, avatarColor?: string): Companion`
      - `listCompanions(): Companion[]`
      - `createFootprint(input: CreateFootprintInput): Footprint`
      - `updateFootprint(id: string, patch: Partial<CreateFootprintInput>): Footprint | null`
      - `deleteFootprint(id: string): boolean`
      - `getFootprint(id: string): Footprint | null`
      - `listFootprints(filter?: FootprintFilter): Footprint[]`
      - `getStats(): FootprintStats`
      - `createTrip(input: { title: string; coverPhoto?: string | null; startDate?: string | null; endDate?: string | null; status?: TripStatus; companionIds?: string[]; summaryNote?: string; dayCount?: number; extensions?: Record<string, unknown> }): Trip`
      - `getTrip(id: string): Trip | null`
      - `listTrips(): Trip[]`
      - `updateTrip(id: string, patch: Partial<{ title: string; coverPhoto: string | null; startDate: string | null; endDate: string | null; status: TripStatus; companionIds: string[]; summaryNote: string; extensions: Record<string, unknown> }>): Trip | null`
      - `deleteTrip(id: string): boolean`
      - `addTripDay(tripId: string, input: { dayNumber?: number; date?: string | null; title?: string }): TripDay`
      - `addTripItem(tripDayId: string, input: { title: string; coordinates?: Coordinates | null; plannedTime?: string; note?: string; sortOrder?: number; extensions?: Record<string, unknown> }): TripItem`
      - `reorderTripItems(tripDayId: string, orderedItemIds: string[]): TripItem[]`
      - `checkInTripItem(tripItemId: string, visitInput: Omit<CreateFootprintInput, 'tripId' | 'tripDayId' | 'title'> & { title?: string }): { tripItem: TripItem; footprint: Footprint }`
      - `addLiveTripCheckIn(tripDayId: string, visitInput: Omit<CreateFootprintInput, 'tripId' | 'tripDayId'>): { tripItem: TripItem; footprint: Footprint }`
      - `exportBackup(): BackupPayload`
      - `importBackup(payload: BackupPayload): void`
      - `close(): void`

- [ ] **Step 1: Initialize `package.json`, `tsconfig.json`, `vite.config.ts`, and install dependencies**

Create `package.json` with scripts `"dev"`, `"build"`, `"test": "vitest run"`, and install dependencies (`express`, `cors`, `maplibre-gl`, `exifr`, `lucide-react`, `react`, `react-dom`) and devDependencies (`typescript`, `vite`, `@vitejs/plugin-react`, `tailwindcss`, `@tailwindcss/vite`, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `supertest`, `@types/express`, `@types/cors`, `@types/supertest`, `@types/react`, `@types/react-dom`, `tsx`).

- [ ] **Step 2: Write the failing repository tests in `tests/server/repository.test.ts`**

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TravelRepository } from '../../src/server/repository';

describe('TravelRepository', () => {
  let repo: TravelRepository;

  beforeEach(() => {
    repo = new TravelRepository(':memory:');
  });

  afterEach(() => {
    repo.close();
  });

  it('creates standalone footprints, supports YYYY-MM partial dates, and computes stats & filters', () => {
    const alice = repo.createCompanion('Alice', '#f59e0b');
    const bob = repo.createCompanion('Bob', '#10b981');

    repo.createFootprint({
      title: 'Kiyomizu-dera',
      coordinates: { lat: 34.9949, lng: 135.785 },
      countryCode: 'JP',
      countryName: 'Japan',
      cityName: 'Kyoto',
      visitedAt: '2019-04', // Partial month-only date (Review Focus #1)
      note: 'Cherry blossoms at dusk',
      rating: 5,
      companionIds: [alice.id],
      extensions: { ticketPrice: 400 },
    });

    repo.createFootprint({
      title: 'Taipei 101',
      coordinates: { lat: 25.0339, lng: 121.5645 },
      countryCode: 'TW',
      countryName: 'Taiwan',
      cityName: 'Taipei',
      visitedAt: '2024-11-15T18:30:00Z',
      companionIds: [bob.id],
    });

    const stats = repo.getStats();
    expect(stats.countryCount).toBe(2);
    expect(stats.cityCount).toBe(2);
    expect(stats.landmarkCount).toBe(2);
    expect(stats.visitedCountryCodes).toEqual(['JP', 'TW']);
    expect(stats.years).toEqual(['2024', '2019']);

    const byYear2019 = repo.listFootprints({ year: '2019' });
    expect(byYear2019).toHaveLength(1);
    expect(byYear2019[0].title).toBe('Kiyomizu-dera');
    expect(byYear2019[0].extensions).toEqual({ ticketPrice: 400 });

    const byAlice = repo.listFootprints({ companionId: alice.id });
    expect(byAlice).toHaveLength(1);
    expect(byAlice[0].companions[0].name).toBe('Alice');
  });

  it('links Trip check-ins to global Footprints, inherits Trip companions, and preserves Footprints when Trip is deleted', () => {
    const partner = repo.createCompanion('Ken', '#3b82f6');
    const trip = repo.createTrip({
      title: '2024 Kansai Autumn',
      startDate: '2024-11-01',
      endDate: '2024-11-05',
      status: 'active',
      companionIds: [partner.id],
      dayCount: 2,
    });

    expect(trip.days).toHaveLength(2);
    const day1 = trip.days[0];

    const plannedStop = repo.addTripItem(day1.id, {
      title: 'Fushimi Inari Taisha',
      coordinates: { lat: 34.9671, lng: 135.7727 },
      plannedTime: '09:00',
    });
    expect(plannedStop.footprintId).toBeNull();

    // Check in planned stop without passing companionIds -> inherits trip's companions (Review Focus #3)
    const { tripItem, footprint } = repo.checkInTripItem(plannedStop.id, {
      coordinates: { lat: 34.9671, lng: 135.7727 },
      countryCode: 'JP',
      countryName: 'Japan',
      cityName: 'Kyoto',
      visitedAt: '2024-11-01T09:30:00Z',
      note: 'Thousands of torii gates!',
      rating: 5,
    });

    expect(tripItem.footprintId).toBe(footprint.id);
    expect(footprint.tripId).toBe(trip.id);
    expect(footprint.tripDayId).toBe(day1.id);
    expect(footprint.companions.map((c) => c.name)).toEqual(['Ken']);

    // Add live unplanned check-in directly to Day 1
    const live = repo.addLiveTripCheckIn(day1.id, {
      title: 'Uji Matcha Cafe',
      coordinates: { lat: 34.8893, lng: 135.8077 },
      countryCode: 'JP',
      countryName: 'Japan',
      cityName: 'Uji',
      visitedAt: '2024-11-01T14:00:00Z',
    });
    expect(live.footprint.companions.map((c) => c.name)).toEqual(['Ken']);

    // Deleting the trip must preserve both footprints in the global library (Review Focus #2)
    repo.deleteTrip(trip.id);
    expect(repo.getTrip(trip.id)).toBeNull();

    const remainingFootprints = repo.listFootprints();
    expect(remainingFootprints).toHaveLength(2);
    expect(remainingFootprints.every((f) => f.tripId === null && f.tripDayId === null)).toBe(true);
  });

  it('exports and imports full backup payload without data loss', () => {
    const c = repo.createCompanion('Solo', '#6366f1');
    repo.createFootprint({
      title: 'Eiffel Tower',
      coordinates: { lat: 48.8584, lng: 2.2945 },
      countryCode: 'FR',
      countryName: 'France',
      cityName: 'Paris',
      visitedAt: '2023-06-10',
      companionIds: [c.id],
    });
    const backup = repo.exportBackup();

    const repo2 = new TravelRepository(':memory:');
    repo2.importBackup(backup);
    expect(repo2.listFootprints()).toHaveLength(1);
    expect(repo2.listFootprints()[0].title).toBe('Eiffel Tower');
    expect(repo2.listFootprints()[0].companions[0].name).toBe('Solo');
    repo2.close();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/server/repository.test.ts`
Expected: FAIL with module `../../src/server/repository` not found.

- [ ] **Step 4: Implement `src/shared/types.ts` and `src/server/repository.ts`**

Implement the exact types and `TravelRepository` class using `DatabaseSync` from `'node:sqlite'`. Enable `PRAGMA foreign_keys = ON`. Define tables `companions`, `trips`, `trip_days` (`ON DELETE CASCADE`), `footprints` (`trip_id TEXT REFERENCES trips(id) ON DELETE SET NULL`, `trip_day_id TEXT REFERENCES trip_days(id) ON DELETE SET NULL`), `footprint_companions`, `trip_companions`, and `trip_items` (`footprint_id TEXT REFERENCES footprints(id) ON DELETE SET NULL`). Extract year via `substr(visited_at, 1, 4)` so both `YYYY-MM` and full ISO strings sort and filter identically.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/server/repository.test.ts`
Expected: PASS (3 passed)

- [ ] **Step 6: Commit**

```bash
git init
git add package.json tsconfig.json vite.config.ts src/shared/types.ts src/server/repository.ts tests/server/repository.test.ts
git commit -m "feat: add domain types and SQLite travel repository"
```

---

### Task 2: Geo & Weather Enrichment Service (Open-Meteo + Nominatim + Local Cache)

**Files:**
- Create: `src/server/enrichment.ts`
- Test: `tests/server/enrichment.test.ts`

**Interfaces:**
- Consumes: `Coordinates`, `WeatherInfo` from `src/shared/types.ts`
- Produces:
  - `wmoCodeToWeather(code: number, tempC: number): WeatherInfo`
  - `normalizeVisitDate(visitedAt: string): string` (converts `"2019-04"` → `"2019-04-01"` and `"2024-11-15T18:30:00Z"` → `"2024-11-15"`)
  - `class EnrichmentService`
    - `constructor(fetchFn?: typeof fetch)`
    - `fetchWeatherForVisit(coords: Coordinates, visitedAt: string): Promise<WeatherInfo | null>`
    - `reverseGeocode(coords: Coordinates): Promise<{ countryCode: string; countryName: string; cityName: string; displayName: string } | null>`
    - `searchPlaces(query: string): Promise<Array<{ title: string; displayName: string; coordinates: Coordinates; countryCode: string; countryName: string; cityName: string }>>`

- [ ] **Step 1: Write the failing enrichment tests in `tests/server/enrichment.test.ts`**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { EnrichmentService, normalizeVisitDate, wmoCodeToWeather } from '../../src/server/enrichment';

describe('EnrichmentService', () => {
  it('normalizes full ISO dates and partial YYYY-MM dates into YYYY-MM-DD', () => {
    expect(normalizeVisitDate('2024-11-15T18:30:00Z')).toBe('2024-11-15');
    expect(normalizeVisitDate('2019-04')).toBe('2019-04-01');
  });

  it('maps WMO codes to human-readable Traditional Chinese labels and icons', () => {
    expect(wmoCodeToWeather(0, 24.6)).toEqual({
      conditionCode: 0,
      conditionText: '晴朗',
      tempC: 25,
      icon: '☀️',
    });
    expect(wmoCodeToWeather(61, 16.2).icon).toBe('🌧️');
  });

  it('fetches historical weather from Open-Meteo archive API and caches repeated requests', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        daily: {
          weather_code: [1],
          temperature_2m_max: [21.8],
        },
      }),
    });

    const service = new EnrichmentService(mockFetch as unknown as typeof fetch);
    const w1 = await service.fetchWeatherForVisit({ lat: 35.0, lng: 135.7 }, '2019-04');
    const w2 = await service.fetchWeatherForVisit({ lat: 35.0, lng: 135.7 }, '2019-04');

    expect(w1).toEqual({
      conditionCode: 1,
      conditionText: '晴時多雲',
      tempC: 22,
      icon: '🌤️',
    });
    expect(w2).toEqual(w1);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toContain('start_date=2019-04-01');
  });

  it('returns null gracefully when Open-Meteo or Nominatim fails (Review Focus #4)', async () => {
    const failingFetch = vi.fn().mockRejectedValue(new Error('Network offline'));
    const service = new EnrichmentService(failingFetch as unknown as typeof fetch);

    const weather = await service.fetchWeatherForVisit({ lat: 25.0, lng: 121.5 }, '2024-10-01');
    const geo = await service.reverseGeocode({ lat: 25.0, lng: 121.5 });
    const places = await service.searchPlaces('Tokyo Tower');

    expect(weather).toBeNull();
    expect(geo).toBeNull();
    expect(places).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/server/enrichment.test.ts`
Expected: FAIL with module `../../src/server/enrichment` not found.

- [ ] **Step 3: Implement `src/server/enrichment.ts`**

Implement `normalizeVisitDate`, `wmoCodeToWeather`, and `EnrichmentService` with an in-memory `Map` cache keyed by rounded coordinates (`lat.toFixed(2),lng.toFixed(2)`) and date. Use `https://archive-api.open-meteo.com/v1/archive` for dates older than 5 days and `https://api.open-meteo.com/v1/forecast` for recent/today dates. Use `https://nominatim.openstreetmap.org/reverse` and `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1` with a descriptive `User-Agent: TravelFootprintApp/1.0` header. Wrap all network calls in `try/catch` returning `null` or `[]` on error.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/server/enrichment.test.ts`
Expected: PASS (4 passed)

- [ ] **Step 5: Commit**

```bash
git add src/server/enrichment.ts tests/server/enrichment.test.ts
git commit -m "feat: add Open-Meteo and Nominatim enrichment service with caching"
```

---

### Task 3: Express REST API Server & Photo Storage Endpoints

**Files:**
- Create: `src/server/app.ts`
- Create: `src/server/index.ts`
- Test: `tests/server/app.test.ts`

**Interfaces:**
- Consumes: `TravelRepository` from `src/server/repository.ts`, `EnrichmentService` from `src/server/enrichment.ts`
- Produces:
  - `createApp(repo: TravelRepository, enrichment: EnrichmentService, uploadsDir?: string): express.Express`
  - REST Endpoints:
    - `GET /api/stats` → `FootprintStats`
    - `GET /api/companions` → `Companion[]`
    - `POST /api/companions` (`{ name, avatarColor }`) → `Companion`
    - `GET /api/footprints?year=&countryCode=&companionId=&tripId=` → `Footprint[]`
    - `POST /api/footprints` (`CreateFootprintInput & { autoEnrich?: boolean }`) → `Footprint` (auto-fills missing `weather` and `countryCode`/`cityName` via `EnrichmentService` when `autoEnrich !== false`)
    - `PATCH /api/footprints/:id` → `Footprint`
    - `DELETE /api/footprints/:id` → `{ ok: true }`
    - `GET /api/trips` → `Trip[]`
    - `GET /api/trips/:id` → `Trip`
    - `POST /api/trips` → `Trip`
    - `PATCH /api/trips/:id` → `Trip`
    - `DELETE /api/trips/:id` → `{ ok: true }`
    - `POST /api/trips/:tripId/days` → `TripDay`
    - `POST /api/trip-days/:dayId/items` → `TripItem`
    - `PUT /api/trip-days/:dayId/reorder` (`{ orderedItemIds: string[] }`) → `TripItem[]`
    - `POST /api/trip-items/:itemId/checkin` → `{ tripItem: TripItem; footprint: Footprint }`
    - `POST /api/trip-days/:dayId/live-checkin` → `{ tripItem: TripItem; footprint: Footprint }`
    - `POST /api/enrich` (`{ coordinates: Coordinates; visitedAt: string }`) → `{ weather: WeatherInfo | null; geo: { countryCode: string; countryName: string; cityName: string; displayName: string } | null }`
    - `GET /api/places/search?q=` → `Array<{ title: string; displayName: string; coordinates: Coordinates; countryCode: string; countryName: string; cityName: string }>`
    - `POST /api/photos` (`{ dataUrl: string; filename?: string; caption?: string; takenAt?: string }`) → `PhotoItem`
    - `GET /api/backup/export` → `BackupPayload`
    - `POST /api/backup/import` (`BackupPayload`) → `{ ok: true }`

- [ ] **Step 1: Write the failing API integration tests in `tests/server/app.test.ts`**

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { TravelRepository } from '../../src/server/repository';
import { EnrichmentService } from '../../src/server/enrichment';
import { createApp } from '../../src/server/app';

describe('Express API routes', () => {
  let repo: TravelRepository;
  let tmpUploads: string;

  beforeEach(() => {
    repo = new TravelRepository(':memory:');
    tmpUploads = fs.mkdtempSync(path.join(os.tmpdir(), 'travel-uploads-'));
  });

  afterEach(() => {
    repo.close();
    fs.rmSync(tmpUploads, { recursive: true, force: true });
  });

  it('auto-enriches weather & reverse geocoding when creating a footprint', async () => {
    const mockEnrich = new EnrichmentService(vi.fn() as unknown as typeof fetch);
    vi.spyOn(mockEnrich, 'fetchWeatherForVisit').mockResolvedValue({
      conditionCode: 0,
      conditionText: '晴朗',
      tempC: 26,
      icon: '☀️',
    });
    vi.spyOn(mockEnrich, 'reverseGeocode').mockResolvedValue({
      countryCode: 'JP',
      countryName: 'Japan',
      cityName: 'Tokyo',
      displayName: 'Tokyo Tower, Minato, Tokyo, Japan',
    });

    const app = createApp(repo, mockEnrich, tmpUploads);

    const res = await request(app)
      .post('/api/footprints')
      .send({
        title: 'Tokyo Tower',
        coordinates: { lat: 35.6586, lng: 139.7454 },
        visitedAt: '2024-05-10',
      });

    expect(res.status).toBe(201);
    expect(res.body.countryCode).toBe('JP');
    expect(res.body.cityName).toBe('Tokyo');
    expect(res.body.weather.tempC).toBe(26);
  });

  it('handles trip creation, planned item check-in, and photo dataUrl saving', async () => {
    const mockEnrich = new EnrichmentService(vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch);
    const app = createApp(repo, mockEnrich, tmpUploads);

    const photoRes = await request(app)
      .post('/api/photos')
      .send({
        dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        caption: 'First glimpse',
      });
    expect(photoRes.status).toBe(201);
    expect(photoRes.body.url).toMatch(/^\/uploads\//);

    const tripRes = await request(app)
      .post('/api/trips')
      .send({ title: 'Island Hopping', dayCount: 1 });
    expect(tripRes.status).toBe(201);
    const dayId = tripRes.body.days[0].id;

    const itemRes = await request(app)
      .post(`/api/trip-days/${dayId}/items`)
      .send({ title: 'Sun Moon Lake', coordinates: { lat: 23.85, lng: 120.91 } });
    expect(itemRes.status).toBe(201);

    const checkinRes = await request(app)
      .post(`/api/trip-items/${itemRes.body.id}/checkin`)
      .send({
        coordinates: { lat: 23.85, lng: 120.91 },
        countryCode: 'TW',
        countryName: 'Taiwan',
        cityName: 'Nantou',
        visitedAt: '2024-12-01',
        photos: [photoRes.body],
      });
    expect(checkinRes.status).toBe(201);
    expect(checkinRes.body.footprint.photos).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/server/app.test.ts`
Expected: FAIL with module `../../src/server/app` not found.

- [ ] **Step 3: Implement `src/server/app.ts` and `src/server/index.ts`**

Implement `createApp(repo, enrichment, uploadsDir)` with `express.json({ limit: '50mb' })` so batch base64/dataUrl photo uploads work smoothly. Serve `uploadsDir` at `/uploads`. In `POST /api/footprints`, `POST /api/trip-items/:itemId/checkin`, and `POST /api/trip-days/:dayId/live-checkin`, if `weather` is missing or `countryCode` is empty, call `enrichment.fetchWeatherForVisit` and `enrichment.reverseGeocode` automatically. Create `src/server/index.ts` that initializes `TravelRepository('./data/travel.db')` and listens on `PORT || 3001`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/server/app.test.ts`
Expected: PASS (2 passed)

- [ ] **Step 5: Commit**

```bash
git add src/server/app.ts src/server/index.ts tests/server/app.test.ts
git commit -m "feat: add Express REST API server and photo upload endpoints"
```

---

### Task 4: Client-Side EXIF Batch Parser & Typed API Client

**Files:**
- Create: `src/client/lib/exif.ts`
- Create: `src/client/lib/api.ts`
- Test: `tests/client/exif.test.ts`

**Interfaces:**
- Consumes: `exifr` package, shared types from `src/shared/types.ts`
- Produces:
  - `src/client/lib/exif.ts`:
    - `ParsedPhotoDraft { id: string; fileName: string; dataUrl: string; coordinates: Coordinates | null; visitedAt: string | null; suggestedTitle: string }`
    - `extractPhotoMetadata(file: File | Blob, fileName?: string, parseExifFn?: (input: Blob) => Promise<any>, readDataUrlFn?: (input: Blob) => Promise<string>): Promise<ParsedPhotoDraft>`
  - `src/client/lib/api.ts`:
    - `api.getStats(): Promise<FootprintStats>`
    - `api.listCompanions(): Promise<Companion[]>`
    - `api.createCompanion(name: string, avatarColor?: string): Promise<Companion>`
    - `api.listFootprints(filter?: FootprintFilter): Promise<Footprint[]>`
    - `api.createFootprint(input: CreateFootprintInput): Promise<Footprint>`
    - `api.updateFootprint(id: string, patch: Partial<CreateFootprintInput>): Promise<Footprint>`
    - `api.deleteFootprint(id: string): Promise<void>`
    - `api.listTrips(): Promise<Trip[]>`
    - `api.getTrip(id: string): Promise<Trip>`
    - `api.createTrip(input: any): Promise<Trip>`
    - `api.updateTrip(id: string, patch: any): Promise<Trip>`
    - `api.deleteTrip(id: string): Promise<void>`
    - `api.addTripDay(tripId: string, input: any): Promise<TripDay>`
    - `api.addTripItem(dayId: string, input: any): Promise<TripItem>`
    - `api.reorderTripItems(dayId: string, orderedItemIds: string[]): Promise<TripItem[]>`
    - `api.checkInTripItem(itemId: string, input: any): Promise<{ tripItem: TripItem; footprint: Footprint }>`
    - `api.addLiveTripCheckIn(dayId: string, input: any): Promise<{ tripItem: TripItem; footprint: Footprint }>`
    - `api.enrich(coordinates: Coordinates, visitedAt: string): Promise<{ weather: WeatherInfo | null; geo: any }>`
    - `api.searchPlaces(query: string): Promise<any[]>`
    - `api.uploadPhoto(dataUrl: string, caption?: string, takenAt?: string): Promise<PhotoItem>`
    - `api.exportBackup(): Promise<BackupPayload>`
    - `api.importBackup(payload: BackupPayload): Promise<void>`

- [ ] **Step 1: Write the failing EXIF parser tests in `tests/client/exif.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { extractPhotoMetadata } from '../../src/client/lib/exif';

describe('extractPhotoMetadata', () => {
  it('extracts GPS coordinates and ISO date from EXIF tags', async () => {
    const fakeBlob = new Blob(['fake-image'], { type: 'image/jpeg' });
    const draft = await extractPhotoMetadata(
      fakeBlob,
      'IMG_2023_Kyoto.jpg',
      async () => ({
        latitude: 34.9949,
        longitude: 135.785,
        DateTimeOriginal: new Date('2023-11-20T10:15:00Z'),
      }),
      async () => 'data:image/jpeg;base64,abc'
    );

    expect(draft.coordinates).toEqual({ lat: 34.9949, lng: 135.785 });
    expect(draft.visitedAt).toBe('2023-11-20');
    expect(draft.suggestedTitle).toBe('IMG 2023 Kyoto');
    expect(draft.dataUrl).toBe('data:image/jpeg;base64,abc');
  });

  it('gracefully returns null coordinates and visitedAt when photo has no EXIF tags (Review Focus #5)', async () => {
    const fakeBlob = new Blob(['stripped-image'], { type: 'image/jpeg' });
    const draft = await extractPhotoMetadata(
      fakeBlob,
      'old-scan.jpg',
      async () => null,
      async () => 'data:image/jpeg;base64,xyz'
    );

    expect(draft.coordinates).toBeNull();
    expect(draft.visitedAt).toBeNull();
    expect(draft.suggestedTitle).toBe('old scan');
    expect(draft.dataUrl).toBe('data:image/jpeg;base64,xyz');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/client/exif.test.ts`
Expected: FAIL with module `../../src/client/lib/exif` not found.

- [ ] **Step 3: Implement `src/client/lib/exif.ts` and `src/client/lib/api.ts`**

Implement `extractPhotoMetadata` using `exifr.parse(blob, { gps: true, tiff: true, exif: true })` by default, catching any parser errors and returning `{ coordinates: null, visitedAt: null }` when tags are absent. Implement `src/client/lib/api.ts` wrapping `fetch('/api/...')`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/client/exif.test.ts`
Expected: PASS (2 passed)

- [ ] **Step 5: Commit**

```bash
git add src/client/lib/exif.ts src/client/lib/api.ts tests/client/exif.test.ts
git commit -m "feat: add client EXIF metadata extractor and typed API client"
```

---

### Task 5: World Footprint Map, Illuminated Countries Layer & Polaroid Story Card UI

**Files:**
- Create: `src/client/components/StatsBar.tsx`
- Create: `src/client/components/PolaroidModal.tsx`
- Create: `src/client/components/WorldMapView.tsx`
- Test: `tests/client/polaroid-and-stats.test.tsx`

**Interfaces:**
- Consumes: `Footprint`, `FootprintStats`, `FootprintFilter`, `Companion` from `src/shared/types.ts`
- Produces:
  - `StatsBar({ stats, companions, filter, onFilterChange, onOpenCheckIn, onOpenRetroImport }): JSX.Element`
  - `PolaroidModal({ footprint, onClose, onDelete }): JSX.Element`
  - `WorldMapView({ footprints, visitedCountryCodes, routeCoordinates, onSelectFootprint, onMapClick }): JSX.Element`

- [ ] **Step 1: Write the failing component tests in `tests/client/polaroid-and-stats.test.tsx`**

```tsx
// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { StatsBar } from '../../src/client/components/StatsBar';
import { PolaroidModal } from '../../src/client/components/PolaroidModal';
import type { Footprint, FootprintStats } from '../../src/shared/types';

describe('StatsBar & PolaroidModal', () => {
  const sampleStats: FootprintStats = {
    countryCount: 3,
    cityCount: 5,
    landmarkCount: 12,
    visitedCountryCodes: ['JP', 'TW', 'FR'],
    years: ['2024', '2019'],
  };

  it('renders unlocked country, city, and landmark counts and triggers filter changes', () => {
    const onFilterChange = vi.fn();
    render(
      <StatsBar
        stats={sampleStats}
        companions={[{ id: 'c1', name: 'Alice', avatarColor: '#f59e0b' }]}
        filter={{}}
        onFilterChange={onFilterChange}
        onOpenCheckIn={() => {}}
        onOpenRetroImport={() => {}}
      />
    );

    expect(screen.getByTestId('stat-countries')).toHaveTextContent('3');
    expect(screen.getByTestId('stat-cities')).toHaveTextContent('5');
    expect(screen.getByTestId('stat-landmarks')).toHaveTextContent('12');

    fireEvent.change(screen.getByLabelText('篩選旅伴'), { target: { value: 'c1' } });
    expect(onFilterChange).toHaveBeenCalledWith({ companionId: 'c1' });
  });

  it('renders PolaroidModal with photo, note, automatic weather badge, and companions', () => {
    const fp: Footprint = {
      id: 'fp1',
      title: '清水寺',
      coordinates: { lat: 34.9949, lng: 135.785 },
      countryCode: 'JP',
      countryName: 'Japan',
      cityName: 'Kyoto',
      visitedAt: '2024-11-15',
      photos: [{ id: 'p1', url: '/uploads/kyoto.jpg', caption: 'Autumn leaves' }],
      note: '楓紅超美的一天！',
      rating: 5,
      weather: { conditionCode: 0, conditionText: '晴朗', tempC: 19, icon: '☀️' },
      companions: [{ id: 'c1', name: 'Alice' }],
      tripId: null,
      tripDayId: null,
      extensions: {},
      createdAt: '2024-11-15T10:00:00Z',
    };

    render(<PolaroidModal footprint={fp} onClose={() => {}} onDelete={() => {}} />);

    expect(screen.getByText('清水寺')).toBeInTheDocument();
    expect(screen.getByText('楓紅超美的一天！')).toBeInTheDocument();
    expect(screen.getByText(/☀️/)).toBeInTheDocument();
    expect(screen.getByText(/19°C/)).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/client/polaroid-and-stats.test.tsx`
Expected: FAIL with module `../../src/client/components/StatsBar` not found.

- [ ] **Step 3: Implement `StatsBar.tsx`, `PolaroidModal.tsx`, and `WorldMapView.tsx`**

Implement `StatsBar.tsx` with achievement counters (`data-testid="stat-countries"`, `stat-cities`, `stat-landmarks`), year/country/companion filter selectors (`aria-label="篩選年份"`, `"篩選國家"`, `"篩選旅伴"`), and quick action buttons for Check-In and Retro Import. Implement `PolaroidModal.tsx` styled as a tactile cream Polaroid card showing the photo, handwritten-feel note, rating stars, weather badge (`icon + tempC + conditionText`), date, city/country, and companion pills. Implement `WorldMapView.tsx` using `maplibre-gl` with a dark/warm vector or raster basemap, a GeoJSON fill layer highlighting `visitedCountryCodes`, interactive Polaroid thumbnail pins for each `Footprint`, an optional `routeCoordinates` dashed polyline layer for active trips, and a clean fallback list/grid view button for environments without WebGL.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/client/polaroid-and-stats.test.tsx`
Expected: PASS (2 passed)

- [ ] **Step 5: Commit**

```bash
git add src/client/components/StatsBar.tsx src/client/components/PolaroidModal.tsx src/client/components/WorldMapView.tsx tests/client/polaroid-and-stats.test.tsx
git commit -m "feat: add WorldMapView, StatsBar, and PolaroidModal components"
```

---

### Task 6: Quick Check-In Modal & Retroactive Dual-Track Import Wizard

**Files:**
- Create: `src/client/components/CheckInModal.tsx`
- Create: `src/client/components/RetroImportModal.tsx`
- Test: `tests/client/checkin-and-retro.test.tsx`

**Interfaces:**
- Consumes: `api` from `src/client/lib/api.ts`, `extractPhotoMetadata` from `src/client/lib/exif.ts`, shared types from `src/shared/types.ts`
- Produces:
  - `CheckInModal({ companions, trips, initialCoordinates, preselectedTripDay, onCreated, onCompanionCreated, onClose }): JSX.Element`
  - `RetroImportModal({ companions, trips, onImported, onClose }): JSX.Element`

- [ ] **Step 1: Write the failing component tests in `tests/client/checkin-and-retro.test.tsx`**

```tsx
// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CheckInModal } from '../../src/client/components/CheckInModal';
import { api } from '../../src/client/lib/api';

vi.mock('../../src/client/lib/api', () => ({
  api: {
    searchPlaces: vi.fn().mockResolvedValue([
      {
        title: '巴黎鐵塔',
        displayName: 'Eiffel Tower, Paris, France',
        coordinates: { lat: 48.8584, lng: 2.2945 },
        countryCode: 'FR',
        countryName: 'France',
        cityName: 'Paris',
      },
    ]),
    enrich: vi.fn().mockResolvedValue({
      weather: { conditionCode: 0, conditionText: '晴朗', tempC: 21, icon: '☀️' },
      geo: { countryCode: 'FR', countryName: 'France', cityName: 'Paris', displayName: 'Paris, France' },
    }),
    createFootprint: vi.fn().mockResolvedValue({ id: 'new-fp', title: '巴黎鐵塔' }),
    createCompanion: vi.fn(),
    uploadPhoto: vi.fn(),
  },
}));

describe('CheckInModal', () => {
  it('allows searching a landmark, auto-enriches weather, and saves footprint in seconds', async () => {
    const onCreated = vi.fn();
    render(
      <CheckInModal
        companions={[{ id: 'c1', name: 'Alice' }]}
        trips={[]}
        onCreated={onCreated}
        onCompanionCreated={() => {}}
        onClose={() => {}}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/搜尋地標/i), { target: { value: '巴黎鐵塔' } });
    fireEvent.click(screen.getByRole('button', { name: /搜尋/i }));

    await waitFor(() => {
      expect(screen.getByText(/Eiffel Tower, Paris, France/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Eiffel Tower, Paris, France/));

    await waitFor(() => {
      expect(screen.getByText(/21°C/)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/寫下一兩句當下的心情/i), {
      target: { value: '終於親眼看到鐵塔閃燈！' },
    });

    fireEvent.click(screen.getByRole('button', { name: /儲存踩點/i }));

    await waitFor(() => {
      expect(api.createFootprint).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '巴黎鐵塔',
          countryCode: 'FR',
          note: '終於親眼看到鐵塔閃燈！',
        })
      );
      expect(onCreated).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/client/checkin-and-retro.test.tsx`
Expected: FAIL with module `../../src/client/components/CheckInModal` not found.

- [ ] **Step 3: Implement `CheckInModal.tsx` and `RetroImportModal.tsx`**

Implement `CheckInModal.tsx` supporting both current-trip live check-in and standalone / manual search retro check-in, including place search (`api.searchPlaces`), GPS button, photo picker, date input (supporting full date `YYYY-MM-DD` or month-only `YYYY-MM` toggle), auto-enriched weather preview, star rating, companion tag selector + inline new companion creator, and optional trip/day selector. Implement `RetroImportModal.tsx` allowing multi-file photo selection → running `extractPhotoMetadata` on each file → calling `api.enrich` for drafts with EXIF coordinates → allowing the user to search/pin missing locations on drafts where `coordinates === null` → batch-assigning companions or a `Trip` → importing all valid items into `api.createFootprint`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/client/checkin-and-retro.test.tsx`
Expected: PASS (1 passed)

- [ ] **Step 5: Commit**

```bash
git add src/client/components/CheckInModal.tsx src/client/components/RetroImportModal.tsx tests/client/checkin-and-retro.test.tsx
git commit -m "feat: add quick CheckInModal and batch EXIF RetroImportModal"
```

---

### Task 7: Trips & Live Journal Module + Responsive App Shell & PWA

**Files:**
- Create: `src/client/components/TripsView.tsx`
- Create: `src/client/App.tsx`
- Create: `src/client/main.tsx`
- Create: `src/client/index.css`
- Create: `index.html`
- Create: `public/manifest.json`
- Test: `tests/client/trips-view.test.tsx`

**Interfaces:**
- Consumes: `api` from `src/client/lib/api.ts`, `WorldMapView`, `StatsBar`, `PolaroidModal`, `CheckInModal`, `RetroImportModal`
- Produces:
  - `TripsView({ trips, companions, onRefresh, onSelectFootprint }): JSX.Element`
  - `App(): JSX.Element`

- [ ] **Step 1: Write the failing Trips & Live Journal tests in `tests/client/trips-view.test.tsx`**

```tsx
// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { TripsView } from '../../src/client/components/TripsView';
import { api } from '../../src/client/lib/api';
import type { Trip } from '../../src/shared/types';

vi.mock('../../src/client/lib/api', () => ({
  api: {
    createTrip: vi.fn(),
    addTripDay: vi.fn(),
    addTripItem: vi.fn(),
    checkInTripItem: vi.fn().mockResolvedValue({
      tripItem: { id: 'item1', footprintId: 'fp1' },
      footprint: { id: 'fp1', title: '伏見稻荷大社' },
    }),
    addLiveTripCheckIn: vi.fn(),
    deleteTrip: vi.fn(),
  },
}));

describe('TripsView', () => {
  const sampleTrip: Trip = {
    id: 'trip1',
    title: '2024 京都賞楓 5 日行',
    coverPhoto: null,
    startDate: '2024-11-01',
    endDate: '2024-11-05',
    status: 'active',
    companions: [{ id: 'c1', name: 'Ken' }],
    summaryNote: '追楓之旅',
    extensions: {},
    createdAt: '2024-11-01T00:00:00Z',
    days: [
      {
        id: 'day1',
        tripId: 'trip1',
        dayNumber: 1,
        date: '2024-11-01',
        title: '東山與伏見散步',
        items: [
          {
            id: 'item1',
            tripId: 'trip1',
            tripDayId: 'day1',
            title: '伏見稻荷大社',
            coordinates: { lat: 34.9671, lng: 135.7727 },
            sortOrder: 1,
            plannedTime: '09:30',
            note: '早起避開人潮',
            footprintId: null,
            footprint: null,
            extensions: {},
          },
        ],
      },
    ],
  };

  it('displays trip itinerary by day and converts a planned stop into a visited footprint on check-in', async () => {
    const onRefresh = vi.fn();
    render(
      <TripsView
        trips={[sampleTrip]}
        companions={[{ id: 'c1', name: 'Ken' }]}
        onRefresh={onRefresh}
        onSelectFootprint={() => {}}
      />
    );

    expect(screen.getByText('2024 京都賞楓 5 日行')).toBeInTheDocument();
    fireEvent.click(screen.getByText('2024 京都賞楓 5 日行'));

    expect(screen.getByText(/Day 1/)).toBeInTheDocument();
    expect(screen.getByText('伏見稻荷大社')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /打卡踩點/i }));

    await waitFor(() => {
      expect(api.checkInTripItem).toHaveBeenCalledWith(
        'item1',
        expect.objectContaining({
          coordinates: { lat: 34.9671, lng: 135.7727 },
        })
      );
      expect(onRefresh).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/client/trips-view.test.tsx`
Expected: FAIL with module `../../src/client/components/TripsView` not found.

- [ ] **Step 3: Implement `TripsView.tsx`, `App.tsx`, `main.tsx`, `index.css`, `index.html`, and `public/manifest.json`**

Implement `TripsView.tsx` with a trip list & creation form, detail view showing Day 1..N tabs/timeline, planned stop creation, one-click `"打卡踩點"` button on planned stops (which calls `api.checkInTripItem` and syncs to the global footprint library), `"＋新增即時踩點"` button for unplanned live discoveries during the trip, and ordered route coordinates calculation for the map polyline. Implement `App.tsx` uniting the two primary tabs (`🌍 世界足跡` and `🎒 我的旅程`), the Polaroid story card modal, Check-In & Retro Import modals, and JSON Backup Export/Import controls.

- [ ] **Step 4: Run the full test suite and production build to verify everything passes**

Run: `npx vitest run && npm run build`
Expected: All test suites PASS and Vite production bundle builds cleanly with exit code 0.

- [ ] **Step 5: Commit**

```bash
git add index.html public/manifest.json src/client/ tests/client/trips-view.test.tsx
git commit -m "feat: add TripsView live journal, responsive App shell, and PWA manifest"
```
