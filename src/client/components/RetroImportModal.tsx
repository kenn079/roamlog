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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-3xl panel p-6 text-ink my-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-lg font-bold">過去旅行回憶・智慧照片批次補登</h2>
            <p className="text-xs text-ink-soft mt-0.5">
              自動解析舊照片 EXIF 經緯度與拍攝日期，並反查歷史天氣；無 GPS 的老照片亦可直接輸入地名定位
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost p-1.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* File Dropzone */}
        <label className="w-full border-2 border-dashed border-line hover:border-accent rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition bg-surface-2/50 mb-4">
          <Upload className="w-8 h-8 text-accent mb-2" />
          <span className="text-sm font-medium text-ink">
            點擊選取多張舊旅遊照片（支援自動解析 EXIF GPS 與日期）
          </span>
          <span className="text-xs text-ink-soft mt-1">
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
            <div className="bg-surface-2/80 border border-line rounded-2xl p-3 flex items-center justify-between flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-ink-soft">批次套用旅伴：</span>
                {companions.map((c) => {
                  const active = selectedCompanionIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      data-active={active}
                      onClick={() =>
                        setSelectedCompanionIds((prev) =>
                          prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id]
                        )
                      }
                      className="chip px-2.5 py-0.5"
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>

              {trips.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-ink-soft">歸入旅程：</span>
                  <select
                    value={selectedTripId}
                    onChange={(e) => setSelectedTripId(e.target.value)}
                    className="field px-2.5 py-1 text-xs"
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
                  className="bg-surface-2/65 border border-line rounded-2xl p-3 flex items-start gap-3"
                >
                  <div className="w-16 h-16 rounded-xl bg-surface overflow-hidden shrink-0 border border-line">
                    {d.dataUrl && (
                      <img
                        src={d.dataUrl}
                        alt={d.suggestedTitle}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={d.suggestedTitle}
                        onChange={(e) => updateDraft(d.id, { suggestedTitle: e.target.value })}
                        className="field px-2.5 py-1 text-xs"
                      />
                      <input
                        type="date"
                        value={d.visitedAt || ''}
                        onChange={(e) => updateDraft(d.id, { visitedAt: e.target.value })}
                        className="field px-2.5 py-1 text-xs"
                      />
                    </div>

                    {d.coordinates ? (
                      <div className="flex items-center gap-2 text-xs text-moss font-medium">
                        <Check className="w-3.5 h-3.5" />
                        <span>
                          已定位：
                          {d.cityName ||
                            d.countryName ||
                            `${d.coordinates.lat}, ${d.coordinates.lng}`}
                        </span>
                        {d.weather && (
                          <span className="text-accent">
                            · {d.weather.icon} {d.weather.tempC}°C
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-accent shrink-0" />
                        <span className="text-xs text-accent shrink-0">無 EXIF 定位：</span>
                        <input
                          type="text"
                          value={d.manualSearchQuery}
                          onChange={(e) =>
                            updateDraft(d.id, { manualSearchQuery: e.target.value })
                          }
                          placeholder="輸入地名補定位（如：日月潭）"
                          className="field flex-1 px-2.5 py-1 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleManualResolveLocation(d.id, d.manualSearchQuery)}
                          className="btn-primary px-2.5 py-1 text-xs"
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

            <div className="flex justify-end gap-2 pt-3 border-t border-line">
              <button type="button" onClick={onClose} className="btn-soft px-4 py-2 text-sm">
                取消
              </button>
              <button
                type="button"
                disabled={importing || drafts.every((d) => !d.coordinates)}
                onClick={handleBatchImport}
                className="btn-primary px-5 py-2 text-sm"
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
