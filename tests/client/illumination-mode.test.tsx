// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type { Footprint } from '../../shared/types';

describe('Map Illumination Mode Switcher & Styling', () => {
  let WorldMapView: any;

  beforeAll(async () => {
    if (!window.URL.createObjectURL) {
      window.URL.createObjectURL = () => 'blob:mock';
    }
    const mod = await import('../../src/client/components/WorldMapView');
    WorldMapView = mod.WorldMapView;
  });

  const dummyFootprints: Footprint[] = [
    {
      id: 'fp-1',
      title: '玉山主峰',
      visitedAt: '2026-05-20',
      coordinates: { lat: 23.47, lng: 120.957 },
      countryCode: 'TW',
      cityName: '南投',
      photos: [],
      createdAt: '2026-05-20T08:00:00Z',
      updatedAt: '2026-05-20T08:00:00Z',
    },
  ];

  it('does not render floating illumination mode buttons on the map canvas', () => {
    render(
      <WorldMapView
        footprints={dummyFootprints}
        visitedCountryCodes={['TW']}
        illuminationMode="city"
        onSelectFootprint={() => {}}
      />
    );

    expect(screen.queryByTestId('map-illumination-city-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('map-illumination-country-btn')).not.toBeInTheDocument();
  });

  it('allows switching illumination mode between city and country inside the Settings panel', async () => {
    const { App } = await import('../../src/client/App');
    render(<App />);

    const settingsBtn = screen.getByRole('button', { name: /偏好與資料設定/i });
    expect(settingsBtn).toBeInTheDocument();
    fireEvent.click(settingsBtn);

    const cityOption = screen.getByTestId('illumination-mode-city');
    const countryOption = screen.getByTestId('illumination-mode-country');

    expect(cityOption).toBeInTheDocument();
    expect(countryOption).toBeInTheDocument();

    // Click country mode
    fireEvent.click(countryOption);
    expect(countryOption).toHaveClass('bg-accent');
    expect(cityOption).not.toHaveClass('bg-accent');

    // Click city mode
    fireEvent.click(cityOption);
    expect(cityOption).toHaveClass('bg-accent');
    expect(countryOption).not.toHaveClass('bg-accent');
  });
});
