import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapPin, Layers } from 'lucide-react';
import type { Coordinates, Footprint } from '../../shared/types';

export interface WorldMapViewProps {
  footprints: Footprint[];
  visitedCountryCodes: string[];
  routeCoordinates?: Coordinates[];
  onSelectFootprint: (footprint: Footprint) => void;
  onMapClick?: (coords: Coordinates) => void;
}

const COUNTRIES_GEOJSON_URL =
  'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_0_countries.geojson';

export function createFootprintMarkerElement(
  fp: Footprint,
  onSelectFootprint: (footprint: Footprint) => void
): HTMLButtonElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'group relative flex flex-col items-center focus:outline-none cursor-pointer';
  el.title = fp.title;

  const card = document.createElement('div');
  card.className =
    'w-11 h-11 rounded-sm bg-[#faf6f0] p-1 shadow-lg border border-amber-300 group-hover:scale-110 transition transform flex flex-col items-center justify-center overflow-hidden';

  const thumb = fp.photos[0]?.url;
  if (thumb) {
    const img = document.createElement('img');
    img.src = thumb;
    img.alt = fp.title;
    img.className = 'w-full h-7 object-cover rounded-xs';
    card.appendChild(img);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'w-full h-7 bg-amber-500/20 flex items-center justify-center text-xs';
    placeholder.textContent = '📍';
    card.appendChild(placeholder);
  }

  const label = document.createElement('span');
  label.className = 'text-[8px] font-bold text-stone-800 truncate w-full text-center';
  label.textContent = fp.title;
  card.appendChild(label);

  const pinTip = document.createElement('div');
  pinTip.className = 'w-2 h-2 bg-amber-400 rotate-45 -mt-1 shadow';

  el.appendChild(card);
  el.appendChild(pinTip);

  el.addEventListener('click', (ev) => {
    ev.stopPropagation();
    onSelectFootprint(fp);
  });

  return el;
}

