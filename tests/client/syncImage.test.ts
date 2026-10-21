import { describe, it, expect, vi } from 'vitest';
import {
  compressImageForSync,
  dataUrlToBlob,
  blobToDataUrl,
} from '../../src/client/lib/syncImage';

describe('syncImage', () => {
  it('converts dataUrl to Blob and back', async () => {
    const sampleDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const blob = dataUrlToBlob(sampleDataUrl);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/png');

    const recoveredUrl = await blobToDataUrl(blob);
    expect(recoveredUrl.startsWith('data:image/png')).toBe(true);
  });

  it('compresses image for sync using canvas and returns blob and dimensions', async () => {
    // Mock image loader and canvas for jsdom/headless testing
    const fakeImg = {
      width: 2400,
      height: 1600,
    } as HTMLImageElement;

    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue({
        drawImage: vi.fn(),
      }),
      toBlob: vi.fn().mockImplementation((cb: (b: Blob | null) => void) => {
        cb(new Blob(['fake-jpg-content'], { type: 'image/jpeg' }));
      }),
      toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,fake-content'),
    } as unknown as HTMLCanvasElement;

    const result = await compressImageForSync('data:image/jpeg;base64,raw...', {
      maxDimension: 1600,
      quality: 0.8,
      loadImageFn: async () => fakeImg,
      createCanvasFn: () => fakeCanvas,
    });

    expect(result.width).toBe(1600);
    expect(result.height).toBe(1067); // 2400x1600 scaled to max 1600
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.dataUrl).toContain('data:image/jpeg');
  });
});
