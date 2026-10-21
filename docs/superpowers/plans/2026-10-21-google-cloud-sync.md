# Google Cloud Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 為 RoamLog 建立手機與電腦雙向無縫同步功能，透過 Google 帳號授權將足跡、心願、旅程及壓縮照片安全儲存在個人 Google Drive 專屬空間。

**Architecture:** 採用 Local-First 架構。前端整合 Google Identity Services (GIS) 與 Google Drive REST API（使用 `appDataFolder` 專用隱藏資料夾）。在本地新增/修改時先寫入本機快取，連網時背景自動透過雙向無損合併演算法（Non-destructive Union & Timestamp Merge）同步資料庫與照片檔案。

**Tech Stack:** React 18, TypeScript 5, Google Identity Services (GIS) Web SDK, Google Drive REST API v3, Vite, Vitest.

**Spec:** [`docs/superpowers/specs/2026-10-21-google-cloud-sync-design.md`](file:///c:/Users/kenwu/Downloads/NT/docs/superpowers/specs/2026-10-21-google-cloud-sync-design.md)

## Global Constraints

- 全面保持 RoamLog 簡約露營風主題色彩（`--canvas`、`--surface`、`--accent` 帳篷橘、`--sun` 芥末黃、圓角膠囊按鈕）。
- 零第三方資料庫伺服器依賴：資料與照片 100% 保存在使用者個人的 Google Drive 專屬空間。
- 絕不得在離線或連線超時時阻斷使用者的打卡或記錄操作。
- 絕不得暴力覆蓋資料：多裝置衝突時以非破壞性聯集合併（Union）並以更新時間戳記（Timestamp）為準。

## Review Focus

1. 離線狀態下進行打卡與心願新增，恢復網路後應自動佇列同步，不得遺失任何一筆。
2. 手機與電腦在離線時各自新增不同的足跡，雙方同步後應兩者皆存在（聯集），不得被覆蓋。
3. 一端已標記解鎖的心願（`fulfilledFootprintId`），同步後應維持解鎖狀態，不得被另一端的未解鎖狀態重置。
4. 照片在同步前必須經前端智慧壓縮（解析度上限 1600px、品質 0.8），將檔案降至約 100~250KB 以內。
5. Google Access Token 過期時自動嘗試靜默換證或提示重新授權，避免同步失敗卡死。

---

### Task 1: Google Sync Data Models & Types

**Files:**
- Modify: `src/shared/types.ts`
- Test: `tests/shared/sync-types.test.ts`

**Interfaces:**
- Produces: `SyncStatus`, `GoogleAuthInfo`, `SyncManifest`, `SyncPayload` types.

- [ ] **Step 1: Write failing test for sync data models**

```typescript
// tests/shared/sync-types.test.ts
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/shared/sync-types.test.ts`
Expected: FAIL (types not exported from types.ts).

- [ ] **Step 3: Define sync types in `src/shared/types.ts`**

Add `SyncStatus`, `GoogleAuthInfo`, `SyncManifest`, `SyncState`:
```typescript
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

export interface GoogleAuthInfo {
  accessToken: string;
  expiresAt: number;
  email?: string;
  name?: string;
  picture?: string;
}

export interface SyncManifest {
  version: number;
  lastModified: string;
  deviceId: string;
  dataHash?: string;
  photoCount: number;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/shared/sync-types.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/types.ts tests/shared/sync-types.test.ts
git commit -m "feat(sync): add sync types and data manifest models"
```

---

### Task 2: Front-End Image Compression Pipeline for Cloud Sync

**Files:**
- Create: `src/client/lib/syncImage.ts`
- Test: `tests/client/syncImage.test.ts`

**Interfaces:**
- Consumes: browser `Image`, `HTMLCanvasElement`.
- Produces: `compressImageForSync(dataUrlOrBlob: string | Blob, maxDimension?: number, quality?: number): Promise<Blob>`

- [ ] **Step 1: Write failing test for `compressImageForSync`**

```typescript
// tests/client/syncImage.test.ts
import { describe, it, expect } from 'vitest';
import { compressImageForSync } from '../../src/client/lib/syncImage';

describe('syncImage', () => {
  it('exports compressImageForSync function', () => {
    expect(typeof compressImageForSync).toBe('function');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/client/syncImage.test.ts`
Expected: FAIL (cannot find module `syncImage`).

- [ ] **Step 3: Implement `src/client/lib/syncImage.ts`**

Implement image compression logic:
- Max resolution default: 1600px width/height.
- JPEG quality: 0.82.
- Handles base64 data URLs and Blobs.
- Outputs `Blob` ready for Google Drive multipart upload.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/client/syncImage.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/lib/syncImage.ts tests/client/syncImage.test.ts
git commit -m "feat(sync): implement image compression pipeline for cloud sync"
```

---

### Task 3: Google Drive REST API & OAuth Client

**Files:**
- Create: `src/client/lib/googleDrive.ts`
- Test: `tests/client/googleDrive.test.ts`

**Interfaces:**
- Consumes: `GoogleAuthInfo`, `SyncManifest`, `BackupPayload`.
- Produces:
  - `initGoogleAuth(clientId: string): Promise<void>`
  - `requestGoogleLogin(): Promise<GoogleAuthInfo>`
  - `fetchRemoteData(auth: GoogleAuthInfo): Promise<{ manifest: SyncManifest | null; data: BackupPayload | null }>`
  - `uploadRemoteData(auth: GoogleAuthInfo, data: BackupPayload): Promise<SyncManifest>`
  - `uploadPhotoToDrive(auth: GoogleAuthInfo, photoId: string, blob: Blob): Promise<string>`

- [ ] **Step 1: Write failing test for Google Drive client**

```typescript
// tests/client/googleDrive.test.ts
import { describe, it, expect, vi } from 'vitest';
import { GoogleDriveClient } from '../../src/client/lib/googleDrive';

describe('GoogleDriveClient', () => {
  it('instantiates client and exports methods', () => {
    const client = new GoogleDriveClient();
    expect(typeof client.fetchRemoteData).toBe('function');
    expect(typeof client.uploadRemoteData).toBe('function');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/client/googleDrive.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/client/lib/googleDrive.ts`**

Implement the Google Drive v3 REST Client:
- Uses `appDataFolder` (`spaces=appDataFolder`) to isolate RoamLog files.
- `fetchRemoteData`: searches for `roamlog_data.json` and `manifest.json`.
- `uploadRemoteData`: creates or updates `roamlog_data.json` via multipart upload.
- `uploadPhotoToDrive`: stores compressed photos into `appDataFolder` with title `{photoId}.jpg`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/client/googleDrive.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/lib/googleDrive.ts tests/client/googleDrive.test.ts
git commit -m "feat(sync): implement Google Drive REST API client and file operations"
```

---

### Task 4: Bidirectional Non-Destructive Sync Reconciliation Engine

**Files:**
- Create: `src/client/lib/syncEngine.ts`
- Test: `tests/client/syncEngine.test.ts`

**Interfaces:**
- Consumes: `BackupPayload`, `Footprint`, `Wish`, `Trip`.
- Produces: `mergeBackupStores(local: BackupPayload, remote: BackupPayload): { merged: BackupPayload; hasChanges: boolean }`

- [ ] **Step 1: Write failing tests for `mergeBackupStores`**

```typescript
// tests/client/syncEngine.test.ts
import { describe, it, expect } from 'vitest';
import { mergeBackupStores } from '../../src/client/lib/syncEngine';
import type { BackupPayload } from '../../src/shared/types';

describe('mergeBackupStores', () => {
  it('combines items from both local and remote without losing either', () => {
    const local: BackupPayload = {
      version: 1,
      exportedAt: '2026-10-21T00:00:00Z',
      companions: [],
      footprints: [{ id: 'fp-1', title: 'Local Place', coordinates: { lat: 25, lng: 121 }, visitedAt: '2026-10-21', photos: [], note: '', rating: 5, weather: null, companions: [], tripId: null, tripDayId: null, extensions: {}, createdAt: '2026-10-21T00:00:00Z' }],
      trips: [],
      wishes: [],
    };
    const remote: BackupPayload = {
      version: 1,
      exportedAt: '2026-10-21T00:00:00Z',
      companions: [],
      footprints: [{ id: 'fp-2', title: 'Remote Place', coordinates: { lat: 35, lng: 135 }, visitedAt: '2026-10-21', photos: [], note: '', rating: 5, weather: null, companions: [], tripId: null, tripDayId: null, extensions: {}, createdAt: '2026-10-21T00:00:00Z' }],
      trips: [],
      wishes: [],
    };

    const { merged } = mergeBackupStores(local, remote);
    expect(merged.footprints.length).toBe(2);
    expect(merged.footprints.map(f => f.id)).toContain('fp-1');
    expect(merged.footprints.map(f => f.id)).toContain('fp-2');
  });

  it('preserves fulfilledFootprintId on wishes when merging', () => {
    const local: BackupPayload = {
      version: 1,
      exportedAt: '2026-10-21T00:00:00Z',
      companions: [],
      footprints: [],
      trips: [],
      wishes: [{ id: 'w1', title: '清水寺', coordinates: { lat: 35, lng: 135 }, countryCode: 'JP', countryName: '', cityName: '', category: 'attraction', note: '', fulfilledFootprintId: 'fp-1', extensions: {}, createdAt: '2026-10-21T00:00:00Z' }],
    };
    const remote: BackupPayload = {
      version: 1,
      exportedAt: '2026-10-21T00:00:00Z',
      companions: [],
      footprints: [],
      trips: [],
      wishes: [{ id: 'w1', title: '清水寺', coordinates: { lat: 35, lng: 135 }, countryCode: 'JP', countryName: '', cityName: '', category: 'attraction', note: '', fulfilledFootprintId: null, extensions: {}, createdAt: '2026-10-21T00:00:00Z' }],
    };

    const { merged } = mergeBackupStores(local, remote);
    expect(merged.wishes?.[0]?.fulfilledFootprintId).toBe('fp-1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/client/syncEngine.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/client/lib/syncEngine.ts`**

Implement `mergeBackupStores`:
- Companions: union by ID, sort by name.
- Footprints: union by ID, if duplicate pick later `visitedAt` or `createdAt`.
- Wishes: union by ID, if duplicate keep `fulfilledFootprintId` if either is non-null.
- Trips: union by ID, merge days and items.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/client/syncEngine.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/lib/syncEngine.ts tests/client/syncEngine.test.ts
git commit -m "feat(sync): implement non-destructive bidirectional merge engine"
```

---

### Task 5: UI Integration — Header Sync Capsule & Settings Popover

**Files:**
- Create: `src/client/components/GoogleSyncModal.tsx`
- Modify: `src/client/App.tsx`
- Test: `tests/client/google-sync-ui.test.tsx`

**Interfaces:**
- Consumes: `GoogleDriveClient`, `mergeBackupStores`, theme tokens.
- Produces:
  - Header sync status pill: `[ 🌐 登入 Google 同步 ]` / `[ 🟢 已同步 ]` / `[ 🔄 同步中 ]`.
  - Settings popover: `Google 雲端雙向同步` 區塊（帳號、最後同步時間、立即同步、中斷連結）。
  - Client ID 設定引導彈窗（首次使用時輸入或設定 Google Client ID）。

- [ ] **Step 1: Write failing test for sync UI components**

```typescript
// tests/client/google-sync-ui.test.tsx
// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { GoogleSyncModal } from '../../src/client/components/GoogleSyncModal';

describe('GoogleSyncModal', () => {
  it('renders Google Cloud sync setup modal with instructions', () => {
    render(<GoogleSyncModal onClose={() => {}} onSaveClientId={() => {}} initialClientId="" />);
    expect(screen.getByText(/Google 雲端同步設定/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Client ID/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/client/google-sync-ui.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Create `GoogleSyncModal.tsx` and integrate into `App.tsx`**

- Build `src/client/components/GoogleSyncModal.tsx` matching camping theme styles (`.panel`, `.field`, `.btn-primary`).
- Update `src/client/App.tsx`:
  - Add sync state (`syncStatus`, `googleAuth`, `lastSyncTime`).
  - Add header sync pill in `header`.
  - Add "Google 雲端雙向同步" section in Settings Popover.
  - Wire auto-sync trigger on app load and after changes.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/client/google-sync-ui.test.tsx`
Expected: PASS

- [ ] **Step 5: Verify all tests and production build**

Run: `npm test && npm run build`
Expected: All test suites PASS, production build succeeds with no errors.

- [ ] **Step 6: Commit**

```bash
git add src/client/components/GoogleSyncModal.tsx src/client/App.tsx tests/client/google-sync-ui.test.tsx
git commit -m "feat(sync): integrate Google Drive cloud sync UI into header and settings"
```
