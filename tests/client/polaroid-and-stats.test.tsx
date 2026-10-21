// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { StatsBar } from '../../src/client/components/StatsBar';
import { PolaroidModal } from '../../src/client/components/PolaroidModal';
import type { Footprint, FootprintStats } from '../../src/shared/types';

describe('StatsBar & PolaroidModal', () => {
  const sampleStats: FootprintStats = {
    countryCount: 3,
    cityCount: 5,
    visitedCountryCodes: ['JP', 'TW', 'FR'],
    years: ['2024', '2019'],
  };

  it('renders unlocked country and city counts (without landmark count) and triggers filter changes', () => {
    const onFilterChange = vi.fn();
    render(
      <StatsBar
        stats={sampleStats}
        companions={[{ id: 'c1', name: 'Alice', avatarColor: '#f59e0b' }]}
        filter={{}}
        onFilterChange={onFilterChange}
        onOpenCheckIn={() => {}}
        onOpenRetroImport={() => {}}
      />
    );

    expect(screen.getByTestId('stat-countries')).toHaveTextContent('3');
    expect(screen.getByTestId('stat-cities')).toHaveTextContent('5');
    expect(screen.queryByTestId('stat-landmarks')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('篩選旅伴'), { target: { value: 'c1' } });
    expect(onFilterChange).toHaveBeenCalledWith({ companionId: 'c1' });
  });

  it('renders PolaroidModal with photo, note, automatic weather badge, and companions', () => {
    const fp: Footprint = {
      id: 'fp1',
      title: '清水寺',
      coordinates: { lat: 34.9949, lng: 135.785 },
      countryCode: 'JP',
      countryName: 'Japan',
      cityName: 'Kyoto',
      visitedAt: '2024-11-15',
      photos: [{ id: 'p1', url: '/uploads/kyoto.jpg', caption: 'Autumn leaves' }],
      note: '楓紅超美的一天！',
      rating: 5,
      weather: { conditionCode: 0, conditionText: '晴朗', tempC: 19, icon: '☀️' },
      companions: [{ id: 'c1', name: 'Alice' }],
      tripId: null,
      tripDayId: null,
      extensions: {},
      createdAt: '2024-11-15T10:00:00Z',
    };

    render(<PolaroidModal footprint={fp} onClose={() => {}} onDelete={() => {}} />);

    expect(screen.getByText('清水寺')).toBeInTheDocument();
    expect(screen.getByText('楓紅超美的一天！')).toBeInTheDocument();
    expect(screen.getByText(/☀️/)).toBeInTheDocument();
    expect(screen.getByText(/19°C/)).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('renders a clear trip filter button when filter.tripId is active and clears tripId on click', () => {
    const onFilterChange = vi.fn();
    render(
      <StatsBar
        stats={sampleStats}
        companions={[]}
        filter={{ tripId: 'trip-123', year: '2024' }}
        onFilterChange={onFilterChange}
        onOpenCheckIn={() => {}}
        onOpenRetroImport={() => {}}
      />
    );

    const clearBtn = screen.getByRole('button', { name: /清除旅程篩選/i });
    fireEvent.click(clearBtn);
    expect(onFilterChange).toHaveBeenCalledWith({ year: '2024', tripId: undefined });
  });

  it('createFootprintMarkerElement safely renders titles with HTML special characters via textContent', async () => {
    if (!window.URL.createObjectURL) {
      window.URL.createObjectURL = () => 'blob:mock';
    }
    const { createFootprintMarkerElement } = await import('../../src/client/components/WorldMapView');
    const maliciousFp: Footprint = {
      id: 'fp-xss',
      title: '<img src=x onerror=alert(1)>Café & Bar',
      coordinates: { lat: 35.0, lng: 135.0 },
      countryCode: 'JP',
      countryName: 'Japan',
      cityName: 'Kyoto',
      visitedAt: '2024-11-15',
      photos: [],
      note: '',
      rating: 5,
      weather: null,
      companions: [],
      tripId: null,
      tripDayId: null,
      extensions: {},
      createdAt: '2024-11-15T10:00:00Z',
    };

    const el = createFootprintMarkerElement(maliciousFp, () => {});
    expect(el.querySelectorAll('img')).toHaveLength(0);
    expect(el.textContent).toContain('<img src=x onerror=alert(1)>Café & Bar');
  });

  it('renders App with Settings button opening the illumination & backup panel', async () => {
    const { App } = await import('../../src/client/App');
    render(<App />);

    const settingsBtn = screen.getByRole('button', { name: /偏好與資料設定/i });
    expect(settingsBtn).toBeInTheDocument();

    fireEvent.click(settingsBtn);

    expect(screen.getByText('偏好與資料設定')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /僅限城市/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /整個國家/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /匯出備份/i })).toBeInTheDocument();
    expect(screen.getByText(/還原備份/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /整個國家/i }));
    expect(screen.getByRole('button', { name: /整個國家/i })).toHaveClass('bg-accent');

    // Click outside to close
    fireEvent.click(screen.getByRole('button', { name: /關閉設定/i }));
    expect(screen.queryByText('偏好與資料設定')).not.toBeInTheDocument();
  });

  it('correctly calculates city groups and GeoJSON polygons for city illumination', async () => {
    const { groupFootprintsByCity, createGeoCircle, buildCitiesGeoJson } = await import(
      '../../src/client/components/WorldMapView'
    );

    const testFootprints: Footprint[] = [
      {
        id: 'fp1',
        title: 'Taipei 101',
        coordinates: { lat: 25.0339, lng: 121.5645 },
        countryCode: 'TW',
        countryName: 'Taiwan',
        cityName: 'Taipei',
        visitedAt: '2024-01-01',
        photos: [],
        note: '',
        rating: 5,
        weather: null,
        companions: [],
        tripId: null,
        tripDayId: null,
        extensions: {},
        createdAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'fp2',
        title: 'Shilin Night Market',
        coordinates: { lat: 25.088, lng: 121.524 },
        countryCode: 'TW',
        countryName: 'Taiwan',
        cityName: 'Taipei',
        visitedAt: '2024-01-02',
        photos: [],
        note: '',
        rating: 5,
        weather: null,
        companions: [],
        tripId: null,
        tripDayId: null,
        extensions: {},
        createdAt: '2024-01-02T00:00:00Z',
      },
    ];

    const groups = groupFootprintsByCity(testFootprints);
    expect(groups).toHaveLength(1);
    expect(groups[0].name).toBe('Taipei');
    expect(groups[0].footprintCount).toBe(2);

    const circle = createGeoCircle(groups[0].center, 25);
    expect(circle.length).toBeGreaterThan(10);
    // Closed ring
    expect(circle[0]).toEqual(circle[circle.length - 1]);

    const geoJson = buildCitiesGeoJson(groups);
    expect(geoJson.features).toHaveLength(2); // 1 polygon + 1 center point
    expect(geoJson.features.some((f: any) => f.properties.type === 'polygon')).toBe(true);
    expect(geoJson.features.some((f: any) => f.properties.type === 'point')).toBe(true);
  });
});
