import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapPin } from 'lucide-react';
import { EmptyCamp, tiltFor } from './CampDecor';
import type { Theme } from '../lib/theme';
import type { Coordinates, Footprint } from '../../shared/types';

export interface WorldMapViewProps {
  footprints: Footprint[];
  visitedCountryCodes: string[];
  routeCoordinates?: Coordinates[];
  theme?: Theme;
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
    'w-12 h-12 rounded-sm polaroid p-1 border border-line group-hover:scale-110 transition transform flex flex-col items-center justify-center overflow-hidden';

  const thumb = fp.photos[0]?.url;
  if (thumb) {
    const img = document.createElement('img');
    img.src = thumb;
    img.alt = fp.title;
    img.className = 'w-full h-7 object-cover rounded-xs';
    card.appendChild(img);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className =
      'w-full h-7 bg-accent/15 text-accent flex items-center justify-center text-xs font-bold';
    placeholder.textContent = '⛺';
    card.appendChild(placeholder);
  }

  const label = document.createElement('span');
  label.className = 'text-[8px] font-bold text-paper-ink truncate w-full text-center mt-0.5';
  label.textContent = fp.title;
  card.appendChild(label);

  const pinTip = document.createElement('div');
  pinTip.className = 'w-2 h-2 bg-accent rotate-45 -mt-1 shadow';

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
  theme = 'light',
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
                visibility: theme === 'light' ? 'visible' : 'none',
              },
            },
            {
              id: 'arcgis-dark-base-layer',
              type: 'raster',
              source: 'arcgis-dark-base',
              minzoom: 0,
              maxzoom: 16,
              layout: {
                visibility: theme === 'dark' ? 'visible' : 'none',
              },
            },
            {
              id: 'arcgis-dark-labels-layer',
              type: 'raster',
              source: 'arcgis-dark-labels',
              minzoom: 0,
              maxzoom: 16,
              layout: {
                visibility: theme === 'dark' ? 'visible' : 'none',
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
              'fill-color': '#e07a3f',
              'fill-opacity': 0.3,
            },
            filter: ['in', 'iso_a2', ...initialCodes],
          });

          map.addLayer({
            id: 'visited-countries-outline',
            type: 'line',
            source: 'visited-countries',
            paint: {
              'line-color': '#c8643b',
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
              'line-color': '#7a8b5c',
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

  // Sync base map tiles and warm tint with the app-wide theme
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    try {
      if (map.getLayer('osm-standard-layer')) {
        map.setLayoutProperty(
          'osm-standard-layer',
          'visibility',
          theme === 'light' ? 'visible' : 'none'
        );
      }
      if (map.getLayer('arcgis-dark-base-layer')) {
        map.setLayoutProperty(
          'arcgis-dark-base-layer',
          'visibility',
          theme === 'dark' ? 'visible' : 'none'
        );
      }
      if (map.getLayer('arcgis-dark-labels-layer')) {
        map.setLayoutProperty(
          'arcgis-dark-labels-layer',
          'visibility',
          theme === 'dark' ? 'visible' : 'none'
        );
      }
      if (map.getLayer('visited-countries-fill')) {
        map.setPaintProperty(
          'visited-countries-fill',
          'fill-color',
          theme === 'dark' ? '#e3a93b' : '#e07a3f'
        );
      }
      if (map.getLayer('visited-countries-outline')) {
        map.setPaintProperty(
          'visited-countries-outline',
          'line-color',
          theme === 'dark' ? '#f2a65a' : '#c8643b'
        );
      }
    } catch {
      // Ignore layout property error before style load
    }
  }, [theme, mapReady]);

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
        <div className="relative w-full h-[460px] sm:h-[500px] rounded-3xl overflow-hidden border border-line shadow-soft">
          <div
            ref={containerRef}
            style={{
              width: '100%',
              height: '100%',
              minHeight: '460px',
              filter:
                theme === 'dark'
                  ? 'sepia(0.32) saturate(0.85) brightness(0.95)'
                  : 'sepia(0.12) saturate(0.92)',
            }}
            className="w-full h-full"
          />
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
          className="relative w-full h-[460px] rounded-3xl bg-surface-2 border border-line overflow-hidden cursor-crosshair select-none shadow-soft"
        >
          {/* SVG World Map Fallback (Zero API Key & Zero WebGL Required) */}
          <svg
            viewBox="0 0 1000 500"
            className="w-full h-full object-cover"
            preserveAspectRatio="none"
          >
            <defs>
              <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path
                  d="M 50 0 L 0 0 0 50"
                  fill="none"
                  stroke="var(--line)"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="1000" height="500" fill="var(--surface-2)" />
            <rect width="1000" height="500" fill="url(#grid)" />
            {/* Simplified Continents Silhouette in warm moss/earth tones */}
            <g fill="var(--moss-soft)" stroke="var(--moss)" strokeWidth="1.5" opacity="0.65">
              <path d="M80,70 L260,60 L300,150 L230,240 L180,230 L110,150 Z" />
              <path d="M240,260 L330,280 L310,430 L260,460 L230,350 Z" />
              <path d="M440,70 L570,65 L590,155 L460,165 L435,120 Z" />
              <path d="M445,180 L585,185 L615,310 L545,410 L485,390 L440,260 Z" />
              <path d="M580,65 L880,75 L900,220 L770,275 L640,240 L590,160 Z" />
              <circle cx="838" cy="180" r="8" fill="var(--accent)" opacity="0.75" />
              <path d="M855,135 L878,145 L868,175 L848,165 Z" />
              <path d="M760,320 L880,320 L890,410 L770,415 Z" />
            </g>
            {routeCoordinates && routeCoordinates.length > 1 && (
              <polyline
                fill="none"
                stroke="var(--accent)"
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
                <div className="w-12 h-12 rounded-sm polaroid p-1 border border-line group-hover:scale-110 transition transform flex flex-col items-center justify-center overflow-hidden">
                  {fp.photos[0]?.url ? (
                    <img
                      src={fp.photos[0].url}
                      alt={fp.title}
                      className="w-full h-7 object-cover rounded-xs"
                    />
                  ) : (
                    <div className="w-full h-7 bg-accent/15 text-accent flex items-center justify-center text-xs">
                      ⛺
                    </div>
                  )}
                  <span className="text-[8px] font-bold text-paper-ink truncate w-full text-center mt-0.5">
                    {fp.title}
                  </span>
                </div>
                <div className="w-2 h-2 bg-accent rotate-45 -mt-1 shadow" />
              </button>
            );
          })}

          <div className="absolute bottom-3 left-3 bg-surface/90 backdrop-blur-sm border border-line rounded-full px-3.5 py-1.5 text-xs text-ink-soft">
            點擊地圖任意位置即可新增踩點回憶
          </div>
        </div>
      )}

      {/* Bottom Polaroid Strip for quick browsing on both mobile & desktop */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="font-display text-sm font-semibold text-ink flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-accent" />
            已解鎖地標拍立得
          </h3>
          <span className="text-xs text-ink-faint">點擊卡片或地圖圖釘查看回憶詳情</span>
        </div>

        {footprints.length === 0 ? (
          <div className="panel p-8">
            <EmptyCamp message="尚未記錄符合條件的踩點足跡，點擊右上角「打卡踩點」或「舊照批次補登」點亮你的第一個地標吧！" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {footprints.map((fp) => {
              const deg = tiltFor(fp.id);
              return (
                <button
                  key={fp.id}
                  type="button"
                  onClick={() => onSelectFootprint(fp)}
                  style={{ transform: `rotate(${deg}deg)` }}
                  className="polaroid p-2 pb-3.5 rounded-sm border border-line/70 hover:!rotate-0 hover:-translate-y-1 transition text-left flex flex-col cursor-pointer"
                >
                  <div className="aspect-[4/3] w-full bg-surface-2 rounded-xs overflow-hidden mb-2 relative">
                    {fp.photos[0] ? (
                      <img
                        src={fp.photos[0].url}
                        alt={fp.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-accent text-xl">
                        ⛺
                      </div>
                    )}
                    {fp.weather && (
                      <span className="absolute top-1.5 right-1.5 bg-paper/90 text-paper-ink text-[10px] font-medium px-1.5 py-0.5 rounded-full shadow-xs">
                        {fp.weather.icon} {fp.weather.tempC}°C
                      </span>
                    )}
                  </div>
                  <div className="font-display font-bold text-xs text-paper-ink truncate">
                    {fp.title}
                  </div>
                  <div className="text-[10px] text-paper-ink/65 truncate mt-0.5">
                    {fp.visitedAt.slice(0, 10)} · {fp.cityName || fp.countryCode || '已踩點'}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
