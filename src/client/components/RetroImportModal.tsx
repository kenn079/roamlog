import React, { useState } from 'react';
import { X, Upload, MapPin, Check, AlertCircle, Search } from 'lucide-react';
import { extractPhotoMetadata, type ParsedPhotoDraft } from '../lib/exif';
import { api } from '../lib/api';
import type { Companion, Coordinates, Trip, WeatherInfo } from '../../shared/types';

export interface RetroImportModalProps {
  companions: Companion[];
  trips: Trip[];
  onImported: () => void;
  onClose: () => void;
}

interface EnrichedDraft extends ParsedPhotoDraft {
  countryCode: string;
  countryName: string;
  cityName: string;
  weather: WeatherInfo | null;
  note: string;
  manualSearchQuery: string;
}

export function RetroImportModal({
  companions,
  trips,
  onImported,
  onClose,
}: RetroImportModalProps): React.ReactElement {
  const [drafts, setDrafts] = useState<EnrichedDraft[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedCompanionIds, setSelectedCompanionIds] = useState<string[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>('');

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setParsing(true);
    try {
      const results: EnrichedDraft[] = [];
      for (const file of files) {
        const meta = await extractPhotoMetadata(file, file.name);
        let countryCode = '';
        let countryName = '';
        let cityName = '';
        let weather: WeatherInfo | null = null;

        if (meta.coordinates) {
          try {
            const enriched = await api.enrich(
              meta.coordinates,
              meta.visitedAt || new Date().toISOString().slice(0, 10)
            );
            weather = enriched.weather;
            if (enriched.geo) {
              countryCode = enriched.geo.countryCode;
              countryName = enriched.geo.countryName;
              cityName = enriched.geo.cityName;
            }
          } catch {
            // Keep defaults if offline
          }
        }

        results.push({
          ...meta,
          countryCode,
          countryName,
          cityName,
          weather,
          note: '',
          manualSearchQuery: '',
        });
      }
      setDrafts((prev) => [...prev, ...results]);
    } finally {
      setParsing(false);
    }
  }

  async function handleManualResolveLocation(draftId: string, query: string) {
    if (!query.trim()) return;
    const found = await api.searchPlaces(query);
    if (!found.length) return;
    const first = found[0];
    setDrafts((prev) =>
      prev.map((d) =>
        d.id === draftId
          ? {
              ...d,
              suggestedTitle: first.title,
              coordinates: first.coordinates,
              countryCode: first.countryCode,
              countryName: first.countryName,
              cityName: first.cityName,
            }
          : d
      )
    );
  }

  function updateDraft(id: string, patch: Partial<EnrichedDraft>) {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  async function handleBatchImport() {
    const validDrafts = drafts.filter((d) => d.coordinates !== null);
    if (!validDrafts.length) return;
    setImporting(true);
    try {
      for (const d of validDrafts) {
        const uploadedPhoto = d.dataUrl
          ? await api.uploadPhoto(d.dataUrl, d.suggestedTitle, d.visitedAt ?? undefined)
          : null;
        await api.createFootprint({
          title: d.suggestedTitle,
          coordinates: d.coordinates as Coordinates,
          countryCode: d.countryCode,
          countryName: d.countryName,
          cityName: d.cityName,
          visitedAt: d.visitedAt || new Date().toISOString().slice(0, 10),
          photos: uploadedPhoto ? [uploadedPhoto] : [],
          note: d.note,
          rating: 5,
          weather: d.weather,
          companionIds: selectedCompanionIds,
          tripId: selectedTripId || null,
        });
      }
      onImported();
      onClose();
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 shadow-2xl my-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold">過去旅行回憶・智慧照片批次補登</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              自動解析舊照片 EXIF 經緯度與拍攝日期，並反查歷史天氣；無 GPS 的老照片亦可直接輸入地名定位
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* File Dropzone */}
        <label className="w-full border-2 border-dashed border-slate-700 hover:border-amber-400 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition bg-slate-800/40 mb-4">
          <Upload className="w-8 h-8 text-amber-400 mb-2" />
          <span className="text-sm font-medium">點擊選取多張舊旅遊照片（支援自動解析 EXIF GPS 與日期）</span>
          <span className="text-xs text-slate-400 mt-1">
            {parsing ? '正在解析照片定位與歷史天氣...' : '支援 JPG / PNG / HEIC'}
          </span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFilesSelected}
            className="hidden"
          />
        </label>

        {/* Batch Settings */}
        {drafts.length > 0 && (
          <div className="space-y-4">
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 flex items-center justify-between flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-400">批次套用旅伴：</span>
                {companions.map((c) => {
                  const active = selectedCompanionIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() =>
                        setSelectedCompanionIds((prev) =>
                          prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id]
                        )
                      }
                      className={`px-2 py-0.5 rounded-full cursor-pointer ${
                        active ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-700 text-slate-200'
                      }`}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>

              {trips.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">歸入旅程：</span>
                  <select
                    value={selectedTripId}
                    onChange={(e) => setSelectedTripId(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200"
                  >
                    <option value="">獨立足跡</option>
                    {trips.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Draft Cards List */}
            <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1">
              {drafts.map((d) => (
                <div
                  key={d.id}
                  className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 flex items-start gap-3"
                >
                  <div className="w-16 h-16 rounded-lg bg-slate-900 overflow-hidden shrink-0">
                    {d.dataUrl && (
                      <img src={d.dataUrl} alt={d.suggestedTitle} className="w-full h-full object-cover" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={d.suggestedTitle}
                        onChange={(e) => updateDraft(d.id, { suggestedTitle: e.target.value })}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                      />
                      <input
                        type="date"
                        value={d.visitedAt || ''}
                        onChange={(e) => updateDraft(d.id, { visitedAt: e.target.value })}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                      />
                    </div>

                    {d.coordinates ? (
                      <div className="flex items-center gap-2 text-xs text-emerald-400">
                        <Check className="w-3.5 h-3.5" />
                        <span>
                          已定位：{d.cityName || d.countryName || `${d.coordinates.lat}, ${d.coordinates.lng}`}
                        </span>
                        {d.weather && (
                          <span className="text-amber-300">
                            · {d.weather.icon} {d.weather.tempC}°C
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="text-xs text-amber-300 shrink-0">無 EXIF 定位：</span>
                        <input
                          type="text"
                          value={d.manualSearchQuery}
                          onChange={(e) => updateDraft(d.id, { manualSearchQuery: e.target.value })}
                          placeholder="輸入地名補定位（如：日月潭）"
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleManualResolveLocation(d.id, d.manualSearchQuery)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Search className="w-3 h-3" />
                          定位
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 text-sm text-slate-300 cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                disabled={importing || drafts.every((d) => !d.coordinates)}
                onClick={handleBatchImport}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm flex items-center gap-1.5 cursor-pointer"
              >
                <MapPin className="w-4 h-4" />
                {importing
                  ? '匯入中...'
                  : `一鍵匯入已定位照片 (${drafts.filter((d) => d.coordinates).length})`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
