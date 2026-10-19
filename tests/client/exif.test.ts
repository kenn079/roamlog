import { describe, it, expect } from 'vitest';
import { extractPhotoMetadata } from '../../src/client/lib/exif';

describe('extractPhotoMetadata', () => {
  it('extracts GPS coordinates and ISO date from EXIF tags', async () => {
    const fakeBlob = new Blob(['fake-image'], { type: 'image/jpeg' });
    const draft = await extractPhotoMetadata(
      fakeBlob,
      'IMG_2023_Kyoto.jpg',
      async () => ({
        latitude: 34.9949,
        longitude: 135.785,
        DateTimeOriginal: new Date('2023-11-20T10:15:00Z'),
      }),
      async () => 'data:image/jpeg;base64,abc'
    );

    expect(draft.coordinates).toEqual({ lat: 34.9949, lng: 135.785 });
    expect(draft.visitedAt).toBe('2023-11-20');
    expect(draft.suggestedTitle).toBe('IMG 2023 Kyoto');
    expect(draft.dataUrl).toBe('data:image/jpeg;base64,abc');
  });

  it('gracefully returns null coordinates and visitedAt when photo has no EXIF tags (Review Focus #5)', async () => {
    const fakeBlob = new Blob(['stripped-image'], { type: 'image/jpeg' });
    const draft = await extractPhotoMetadata(
      fakeBlob,
      'old-scan.jpg',
      async () => null,
      async () => 'data:image/jpeg;base64,xyz'
    );

    expect(draft.coordinates).toBeNull();
    expect(draft.visitedAt).toBeNull();
    expect(draft.suggestedTitle).toBe('old scan');
    expect(draft.dataUrl).toBe('data:image/jpeg;base64,xyz');
  });
});
