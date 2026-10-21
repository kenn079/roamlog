# 個人旅行足跡與動態行程記錄 App：Google 雲端雙向同步設計規格書 (RoamLog Google Cloud Sync Design)

**日期：** 2026-10-21  
**狀態：** 已確認 (Approved by User, Ready for Plan)

---

## 1. 意圖與核心動機 (Intent & The Why)

使用者希望擁有**手機與電腦無縫同步**的個人旅行紀錄體驗：
- **外出旅途中**：使用手機（PWA / 手機瀏覽器）隨手拍照打卡、標記想去的心願地點、即時更新旅程天數。
- **回到家/咖啡廳**：打開電腦大螢幕，世界地圖上的足跡點亮範圍、心願星標與拍立得回憶卡已自動同步，不需要手動匯出或傳遞 JSON 備份檔。
- **隱私與自主權**：以個人的 **Google 帳號** 進行登入綁定，資料與相片直接儲存於使用者專屬的 **Google Drive（雲端硬碟）**，不透過任何第三方不受控的資料庫伺服器，安全、私密且永久免費。

---

## 2. 目標、非目標與反目標 (Goals, Non-Goals, Anti-Goals)

### 目標 (Goals)
1. **Google 帳號一鍵登入**：支援 Google Identity Services (GIS) Web SDK，提供簡潔安全的授權流程。
2. **Google Drive 專屬雲端儲存**：在使用者個人的 Google Drive 建立專屬應用程式空間（`appDataFolder` 或專用資料夾），安全保存足跡、心願、旅程、旅伴以及相片檔案。
3. **雙向無損自動同步（Bidirectional Non-Destructive Sync）**：手機新增或電腦修改時，以時間戳記自動進行無損合併（Merge），避免舊資料覆蓋新紀錄。
4. **離線優先架構（Local-First）**：無網路或訊號微弱時，手機與電腦仍可順暢離線打卡、記錄心願；恢復網路後背景自動佇列同步。
5. **相片適度壓縮管線**：在相片上傳至雲端前，自動在前端進行適度壓縮（兼顧拍立得畫質與傳輸效率），將相片體積大幅縮小 70%~85%，節省使用者的 Google Drive 空間並加速行動網路載入。
6. **風格與主題嚴格一致**：全面沿用 RoamLog 簡約露營風視覺語意（米白帆布 `--canvas`、可可棕深色、帳篷橘 `--accent`、芥末黃 `--sun`、圓角膠囊按鈕、`.panel` 卡片樣式）。

### 非目標 (Non-Goals)
- **不做公開多人社交貼文**：僅服務單一使用者的跨裝置私有同步，不提供好友追蹤、公開貼文或社群留言功能。
- **不架設專屬私有伺服器託管使用者資料**：完全利用 Google Drive 官方 API 作為雲端儲存庫，零伺服器維護負擔與零衍生資料庫費用。

### 反目標 (Anti-Goals)
- **絕不得因離線或連線超時阻斷打卡**：旅行當下的打卡體驗必須隨點隨開，雲端同步必須在背景非同步進行，失敗時自動重試，絕不跳出阻塞性錯誤。
- **絕不得暴力覆蓋資料**：雙向同步時若兩端各有新建立的足跡或心願，必須自動合併保存，絕不發生單邊覆蓋導致資料遺失。
- **絕不得要求每次頻繁重新登入**：登入憑證應妥善保留於安全儲存區，確保重啟 App 或分頁時無感延續同步狀態。

---

## 3. 限制與執行條件 (Constraints)

- **執行環境**：
  - 電腦端：Node.js + Express 本機環境，支援直接呼叫 API 或靜態 PWA 模式。
  - 行動端：iOS Safari / Android Chrome 支援 PWA 安裝與本機儲存（IndexedDB / LocalStorage）。
