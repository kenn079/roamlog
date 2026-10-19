import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateDimensions, compressImage } from '../../src/client/lib/image';

describe('calculateDimensions', () => {
  it('does not scale up when image is smaller than max bounds', () => {
    const { width, height } = calculateDimensions(800, 600, 1280, 1280);
    expect(width).toBe(800);
    expect(height).toBe(600);
  });

  it('scales down proportionally when width exceeds maxWidth', () => {
    const { width, height } = calculateDimensions(2560, 1440, 1280, 1280);
    expect(width).toBe(1280);
    expect(height).toBe(720);
  });

  it('scales down proportionally when height exceeds maxHeight', () => {
    const { width, height } = calculateDimensions(1000, 2000, 1280, 1280);
    expect(width).toBe(640);
    expect(height).toBe(1280);
  });

  it('handles square images properly', () => {
    const { width, height } = calculateDimensions(3000, 3000, 1280, 1280);
    expect(width).toBe(1280);
    expect(height).toBe(1280);
  });
});

describe('compressImage', () => {
  it('compresses a dataUrl using canvas and returns the compressed dataUrl', async () => {
    const mockDataUrl = 'data:image/jpeg;base64,largeImageData';
    const compressedResult = 'data:image/jpeg;base64,smallImageData';

    const drawImageMock = vi.fn();
    const toDataURLMock = vi.fn().mockReturnValue(compressedResult);

    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue({
        drawImage: drawImageMock,
      }),
      toDataURL: toDataURLMock,
    };

    const createCanvasFn = () => mockCanvas as unknown as HTMLCanvasElement;
    const loadImageFn = vi.fn().mockResolvedValue({
      width: 2560,
      height: 1440,
    } as unknown as HTMLImageElement);

    const result = await compressImage(mockDataUrl, {
      maxWidth: 1280,
      maxHeight: 1280,
      quality: 0.8,
      createCanvasFn,
      loadImageFn,
    });

    expect(result).toBe(compressedResult);
    expect(mockCanvas.width).toBe(1280);
    expect(mockCanvas.height).toBe(720);
    expect(drawImageMock).toHaveBeenCalled();
    expect(toDataURLMock).toHaveBeenCalledWith('image/jpeg', 0.8);
  });

  it('falls back to the original dataUrl if image loading fails', async () => {
    const mockDataUrl = 'data:image/jpeg;base64,original';
    const result = await compressImage(mockDataUrl, {
      loadImageFn: vi.fn().mockRejectedValue(new Error('Image decode failure')),
    });

    expect(result).toBe(mockDataUrl);
  });
});
