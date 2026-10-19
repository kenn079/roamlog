import exifr from 'exifr';
import type { Coordinates } from '../../shared/types';

export interface ParsedPhotoDraft {
  id: string;
  fileName: string;
  dataUrl: string;
  coordinates: Coordinates | null;
  visitedAt: string | null;
  suggestedTitle: string;
}

function defaultReadDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof FileReader === 'undefined') {
      resolve('');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function defaultParseExif(blob: Blob): Promise<any> {
  return exifr.parse(blob, { gps: true, tiff: true, exif: true });
}

export async function extractPhotoMetadata(
  file: File | Blob,
  fileName?: string,
  parseExifFn: (input: Blob) => Promise<any> = defaultParseExif,
  readDataUrlFn: (input: Blob) => Promise<string> = defaultReadDataUrl
): Promise<ParsedPhotoDraft> {
  const name = fileName || (file instanceof File ? file.name : 'photo.jpg');
  const cleanTitle =
    name
      .replace(/\.[^.]+$/, '')
      .replace(/[_-]+/g, ' ')
      .trim() || '未命名地標';

  let dataUrl = '';
  try {
    dataUrl = await readDataUrlFn(file);
  } catch {
    dataUrl = '';
  }

  let coordinates: Coordinates | null = null;
  let visitedAt: string | null = null;

  try {
    const tags = await parseExifFn(file);
    if (tags) {
      if (typeof tags.latitude === 'number' && typeof tags.longitude === 'number') {
        coordinates = {
          lat: Number(tags.latitude.toFixed(6)),
          lng: Number(tags.longitude.toFixed(6)),
        };
      }
      const rawDate = tags.DateTimeOriginal || tags.CreateDate || tags.ModifyDate;
      if (rawDate instanceof Date && !Number.isNaN(rawDate.getTime())) {
        visitedAt = rawDate.toISOString().slice(0, 10);
      } else if (typeof rawDate === 'string' && rawDate.trim()) {
        const normalized = rawDate.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
        const dt = new Date(normalized);
        if (!Number.isNaN(dt.getTime())) {
          visitedAt = dt.toISOString().slice(0, 10);
        }
      }
    }
  } catch {
    coordinates = null;
    visitedAt = null;
  }

  const id = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    id,
    fileName: name,
    dataUrl,
    coordinates,
    visitedAt,
    suggestedTitle: cleanTitle,
  };
}