- **Google API 配額**：Google Drive API 提供極為寬裕的免費讀寫配額，一般旅行紀錄 JSON 僅數百 KB，相片壓縮後每張約 100~200 KB，完全落在免費空間容量內。
- **用戶端憑證設定**：使用者只需在設定面板中填入一次 Google Cloud Client ID（系統附帶圖文引導），即可在各裝置一鍵登入。

---

## 4. 已確認的設計決策 (Decided How)

### 4.1 雲端儲存組織結構 (Cloud Storage Hierarchy)

在 Google Drive 的專屬空間中，維護以下檔案結構：

```
[Google Drive: RoamLog Sync]
├── manifest.json              # 同步清單：記錄最後更新時間戳、資料版本、相片列表索引
├── data/
│   └── roamlog_data.json      # 完整核心資料庫：footprints, wishes, trips, companions
└── photos/
    ├── {photoId_1}.jpg        # 最佳化壓縮後的拍立得照片
    └── {photoId_2}.jpg
```

### 4.2 雙向合併邏輯 (Sync Reconciliation)

1. **同步觸發時機**：
   - App 啟動時自動拉取最新資料。
   - 新增/編輯/刪除足跡或心願後，延遲 3 秒背景自動推送。
   - 使用者在設定面板點擊「🔄 立即強制同步」。
2. **合併演算法 (Union & Timestamp Resolution)**：
   - **實體合併 (Footprints, Wishes, Trips)**：依據 `id` 識別。
     - 若雲端有、本地無：下載並存入本地。
     - 若本地有、雲端無：上傳至雲端。
     - 若兩端皆有：比對更新時間戳記，保留較新版本的文字與評分內容。
   - **心願解鎖狀態 (fulfilledFootprintId)**：若任一端已標記解鎖，合併後自動保留解鎖狀態。
   - **相片同步**：本地新相片經壓縮後上傳至雲端 `photos/` 目錄；本地缺少雲端已存在的相片時，在瀏覽時依需求自動快取。

### 4.3 介面設計與主題一致性 (UI / UX Architecture)

1. **頂部導覽列右側（Header）**：
   - **未登入狀態**：顯示簡約 Google 膠囊按鈕：
     `[ 🌐 登入 Google 同步 ]`
   - **已登入狀態**：顯示圓角微光膠囊：
     `🟢 已同步 (剛剛)` 或 `🔄 同步中...`，點擊可展開簡要資訊卡片（顯示 Google 帳號與最後同步時間）。
2. **偏好與資料設定面板（Settings Popover ⚙️）**：
   - 新增「**☁️ Google 雲端雙向同步**」區塊：
     - Google 帳號名稱與 Email。
     - 連線狀態與最後同步時間。
     - **「🔄 立即強制同步」按鈕**（帳篷橘 `--accent` 樣式）。
     - **「中斷 Google 連結」按鈕**（柔和邊框 `--surface-2` 樣式）。
     - Client ID 設定折疊區（提供清楚引導說明）。

---

## 5. 留給實作者的工程細節 (What's Left to the Builder)

- Google Identity Services (GIS) 腳本的動態載入與快取。
- 本地 IndexedDB / LocalStorage 儲存機制的快取配額管理。
- 圖片上傳時的並行上限控制（每次最多 3 張並行上傳，防止行動網路壅塞）。
- 離線佇列管理器（Offline Queue）：在離線狀態下將變更動作暫存於本地隊列，連線恢復時循序推送。

---

## 6. 審查自檢結果 (Builder Review Check)

- **Q: 當多台裝置在離線時分別建立了衝突的行程天數（TripDay），該如何處理？**
  - **A:** 實作者將以 `dayNumber` 作為錨點，若兩端對同一天皆有新增節點，自動合併當天節點清單並依建立時間排序，不破壞行程架構。
- **Q: Google Drive API 權限範圍？**
  - **A:** 僅要求 `https://www.googleapis.com/auth/drive.appdata` 或 `https://www.googleapis.com/auth/drive.file`（僅能存取 RoamLog 自己建立的檔案），絕不讀取使用者 Google Drive 中的其他個人檔案，確保最高隱私等級。
