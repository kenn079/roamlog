import type { BadgeDefinition, Footprint, Trail, UserBadge, Wish } from '../../shared/types';
import { haversineDistanceKm } from './trailParser';

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // ── 1. 足跡探索 (Footprint & Exploration) ──
  {
    id: 'b-origin',
    title: '大地起點',
    description: '完成第 1 次足跡打卡，開啟探索地球旅程。',
    icon: 'compass',
    category: 'footprint',
  },
  {
    id: 'b-footprint-10',
    title: '漫步漫遊',
    description: '累積打卡點亮 10 個足跡點位。',
    icon: 'footprints',
    category: 'footprint',
  },
  {
    id: 'b-footprint-50',
    title: '旅圖收藏家',
    description: '足跡手帳中累積珍藏 50 個足跡點位。',
    icon: 'map',
    category: 'footprint',
  },
  {
    id: 'b-cities-5',
    title: '雙城記事',
    description: '足跡遍及 5 個以上不同城鎮與城市。',
    icon: 'building',
    category: 'footprint',
  },
  {
    id: 'b-countries-5',
    title: '多國行者',
    description: '足跡點亮 5 個以上不同國家或地區。',
    icon: 'globe',
    category: 'footprint',
  },
  {
    id: 'b-continents',
    title: '環球飛躍',
    description: '足跡跨越 2 個以上不同大洲。',
    icon: 'plane',
    category: 'footprint',
  },
  {
    id: 'b-world-citizen',
    title: '世界公民',
    description: '足跡橫跨 4 個以上不同大洲。',
    icon: 'globe-2',
    category: 'footprint',
  },

  // ── 2. 軌跡里程 (Distance & Trails) ──
  {
    id: 'b-first-trail',
    title: '破霧先鋒',
    description: '匯入第 1 條移動軌跡或時間軸，為大地開闢迷霧走廊。',
    icon: 'cloud-fog',
    category: 'distance',
  },
  {
    id: 'b-hundred-km',
    title: '百里之行',
    description: '累積記錄之移動軌跡總里程達到 100 公里。',
    icon: 'bike',
    category: 'distance',
  },
  {
    id: 'b-thousand-km',
    title: '千哩長征',
    description: '累積記錄之移動軌跡總里程達到 1,000 公里。',
    icon: 'milestone',
    category: 'distance',
  },
  {
    id: 'b-five-thousand-km',
    title: '萬里壯遊',
    description: '累積記錄之移動軌跡總里程突破 5,000 公里。',
    icon: 'train',
    category: 'distance',
  },
  {
    id: 'b-marathon',
    title: '單日鐵人',
    description: '單次移動軌跡記錄超過全馬里程（42.195 公里）。',
    icon: 'timer',
    category: 'distance',
  },

  // ── 3. 高山自然 (Elevation & Nature) ──
  {
    id: 'b-sea-level',
    title: '浪潮與海風',
    description: '造訪標高小於等於 10 公尺之沿海海濱勝景。',
    icon: 'waves',
    category: 'elevation',
  },
  {
    id: 'b-highland',
    title: '高原之息',
    description: '造訪標高超過 1,500 公尺之中高海拔山脈或高原。',
    icon: 'trees',
    category: 'elevation',
  },
  {
    id: 'b-cloud-walker',
    title: '雲端客',
    description: '造訪或攻頂標高超過 3,000 公尺之高山高峰。',
    icon: 'mountain',
    category: 'elevation',
  },

  // ── 4. 極境地理 (Geography & Extremes) ──
  {
    id: 'b-island-rider',
    title: '環島騎士',
    description: '足跡或軌跡踏足台灣本島四極點（富貴角、三貂角、鵝鑾鼻、國聖燈塔）。',
    icon: 'navigation',
    category: 'geography',
  },
  {
    id: 'b-tropic-cancer',
    title: '北回歸線之約',
    description: '造訪或行經北回歸線標（緯度 23.44°N 附近 25km 範圍內）。',
    icon: 'sun',
    category: 'geography',
  },
  {
    id: 'b-equator-crosser',
    title: '赤道共舞',
    description: '足跡踏足赤道熱帶圈（緯度 ±1.5° 以內之國度）。',
    icon: 'flame',
    category: 'geography',
  },
  {
    id: 'b-polar-circle',
    title: '極地邊界',
    description: '抵達緯度高於 60°N 或低於 60°S 之高緯極地境域。',
    icon: 'snowflake',
    category: 'geography',
  },
  {
    id: 'b-island-hopper',
    title: '跳島浪人',
    description: '探訪 2 個以上外島或離島勝地（如澎湖、金門、綠島、沖繩、濟州島等）。',
    icon: 'anchor',
    category: 'geography',
  },

  // ── 5. 手帳時光 (Journal & Lifestyle) ──
  {
    id: 'b-photo-album',
    title: '光影記憶',
    description: '手帳中累積珍藏 20 張以上旅行明信片與照片。',
    icon: 'camera',
    category: 'journal',
  },
  {
    id: 'b-wish-fulfilled',
    title: '心願實現者',
    description: '完成並點亮至少 1 個心願清單景點。',
    icon: 'sparkles',
    category: 'journal',
  },
  {
    id: 'b-night-owl',
    title: '星夜打卡',
    description: '在深夜或清晨（22:00 ～ 04:00）完成一次浪漫的足跡記錄。',
    icon: 'moon',
    category: 'journal',
  },
  {
    id: 'b-four-seasons',
    title: '四季行旅',
    description: '在春、夏、秋、冬四個不同季節均留有探索足跡。',
    icon: 'flower',
    category: 'journal',
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

const ISLAND_KEYWORDS = [
  '澎湖', '金門', '馬祖', '綠島', '蘭嶼', '小琉球', '龜山島', '琉球', '望安', '七美',
  '吉貝', '東引', '南竿', '北竿', '烈嶼', '沖繩', '濟州', '峇里', '普吉', '蘇梅',
  '宿霧', '關島', '夏威夷', '塞班', '斐濟', '冰島', '大溪地', '馬爾地夫', '聖托里尼',
  'okinawa', 'jeju', 'bali', 'phuket', 'hawaii', 'guam', 'cebu', 'santorini',
];

/**
 * Evaluate all badges against current footprints, trails, and wishes
 */
export function evaluateBadges(
  footprints: Footprint[],
  trails: Trail[],
  wishes: Wish[] = []
): UserBadge[] {
  const now = new Date().toISOString();
  const results: UserBadge[] = [];

  // Pre-calculate common metrics
  const totalKm = trails.reduce((acc, t) => acc + (t.distanceKm || 0), 0);
  const maxSingleTrailKm = trails.reduce((max, t) => Math.max(max, t.distanceKm || 0), 0);

  // Distinct cities and countries
  const citySet = new Set<string>();
  const countrySet = new Set<string>();
  const continentSet = new Set<string>();
  let totalPhotos = 0;
  let nightOwlVisited = false;
  const seasonsSet = new Set<'spring' | 'summer' | 'autumn' | 'winter'>();

  let maxAltitude = 0;
  let hasSeaLevel = false;

  // Geographic checks
  let tropicCancerClose = false;
  let equatorClose = false;
  let polarClose = false;
  const visitedIslands = new Set<string>();

  // Process footprints
  for (const fp of footprints) {
    const rawCity = (fp.cityName || '').trim();
    if (rawCity) {
      citySet.add(rawCity.toLowerCase());
    } else if (fp.title) {
      citySet.add(fp.title.trim().toLowerCase());
    }

    if (fp.countryCode) {
      const code = fp.countryCode.toUpperCase();
      countrySet.add(code);
      const continent = CONTINENT_MAP[code];
      if (continent) continentSet.add(continent);
    }

    totalPhotos += fp.photos?.length || 0;

    // Date & Season analysis
    const dateStr = fp.visitedAt || fp.createdAt;
    if (dateStr) {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const hour = d.getHours();
        if (hour >= 22 || hour < 4) {
          nightOwlVisited = true;
        }

        const month = d.getMonth(); // 0 to 11
        if (month >= 2 && month <= 4) seasonsSet.add('spring');
        else if (month >= 5 && month <= 7) seasonsSet.add('summer');
        else if (month >= 8 && month <= 10) seasonsSet.add('autumn');
        else seasonsSet.add('winter');
      }
    }

    // Altitude
    const ele = typeof fp.extensions?.elevation === 'number' ? fp.extensions.elevation : undefined;
    if (typeof ele === 'number') {
      if (ele > maxAltitude) maxAltitude = ele;
      if (ele >= -50 && ele <= 10) hasSeaLevel = true;
    }

    // Check title/note for sea keywords
    const textDesc = `${fp.title || ''} ${fp.note || ''}`.toLowerCase();
    if (/海|灘|港|灣|coast|beach|ocean|bay|port/.test(textDesc)) {
      hasSeaLevel = true;
    }

    // Islands
    for (const kw of ISLAND_KEYWORDS) {
      if (textDesc.includes(kw)) {
        visitedIslands.add(kw);
      }
    }

    // Coordinates checks
    if (fp.coordinates) {
      const lat = fp.coordinates.lat;
      const lng = fp.coordinates.lng;

      // Tropic of cancer (~23.436°N within 25km -> ~0.225 degrees lat)
      if (Math.abs(lat - 23.436) * 111.32 <= 25) {
        tropicCancerClose = true;
      }

      // Equator (within ±1.5°)
      if (Math.abs(lat) <= 1.5) {
        equatorClose = true;
      }

      // Polar circle
      if (Math.abs(lat) >= 60.0) {
        polarClose = true;
      }

      // Coordinate based offshore islands (Taiwan)
      if (lat >= 23.1 && lat <= 23.8 && lng >= 119.3 && lng <= 119.7) visitedIslands.add('澎湖');
      if (lat >= 24.3 && lat <= 24.6 && lng >= 118.2 && lng <= 118.5) visitedIslands.add('金門');
      if (lat >= 25.9 && lat <= 26.3 && lng >= 119.8 && lng <= 120.6) visitedIslands.add('馬祖');
      if (lat >= 22.6 && lat <= 22.8 && lng >= 121.4 && lng <= 121.6) visitedIslands.add('綠島');
      if (lat >= 21.9 && lat <= 22.2 && lng >= 121.4 && lng <= 121.7) visitedIslands.add('蘭嶼');
      if (lat >= 22.3 && lat <= 22.4 && lng >= 120.3 && lng <= 120.4) visitedIslands.add('小琉球');
      if (lat >= 26.0 && lat <= 27.0 && lng >= 127.5 && lng <= 128.5) visitedIslands.add('沖繩');
      if (lat >= 33.1 && lat <= 33.6 && lng >= 126.1 && lng <= 126.9) visitedIslands.add('濟州');
    }
  }

  // Process trails for altitude & geographic points
  for (const t of trails) {
    for (const p of t.points) {
      if (typeof p.elevation === 'number') {
        if (p.elevation > maxAltitude) maxAltitude = p.elevation;
        if (p.elevation >= -50 && p.elevation <= 10) hasSeaLevel = true;
      }
      if (Math.abs(p.lat - 23.436) * 111.32 <= 25) tropicCancerClose = true;
      if (Math.abs(p.lat) <= 1.5) equatorClose = true;
      if (Math.abs(p.lat) >= 60.0) polarClose = true;
    }
  }

  // Taiwan 4 Extremes check
  const allCoordinates: { lat: number; lng: number }[] = [];
  for (const fp of footprints) {
    if (fp.coordinates && fp.coordinates.lat >= 21.5 && fp.coordinates.lat <= 25.5 && fp.coordinates.lng >= 119.8 && fp.coordinates.lng <= 122.2) {
      allCoordinates.push(fp.coordinates);
    }
  }
  for (const t of trails) {
    for (const p of t.points) {
      if (p.lat >= 21.5 && p.lat <= 25.5 && p.lng >= 119.8 && p.lng <= 122.2) {
        allCoordinates.push({ lat: p.lat, lng: p.lng });
      }
    }
  }

  let extremeMatches = 0;
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

  // Fulfilled wishes
  const fulfilledWishCount = wishes.filter((w) => w.fulfilled).length;

  // ── Construct UserBadge evaluations ──

  // 1. b-origin
  const hasFootprint = footprints.length >= 1;
  results.push({
    badgeId: 'b-origin',
    unlockedAt: hasFootprint ? footprints[0]?.visitedAt || now : '',
    progress: hasFootprint ? 1 : 0,
    unlocked: hasFootprint,
  });

  // 2. b-footprint-10
  const fp10Unlocked = footprints.length >= 10;
  results.push({
    badgeId: 'b-footprint-10',
    unlockedAt: fp10Unlocked ? now : '',
    progress: Math.min(1, footprints.length / 10),
    unlocked: fp10Unlocked,
  });

  // 3. b-footprint-50
  const fp50Unlocked = footprints.length >= 50;
  results.push({
    badgeId: 'b-footprint-50',
    unlockedAt: fp50Unlocked ? now : '',
    progress: Math.min(1, footprints.length / 50),
    unlocked: fp50Unlocked,
  });

  // 4. b-cities-5
  const citiesCount = citySet.size;
  const citiesUnlocked = citiesCount >= 5;
  results.push({
    badgeId: 'b-cities-5',
    unlockedAt: citiesUnlocked ? now : '',
    progress: Math.min(1, citiesCount / 5),
    unlocked: citiesUnlocked,
  });

  // 5. b-countries-5
  const countriesCount = countrySet.size;
  const countriesUnlocked = countriesCount >= 5;
  results.push({
    badgeId: 'b-countries-5',
    unlockedAt: countriesUnlocked ? now : '',
    progress: Math.min(1, countriesCount / 5),
    unlocked: countriesUnlocked,
  });

  // 6. b-continents
  const continentCount = continentSet.size;
  const continentUnlocked = continentCount >= 2;
  results.push({
    badgeId: 'b-continents',
    unlockedAt: continentUnlocked ? now : '',
    progress: Math.min(1, continentCount / 2),
    unlocked: continentUnlocked,
  });

  // 7. b-world-citizen
  const worldCitizenUnlocked = continentCount >= 4;
  results.push({
    badgeId: 'b-world-citizen',
    unlockedAt: worldCitizenUnlocked ? now : '',
    progress: Math.min(1, continentCount / 4),
    unlocked: worldCitizenUnlocked,
  });

  // 8. b-first-trail
  const firstTrailUnlocked = trails.length >= 1;
  results.push({
    badgeId: 'b-first-trail',
    unlockedAt: firstTrailUnlocked ? now : '',
    progress: firstTrailUnlocked ? 1 : 0,
    unlocked: firstTrailUnlocked,
  });

  // 9. b-hundred-km
  const hundredDistUnlocked = totalKm >= 100;
  results.push({
    badgeId: 'b-hundred-km',
    unlockedAt: hundredDistUnlocked ? now : '',
    progress: Math.min(1, Math.round((totalKm / 100) * 100) / 100),
    unlocked: hundredDistUnlocked,
  });

  // 10. b-thousand-km
  const thousandDistUnlocked = totalKm >= 1000;
  results.push({
    badgeId: 'b-thousand-km',
    unlockedAt: thousandDistUnlocked ? now : '',
    progress: Math.min(1, Math.round((totalKm / 1000) * 100) / 100),
    unlocked: thousandDistUnlocked,
  });

  // 11. b-five-thousand-km
  const fiveThousandDistUnlocked = totalKm >= 5000;
  results.push({
    badgeId: 'b-five-thousand-km',
    unlockedAt: fiveThousandDistUnlocked ? now : '',
    progress: Math.min(1, Math.round((totalKm / 5000) * 100) / 100),
    unlocked: fiveThousandDistUnlocked,
  });

  // 12. b-marathon
  const marathonUnlocked = maxSingleTrailKm >= 42.195;
  results.push({
    badgeId: 'b-marathon',
    unlockedAt: marathonUnlocked ? now : '',
    progress: Math.min(1, Math.round((maxSingleTrailKm / 42.195) * 100) / 100),
    unlocked: marathonUnlocked,
  });

  // 13. b-sea-level
  results.push({
    badgeId: 'b-sea-level',
    unlockedAt: hasSeaLevel ? now : '',
    progress: hasSeaLevel ? 1 : 0,
    unlocked: hasSeaLevel,
  });

  // 14. b-highland
  const highlandUnlocked = maxAltitude >= 1500;
  results.push({
    badgeId: 'b-highland',
    unlockedAt: highlandUnlocked ? now : '',
    progress: Math.min(1, Math.round((maxAltitude / 1500) * 100) / 100),
    unlocked: highlandUnlocked,
  });

  // 15. b-cloud-walker
  const cloudUnlocked = maxAltitude >= 3000;
  results.push({
    badgeId: 'b-cloud-walker',
    unlockedAt: cloudUnlocked ? now : '',
    progress: Math.min(1, Math.round((maxAltitude / 3000) * 100) / 100),
    unlocked: cloudUnlocked,
  });

  // 16. b-island-rider
  const islandUnlocked = extremeMatches === 4;
  results.push({
    badgeId: 'b-island-rider',
    unlockedAt: islandUnlocked ? now : '',
    progress: extremeMatches / 4,
    unlocked: islandUnlocked,
  });

  // 17. b-tropic-cancer
  results.push({
    badgeId: 'b-tropic-cancer',
    unlockedAt: tropicCancerClose ? now : '',
    progress: tropicCancerClose ? 1 : 0,
    unlocked: tropicCancerClose,
  });

  // 18. b-equator-crosser
  results.push({
    badgeId: 'b-equator-crosser',
    unlockedAt: equatorClose ? now : '',
    progress: equatorClose ? 1 : 0,
    unlocked: equatorClose,
  });

  // 19. b-polar-circle
  results.push({
    badgeId: 'b-polar-circle',
    unlockedAt: polarClose ? now : '',
    progress: polarClose ? 1 : 0,
    unlocked: polarClose,
  });

  // 20. b-island-hopper
  const islandHopperUnlocked = visitedIslands.size >= 2;
  results.push({
    badgeId: 'b-island-hopper',
    unlockedAt: islandHopperUnlocked ? now : '',
    progress: Math.min(1, visitedIslands.size / 2),
    unlocked: islandHopperUnlocked,
  });

  // 21. b-photo-album
  const photoUnlocked = totalPhotos >= 20;
  results.push({
    badgeId: 'b-photo-album',
    unlockedAt: photoUnlocked ? now : '',
    progress: Math.min(1, totalPhotos / 20),
    unlocked: photoUnlocked,
  });

  // 22. b-wish-fulfilled
  const wishUnlocked = fulfilledWishCount >= 1;
  results.push({
    badgeId: 'b-wish-fulfilled',
    unlockedAt: wishUnlocked ? now : '',
    progress: Math.min(1, fulfilledWishCount / 1),
    unlocked: wishUnlocked,
  });

  // 23. b-night-owl
  results.push({
    badgeId: 'b-night-owl',
    unlockedAt: nightOwlVisited ? now : '',
    progress: nightOwlVisited ? 1 : 0,
    unlocked: nightOwlVisited,
  });

  // 24. b-four-seasons
  const fourSeasonsUnlocked = seasonsSet.size === 4;
  results.push({
    badgeId: 'b-four-seasons',
    unlockedAt: fourSeasonsUnlocked ? now : '',
    progress: seasonsSet.size / 4,
    unlocked: fourSeasonsUnlocked,
  });

  return results;
}
