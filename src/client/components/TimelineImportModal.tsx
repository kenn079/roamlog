import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';
import {
  detectFileFormat,
  parseGoogleTakeoutRecords,
  parseGoogleSemanticTimeline,
  parseGoogleOnDeviceTimeline,
  parseGeoJSONTracks,
  parseGPXString,
} from '../lib/trailParser';
import { saveTrails } from '../lib/trailStorage';
import type { Trail } from '../../shared/types';

interface TimelineImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (importedCount: number, distanceKm: number) => void;
}

function readFileAsText(file: File): Promise<string> {
  const cleanBOM = (str: string) => (str.charCodeAt(0) === 0xfeff ? str.slice(1) : str);
  if (typeof file.text === 'function') {
    return file.text().then(cleanBOM);
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(cleanBOM(reader.result as string));
    reader.onerror = () => reject(reader.error || new Error('檔案讀取失敗'));
    reader.readAsText(file);
  });
}

export function TimelineImportModal({
  isOpen,
  onClose,
  onImportSuccess,
}: TimelineImportModalProps): React.ReactElement | null {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    setErrorMessage(null);
    setProgressText('讀取檔案中...');

    try {
      const totalImportedTrails: Trail[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgressText(`正在解析 ${file.name}...`);

        const text = await readFileAsText(file);
        const format = detectFileFormat(text);

        let parsed: Trail[] = [];
        if (format === 'google-records') {
          const json = JSON.parse(text);
          parsed = parseGoogleTakeoutRecords(json, file.name.replace(/\.[^/.]+$/, ''));
        } else if (format === 'google-semantic') {
          const json = JSON.parse(text);
          parsed = parseGoogleSemanticTimeline(json, file.name.replace(/\.[^/.]+$/, ''));
        } else if (format === 'google-on-device') {
          const json = JSON.parse(text);
          parsed = parseGoogleOnDeviceTimeline(json, file.name.replace(/\.[^/.]+$/, ''));
        } else if (format === 'geojson') {
          const json = JSON.parse(text);
          parsed = parseGeoJSONTracks(json, file.name.replace(/\.[^/.]+$/, ''));
        } else if (format === 'gpx') {
          parsed = parseGPXString(text, file.name.replace(/\.[^/.]+$/, ''));
        } else {
          // Try parse JSON fallback
          try {
            const json = JSON.parse(text);
            if (Array.isArray(json.semanticSegments) || Array.isArray(json.rawSignals)) {
              parsed = parseGoogleOnDeviceTimeline(json, file.name.replace(/\.[^/.]+$/, ''));
            } else if (Array.isArray(json.locations)) {
              parsed = parseGoogleTakeoutRecords(json, file.name.replace(/\.[^/.]+$/, ''));
            } else if (Array.isArray(json.timelineObjects)) {
              parsed = parseGoogleSemanticTimeline(json, file.name.replace(/\.[^/.]+$/, ''));
            } else if (json.type === 'FeatureCollection' || json.type === 'Feature') {
              parsed = parseGeoJSONTracks(json, file.name.replace(/\.[^/.]+$/, ''));
            }
          } catch {
            throw new Error(`無法辨識檔案格式: ${file.name}。請確認為 Google 時間軸 JSON、GeoJSON 或 GPX 檔案。`);
          }
        }

        if (parsed.length === 0) {
          let extraInfo = '';
          try {
            const sampleJson = JSON.parse(text);
            if (sampleJson && typeof sampleJson === 'object') {
              const keys = Object.keys(sampleJson).slice(0, 6).join(', ');
              extraInfo = ` (偵測到欄位: ${keys || '空物件'})`;
            }
          } catch {}
          throw new Error(`檔案中未包含有效之經緯度軌跡數據${extraInfo}。請確認此時間軸檔案有記錄出行移動軌跡。`);
        }

        totalImportedTrails.push(...parsed);
      }

      setProgressText(`正在儲存 ${totalImportedTrails.length} 條軌跡...`);
      await saveTrails(totalImportedTrails);

      const totalDist = totalImportedTrails.reduce((acc, t) => acc + (t.distanceKm || 0), 0);
      onImportSuccess(totalImportedTrails.length, Math.round(totalDist * 10) / 10);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || '匯入失敗，請檢查檔案格式是否正確。');
    } finally {
      setIsProcessing(false);
      setProgressText('');
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay backdrop-blur-xs">
      <div className="w-full max-w-lg panel p-6 rounded-2xl shadow-xl flex flex-col gap-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-ink-soft hover:text-ink rounded-lg transition-colors"
          title="關閉"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="p-2 bg-accent/15 text-accent rounded-xl">
            <UploadCloud className="w-6 h-6" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-ink">匯入時間軸與軌跡檔案</h2>
            <p className="text-xs text-ink-soft">
              支援 Google 地圖時間軸 Records.json、Timeline.json、GeoJSON、GPX
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 bg-danger/10 border border-danger/30 rounded-xl text-danger text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div
          data-testid="timeline-dropzone"
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
            isDragging
              ? 'border-accent bg-accent/5'
              : 'border-line hover:border-accent/60 bg-surface-2/40'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent">
            <FileText className="w-6 h-6" />
          </div>

          <div className="text-center">
            <p className="text-sm font-semibold text-ink">
              點擊選取或拖曳檔案至此
            </p>
            <p className="text-xs text-ink-soft mt-1">
              Google Takeout (Records.json)、Timeline.json 或 .geojson / .gpx
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5 justify-center mt-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-surface text-ink-soft border border-line">
              Timeline.json
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-surface text-ink-soft border border-line">
              Records.json
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-surface text-ink-soft border border-line">
              .geojson
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-surface text-ink-soft border border-line">
              .gpx
            </span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".json,.geojson,.gpx,.kml"
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
        </div>

        {isProcessing && (
          <div className="flex items-center justify-center gap-2 py-2 text-xs text-accent font-medium">
            <div className="w-3.5 h-3.5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <span>{progressText}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-ink-soft hover:text-ink hover:bg-surface-2 transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
