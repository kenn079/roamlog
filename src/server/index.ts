import path from 'node:path';
import { TravelRepository } from './repository';
import { EnrichmentService } from './enrichment';
import { createApp } from './app';

const port = Number(process.env.PORT || 3001);
const dbPath = process.env.DB_PATH || path.resolve(process.cwd(), 'data', 'travel.db');
const uploadsDir = process.env.UPLOADS_DIR || path.resolve(process.cwd(), 'uploads');

const repo = new TravelRepository(dbPath);
const enrichment = new EnrichmentService();
const app = createApp(repo, enrichment, uploadsDir);

app.listen(port, '0.0.0.0', () => {
  console.log(`Travel Footprint Server listening on http://localhost:${port}`);
});
