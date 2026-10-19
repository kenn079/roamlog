export interface CompressImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: string;
  createCanvasFn?: () => HTMLCanvasElement;
  loadImageFn?: (src: string) => Promise<HTMLImageElement>;
}

export function calculateDimensions(
  origWidth: number,
  origHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  if (origWidth <= maxWidth && origHeight <= maxHeight) {
    return { width: origWidth, height: origHeight };
  }
  const ratio = Math.min(maxWidth / origWidth, maxHeight / origHeight);
  return {
    width: Math.round(origWidth * ratio),
    height: Math.round(origHeight * ratio),
  };
}

function defaultLoadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image for compression'));
    img.src = src;
  });
}

function defaultCreateCanvas(): HTMLCanvasElement {
  return document.createElement('canvas');
}

export async function compressImage(
  dataUrlOrFile: string | Blob,
  options?: CompressImageOptions
): Promise<string> {
  const maxWidth = options?.maxWidth ?? 1280;
  const maxHeight = options?.maxHeight ?? 1280;
  const quality = options?.quality ?? 0.8;
  const mimeType = options?.mimeType ?? 'image/jpeg';
  const createCanvas = options?.createCanvasFn ?? defaultCreateCanvas;
  const loadImage = options?.loadImageFn ?? defaultLoadImage;

  let sourceUrl = '';
  if (typeof dataUrlOrFile === 'string') {
    sourceUrl = dataUrlOrFile;
  } else if (typeof FileReader !== 'undefined') {
    sourceUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(dataUrlOrFile);
    });
  } else {
    return '';
  }

  if (!sourceUrl || !sourceUrl.startsWith('data:image/')) {
    return sourceUrl;
  }

  // Preserve vector SVG or animated GIF
  if (sourceUrl.startsWith('data:image/gif') || sourceUrl.startsWith('data:image/svg+xml')) {
    return sourceUrl;
  }

  try {
    const img = await loadImage(sourceUrl);
    if (!img.width || !img.height) {
      return sourceUrl;
    }

    const { width, height } = calculateDimensions(img.width, img.height, maxWidth, maxHeight);
    const canvas = createCanvas();
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return sourceUrl;
    }

    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL(mimeType, quality);
  } catch {
    return sourceUrl;
  }
}
