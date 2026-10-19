import React, { useEffect, useState } from 'react';
import { Globe, Compass, Download, Upload, MapPin } from 'lucide-react';
import { api } from './lib/api';
import { StatsBar } from './components/StatsBar';
import { WorldMapView } from './components/WorldMapView';
import { PolaroidModal } from './components/PolaroidModal';
import { CheckInModal } from './components/CheckInModal';
import { RetroImportModal } from './components/RetroImportModal';
import { TripsView } from './components/TripsView';
import type {
  BackupPayload,
  Companion,
  Coordinates,
  Footprint,
  FootprintFilter,
  FootprintStats,
  Trip,
} from '../shared/types';

export function App(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<'world' | 'trips'>('world');
  const [stats, setStats] = useState<FootprintStats>({
    countryCount: 0,
    cityCount: 0,
    visitedCountryCodes: [],
    years: [],
  });
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [footprints, setFootprints] = useState<Footprint[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [filter, setFilter] = useState<FootprintFilter>({});

  const [selectedFootprint, setSelectedFootprint] = useState<Footprint | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<Coordinates[]>([]);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkInCoords, setCheckInCoords] = useState<Coordinates | null>(null);
  const [preselectedTripDay, setPreselectedTripDay] = useState<{
    tripId: string;
    tripDayId: string;
  } | null>(null);
  const [retroImportOpen, setRetroImportOpen] = useState(false);

  async function loadAll(currentFilter: FootprintFilter = filter) {
    try {
      const [st, comps, fps, trs] = await Promise.all([
        api.getStats(),
        api.listCompanions(),
        api.listFootprints(currentFilter),
        api.listTrips(),
      ]);
      setStats(st);
      setCompanions(comps);
      setFootprints(fps);
      setTrips(trs);
    } catch {
      // Graceful fallback before backend is populated
    }
  }

  useEffect(() => {
    loadAll(filter);
  }, [filter.year, filter.countryCode, filter.companionId, filter.tripId]);

  async function handleDeleteFootprint(id: string) {
    await api.deleteFootprint(id);
    setSelectedFootprint(null);
    loadAll(filter);
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
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-white">
              RoamLog
            </h1>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              點亮世界地圖 × 拍立得回憶卡 × 獨立旅程日誌
            </p>
          </div>
        </div>

        {/* Center Mode Switcher */}
        <nav className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1">
          <button
            type="button"
            onClick={() => setActiveTab('world')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'world'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Globe className="w-4 h-4" />
            🌍 世界足跡庫
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('trips')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'trips'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Compass className="w-4 h-4" />
            🎒 我的旅程本 ({trips.length})
          </button>
        </nav>

        {/* Backup Export / Import */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportBackup}
            title="匯出完整 JSON 備份"
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs flex items-center gap-1 cursor-pointer"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span className="hidden md:inline">匯出備份</span>
          </button>

          <label
            title="匯入 JSON 備份"
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs flex items-center gap-1 cursor-pointer"
          >
            <Upload className="w-4 h-4 text-sky-400" />
            <span className="hidden md:inline">還原備份</span>
            <input
              type="file"
              accept="application/json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 space-y-5 flex flex-col">
        {activeTab === 'world' ? (
          <>
            <StatsBar
              stats={stats}
              companions={companions}
              filter={filter}
              onFilterChange={(nextFilter) => {
                setFilter(nextFilter);
                if (!nextFilter.tripId) {
                  setRouteCoordinates([]);
                }
              }}
              onOpenCheckIn={() => {
                setCheckInCoords(null);
                setPreselectedTripDay(null);
                setCheckInOpen(true);
              }}
              onOpenRetroImport={() => setRetroImportOpen(true)}
            />

            <div className="flex-1 flex flex-col">
              <WorldMapView
                footprints={footprints}
                visitedCountryCodes={stats.visitedCountryCodes}
                routeCoordinates={routeCoordinates}
                onSelectFootprint={(fp) => setSelectedFootprint(fp)}
                onMapClick={(coords) => {
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
            onSelectFootprint={(fp) => setSelectedFootprint(fp)}
            onOpenLiveCheckIn={(tripId, tripDayId) => {
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
          preselectedTripDay={preselectedTripDay}
          onCreated={() => loadAll(filter)}
          onCompanionCreated={(c) => setCompanions((prev) => [...prev, c])}
          onClose={() => setCheckInOpen(false)}
        />
      )}

      {retroImportOpen && (
        <RetroImportModal
          companions={companions}
          trips={trips}
          onImported={() => loadAll(filter)}
          onClose={() => setRetroImportOpen(false)}
        />
      )}
    </div>
  );
}
export default App;
