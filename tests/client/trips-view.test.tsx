// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { TripsView } from '../../src/client/components/TripsView';
import { api } from '../../src/client/lib/api';
import type { Trip } from '../../src/shared/types';

vi.mock('../../src/client/lib/api', () => ({
  api: {
    createTrip: vi.fn(),
    addTripDay: vi.fn(),
    addTripItem: vi.fn(),
    searchPlaces: vi.fn().mockResolvedValue([
      {
        title: '金閣寺',
        displayName: 'Kinkaku-ji, Kyoto, Japan',
        coordinates: { lat: 35.0394, lng: 135.7292 },
        countryCode: 'JP',
        countryName: 'Japan',
        cityName: 'Kyoto',
      },
    ]),
    checkInTripItem: vi.fn().mockResolvedValue({
      tripItem: { id: 'item1', footprintId: 'fp1' },
      footprint: { id: 'fp1', title: '伏見稻荷大社' },
    }),
    addLiveTripCheckIn: vi.fn(),
    deleteTrip: vi.fn(),
    deleteTripItem: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('TripsView', () => {
  const sampleTrip: Trip = {
    id: 'trip1',
    title: '2024 京都賞楓 5 日行',
    coverPhoto: null,
    startDate: '2024-11-01',
    endDate: '2024-11-05',
    status: 'active',
    companions: [{ id: 'c1', name: 'Ken' }],
    summaryNote: '追楓之旅',
    extensions: {},
    createdAt: '2024-11-01T00:00:00Z',
    days: [
      {
        id: 'day1',
        tripId: 'trip1',
        dayNumber: 1,
        date: '2024-11-01',
        title: '東山與伏見散步',
        items: [
          {
            id: 'item1',
            tripId: 'trip1',
            tripDayId: 'day1',
            title: '伏見稻荷大社',
            coordinates: { lat: 34.9671, lng: 135.7727 },
            sortOrder: 1,
            plannedTime: '09:30',
            note: '早起避開人潮',
            footprintId: null,
            footprint: null,
            extensions: {},
          },
        ],
      },
    ],
  };

  it('displays trip itinerary by day and converts a planned stop into a visited footprint on check-in', async () => {
    const onRefresh = vi.fn();
    render(
      <TripsView
        trips={[sampleTrip]}
        companions={[{ id: 'c1', name: 'Ken' }]}
        onRefresh={onRefresh}
        onSelectFootprint={() => {}}
      />
    );

    expect(screen.getByText('2024 京都賞楓 5 日行')).toBeInTheDocument();
    fireEvent.click(screen.getByText('2024 京都賞楓 5 日行'));

    expect(screen.getByText(/Day 1/)).toBeInTheDocument();
    expect(screen.getByText('伏見稻荷大社')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /打卡踩點/i }));

    await waitFor(() => {
      expect(api.checkInTripItem).toHaveBeenCalledWith(
        'item1',
        expect.objectContaining({
          coordinates: { lat: 34.9671, lng: 135.7727 },
        })
      );
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  it('geocodes planned stop title via api.searchPlaces when item.coordinates is null before checking in', async () => {
    const tripWithoutCoords: Trip = {
      ...sampleTrip,
      id: 'trip2',
      title: '京都北區散步',
      days: [
        {
          id: 'day2',
          tripId: 'trip2',
          dayNumber: 1,
          date: '2024-11-02',
          title: '北山巡禮',
          items: [
            {
              id: 'item-no-coords',
              tripId: 'trip2',
              tripDayId: 'day2',
              title: '金閣寺',
              coordinates: null,
              sortOrder: 1,
              footprintId: null,
              footprint: null,
              extensions: {},
            },
          ],
        },
      ],
    };

    render(
      <TripsView
        trips={[tripWithoutCoords]}
        companions={[]}
        onRefresh={() => {}}
        onSelectFootprint={() => {}}
      />
    );

    fireEvent.click(screen.getByText('京都北區散步'));
    fireEvent.click(screen.getByRole('button', { name: /打卡踩點/i }));

    await waitFor(() => {
      expect(api.searchPlaces).toHaveBeenCalledWith('金閣寺');
      expect(api.checkInTripItem).toHaveBeenCalledWith(
        'item-no-coords',
        expect.objectContaining({
          coordinates: { lat: 35.0394, lng: 135.7292 },
          countryCode: 'JP',
          cityName: 'Kyoto',
        })
      );
    });
  });

  it('allows deleting a stop/check-in item from a trip day', async () => {
    const onRefresh = vi.fn();
    render(
      <TripsView
        trips={[sampleTrip]}
        companions={[]}
        onRefresh={onRefresh}
        onSelectFootprint={() => {}}
      />
    );

    fireEvent.click(screen.getByText('2024 京都賞楓 5 日行'));
    const deleteBtn = screen.getByRole('button', { name: /刪除 伏見稻荷大社/i });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(api.deleteTripItem).toHaveBeenCalledWith('item1');
      expect(onRefresh).toHaveBeenCalled();
    });
  });
});
