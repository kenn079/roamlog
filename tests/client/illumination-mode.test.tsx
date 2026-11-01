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

  it('renders the floating illumination mode switcher on the map with city and country options', () => {
    const onModeChange = vi.fn();
    render(
      <WorldMapView
        footprints={dummyFootprints}
        visitedCountryCodes={['TW']}
        illuminationMode="city"
        onIlluminationModeChange={onModeChange}
        onSelectFootprint={() => {}}
      />
    );

    const cityBtn = screen.getByTestId('map-illumination-city-btn');
    const countryBtn = screen.getByTestId('map-illumination-country-btn');

    expect(cityBtn).toBeInTheDocument();
    expect(countryBtn).toBeInTheDocument();

    // In city mode, city button is active
    expect(cityBtn).toHaveClass('bg-accent');
    expect(countryBtn).not.toHaveClass('bg-accent');

    // Click country mode
    fireEvent.click(countryBtn);
    expect(onModeChange).toHaveBeenCalledWith('country');
  });

  it('renders country button active when illuminationMode is country', () => {
    const onModeChange = vi.fn();
    render(
      <WorldMapView
        footprints={dummyFootprints}
        visitedCountryCodes={['TW']}
        illuminationMode="country"
        onIlluminationModeChange={onModeChange}
        onSelectFootprint={() => {}}
      />
    );

    const cityBtn = screen.getByTestId('map-illumination-city-btn');
    const countryBtn = screen.getByTestId('map-illumination-country-btn');

    expect(cityBtn).not.toHaveClass('bg-accent');
    expect(countryBtn).toHaveClass('bg-accent');

    // Click city mode
    fireEvent.click(cityBtn);
    expect(onModeChange).toHaveBeenCalledWith('city');
  });
});