export function WorldMapView({
  footprints,
  visitedCountryCodes,
  routeCoordinates,
  onSelectFootprint,
  onMapClick,
}: WorldMapViewProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;

  const [mapReady, setMapReady] = useState(false);
  const [webglError, setWebglError] = useState(false);
  const [mapTheme, setMapTheme] = useState<'voyager' | 'dark'>('voyager');

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let resizeObserver: ResizeObserver | null = null;

    try {
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: {
          version: 8,
          sources: {
            'osm-standard': {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '&copy; OpenStreetMap contributors',
            },
            'arcgis-dark-base': {
              type: 'raster',
              tiles: [
                'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
              ],
              tileSize: 256,
              attribution: '&copy; Esri, HERE, Garmin, OpenStreetMap contributors',
            },
            'arcgis-dark-labels': {
              type: 'raster',
              tiles: [
                'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
              ],
              tileSize: 256,
            },
          },
          layers: [
            {
              id: 'osm-standard-layer',
              type: 'raster',
              source: 'osm-standard',
              minzoom: 0,
              maxzoom: 19,
              layout: {
                visibility: 'visible',
              },
            },
            {
              id: 'arcgis-dark-base-layer',
              type: 'raster',
              source: 'arcgis-dark-base',
              minzoom: 0,
              maxzoom: 16,
              layout: {
                visibility: 'none',
              },
            },
            {
              id: 'arcgis-dark-labels-layer',
              type: 'raster',
              source: 'arcgis-dark-labels',
              minzoom: 0,
              maxzoom: 16,
              layout: {
                visibility: 'none',
              },
            },
          ],
        },
        center: [121.5, 25.0],
        zoom: 2.3,
      });

      map.addControl(new maplibregl.NavigationControl(), 'bottom-right');

      if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
        resizeObserver = new ResizeObserver(() => {
          map.resize();
        });
        resizeObserver.observe(containerRef.current);
      }

      map.on('load', () => {
        map.resize();

        try {
          map.addSource('visited-countries', {
            type: 'geojson',
            data: COUNTRIES_GEOJSON_URL,
          });

          const initialCodes = visitedCountryCodes.length ? visitedCountryCodes : ['__NONE__'];

          map.addLayer({
            id: 'visited-countries-fill',
            type: 'fill',
            source: 'visited-countries',
            paint: {
              'fill-color': '#f59e0b',
              'fill-opacity': 0.28,
            },
            filter: ['in', 'iso_a2', ...initialCodes],
          });

          map.addLayer({
            id: 'visited-countries-outline',
            type: 'line',
            source: 'visited-countries',
            paint: {
              'line-color': '#d97706',
              'line-width': 1.8,
            },
            filter: ['in', 'iso_a2', ...initialCodes],
          });

          map.addSource('trip-route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: [],
              },
            },
          });

          map.addLayer({
            id: 'trip-route-line',
            type: 'line',
            source: 'trip-route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#0284c7',
              'line-width': 3,
              'line-dasharray': [2, 2],
            },
          });
        } catch {
          // Continue even if external GeoJSON fails
        }

        setMapReady(true);
      });

      map.on('click', (e) => {
        if (onMapClickRef.current) {
          onMapClickRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng });
        }
      });

      map.on('error', () => {
        // Keep functioning even if external tiles are slow
      });

      mapRef.current = map;
    } catch {
      setWebglError(true);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Toggle between OpenStreetMap (clear street map) and Dark theme
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    try {
      if (map.getLayer('osm-standard-layer')) {
        map.setLayoutProperty(
          'osm-standard-layer',
          'visibility',
          mapTheme === 'voyager' ? 'visible' : 'none'
        );
      }
      if (map.getLayer('arcgis-dark-base-layer')) {
        map.setLayoutProperty(
          'arcgis-dark-base-layer',
          'visibility',
          mapTheme === 'dark' ? 'visible' : 'none'
        );
      }
      if (map.getLayer('arcgis-dark-labels-layer')) {
        map.setLayoutProperty(
          'arcgis-dark-labels-layer',
          'visibility',
          mapTheme === 'dark' ? 'visible' : 'none'
        );
      }
    } catch {
      // Ignore layout property error before style load
    }
  }, [mapTheme, mapReady]);

  // Update illuminated country codes filter
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const filterExpr: any = [
      'in',
      'iso_a2',
      ...(visitedCountryCodes.length ? visitedCountryCodes : ['__NONE__']),
    ];
    try {
      if (map.getLayer('visited-countries-fill')) {
        map.setFilter('visited-countries-fill', filterExpr);
      }
      if (map.getLayer('visited-countries-outline')) {
        map.setFilter('visited-countries-outline', filterExpr);
      }
    } catch {
      // Ignore filter errors if layer not yet ready
    }
  }, [visitedCountryCodes, mapReady]);

  // Update trip route line
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const src = map.getSource('trip-route') as maplibregl.GeoJSONSource | undefined;
    if (!src) return;
    const coords = (routeCoordinates ?? []).map((c) => [c.lng, c.lat]);
    src.setData({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: coords,
      },
    });
  }, [routeCoordinates, mapReady]);

  // Update Polaroid markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    footprints.forEach((fp) => {
      const el = createFootprintMarkerElement(fp, onSelectFootprint);
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([fp.coordinates.lng, fp.coordinates.lat])
        .addTo(map);
      markersRef.current.push(marker);
    });
  }, [footprints, onSelectFootprint]);

  // Project lat/lng to percentage for the non-WebGL interactive fallback map
  function projectToPercent(coords: Coordinates): { x: number; y: number } {
    const x = ((coords.lng + 180) / 360) * 100;
    const y = ((90 - coords.lat) / 180) * 100;
    return {
      x: Math.max(2, Math.min(98, x)),
      y: Math.max(4, Math.min(96, y)),
    };
  }

  return (
    <div className="relative w-full flex-1 flex flex-col">
      {!webglError ? (
        <div className="relative w-full h-[480px] sm:h-[520px] rounded-2xl overflow-hidden border border-slate-800 shadow-inner">
          <div
            ref={containerRef}
            style={{ width: '100%', height: '100%', minHeight: '480px' }}
            className="w-full h-full"
          />
          <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMapTheme((prev) => (prev === 'voyager' ? 'dark' : 'voyager'))}
              className="px-3 py-1.5 rounded-xl bg-slate-900/85 hover:bg-slate-900 backdrop-blur-md border border-slate-700 text-xs font-semibold text-slate-100 flex items-center gap-1.5 shadow-lg cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              {mapTheme === 'voyager' ? '切換深色地圖' : '切換明亮地圖'}
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={(e) => {
            if (!onMapClick) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const relX = (e.clientX - rect.left) / rect.width;
            const relY = (e.clientY - rect.top) / rect.height;
            const lng = Number((relX * 360 - 180).toFixed(4));
            const lat = Number((90 - relY * 180).toFixed(4));
            onMapClick({ lat, lng });
          }}
          className="relative w-full h-[480px] rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden cursor-crosshair select-none"
        >
          {/* SVG World Map Fallback (Zero API Key & Zero WebGL Required) */}
          <svg
            viewBox="0 0 1000 500"
            className="w-full h-full object-cover opacity-80"
            preserveAspectRatio="none"
          >
            <defs>
              <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path
                  d="M 50 0 L 0 0 0 50"
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="1000" height="500" fill="#0f172a" />
            <rect width="1000" height="500" fill="url(#grid)" />
            {/* Simplified Continents Silhouette */}
            <g fill="#1e293b" stroke="#334155" strokeWidth="1.5">
              {/* North America */}
              <path d="M80,70 L260,60 L300,150 L230,240 L180,230 L110,150 Z" />
              {/* South America */}
              <path d="M240,260 L330,280 L310,430 L260,460 L230,350 Z" />
              {/* Europe */}
              <path d="M440,70 L570,65 L590,155 L460,165 L435,120 Z" />
              {/* Africa */}
              <path d="M445,180 L585,185 L615,310 L545,410 L485,390 L440,260 Z" />
              {/* Asia */}
              <path d="M580,65 L880,75 L900,220 L770,275 L640,240 L590,160 Z" />
              {/* Taiwan & Japan highlight area */}
              <circle cx="838" cy="180" r="8" fill="#f59e0b" opacity="0.5" />
              <path d="M855,135 L878,145 L868,175 L848,165 Z" />
              {/* Australia */}
              <path d="M760,320 L880,320 L890,410 L770,415 Z" />
            </g>
            {routeCoordinates && routeCoordinates.length > 1 && (
              <polyline
                fill="none"
                stroke="#38bdf8"
                strokeWidth="3"
                strokeDasharray="6,6"
                points={routeCoordinates
                  .map((c) => {
                    const x = ((c.lng + 180) / 360) * 1000;
                    const y = ((90 - c.lat) / 180) * 500;
                    return `${x},${y}`;
                  })
                  .join(' ')}
              />
            )}
          </svg>

          {/* Interactive Polaroid Pins on 2D Fallback Map */}
          {footprints.map((fp) => {
            const pos = projectToPercent(fp.coordinates);
            return (
              <button
                key={fp.id}
                type="button"
                onClick={(ev) => {
                  ev.stopPropagation();
                  onSelectFootprint(fp);
                }}
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-full group flex flex-col items-center cursor-pointer z-10"
              >
                <div className="w-11 h-11 rounded-sm bg-[#faf6f0] p-1 shadow-lg border border-amber-300 group-hover:scale-110 transition transform flex flex-col items-center justify-center overflow-hidden">
                  {fp.photos[0]?.url ? (
                    <img
                      src={fp.photos[0].url}
                      alt={fp.title}
                      className="w-full h-7 object-cover rounded-xs"
                    />
                  ) : (
                    <div className="w-full h-7 bg-amber-500/20 flex items-center justify-center text-xs">
                      📍
                    </div>
                  )}
                  <span className="text-[8px] font-bold text-stone-800 truncate w-full text-center">
                    {fp.title}
                  </span>
                </div>
                <div className="w-2 h-2 bg-amber-400 rotate-45 -mt-1 shadow" />
              </button>
            );
          })}

          <div className="absolute bottom-3 left-3 bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300">
            🌍 互動式世界地圖（免 API Key · 點擊地圖任意位置即可新增打卡）
          </div>
        </div>
      )}

      {/* Bottom Polaroid Strip for quick browsing on both mobile & desktop */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2 px-1">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-amber-400" />
            已解鎖地標拍立得
          </h3>
          <span className="text-xs text-slate-500">點擊卡片或地圖圖釘查看回憶詳情</span>
        </div>

        {footprints.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 text-center text-slate-400 text-sm">
            尚未記錄符合條件的踩點足跡，點擊右上角「打卡踩點」或「舊照批次補登」點亮你的第一個地標吧！
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {footprints.map((fp) => (
              <button
                key={fp.id}
                type="button"
                onClick={() => onSelectFootprint(fp)}
                className="bg-[#faf6f0] text-stone-900 p-2 pb-3 rounded-sm shadow-md hover:shadow-xl hover:-translate-y-0.5 transition text-left flex flex-col cursor-pointer"
              >
                <div className="aspect-[4/3] w-full bg-stone-800 rounded-xs overflow-hidden mb-2 relative">
                  {fp.photos[0] ? (
                    <img
                      src={fp.photos[0].url}
                      alt={fp.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-amber-400 text-xl">
                      📍
                    </div>
                  )}
                  {fp.weather && (
                    <span className="absolute top-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                      {fp.weather.icon} {fp.weather.tempC}°C
                    </span>
                  )}
                </div>
                <div className="font-bold text-xs truncate">{fp.title}</div>
                <div className="text-[10px] text-stone-500 truncate mt-0.5">
                  {fp.visitedAt.slice(0, 10)} · {fp.cityName || fp.countryCode || '已踩點'}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

