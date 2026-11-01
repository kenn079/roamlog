# RoamLog × 世界迷霧 (Fog of World) 探索機制與時間軸匯入 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 為 RoamLog 新增世界迷霧探索遮罩圖層、支援 Google 地圖時間軸 JSON（及 GeoJSON / GPX）解析與軌跡繪製、跨國大圓航線，以及手帳風格的旅行成就印章館。

**Architecture:** 前端採用分層架構：以 Web Worker / 串流剖析器解析 Google Takeout `Records.json` 與地理檔案，經 Douglas-Peucker 演算法抽樣後存入 IndexedDB 本地儲存；MapLibre GL 增設動態反向遮罩迷霧圖層（結合打卡點與軌跡緩衝區），依日/夜主題切換晨霧或星夜營火視覺；獨立的成就計算引擎判定五大旅行里程碑，並透過復古印章館彈窗呈現。

**Tech Stack:** TypeScript, React 18, MapLibre GL 5.1.0, Tailwind CSS v4, IndexedDB (idb-keyval 或原生 IndexedDB), Vitest 3, @testing-library/react.

**Spec:** [`docs/superpowers/specs/2026-11-01-fog-of-world-and-timeline-design.md`](file:///c:/Users/kenwu/Downloads/NT/docs/superpowers/specs/2026-11-01-fog-of-world-and-timeline-design.md)

## Global Constraints

- 日間主題畫布為 `--canvas: #faf6ed`，迷霧色系與點陣手帳質感一致；暗色主題為 `--canvas: #0e131f`，迷霧為幽邃繁星夜幕並透出金色營火光芒。
- 嚴格維持現有 60 項測試全部通過，不破壞 Firebase/Google Drive 現有備份結構。
- 匯入超大時間軸檔案（50MB~200MB）時不可阻塞主 UI 執行緒，同步至雲端單檔不可超過 1MB。
- 飛航跨國航線僅在起降城市擦除迷霧，不劃穿越洋荒野公海。
- 「環島騎士」以台灣本島四極點（富貴角、三貂角、鵝鑾鼻、國聖港燈塔）判定。

## Review Focus

1. **極度雜亂或含非數字字串的 Takeout JSON**：檔案缺少 `latitudeE7` 或含有 `null` 座標時，解析器應安全略過而非崩潰。
2. **跨越國際換日線（180°經線）的大圓航線**：經度由 170° 跳至 -170° 時，弧線計算需正確跨線，不產生貫穿全地圖的水平割線。
3. **無網路環境下的迷霧計算**：IndexedDB 與幾何多邊形計算完全在客戶端離線完成，離線時亦能 100% 正常繪製迷霧。
4. **大量密集打卡點（超過 500 個）時的迷霧布林運算效能**：避免逐一做複雜多邊形布林聯集導致掉幀，採用空間網格聚合或半徑緩衝分批渲染。
5. **重名或重複匯入同一時間軸**：以軌跡的時間範圍與首尾雜湊值去重，避免重複擦除同一路徑並佔用雙倍存儲。

---

### Task 1: 共享型別與資料模型定義 (Shared Types & Data Contracts)

**Files:**
- Modify: `src/shared/types.ts`
- Test: `tests/shared/sync-types.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export interface TrailPoint {
    lat: number;
    lng: number;
    elevation?: number;
    time?: string;
  }

  export interface Trail {
    id: string;
    title: string;
    color?: string;
    points: TrailPoint[];
    distanceKm: number;
    startTime?: string;
    endTime?: string;
    tripId?: string | null;
    source: 'google-timeline' | 'gpx' | 'kml' | 'geojson';
    createdAt: string;
  }

  export interface FlightArc {
    id: string;
    fromCity: string;
    toCity: string;
    fromCoords: Coordinates;
    toCoords: Coordinates;
    points: [number, number][]; // great circle interpolated points
  }

  export interface BadgeDefinition {
    id: string;
    title: string;
    description: string;
    icon: string;
    category: 'footprint' | 'distance' | 'elevation' | 'special';
  }

  export interface UserBadge {
    badgeId: string;
    unlockedAt: string;
    progress: number; // 0 to 1
    unlocked: boolean;
  }
  ```

- [ ] **Step 1: Write the failing test**
  In `tests/shared/sync-types.test.ts`, add tests verifying `Trail`, `FlightArc`, and `BadgeDefinition` types and validation helpers:
  ```typescript
  it('validates a Trail object structure correctly', () => {
    const trail: Trail = {
      id: 't-1',
      title: 'Taipei Walk',
      points: [{ lat: 25.03, lng: 121.56 }],
      distanceKm: 3.5,
      source: 'google-timeline',
      createdAt: new Date().toISOString(),
    };
    expect(trail.points.length).toBe(1);
    expect(trail.source).toBe('google-timeline');
  });
  ```
- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test tests/shared/sync-types.test.ts`
  Expected: FAIL with "Cannot find name 'Trail'"
- [ ] **Step 3: Implement types in `src/shared/types.ts`**
  Add `TrailPoint`, `Trail`, `FlightArc`, `BadgeDefinition`, `UserBadge` to `src/shared/types.ts`, and add `elevation?: number` to `Footprint` extensions.
- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test tests/shared/sync-types.test.ts`
  Expected: PASS
- [ ] **Step 5: Commit**
  ```bash
  git add src/shared/types.ts tests/shared/sync-types.test.ts
  git commit -m "feat(types): add Trail, FlightArc, and Badge definitions"
  ```

---

### Task 2: 時間軸與多格式軌跡解析器 (Timeline & Multi-format Track Parser)

**Files:**
- Create: `src/client/lib/trailParser.ts`
- Test: `tests/client/trailParser.test.ts`

**Interfaces:**
- Consumes: `TrailPoint`, `Trail` from `src/shared/types.ts`
- Produces:
  ```typescript
  export function parseGoogleTakeoutRecords(json: any, titlePrefix?: string): Trail[];
  export function parseGoogleSemanticTimeline(json: any, titlePrefix?: string): Trail[];
  export function parseGeoJSONTracks(geojson: any, title?: string): Trail[];
  export function parseGPXString(gpxText: string, title?: string): Trail[];
  export function simplifyTrailPoints(points: TrailPoint[], toleranceMeters?: number): TrailPoint[];
  export function detectFileFormat(content: string | object): 'google-records' | 'google-semantic' | 'geojson' | 'gpx' | 'unknown';
  ```

- [ ] **Step 1: Write the failing test**
  In `tests/client/trailParser.test.ts`:
  - Test parsing Google Takeout `Records.json` with `latitudeE7: 250339640, longitudeE7: 1215644680`.
  - Test splitting segments when time delta > 2 hours or distance > 30km.
  - Test Douglas-Peucker point simplification reducing point count while preserving shape.
  - Test handling corrupted / missing coordinate nodes safely without crashing.
- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test tests/client/trailParser.test.ts`
  Expected: FAIL with module not found
- [ ] **Step 3: Implement `trailParser.ts`**
  Implement coordinate transformation (`latE7 / 1e7`), timestamp parsing, distance calculation (Haversine formula), Douglas-Peucker simplification, and segment split logic.
- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test tests/client/trailParser.test.ts`
  Expected: PASS
- [ ] **Step 5: Commit**
  ```bash
  git add src/client/lib/trailParser.ts tests/client/trailParser.test.ts
  git commit -m "feat(parser): implement Google Timeline and multi-format track parser"
  ```

---

### Task 3: 大圓飛航線計算器 (Great-Circle Flight Arcs Calculator)

**Files:**
- Create: `src/client/lib/flightArcs.ts`
- Test: `tests/client/flightArcs.test.ts`

**Interfaces:**
- Consumes: `Coordinates`, `FlightArc`, `Footprint` from `src/shared/types.ts`
- Produces:
  ```typescript
  export function calculateGreatCirclePoints(from: Coordinates, to: Coordinates, steps?: number): [number, number][];
  export function extractFlightArcsFromFootprints(footprints: Footprint[]): FlightArc[];
  ```

- [ ] **Step 1: Write the failing test**
  In `tests/client/flightArcs.test.ts`:
  - Test arc generation between Taipei (25.03, 121.56) and Tokyo (35.68, 139.69) returning smooth curved points.
  - Test international date line crossing (e.g. Tokyo to San Francisco) ensuring longitudes don't jump horizontally across the prime meridian.
  - Test extracting flight arcs when chronological footprints span different country codes.
- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test tests/client/flightArcs.test.ts`
  Expected: FAIL with module not found
- [ ] **Step 3: Implement `flightArcs.ts`**
  Implement spherical intermediate point math (Slerp formula) and footprint sequential country transition detection.
- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test tests/client/flightArcs.test.ts`
  Expected: PASS
- [ ] **Step 5: Commit**
  ```bash
  git add src/client/lib/flightArcs.ts tests/client/flightArcs.test.ts
  git commit -m "feat(flight): add great-circle flight arcs generator"
  ```

---

### Task 4: 軌跡本地儲存庫與雲端同步保護 (Trail Storage & Sync Guard)

**Files:**
- Create: `src/client/lib/trailStorage.ts`
- Modify: `src/client/lib/syncEngine.ts`
- Test: `tests/client/trailStorage.test.ts`

**Interfaces:**
- Consumes: `Trail` from `src/shared/types.ts`
- Produces:
  ```typescript
  export function saveTrails(trails: Trail[]): Promise<void>;
  export function loadTrails(): Promise<Trail[]>;
  export function deleteTrail(id: string): Promise<void>;
  export function clearAllTrails(): Promise<void>;
  export function exportSyncableTrailsSummary(trails: Trail[], maxBytes?: number): Trail[];
  ```

- [ ] **Step 1: Write the failing test**
  In `tests/client/trailStorage.test.ts`:
  - Test saving, loading, and deleting trails using IndexedDB mock / LocalStorage fallback.
  - Test `exportSyncableTrailsSummary` compressing points if total payload exceeds 500KB to protect Firestore 1MB limits.
- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test tests/client/trailStorage.test.ts`
  Expected: FAIL with module not found
- [ ] **Step 3: Implement `trailStorage.ts` and update `syncEngine.ts`**
  Create robust IndexedDB storage with in-memory caching and sync payload safety wrapper.
- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test tests/client/trailStorage.test.ts`
  Expected: PASS
- [ ] **Step 5: Commit**
  ```bash
  git add src/client/lib/trailStorage.ts src/client/lib/syncEngine.ts tests/client/trailStorage.test.ts
  git commit -m "feat(storage): implement indexedDB trail store and sync size guard"
  ```

---

### Task 5: 旅行印章與成就判定引擎 (Travel Badges Engine)

**Files:**
- Create: `src/client/lib/badges.ts`
- Test: `tests/client/badges.test.ts`

**Interfaces:**
- Consumes: `Footprint`, `Trail`, `BadgeDefinition`, `UserBadge` from `src/shared/types.ts`
- Produces:
  ```typescript
  export const BADGE_DEFINITIONS: BadgeDefinition[];
  export function evaluateBadges(footprints: Footprint[], trails: Trail[]): UserBadge[];
  ```

- [ ] **Step 1: Write the failing test**
  In `tests/client/badges.test.ts`:
  - Test "大地起點" (first footprint unlocks).
  - Test "環球飛躍" (footprints spanning 2+ continents unlocks).
  - Test "千哩長征" (total trail distance >= 1000km unlocks).
  - Test "雲端客" (elevation >= 3000m unlocks).
  - Test "環島騎士" (trails covering Taiwan 4 extreme points: Fugui Cape, San Diao Cape, Eluanbi, Guosheng Port).
- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test tests/client/badges.test.ts`
  Expected: FAIL with module not found
- [ ] **Step 3: Implement `badges.ts`**
  Define badge list and evaluation logic with geographic bounding boxes for Taiwan 4 extremes and continent classification by country code.
- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test tests/client/badges.test.ts`
  Expected: PASS
- [ ] **Step 5: Commit**
  ```bash
  git add src/client/lib/badges.ts tests/client/badges.test.ts
  git commit -m "feat(badges): implement travel badges evaluation engine"
  ```

---

### Task 6: 迷霧圖層與幾何遮罩生成 (Fog Mask Layer on MapLibre GL)

**Files:**
- Create: `src/client/components/FogLayer.tsx`
- Modify: `src/client/components/WorldMapView.tsx`
- Test: `tests/client/fog-layer.test.ts`

**Interfaces:**
- Consumes: `Footprint`, `Trail`, `FlightArc` from `src/shared/types.ts`, `theme` from `src/client/lib/theme.ts`
- Produces:
  ```typescript
  export function generateFogMaskGeoJSON(
    footprints: Footprint[],
    trails: Trail[],
    options?: { footprintRadiusKm?: number; trailBufferKm?: number; illuminateCountries?: string[] }
  ): GeoJSON.FeatureCollection;

  export function FogLayer(props: {
    map: maplibregl.Map | null;
    enabled: boolean;
    theme: 'light' | 'dark';
    footprints: Footprint[];
    trails: Trail[];
    flightArcs: FlightArc[];
    illuminationMode: 'city' | 'country';
  }): React.ReactElement | null;
  ```

- [ ] **Step 1: Write the failing test**
  In `tests/client/fog-layer.test.ts`:
  - Test `generateFogMaskGeoJSON` creates a world polygon with holes (cleared circles around footprints and corridors around trails).
  - Test Day Theme fog style uses warm parchment color `#faf6ed` with 0.85 opacity.
  - Test Night Theme fog style uses deep midnight navy `#0e131f` with campfire glow markers.
  - Test that flight arcs draw line routes without adding trail buffers to the cleared fog holes.
- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test tests/client/fog-layer.test.ts`
  Expected: FAIL with module not found
- [ ] **Step 3: Implement `generateFogMaskGeoJSON` and `FogLayer`**
  Implement polygon subtraction math and MapLibre GL GeoJSON source + fill / line layers.
- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test tests/client/fog-layer.test.ts`
  Expected: PASS
- [ ] **Step 5: Commit**
  ```bash
  git add src/client/components/FogLayer.tsx src/client/components/WorldMapView.tsx tests/client/fog-layer.test.ts
  git commit -m "feat(map): implement MapLibre fog of war mask layer"
  ```

---

### Task 7: 時間軸匯入視窗與拖曳互動 (Timeline Import Modal UI)

**Files:**
- Create: `src/client/components/TimelineImportModal.tsx`
- Modify: `src/client/components/WorldMapView.tsx`
- Test: `tests/client/timeline-import-ui.test.tsx`

**Interfaces:**
- Consumes: `parseGoogleTakeoutRecords`, `saveTrails` from Task 2 & Task 4
- Produces:
  ```typescript
  export function TimelineImportModal(props: {
    isOpen: boolean;
    onClose: () => void;
    onImportSuccess: (importedCount: number, distanceKm: number) => void;
  }): React.ReactElement | null;
  ```

- [ ] **Step 1: Write the failing test**
  In `tests/client/timeline-import-ui.test.tsx`:
  - Test rendering modal with dropzone accepting `.json`, `.geojson`, `.gpx`.
  - Test parsing a mock Google Timeline JSON and displaying imported summary (e.g. "成功匯入 3 條軌跡，共 142.5 km").
  - Test error handling when an unsupported or corrupted file is dropped.
- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test tests/client/timeline-import-ui.test.tsx`
  Expected: FAIL with component not found
- [ ] **Step 3: Implement `TimelineImportModal.tsx`**
  Create UI adhering strictly to `--surface`, `--accent`, `--border` and dot-grid styling, with drag-and-drop file readers and progress indicator.
- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test tests/client/timeline-import-ui.test.tsx`
  Expected: PASS
- [ ] **Step 5: Commit**
  ```bash
  git add src/client/components/TimelineImportModal.tsx tests/client/timeline-import-ui.test.tsx
  git commit -m "feat(ui): add timeline and track import modal"
  ```

---

### Task 8: 旅行手帳印章館視窗 (Stamp Cabinet Modal UI)

**Files:**
- Create: `src/client/components/StampCabinetModal.tsx`
- Modify: `src/client/App.tsx`
- Test: `tests/client/stamp-cabinet-ui.test.tsx`

**Interfaces:**
- Consumes: `evaluateBadges`, `BADGE_DEFINITIONS` from Task 5
- Produces:
  ```typescript
  export function StampCabinetModal(props: {
    isOpen: boolean;
    onClose: () => void;
    footprints: Footprint[];
    trails: Trail[];
  }): React.ReactElement | null;
  ```

- [ ] **Step 1: Write the failing test**
  In `tests/client/stamp-cabinet-ui.test.tsx`:
  - Test rendering all 5 badge items in retro stamp style.
  - Test unlocked stamps render in vibrant embossed colors with "已解鎖" mark.
  - Test locked stamps render in monochrome subtle silhouette with progress hint.
- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test tests/client/stamp-cabinet-ui.test.tsx`
  Expected: FAIL with component not found
- [ ] **Step 3: Implement `StampCabinetModal.tsx`**
  Build the modal using RoamLog's stamp boxes, wax seal styling, and warm paper textures.
- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test tests/client/stamp-cabinet-ui.test.tsx`
  Expected: PASS
- [ ] **Step 5: Commit**
  ```bash
  git add src/client/components/StampCabinetModal.tsx tests/client/stamp-cabinet-ui.test.tsx
  git commit -m "feat(ui): add travel stamp cabinet modal"
  ```

---

### Task 9: 導覽列整合、全系統聯調與端對端驗證 (Navigation Integration & E2E Verification)

**Files:**
- Modify: `src/client/App.tsx`
- Modify: `src/client/components/WorldMapView.tsx`
- Modify: `src/client/components/StatsBar.tsx`
- Test: `tests/client/fog-integration.test.tsx`

**Interfaces:**
- Connects: Top bar buttons (迷霧切換按鈕、匯入軌跡按鈕、手帳印章館按鈕), `FogLayer`, `TimelineImportModal`, `StampCabinetModal`.

- [ ] **Step 1: Write the failing test**
  In `tests/client/fog-integration.test.tsx`:
  - Test App top bar contains the Fog toggle button and clicking it toggles fog visibility.
  - Test opening Stamp Cabinet from the header.
  - Test opening Timeline Import modal from the map controls.
- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test tests/client/fog-integration.test.tsx`
  Expected: FAIL
- [ ] **Step 3: Wire components together in `App.tsx` and `WorldMapView.tsx`**
  Add top navigation buttons, state management for trails and fog layer, and hook up modals.
- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test tests/client/fog-integration.test.tsx`
  Expected: PASS
- [ ] **Step 5: Run complete test suite**
  Run: `npm test`
  Expected: All 18+ test suites pass with 0 errors.
- [ ] **Step 6: Commit**
  ```bash
  git add src/client/App.tsx src/client/components/WorldMapView.tsx src/client/components/StatsBar.tsx tests/client/fog-integration.test.tsx
  git commit -m "feat: integrate fog layer, timeline import, and stamp cabinet into main UI"
  ```
