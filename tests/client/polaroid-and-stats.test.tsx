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
    landmarkCount: 12,
    visitedCountryCodes: ['JP', 'TW', 'FR'],
    years: ['2024', '2019'],
  };

  it('renders unlocked country, city, and landmark counts and triggers filter changes', () => {
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
    expect(screen.getByTestId('stat-landmarks')).toHaveTextContent('12');

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
});
