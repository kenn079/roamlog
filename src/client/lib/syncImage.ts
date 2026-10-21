/**
 * Front-end Image Compression Pipeline for Cloud Sync
 * Scales high-resolution photos down to web/mobile friendly sizes (default 1600px max edge, JPEG 0.82)
 * reducing storage and network transfer footprint by ~70-85%.
 */

export interface CompressOptions {
  maxDimension?: number;
  quality?: number;
  loadImageFn?: (src: string) => Promise<HTMLImageElement>;
  createCanvasFn?: () => HTMLCanvasElement;
}

export interface CompressResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Converts a base64 Data URL to a native binary Blob.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0]?.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const byteString = atob(parts[1] || '');
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mime });
}

/**
 * Converts a binary Blob to a base64 Data URL.
 */
export async function blobToDataUrl(blob: Blob): Promise<string> {
  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(blob);
    });
  }
  // Fallback for node / test environments without window.FileReader
  const buffer = await blob.arrayBuffer();
  const base64 = typeof Buffer !== 'undefined'
    ? Buffer.from(buffer).toString('base64')
    : btoa(String.fromCharCode(...new Uint8Array(buffer)));
  return `data:${blob.type || 'application/octet-stream'};base64,${base64}`;
}

function defaultLoadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Failed to load image for compression'));
    img.src = src;
  });
}

/**
 * Compresses an image (base64 string or Blob) into a balanced JPEG Blob & Data URL.
 */
export async function compressImageForSync(
  dataUrlOrBlob: string | Blob,
  options: CompressOptions = {}
): Promise<CompressResult> {
  const maxDimension = options.maxDimension ?? 1600;
  const quality = options.quality ?? 0.82;
  const loadImage = options.loadImageFn ?? defaultLoadImage;
  const createCanvas = options.createCanvasFn ?? (() => document.createElement('canvas'));

  let sourceUrl = '';
  let needRevoke = false;

  if (typeof dataUrlOrBlob === 'string') {
    sourceUrl = dataUrlOrBlob;
  } else {
    if (typeof URL !== 'undefined' && URL.createObjectURL) {
      sourceUrl = URL.createObjectURL(dataUrlOrBlob);
      needRevoke = true;
    } else {
      sourceUrl = await blobToDataUrl(dataUrlOrBlob);
    }
  }

  try {
    const img = await loadImage(sourceUrl);
    let { width, height } = img;

    if (width > maxDimension || height > maxDimension) {
      if (width >= height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
    }

    const canvas = createCanvas();
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2d rendering context from canvas');
    }

    ctx.drawImage(img, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', quality);

    const blob = await new Promise<Blob>((resolve, reject) => {
      if (canvas.toBlob) {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else resolve(dataUrlToBlob(dataUrl));
        }, 'image/jpeg', quality);
      } else {
        resolve(dataUrlToBlob(dataUrl));
      }
    });

    return { blob, dataUrl, width, height };
  } finally {
    if (needRevoke && sourceUrl) {
      try {
        URL.revokeObjectURL(sourceUrl);
      } catch {
        // ignore
      }
    }
  }
}
