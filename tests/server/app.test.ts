import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { TravelRepository } from '../../src/server/repository';
import { EnrichmentService } from '../../src/server/enrichment';
import { createApp } from '../../src/server/app';

describe('Express API routes', () => {
  let repo: TravelRepository;
  let tmpUploads: string;

  beforeEach(() => {
    repo = new TravelRepository(':memory:');
    tmpUploads = fs.mkdtempSync(path.join(os.tmpdir(), 'travel-uploads-'));
  });

  afterEach(() => {
    repo.close();
    fs.rmSync(tmpUploads, { recursive: true, force: true });
  });

  it('auto-enriches weather & reverse geocoding when creating a footprint', async () => {
    const mockEnrich = new EnrichmentService(vi.fn() as unknown as typeof fetch);
    vi.spyOn(mockEnrich, 'fetchWeatherForVisit').mockResolvedValue({
      conditionCode: 0,
      conditionText: '晴朗',
      tempC: 26,
      icon: '☀️',
    });
    vi.spyOn(mockEnrich, 'reverseGeocode').mockResolvedValue({
      countryCode: 'JP',
      countryName: 'Japan',
      cityName: 'Tokyo',
      displayName: 'Tokyo Tower, Minato, Tokyo, Japan',
    });

    const app = createApp(repo, mockEnrich, tmpUploads);

    const res = await request(app)
      .post('/api/footprints')
      .send({
        title: 'Tokyo Tower',
        coordinates: { lat: 35.6586, lng: 139.7454 },
        visitedAt: '2024-05-10',
      });

    expect(res.status).toBe(201);
    expect(res.body.countryCode).toBe('JP');
    expect(res.body.cityName).toBe('Tokyo');
    expect(res.body.weather.tempC).toBe(26);
  });

  it('handles trip creation, planned item check-in, and photo dataUrl saving', async () => {
    const mockEnrich = new EnrichmentService(vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch);
    const app = createApp(repo, mockEnrich, tmpUploads);

    const photoRes = await request(app)
      .post('/api/photos')
      .send({
        dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        caption: 'First glimpse',
      });
    expect(photoRes.status).toBe(201);
    expect(photoRes.body.url).toMatch(/^\/uploads\//);

    const tripRes = await request(app)
      .post('/api/trips')
      .send({ title: 'Island Hopping', dayCount: 1 });
    expect(tripRes.status).toBe(201);
    const dayId = tripRes.body.days[0].id;

    const itemRes = await request(app)
      .post(`/api/trip-days/${dayId}/items`)
      .send({ title: 'Sun Moon Lake', coordinates: { lat: 23.85, lng: 120.91 } });
    expect(itemRes.status).toBe(201);

    const checkinRes = await request(app)
      .post(`/api/trip-items/${itemRes.body.id}/checkin`)
      .send({
        coordinates: { lat: 23.85, lng: 120.91 },
        countryCode: 'TW',
        countryName: 'Taiwan',
        cityName: 'Nantou',
        visitedAt: '2024-12-01',
        photos: [photoRes.body],
      });
    expect(checkinRes.status).toBe(201);
    expect(checkinRes.body.footprint.photos).toHaveLength(1);

    const deleteItemRes = await request(app).delete(`/api/trip-items/${itemRes.body.id}`);
    expect(deleteItemRes.status).toBe(200);

    const footprintsAfterDelete = await request(app).get('/api/footprints');
    expect(footprintsAfterDelete.body).toHaveLength(0);
  });
});
