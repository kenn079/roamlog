import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { TravelRepository } from '../../src/server/repository';
import { createApp } from '../../src/server/app';
import { EnrichmentService } from '../../src/server/enrichment';

describe('Wish Repository & API', () => {
  let repo: TravelRepository;
  let app: any;

  beforeEach(() => {
    repo = new TravelRepository(':memory:');
    const enrichment = new EnrichmentService();
    // Stub reverse geocoding to not hit network
    enrichment.reverseGeocode = async (coords) => ({
      countryCode: 'JP',
      countryName: '日本',
      cityName: '京都',
      displayName: '京都, 日本',
    });
    app = createApp(repo, enrichment);
  });

  it('creates, lists and gets wish from repository', () => {
    const wish = repo.createWish({
      title: '嵐山竹林小徑',
      coordinates: { lat: 35.016, lng: 135.671 },
      category: 'nature',
      note: '清晨去拍照最好看',
    });

    expect(wish.id).toBeDefined();
    expect(wish.title).toBe('嵐山竹林小徑');
    expect(wish.category).toBe('nature');
    expect(wish.fulfilledFootprintId).toBeNull();

    const list = repo.listWishes();
    expect(list.length).toBe(1);
    expect(list[0].id).toBe(wish.id);

    const stats = repo.getWishStats();
    expect(stats.totalCount).toBe(1);
    expect(stats.unfulfilledCount).toBe(1);
  });

  it('updates and fulfills wish', () => {
    const wish = repo.createWish({
      title: '金閣寺',
      coordinates: { lat: 35.039, lng: 135.729 },
      category: 'attraction',
    });

    const updated = repo.updateWish(wish.id, {
      note: '門票要記得準備現金',
      category: 'other',
    });
    expect(updated?.note).toBe('門票要記得準備現金');

    const fp = repo.createFootprint({
      title: '金閣寺',
      coordinates: { lat: 35.039, lng: 135.729 },
      visitedAt: '2026-10-21',
    });

    const fulfilled = repo.fulfillWish(wish.id, fp.id);
    expect(fulfilled?.fulfilledFootprintId).toBe(fp.id);

    // Default list should exclude fulfilled wishes
    const unfulfilledList = repo.listWishes(false);
    expect(unfulfilledList.length).toBe(0);

    // includeFulfilled=true should include it
    const allList = repo.listWishes(true);
    expect(allList.length).toBe(1);

    const stats = repo.getWishStats();
    expect(stats.totalCount).toBe(1);
    expect(stats.unfulfilledCount).toBe(0);
  });

  it('deletes wish', () => {
    const wish = repo.createWish({
      title: '要刪除的店',
      coordinates: { lat: 25.0, lng: 121.5 },
    });
    expect(repo.listWishes().length).toBe(1);

    const deleted = repo.deleteWish(wish.id);
    expect(deleted).toBe(true);
    expect(repo.listWishes().length).toBe(0);
  });

  it('handles HTTP endpoints for wishes', async () => {
    // 1. POST /api/wishes
    const resCreate = await request(app)
      .post('/api/wishes')
      .send({
        title: '伏見稻荷千本鳥居',
        coordinates: { lat: 34.967, lng: 135.772 },
        category: 'attraction',
        note: '要爬上山頂看夕陽',
      });
    expect(resCreate.status).toBe(201);
    expect(resCreate.body.title).toBe('伏見稻荷千本鳥居');
    expect(resCreate.body.countryCode).toBe('JP'); // enriched
    const wishId = resCreate.body.id;

    // 2. GET /api/wishes
    const resList = await request(app).get('/api/wishes');
    expect(resList.status).toBe(200);
    expect(resList.body.length).toBe(1);

    // 3. GET /api/wishes/stats
    const resStats = await request(app).get('/api/wishes/stats');
    expect(resStats.status).toBe(200);
    expect(resStats.body.unfulfilledCount).toBe(1);

    // 4. Create a footprint and fulfill wish
    const fp = repo.createFootprint({
      title: '伏見稻荷千本鳥居',
      coordinates: { lat: 34.967, lng: 135.772 },
      visitedAt: '2026-10-21',
    });

    const resFulfill = await request(app)
      .post(`/api/wishes/${wishId}/fulfill`)
      .send({ footprintId: fp.id });
    expect(resFulfill.status).toBe(200);
    expect(resFulfill.body.fulfilledFootprintId).toBe(fp.id);

    // 5. DELETE /api/wishes/:id
    const resDelete = await request(app).delete(`/api/wishes/${wishId}`);
    expect(resDelete.status).toBe(200);
  });
});
