// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { App } from '../../src/client/App';

// Mock maplibre-gl map constructor
vi.mock('maplibre-gl', () => {
  return {
    default: {
      Map: vi.fn(() => ({
        on: vi.fn((event, cb) => {
          if (event === 'load') setTimeout(cb, 10);
        }),
        remove: vi.fn(),
        addSource: vi.fn(),
        getSource: vi.fn(() => ({ setData: vi.fn() })),
        addLayer: vi.fn(),
        getLayer: vi.fn(),
        setLayoutProperty: vi.fn(),
        setPaintProperty: vi.fn(),
        setFilter: vi.fn(),
        fitBounds: vi.fn(),
        flyTo: vi.fn(),
      })),
      NavigationControl: vi.fn(),
      Marker: vi.fn(() => ({
        setLngLat: vi.fn().mockReturnThis(),
        setPopup: vi.fn().mockReturnThis(),
        addTo: vi.fn().mockReturnThis(),
        remove: vi.fn(),
      })),
      Popup: vi.fn(() => ({
        setHTML: vi.fn().mockReturnThis(),
      })),
      LngLatBounds: vi.fn(() => ({
        extend: vi.fn().mockReturnThis(),
        isEmpty: vi.fn().mockReturnValue(false),
      })),
    },
  };
});

describe('Fog & Timeline App Integration', () => {
  it('renders Stamp Cabinet button and opens modal when clicked', async () => {
    render(<App />);

    const stampBtn = screen.getByTestId('stamp-cabinet-btn');
    expect(stampBtn).toBeInTheDocument();

    fireEvent.click(stampBtn);

    await waitFor(() => {
      expect(screen.getByText(/旅行手帳印章館/i)).toBeInTheDocument();
    });
  });

  it('renders Timeline import button and opens modal when clicked', async () => {
    render(<App />);

    const importBtn = screen.getByTestId('timeline-import-btn');
    expect(importBtn).toBeInTheDocument();

    fireEvent.click(importBtn);

    await waitFor(() => {
      expect(screen.getByText(/匯入時間軸與軌跡檔案/i)).toBeInTheDocument();
    });
  });

  it('renders Fog of war toggle button in header and toggles state', () => {
    render(<App />);

    const fogToggleBtn = screen.getByTestId('fog-toggle-btn');
    expect(fogToggleBtn).toBeInTheDocument();

    expect(fogToggleBtn).toHaveAttribute('data-active', 'true');
    fireEvent.click(fogToggleBtn);
    expect(fogToggleBtn).toHaveAttribute('data-active', 'false');
  });
});
