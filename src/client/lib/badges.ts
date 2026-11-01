import type { BadgeDefinition, Footprint, Trail, UserBadge } from '../../shared/types';
import { haversineDistanceKm } from './trailParser';

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'b-origin',
    title: '大地起點',
    description: '完成第 1 次足跡打卡，開啟探索地球旅程。',
    icon: '🧭',
    category: 'footprint',
  },
  {
    id: 'b-continents',
    title: '環球飛躍',
    description: '足跡或航線跨越 2 個以上不同大洲。',
    icon: '✈️',
    category: 'special',
  },
  {
    id: 'b-thousand-km',
    title: '千哩長征',
    description: '累積記錄之移動軌跡總里程達到 1,000 公里。',
    icon: '🛤️',
    category: 'distance',
  },
  {
    id: 'b-cloud-walker',
    title: '雲端客',
    description: '造訪或攻頂標高超過 3,000 公尺之高山點位。',
    icon: '⛰️',
    category: 'elevation',
  },
  {
    id: 'b-island-rider',
    title: '環島騎士',
    description: '足跡或軌跡踏足台灣本島四極點（富貴角、三貂角、鵝鑾鼻、國聖燈塔）。',
    icon: '🏝️',
    category: 'special',
  },
];

const CONTINENT_MAP: Record<string, string> = {
  // Asia
  TW: 'AS', JP: 'AS', KR: 'AS', CN: 'AS', HK: 'AS', MO: 'AS', TH: 'AS', VN: 'AS',
  SG: 'AS', MY: 'AS', ID: 'AS', PH: 'AS', IN: 'AS', NP: 'AS', TR: 'AS', AE: 'AS',
  // Europe
  FR: 'EU', GB: 'EU', UK: 'EU', DE: 'EU', IT: 'EU', ES: 'EU', CH: 'EU', NL: 'EU',
  AT: 'EU', BE: 'EU', CZ: 'EU', IS: 'EU', NO: 'EU', SE: 'EU', FI: 'EU', DK: 'EU',
  PT: 'EU', GR: 'EU',
  // North America
  US: 'NA', CA: 'NA', MX: 'NA',
  // South America
  BR: 'SA', AR: 'SA', CL: 'SA', PE: 'SA', CO: 'SA',
  // Oceania
  AU: 'OC', NZ: 'OC', FJ: 'OC',
  // Africa
  ZA: 'AF', EG: 'AF', MA: 'AF', KE: 'AF', TZ: 'AF',
};

// Taiwan 4 Extremes: [lat, lng, name]
const TAIWAN_EXTREMES = [
  { name: '極北富貴角', lat: 25.298, lng: 121.538 },
  { name: '極東三貂角', lat: 25.008, lng: 122.001 },
  { name: '極南鵝鑾鼻', lat: 21.902, lng: 120.852 },
  { name: '極西國聖燈塔', lat: 23.101, lng: 120.035 },
];

/**
 * Evaluate all badges against current footprints and trails
 */
export function evaluateBadges(footprints: Footprint[], trails: Trail[]): UserBadge[] {
  const now = new Date().toISOString();
  const results: UserBadge[] = [];

  // 1. b-origin
  const hasFootprint = footprints.length >= 1;
  results.push({
    badgeId: 'b-origin',
    unlockedAt: hasFootprint ? footprints[0]?.visitedAt || now : '',
    progress: hasFootprint ? 1 : 0,
    unlocked: hasFootprint,
  });

  // 2. b-continents
  const continentSet = new Set<string>();
  for (const fp of footprints) {
    if (fp.countryCode) {
      const code = fp.countryCode.toUpperCase();
      const continent = CONTINENT_MAP[code] || 'OTHER';
      continentSet.add(continent);
    }
  }
  const continentCount = continentSet.size;
  const continentUnlocked = continentCount >= 2;
  results.push({
    badgeId: 'b-continents',
    unlockedAt: continentUnlocked ? now : '',
    progress: Math.min(1, continentCount / 2),
    unlocked: continentUnlocked,
  });

  // 3. b-thousand-km
  let totalKm = 0;
  for (const t of trails) {
    totalKm += t.distanceKm || 0;
  }
  const distUnlocked = totalKm >= 1000;
  results.push({
    badgeId: 'b-thousand-km',
    unlockedAt: distUnlocked ? now : '',
    progress: Math.min(1, Math.round((totalKm / 1000) * 100) / 100),
    unlocked: distUnlocked,
  });

  // 4. b-cloud-walker (>3000m)
  let maxAltitude = 0;
  for (const fp of footprints) {
    const ele = typeof fp.extensions?.elevation === 'number' ? fp.extensions.elevation : 0;
    if (ele > maxAltitude) maxAltitude = ele;
  }
  for (const t of trails) {
    for (const p of t.points) {
      if (typeof p.elevation === 'number' && p.elevation > maxAltitude) {
        maxAltitude = p.elevation;
      }
    }
  }
  const cloudUnlocked = maxAltitude >= 3000;
  results.push({
    badgeId: 'b-cloud-walker',
    unlockedAt: cloudUnlocked ? now : '',
    progress: Math.min(1, Math.round((maxAltitude / 3000) * 100) / 100),
    unlocked: cloudUnlocked,
  });

  // 5. b-island-rider (Taiwan 4 extremes within 25km radius)
  let extremeMatches = 0;
  const allCoordinates: { lat: number; lng: number }[] = [];
  for (const fp of footprints) allCoordinates.push(fp.coordinates);
  for (const t of trails) {
    for (const p of t.points) allCoordinates.push({ lat: p.lat, lng: p.lng });
  }

  for (const ext of TAIWAN_EXTREMES) {
    let visited = false;
    for (const coord of allCoordinates) {
      const d = haversineDistanceKm(ext.lat, ext.lng, coord.lat, coord.lng);
      if (d <= 25) {
        visited = true;
        break;
      }
    }
    if (visited) extremeMatches++;
  }

  const islandUnlocked = extremeMatches === 4;
  results.push({
    badgeId: 'b-island-rider',
    unlockedAt: islandUnlocked ? now : '',
    progress: extremeMatches / 4,
    unlocked: islandUnlocked,
  });

  return results;
}
