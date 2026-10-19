// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CheckInModal } from '../../src/client/components/CheckInModal';
import { api } from '../../src/client/lib/api';

vi.mock('../../src/client/lib/api', () => ({
  api: {
    searchPlaces: vi.fn().mockResolvedValue([
      {
        title: '巴黎鐵塔',
        displayName: 'Eiffel Tower, Paris, France',
        coordinates: { lat: 48.8584, lng: 2.2945 },
        countryCode: 'FR',
        countryName: 'France',
        cityName: 'Paris',
      },
    ]),
    enrich: vi.fn().mockResolvedValue({
      weather: { conditionCode: 0, conditionText: '晴朗', tempC: 21, icon: '☀️' },
      geo: { countryCode: 'FR', countryName: 'France', cityName: 'Paris', displayName: 'Paris, France' },
    }),
    createFootprint: vi.fn().mockResolvedValue({ id: 'new-fp', title: '巴黎鐵塔' }),
    createCompanion: vi.fn(),
    uploadPhoto: vi.fn(),
  },
}));

describe('CheckInModal', () => {
  it('allows searching a landmark, auto-enriches weather, and saves footprint in seconds', async () => {
    const onCreated = vi.fn();
    render(
      <CheckInModal
        companions={[{ id: 'c1', name: 'Alice' }]}
        trips={[]}
        onCreated={onCreated}
        onCompanionCreated={() => {}}
        onClose={() => {}}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/搜尋地標/i), { target: { value: '巴黎鐵塔' } });
    fireEvent.click(screen.getByRole('button', { name: /搜尋/i }));

    await waitFor(() => {
      expect(screen.getByText(/Eiffel Tower, Paris, France/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Eiffel Tower, Paris, France/));

    await waitFor(() => {
      expect(screen.getByText(/21°C/)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/寫下一兩句當下的心情/i), {
      target: { value: '終於親眼看到鐵塔閃燈！' },
    });

    fireEvent.click(screen.getByRole('button', { name: /儲存踩點/i }));

    await waitFor(() => {
      expect(api.createFootprint).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '巴黎鐵塔',
          countryCode: 'FR',
          note: '終於親眼看到鐵塔閃燈！',
        })
      );
      expect(onCreated).toHaveBeenCalled();
    });
  });
});
