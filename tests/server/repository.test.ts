import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TravelRepository } from '../../src/server/repository';

describe('TravelRepository', () => {
  let repo: TravelRepository;

  beforeEach(() => {
    repo = new TravelRepository(':memory:');
  });

  afterEach(() => {
    repo.close();
  });

  it('creates standalone footprints, supports YYYY-MM partial dates, and computes stats & filters', () => {
    const alice = repo.createCompanion('Alice', '#f59e0b');
    const bob = repo.createCompanion('Bob', '#10b981');

    repo.createFootprint({
      title: 'Kiyomizu-dera',
      coordinates: { lat: 34.9949, lng: 135.785 },
      countryCode: 'JP',
      countryName: 'Japan',
      cityName: 'Kyoto',
      visitedAt: '2019-04', // Partial month-only date (Review Focus #1)
      note: 'Cherry blossoms at dusk',
      rating: 5,
      companionIds: [alice.id],
      extensions: { ticketPrice: 400 },
    });

    repo.createFootprint({
      title: 'Taipei 101',
      coordinates: { lat: 25.0339, lng: 121.5645 },
      countryCode: 'TW',
      countryName: 'Taiwan',
      cityName: 'Taipei',
      visitedAt: '2024-11-15T18:30:00Z',
      companionIds: [bob.id],
    });

    const stats = repo.getStats();
    expect(stats.countryCount).toBe(2);
    expect(stats.cityCount).toBe(2);
    expect(stats.visitedCountryCodes).toEqual(['JP', 'TW']);
    expect(stats.years).toEqual(['2024', '2019']);

    const byYear2019 = repo.listFootprints({ year: '2019' });
    expect(byYear2019).toHaveLength(1);
    expect(byYear2019[0].title).toBe('Kiyomizu-dera');
    expect(byYear2019[0].extensions).toEqual({ ticketPrice: 400 });

    const byAlice = repo.listFootprints({ companionId: alice.id });
    expect(byAlice).toHaveLength(1);
    expect(byAlice[0].companions[0].name).toBe('Alice');
  });

  it('links Trip check-ins to global Footprints, inherits Trip companions, and preserves Footprints when Trip is deleted', () => {
    const partner = repo.createCompanion('Ken', '#3b82f6');
    const trip = repo.createTrip({
      title: '2024 Kansai Autumn',
      startDate: '2024-11-01',
      endDate: '2024-11-05',
      status: 'active',
      companionIds: [partner.id],
      dayCount: 2,
    });

    expect(trip.days).toHaveLength(2);
    const day1 = trip.days[0];

    const plannedStop = repo.addTripItem(day1.id, {
      title: 'Fushimi Inari Taisha',
      coordinates: { lat: 34.9671, lng: 135.7727 },
      plannedTime: '09:00',
    });
    expect(plannedStop.footprintId).toBeNull();

    // Check in planned stop without passing companionIds -> inherits trip's companions (Review Focus #3)
    const { tripItem, footprint } = repo.checkInTripItem(plannedStop.id, {
      coordinates: { lat: 34.9671, lng: 135.7727 },
      countryCode: 'JP',
      countryName: 'Japan',
      cityName: 'Kyoto',
      visitedAt: '2024-11-01T09:30:00Z',
      note: 'Thousands of torii gates!',
      rating: 5,
    });

    expect(tripItem.footprintId).toBe(footprint.id);
    expect(footprint.tripId).toBe(trip.id);
    expect(footprint.tripDayId).toBe(day1.id);
    expect(footprint.companions.map((c) => c.name)).toEqual(['Ken']);

    // Add live unplanned check-in directly to Day 1
    const live = repo.addLiveTripCheckIn(day1.id, {
      title: 'Uji Matcha Cafe',
      coordinates: { lat: 34.8893, lng: 135.8077 },
      countryCode: 'JP',
      countryName: 'Japan',
      cityName: 'Uji',
      visitedAt: '2024-11-01T14:00:00Z',
    });
    expect(live.footprint.companions.map((c) => c.name)).toEqual(['Ken']);

    // Deleting the trip must preserve both footprints in the global library (Review Focus #2)
    repo.deleteTrip(trip.id);
    expect(repo.getTrip(trip.id)).toBeNull();

    const remainingFootprints = repo.listFootprints();
    expect(remainingFootprints).toHaveLength(2);
    expect(remainingFootprints.every((f) => f.tripId === null && f.tripDayId === null)).toBe(true);
  });

  it('exports and imports full backup payload without data loss', () => {
    const c = repo.createCompanion('Solo', '#6366f1');
    repo.createFootprint({
      title: 'Eiffel Tower',
      coordinates: { lat: 48.8584, lng: 2.2945 },
      countryCode: 'FR',
      countryName: 'France',
      cityName: 'Paris',
      visitedAt: '2023-06-10',
      companionIds: [c.id],
    });
    const backup = repo.exportBackup();

    const repo2 = new TravelRepository(':memory:');
    repo2.importBackup(backup);
    expect(repo2.listFootprints()).toHaveLength(1);
    expect(repo2.listFootprints()[0].title).toBe('Eiffel Tower');
    expect(repo2.listFootprints()[0].companions[0].name).toBe('Solo');
    repo2.close();
  });
});
