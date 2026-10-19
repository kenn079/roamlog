import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { TravelRepository } from './repository';
import type { EnrichmentService } from './enrichment';
import type { CreateFootprintInput, PhotoItem } from '../shared/types';

export function createApp(
  repo: TravelRepository,
  enrichment: EnrichmentService,
  uploadsDir: string = path.resolve(process.cwd(), 'uploads')
): express.Express {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use('/uploads', express.static(uploadsDir));

  async function enrichVisitInput<T extends Partial<CreateFootprintInput>>(input: T): Promise<T> {
    const clone = { ...input };
    if (clone.coordinates && clone.visitedAt && !clone.weather) {
      const weather = await enrichment.fetchWeatherForVisit(clone.coordinates, clone.visitedAt);
      if (weather) {
        clone.weather = weather;
      }
    }
    if (clone.coordinates && (!clone.countryCode || !clone.cityName)) {
      const geo = await enrichment.reverseGeocode(clone.coordinates);
      if (geo) {
        if (!clone.countryCode) clone.countryCode = geo.countryCode;
        if (!clone.countryName) clone.countryName = geo.countryName;
        if (!clone.cityName) clone.cityName = geo.cityName;
      }
    }
    return clone;
  }

  app.get('/api/stats', (_req, res) => {
    res.json(repo.getStats());
  });

  app.get('/api/companions', (_req, res) => {
    res.json(repo.listCompanions());
  });

  app.post('/api/companions', (req, res) => {
    const { name, avatarColor } = req.body ?? {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }
    const companion = repo.createCompanion(name, avatarColor);
    res.status(201).json(companion);
  });

  app.get('/api/footprints', (req, res) => {
    const { year, countryCode, companionId, tripId } = req.query;
    const list = repo.listFootprints({
      year: year ? String(year) : undefined,
      countryCode: countryCode ? String(countryCode) : undefined,
      companionId: companionId ? String(companionId) : undefined,
      tripId: tripId ? String(tripId) : undefined,
    });
    res.json(list);
  });

  app.post('/api/footprints', async (req, res) => {
    try {
      const body = req.body ?? {};
      if (!body.title || !body.coordinates || !body.visitedAt) {
        res.status(400).json({ error: 'title, coordinates, and visitedAt are required' });
        return;
      }
      const enriched =
        body.autoEnrich === false ? body : await enrichVisitInput(body as CreateFootprintInput);
      const created = repo.createFootprint(enriched as CreateFootprintInput);
      res.status(201).json(created);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.patch('/api/footprints/:id', (req, res) => {
    const updated = repo.updateFootprint(req.params.id, req.body ?? {});
    if (!updated) {
      res.status(404).json({ error: 'Footprint not found' });
      return;
    }
    res.json(updated);
  });

  app.delete('/api/footprints/:id', (req, res) => {
    const ok = repo.deleteFootprint(req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'Footprint not found' });
      return;
    }
    res.json({ ok: true });
  });

  app.get('/api/trips', (_req, res) => {
    res.json(repo.listTrips());
  });

  app.get('/api/trips/:id', (req, res) => {
    const trip = repo.getTrip(req.params.id);
    if (!trip) {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }
    res.json(trip);
  });

  app.post('/api/trips', (req, res) => {
    const body = req.body ?? {};
    if (!body.title) {
      res.status(400).json({ error: 'Trip title is required' });
      return;
    }
    const created = repo.createTrip(body);
    res.status(201).json(created);
  });

  app.patch('/api/trips/:id', (req, res) => {
    const updated = repo.updateTrip(req.params.id, req.body ?? {});
    if (!updated) {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }
    res.json(updated);
  });

  app.delete('/api/trips/:id', (req, res) => {
    const ok = repo.deleteTrip(req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }
    res.json({ ok: true });
  });

  app.post('/api/trips/:tripId/days', (req, res) => {
    const day = repo.addTripDay(req.params.tripId, req.body ?? {});
    res.status(201).json(day);
  });

  app.post('/api/trip-days/:dayId/items', (req, res) => {
    try {
      const item = repo.addTripItem(req.params.dayId, req.body ?? {});
      res.status(201).json(item);
    } catch (err) {
      res.status(404).json({ error: (err as Error).message });
    }
  });

  app.put('/api/trip-days/:dayId/reorder', (req, res) => {
    const { orderedItemIds } = req.body ?? {};
    if (!Array.isArray(orderedItemIds)) {
      res.status(400).json({ error: 'orderedItemIds array is required' });
      return;
    }
    const items = repo.reorderTripItems(req.params.dayId, orderedItemIds);
    res.json(items);
  });

  app.post('/api/trip-items/:itemId/checkin', async (req, res) => {
    try {
      const enriched = await enrichVisitInput(req.body ?? {});
      const result = repo.checkInTripItem(req.params.itemId, enriched as any);
      res.status(201).json(result);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.post('/api/trip-days/:dayId/live-checkin', async (req, res) => {
    try {
      const enriched = await enrichVisitInput(req.body ?? {});
      const result = repo.addLiveTripCheckIn(req.params.dayId, enriched as any);
      res.status(201).json(result);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.post('/api/enrich', async (req, res) => {
    const { coordinates, visitedAt } = req.body ?? {};
    if (!coordinates || typeof coordinates.lat !== 'number' || typeof coordinates.lng !== 'number') {
      res.status(400).json({ error: 'Valid coordinates are required' });
      return;
    }
    const [weather, geo] = await Promise.all([
      visitedAt ? enrichment.fetchWeatherForVisit(coordinates, visitedAt) : Promise.resolve(null),
      enrichment.reverseGeocode(coordinates),
    ]);
    res.json({ weather, geo });
  });

  app.get('/api/places/search', async (req, res) => {
    const q = String(req.query.q || '');
    const results = await enrichment.searchPlaces(q);
    res.json(results);
  });

  app.post('/api/photos', (req, res) => {
    const { dataUrl, caption, takenAt } = req.body ?? {};
    if (!dataUrl || typeof dataUrl !== 'string') {
      res.status(400).json({ error: 'dataUrl is required' });
      return;
    }

    const match = /^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/.exec(dataUrl);
    const id = randomUUID();
    if (match) {
      const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
      const base64Data = match[2];
      const fileName = `${id}.${ext}`;
      const filePath = path.join(uploadsDir, fileName);
      fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
      const photo: PhotoItem = {
        id,
        url: `/uploads/${fileName}`,
        caption,
        takenAt,
      };
      res.status(201).json(photo);
      return;
    }

    const photo: PhotoItem = {
      id,
      url: dataUrl,
      caption,
      takenAt,
    };
    res.status(201).json(photo);
  });

  app.get('/api/backup/export', (_req, res) => {
    res.json(repo.exportBackup());
  });

  app.post('/api/backup/import', (req, res) => {
    try {
      repo.importBackup(req.body);
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  const distDir = path.resolve(process.cwd(), 'dist');
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
        next();
        return;
      }
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  return app;
}
