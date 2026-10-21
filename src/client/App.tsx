import React, { useCallback, useEffect, useState } from 'react';
import {
  Map as MapIcon,
  Tent,
  Download,
  Upload,
  Sun,
  Moon,
  Settings,
  Sliders,
  X,
  Building2,
  Globe,
  Star,
  EyeOff,
  Cloud,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { api } from './lib/api';
import { useTheme } from './lib/theme';
import { TentMark } from './components/CampDecor';
import { StatsBar } from './components/StatsBar';
import { WorldMapView } from './components/WorldMapView';
import { PolaroidModal } from './components/PolaroidModal';
import { CheckInModal } from './components/CheckInModal';
import { RetroImportModal } from './components/RetroImportModal';
import { WishModal } from './components/WishModal';
import { WishCardModal } from './components/WishCardModal';
import { FirebaseSyncModal } from './components/FirebaseSyncModal';
import {
  loginWithGoogle,
  logoutFirebase,
  onFirebaseAuthState,
  fetchRemoteFirebaseData,
  uploadToFirebase,
  subscribeToFirebaseChanges,
} from './lib/firebaseSync';
import { mergeBackupStores } from './lib/syncEngine';
import { TripsView, computeTripRouteCoordinates } from './components/TripsView';
import type { User } from 'firebase/auth';
import type {
  BackupPayload,
  Companion,
  Coordinates,
  Footprint,
  FootprintFilter,
  FootprintStats,
  IlluminationMode,
  SyncStatus,
  Trip,
  Wish,
} from '../shared/types';

export function App(): React.ReactElement {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'world' | 'trips'>('world');
  const [stats, setStats] = useState<FootprintStats>({
    countryCount: 0,
    cityCount: 0,
    visitedCountryCodes: [],
    years: [],
  });
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [footprints, setFootprints] = useState<Footprint[]>([]);
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [wishStats, setWishStats] = useState<{ totalCount: number; unfulfilledCount: number }>({
    totalCount: 0,
    unfulfilledCount: 0,
  });
  const [trips, setTrips] = useState<Trip[]>([]);
  const [filter, setFilter] = useState<FootprintFilter>({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [illuminationMode, setIlluminationMode] = useState<IlluminationMode>(() => {
    try {
      const saved = localStorage.getItem('roamlog_illumination_mode');
      if (saved === 'country' || saved === 'city') return saved;
    } catch {
      // fallback
    }
    return 'city';
  });

  function handleIlluminationModeChange(mode: IlluminationMode) {
    setIlluminationMode(mode);
    try {
      localStorage.setItem('roamlog_illumination_mode', mode);
    } catch {
      // ignore
    }
  }

  const [showWishes, setShowWishes] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('roamlog_show_wishes');
      if (saved !== null) return saved === 'true';
    } catch {
      // fallback
    }
    return true;
  });

  function handleShowWishesChange(show: boolean) {
    setShowWishes(show);
    try {
      localStorage.setItem('roamlog_show_wishes', String(show));
    } catch {
      // ignore
    }
  }

  const [selectedFootprint, setSelectedFootprint] = useState<Footprint | null>(null);
  const [selectedWish, setSelectedWish] = useState<Wish | null>(null);
  const [fulfillingWish, setFulfillingWish] = useState<Wish | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<Coordinates[]>([]);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkInCoords, setCheckInCoords] = useState<Coordinates | null>(null);
  const [preselectedTripDay, setPreselectedTripDay] = useState<{
    tripId: string;
    tripDayId: string;
  } | null>(null);
  const [retroImportOpen, setRetroImportOpen] = useState(false);
  const [wishModalOpen, setWishModalOpen] = useState(false);

  // Firebase Real-time Cloud Sync State
  const [firebaseSyncModalOpen, setFirebaseSyncModalOpen] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    try {
      return localStorage.getItem('roamlog_last_sync_time') || null;
    } catch {
      return null;
    }
  });

  const handleSelectFootprint = useCallback((fp: Footprint) => setSelectedFootprint(fp), []);

  async function loadAll(currentFilter: FootprintFilter = filter) {
    try {
      const [st, comps, fps, trs, ws, wst] = await Promise.all([
        api.getStats(),
        api.listCompanions(),
        api.listFootprints(currentFilter),
        api.listTrips(),
        api.listWishes(),
        api.getWishStats(),
      ]);
      setStats(st);
      setCompanions(comps);
      setFootprints(fps);
      setTrips(trs);
      setWishes(ws);
      setWishStats(wst);

      const nextFilter = { ...currentFilter };
      let filterChanged = false;
      if (nextFilter.year && !st.years.includes(nextFilter.year)) {
        delete nextFilter.year;
        filterChanged = true;
      }
      if (nextFilter.countryCode && !st.visitedCountryCodes.includes(nextFilter.countryCode)) {
        delete nextFilter.countryCode;
        filterChanged = true;
      }
      if (filterChanged) {
        setFilter(nextFilter);
      }

      if (currentFilter.tripId) {
        const activeTrip = trs.find((t) => t.id === currentFilter.tripId);
        setRouteCoordinates(activeTrip ? computeTripRouteCoordinates(activeTrip) : []);
      }
    } catch {
      // Graceful fallback before backend is populated
    }
  }

  useEffect(() => {
    loadAll(filter);
  }, [filter.year, filter.countryCode, filter.companionId, filter.tripId]);

  // Firebase Cloud Sync Runner
  const runSync = useCallback(
    async (uidOverride?: string) => {
      const uid = uidOverride || firebaseUser?.uid;
      if (!uid) {
        setSyncStatus('idle');
        return;
      }
      setSyncStatus('syncing');
      setSyncErrorMessage(null);

      try {
        const localPayload = await api.exportBackup();
        const remote = await fetchRemoteFirebaseData(uid);

        const { merged, localChanged, remoteChanged } = mergeBackupStores(localPayload, remote);

        if (localChanged) {
          await api.importBackup(merged);
          await loadAll(filter);
        }

        if (remoteChanged || remote.footprints.length === 0) {
          await uploadToFirebase(uid, merged);
        }

        const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastSyncTime(nowStr);
        try {
          localStorage.setItem('roamlog_last_sync_time', nowStr);
        } catch {
          // ignore
        }
        setSyncStatus('synced');
      } catch (err: any) {
        setSyncStatus('error');
        setSyncErrorMessage(err.message || '雲端同步失敗');
      }
    },
    [firebaseUser, filter]
  );

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onFirebaseAuthState((user) => {
      setFirebaseUser(user);
      if (user) {
        runSync(user.uid);
      } else {
        setSyncStatus('idle');
      }
    });
    return () => unsubscribe();
  }, []);

  // Listen to real-time changes across devices
  useEffect(() => {
    if (!firebaseUser) return;
    const unsubscribe = subscribeToFirebaseChanges(firebaseUser.uid, async () => {
      try {
        const remote = await fetchRemoteFirebaseData(firebaseUser.uid);
        const localPayload = await api.exportBackup();
        const { merged, localChanged } = mergeBackupStores(localPayload, remote);
        if (localChanged) {
          await api.importBackup(merged);
          await loadAll(filter);
        }
        const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastSyncTime(nowStr);
        setSyncStatus('synced');
      } catch {
        // ignore background sync errors
      }
    });

    const onOnline = () => {
      runSync(firebaseUser.uid);
    };
    window.addEventListener('online', onOnline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', onOnline);
    };
  }, [firebaseUser?.uid]);

  async function handleGoogleLogin() {
    try {
      setSyncStatus('syncing');
      setSyncErrorMessage(null);
      const user = await loginWithGoogle();
      setFirebaseUser(user);
      await runSync(user.uid);
    } catch (err: any) {
      setSyncStatus('error');
      setSyncErrorMessage(err.message || 'Google 登入失敗');
    }
  }

  async function handleLogout() {
    try {
      await logoutFirebase();
      setFirebaseUser(null);
      setSyncStatus('idle');
      setSyncErrorMessage(null);
    } catch {
      // ignore
    }
  }

  async function handleDeleteFootprint(id: string) {
    await api.deleteFootprint(id);
    setSelectedFootprint(null);
    await loadAll(filter);
    if (firebaseUser) runSync();
  }

  async function handleDeleteWish(id: string) {
    await api.deleteWish(id);
    setSelectedWish(null);
    await loadAll(filter);
    if (firebaseUser) runSync();
  }

  function handleStartFulfillWish(wish: Wish) {
    setSelectedWish(null);
    setFulfillingWish(wish);
    setCheckInCoords(wish.coordinates);
    setPreselectedTripDay(null);
    setCheckInOpen(true);
  }

  async function handleExportBackup() {
    const payload = await api.exportBackup();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roamlog-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportBackup(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const payload = JSON.parse(text) as BackupPayload;
    await api.importBackup(payload);
    loadAll(filter);
    if (firebaseUser) runSync();
  }

  const tabClass = (active: boolean) =>
    `flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
      active ? 'bg-accent text-on-accent shadow-sm' : 'text-ink-soft hover:text-ink'
    }`;

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-canvas/85 backdrop-blur-md border-b border-line px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <TentMark className="w-9 h-9 shrink-0" />
          <div className="min-w-0">
            <h1 className="font-display text-lg leading-tight text-ink">RoamLog</h1>
            <p className="text-[11px] text-ink-faint hidden sm:block">
              點亮世界地圖 × 拍立得回憶卡 × 獨立旅程日誌
            </p>
          </div>
        </div>

        {/* Center Mode Switcher */}
        <nav className="flex items-center bg-surface-2 border border-line rounded-full p-1">
          <button type="button" onClick={() => setActiveTab('world')} className={tabClass(activeTab === 'world')}>
            <MapIcon className="w-4 h-4" />
            世界足跡庫
          </button>

          <button type="button" onClick={() => setActiveTab('trips')} className={tabClass(activeTab === 'trips')}>
            <Tent className="w-4 h-4" />
            我的旅程本 ({trips.length})
          </button>
        </nav>

        {/* Sync Pill + Theme + Settings Dropdown Popover */}
        <div className="flex items-center gap-1.5 relative">
          {firebaseUser ? (
            <button
              type="button"
              onClick={() => setFirebaseSyncModalOpen(true)}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                syncStatus === 'syncing'
                  ? 'bg-accent/15 text-accent border border-accent/30'
                  : syncStatus === 'error'
                  ? 'bg-red-500/15 text-red-500 border border-red-500/30'
                  : 'bg-moss/15 text-moss border border-moss/30'
              }`}
              title={`Google 雲端同步 (${firebaseUser.email || '已連結'}) - 最後同步: ${lastSyncTime || '剛剛'}`}
            >
              {syncStatus === 'syncing' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : syncStatus === 'error' ? (
                <AlertCircle className="w-3.5 h-3.5" />
              ) : (
                <Cloud className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">
                {syncStatus === 'syncing' ? '同步中' : syncStatus === 'error' ? '同步異常' : '已同步'}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setFirebaseSyncModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold bg-surface-2 hover:bg-surface border border-line text-ink-soft hover:text-ink transition cursor-pointer"
              title="登入 Google 帳號無縫同步"
            >
              <Cloud className="w-3.5 h-3.5 text-accent" />
              <span className="hidden sm:inline">登入同步</span>
            </button>
          )}

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'light' ? '切換深色模式' : '切換明亮模式'}
            title={theme === 'light' ? '切換深色模式' : '切換明亮模式'}
            className="btn-ghost p-2"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-sun" />}
          </button>

          <button
            type="button"
            onClick={() => setSettingsOpen((v) => !v)}
            aria-label="偏好與資料設定"
            title="系統設定"
            className={`btn-ghost p-2 ${settingsOpen ? 'bg-surface-2 text-accent' : ''}`}
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Settings Popover */}
          {settingsOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setSettingsOpen(false)}
              />
              <div className="absolute right-0 top-11 z-50 w-72 sm:w-80 panel p-4 shadow-soft space-y-4 border border-line bg-surface">
                <div className="flex items-center justify-between border-b border-line pb-2.5">
                  <div className="flex items-center gap-2 font-display text-sm font-bold text-ink">
                    <Sliders className="w-4 h-4 text-accent" />
                    <span>偏好與資料設定</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettingsOpen(false)}
                    className="p-1 rounded-full text-ink-faint hover:text-ink hover:bg-surface-2 transition cursor-pointer"
                    aria-label="關閉設定"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Section 1: 地圖點亮範圍 */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-ink-soft block">
                    地圖點亮範圍
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-surface-2 border border-line rounded-xl">
                    <button
                      type="button"
                      onClick={() => handleIlluminationModeChange('city')}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        illuminationMode === 'city'
                          ? 'bg-accent text-on-accent shadow-xs'
                          : 'text-ink-soft hover:text-ink'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>僅限城市</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleIlluminationModeChange('country')}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        illuminationMode === 'country'
                          ? 'bg-accent text-on-accent shadow-xs'
                          : 'text-ink-soft hover:text-ink'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>整個國家</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-ink-faint leading-relaxed">
                    {illuminationMode === 'city'
                      ? '僅點亮地標所在城市的生活圈光暈，不擴及全境。'
                      : '點亮已造訪地標所屬的完整國家地圖版圖。'}
                  </p>
                </div>

                {/* Section 2: 心願地點顯示 */}
                <div className="space-y-2 border-t border-line pt-3">
                  <label className="text-xs font-semibold text-ink-soft block">
                    心願地點圖釘
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-surface-2 border border-line rounded-xl">
                    <button
                      type="button"
                      onClick={() => handleShowWishesChange(true)}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        showWishes
                          ? 'bg-sun text-paper-ink font-bold shadow-xs'
                          : 'text-ink-soft hover:text-ink'
                      }`}
                    >
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>顯示心願</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShowWishesChange(false)}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        !showWishes
                          ? 'bg-accent text-on-accent shadow-xs'
                          : 'text-ink-soft hover:text-ink'
                      }`}
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>暫時隱藏</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-ink-faint leading-relaxed">
                    {showWishes
                      ? '在地圖上以金色星標顯示待訪的心願地點。'
                      : '僅顯示已解鎖足跡，暫時隱藏心願星標。'}
                  </p>
                </div>

                {/* Section 2.5: Google 雲端雙向同步 */}
                <div className="space-y-2 border-t border-line pt-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-ink-soft block">
                      Google 雲端雙向同步
                    </label>
                    {firebaseUser && (
                      <span className="text-[10px] text-moss font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        已連線
                      </span>
                    )}
                  </div>

                  {firebaseUser ? (
                    <div className="p-2.5 bg-surface-2 border border-line rounded-xl space-y-2">
                      <div className="text-[11px] text-ink font-semibold truncate">
                        {firebaseUser.email}
                      </div>
                      <div className="text-[10px] text-ink-faint">
                        最後同步：{lastSyncTime || '剛剛'}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            runSync();
                            setSettingsOpen(false);
                          }}
                          disabled={syncStatus === 'syncing'}
                          className="btn-primary py-1.5 px-2 text-xs flex items-center justify-center gap-1"
                        >
                          <RefreshCw className={`w-3 h-3 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                          <span>立即同步</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSettingsOpen(false);
                            setFirebaseSyncModalOpen(true);
                          }}
                          className="btn-soft py-1.5 px-2 text-xs flex items-center justify-center gap-1"
                        >
                          <span>管理帳號</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setSettingsOpen(false);
                        setFirebaseSyncModalOpen(true);
                      }}
                      className="btn-soft w-full py-2 px-3 text-xs flex items-center justify-center gap-1.5 text-accent"
                    >
                      <Cloud className="w-3.5 h-3.5" />
                      <span>以 Google 帳號一鍵登入</span>
                    </button>
                  )}
                  <p className="text-[11px] text-ink-faint leading-relaxed">
                    透過 Google Firebase 即時同步，手機打卡電腦秒級更新。
                  </p>
                </div>

                {/* Section 3: 資料備份與還原 */}
                <div className="space-y-2 border-t border-line pt-3">
                  <label className="text-xs font-semibold text-ink-soft block">
                    資料備份與還原
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleExportBackup();
                        setSettingsOpen(false);
                      }}
                      className="btn-soft w-full py-2 px-3 text-xs flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5 text-moss" />
                      <span>匯出備份</span>
                    </button>

                    <label className="btn-soft w-full py-2 px-3 text-xs flex items-center justify-center gap-1.5 cursor-pointer">
                      <Upload className="w-3.5 h-3.5 text-accent" />
                      <span>還原備份</span>
                      <input
                        type="file"
                        accept="application/json"
                        onChange={(e) => {
                          handleImportBackup(e);
                          setSettingsOpen(false);
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="text-[11px] text-ink-faint leading-relaxed">
                    足跡、旅程與旅伴資料皆保存在本地，隨時可匯出 JSON 備份檔。
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 space-y-5 flex flex-col">
        {activeTab === 'world' ? (
          <>
            <StatsBar
              stats={stats}
              wishCount={wishStats.unfulfilledCount}
              companions={companions}
              filter={filter}
              onFilterChange={(nextFilter) => {
                setFilter(nextFilter);
                if (!nextFilter.tripId) {
                  setRouteCoordinates([]);
                }
              }}
              onOpenCheckIn={() => {
                setFulfillingWish(null);
                setCheckInCoords(null);
                setPreselectedTripDay(null);
                setCheckInOpen(true);
              }}
              onOpenRetroImport={() => setRetroImportOpen(true)}
              onOpenAddWish={() => setWishModalOpen(true)}
            />

            <div className="flex-1 flex flex-col">
              <WorldMapView
                footprints={footprints}
                wishes={showWishes ? wishes : []}
                visitedCountryCodes={stats.visitedCountryCodes}
                routeCoordinates={routeCoordinates}
                theme={theme}
                illuminationMode={illuminationMode}
                onSelectFootprint={handleSelectFootprint}
                onSelectWish={(w) => setSelectedWish(w)}
                onDeleteFootprint={handleDeleteFootprint}
                onMapClick={(coords) => {
                  setFulfillingWish(null);
                  setCheckInCoords(coords);
                  setPreselectedTripDay(null);
                  setCheckInOpen(true);
                }}
              />
            </div>
          </>
        ) : (
          <TripsView
            trips={trips}
            companions={companions}
            onRefresh={() => loadAll(filter)}
            onSelectFootprint={handleSelectFootprint}
            onOpenLiveCheckIn={(tripId, tripDayId) => {
              setFulfillingWish(null);
              setCheckInCoords(null);
              setPreselectedTripDay({ tripId, tripDayId });
              setCheckInOpen(true);
            }}
            onViewTripOnMap={(tripId, coords) => {
              setFilter((prev) => ({ ...prev, tripId }));
              setRouteCoordinates(coords);
              setActiveTab('world');
            }}
          />
        )}
      </main>

      {/* Modals */}
      {selectedWish && (
        <WishCardModal
          wish={selectedWish}
          onClose={() => setSelectedWish(null)}
          onDelete={handleDeleteWish}
          onFulfill={handleStartFulfillWish}
        />
      )}

      {wishModalOpen && (
        <WishModal
          onCreated={async () => {
            await loadAll(filter);
            if (firebaseUser) runSync();
          }}
          onClose={() => setWishModalOpen(false)}
        />
      )}

      {selectedFootprint && (
        <PolaroidModal
          footprint={selectedFootprint}
          onClose={() => setSelectedFootprint(null)}
          onDelete={handleDeleteFootprint}
        />
      )}

      {checkInOpen && (
        <CheckInModal
          companions={companions}
          trips={trips}
          initialCoordinates={checkInCoords}
          initialTitle={fulfillingWish?.title}
          preselectedTripDay={preselectedTripDay}
          onCreated={async (fp) => {
            if (fulfillingWish && fp) {
              await api.fulfillWish(fulfillingWish.id, fp.id);
              setFulfillingWish(null);
            }
            await loadAll(filter);
            if (firebaseUser) runSync();
          }}
          onCompanionCreated={(c) => setCompanions((prev) => [...prev, c])}
          onClose={() => {
            setFulfillingWish(null);
            setCheckInOpen(false);
          }}
        />
      )}

      {retroImportOpen && (
        <RetroImportModal
          companions={companions}
          trips={trips}
          onImported={async () => {
            await loadAll(filter);
            if (firebaseUser) runSync();
          }}
          onClose={() => setRetroImportOpen(false)}
        />
      )}

      {firebaseSyncModalOpen && (
        <FirebaseSyncModal
          onClose={() => setFirebaseSyncModalOpen(false)}
          onLogin={handleGoogleLogin}
          onLogout={handleLogout}
          onManualSync={() => runSync()}
          isLoggedIn={!!firebaseUser}
          userEmail={firebaseUser?.email}
          userName={firebaseUser?.displayName}
          userPhoto={firebaseUser?.photoURL}
          lastSyncedAt={lastSyncTime}
          syncStatus={syncStatus}
          syncErrorMessage={syncErrorMessage}
        />
      )}
    </div>
  );
}
export default App;
