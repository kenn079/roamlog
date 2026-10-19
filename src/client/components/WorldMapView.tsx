import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapPin, Sparkles } from 'lucide-react';
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
  const [mapReady, setMapReady] = useState(false);
  const [webglError, setWebglError] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    try {
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: {
          version: 8,
          sources: {
            'carto-dark': {
              type: 'raster',
              tiles: [
                'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
                'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              ],
              tileSize: 256,
              attribution: '&copy; OpenStreetMap &copy; CARTO',
            },
          },
          layers: [
            {
              id: 'carto-dark-layer',
              type: 'raster',
              source: 'carto-dark',
              minzoom: 0,
              maxzoom: 20,
            },
          ],
        },
        center: [121.5, 25.0],
        zoom: 2.3,
      });

      map.addControl(new maplibregl.NavigationControl(), 'bottom-right');

      map.on('load', () => {
        map.addSource('visited-countries', {
          type: 'geojson',
          data: COUNTRIES_GEOJSON_URL,
        });

        map.addLayer({
          id: 'visited-countries-fill',
          type: 'fill',
          source: 'visited-countries',
          paint: {
            'fill-color': '#f59e0b',
            'fill-opacity': 0.25,
          },
          filter: ['in', 'iso_a2', ...(visitedCountryCodes.length ? visitedCountryCodes : ['__NONE__'])],
        });

        map.addLayer({
          id: 'visited-countries-outline',
          type: 'line',
          source: 'visited-countries',
          paint: {
            'fill-color': '#fbbf24',
            'line-color': '#fbbf24',
            'line-width': 1.5,
          },
          filter: ['in', 'iso_a2', ...(visitedCountryCodes.length ? visitedCountryCodes : ['__NONE__'])],
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
            'line-color': '#38bdf8',
            'line-width': 3,
            'line-dasharray': [2, 2],
          },
        });

        setMapReady(true);
      });

      map.on('click', (e) => {
        if (onMapClick) {
          onMapClick({ lat: e.lngLat.lat, lng: e.lngLat.lng });
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
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update illuminated country codes filter
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const filterExpr: any = [
      'in',
      'iso_a2',
      ...(visitedCountryCodes.length ? visitedCountryCodes : ['__NONE__']),
    ];
    if (map.getLayer('visited-countries-fill')) {
      map.setFilter('visited-countries-fill', filterExpr);
    }
    if (map.getLayer('visited-countries-outline')) {
      map.setFilter('visited-countries-outline', filterExpr);
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

  return (
    <div className="relative w-full h-full flex flex-col">
      {!webglError ? (
        <div ref={containerRef} className="w-full flex-1 min-h-[420px] rounded-2xl overflow-hidden border border-slate-800 shadow-inner" />
      ) : (
        <div className="w-full flex-1 min-h-[320px] rounded-2xl bg-slate-900 border border-slate-800 p-6 flex flex-col items-center justify-center text-slate-400">
          <Sparkles className="w-8 h-8 text-amber-400 mb-2" />
          <p className="text-sm">已切換為拍立得足跡畫廊檢視模式</p>
        </div>
      )}

      {/* Bottom Polaroid Strip for quick browsing on both mobile & desktop */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2 px-1">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-amber-400" />
            已解鎖地標拍立得 ({footprints.length})
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
