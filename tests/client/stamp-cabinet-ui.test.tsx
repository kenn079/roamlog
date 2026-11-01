// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { StampCabinetModal } from '../../src/client/components/StampCabinetModal';
import type { Footprint, Trail } from '../../src/shared/types';

describe('StampCabinetModal', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <StampCabinetModal isOpen={false} onClose={() => {}} footprints={[]} trails={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders all 5 badge items in retro stamp style', () => {
    render(<StampCabinetModal isOpen={true} onClose={() => {}} footprints={[]} trails={[]} />);
    expect(screen.getByText(/旅行手帳印章館/i)).toBeInTheDocument();
    expect(screen.getByText(/大地起點/i)).toBeInTheDocument();
    expect(screen.getByText(/環球飛躍/i)).toBeInTheDocument();
    expect(screen.getByText(/千哩長征/i)).toBeInTheDocument();
    expect(screen.getByText(/雲端客/i)).toBeInTheDocument();
    expect(screen.getByText(/環島騎士/i)).toBeInTheDocument();
  });

  it('displays unlocked badge badge when criteria are met', () => {
    const mockFootprints: Partial<Footprint>[] = [
      {
        id: 'fp-1',
        title: 'Start',
        countryCode: 'TW',
        coordinates: { lat: 25.0, lng: 121.5 },
        visitedAt: '2024-03-01T00:00:00Z',
      },
    ];

    render(
      <StampCabinetModal
        isOpen={true}
        onClose={() => {}}
        footprints={mockFootprints as Footprint[]}
        trails={[]}
      />
    );

    const matches = screen.getAllByText(/已解鎖/i);
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });
});
