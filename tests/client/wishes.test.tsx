// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { WishModal } from '../../src/client/components/WishModal';
import { WishCardModal } from '../../src/client/components/WishCardModal';
import { api } from '../../src/client/lib/api';
import type { Wish } from '../../src/shared/types';

vi.mock('../../src/client/lib/api', () => ({
  api: {
    searchPlaces: vi.fn().mockResolvedValue([
      {
        title: '伏見稻荷大社',
        displayName: 'Fushimi Inari, Kyoto, Japan',
        coordinates: { lat: 34.967, lng: 135.772 },
        countryCode: 'JP',
        countryName: 'Japan',
        cityName: 'Kyoto',
      },
    ]),
    enrich: vi.fn().mockResolvedValue({
      weather: null,
      geo: { countryCode: 'JP', countryName: '日本', cityName: '京都', displayName: '京都, 日本' },
    }),
    createWish: vi.fn().mockResolvedValue({
      id: 'w-1',
      title: '伏見稻荷大社',
      coordinates: { lat: 34.967, lng: 135.772 },
      category: 'attraction',
      note: '',
      fulfilledFootprintId: null,
    }),
  },
}));

describe('WishModal & WishCardModal', () => {
  it('allows searching places and creating a new wish with category selection', async () => {
    const onCreated = vi.fn();
    const onClose = vi.fn();

    render(<WishModal onCreated={onCreated} onClose={onClose} />);

    // Search
    fireEvent.change(screen.getByPlaceholderText(/搜尋想去的景點/i), {
      target: { value: '伏見稻荷' },
    });
    fireEvent.click(screen.getByRole('button', { name: /搜尋/i }));

    await waitFor(() => {
      expect(screen.getByText('Fushimi Inari, Kyoto, Japan')).toBeInTheDocument();
    });

    // Select place
    fireEvent.click(screen.getByText('Fushimi Inari, Kyoto, Japan'));
    expect(screen.getByDisplayValue('伏見稻荷大社')).toBeInTheDocument();

    // Select category: 🍜 美食
    fireEvent.click(screen.getByText(/🍜 美食/i));

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /加入心願清單/i }));

    await waitFor(() => {
      expect(api.createWish).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '伏見稻荷大社',
          category: 'food',
        })
      );
      expect(onCreated).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('renders WishCardModal with wish details and triggers fulfill & delete callbacks', () => {
    const dummyWish: Wish = {
      id: 'wish-abc',
      title: '嵐山小火車',
      coordinates: { lat: 35.016, lng: 135.671 },
      countryCode: 'JP',
      countryName: '日本',
      cityName: '京都',
      category: 'nature',
      note: '要提早預約偶數號座位',
      fulfilledFootprintId: null,
      extensions: {},
      createdAt: '2026-10-21T00:00:00Z',
    };

    const onClose = vi.fn();
    const onDelete = vi.fn();
    const onFulfill = vi.fn();

    // Mock confirm
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <WishCardModal
        wish={dummyWish}
        onClose={onClose}
        onDelete={onDelete}
        onFulfill={onFulfill}
      />
    );

    expect(screen.getByText('嵐山小火車')).toBeInTheDocument();
    expect(screen.getByText(/要提早預約偶數號座位/)).toBeInTheDocument();
    expect(screen.getByText(/🌿 自然/)).toBeInTheDocument();

    // Click fulfill
    fireEvent.click(screen.getByRole('button', { name: /實地踩點解鎖/i }));
    expect(onFulfill).toHaveBeenCalledWith(dummyWish);

    // Click delete
    fireEvent.click(screen.getByTitle(/刪除心願/i));
    expect(onDelete).toHaveBeenCalledWith('wish-abc');
  });
});
