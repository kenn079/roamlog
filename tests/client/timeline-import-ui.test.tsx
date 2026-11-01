// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { TimelineImportModal } from '../../src/client/components/TimelineImportModal';

describe('TimelineImportModal', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <TimelineImportModal isOpen={false} onClose={() => {}} onImportSuccess={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders dropzone with format hints when open', () => {
    render(<TimelineImportModal isOpen={true} onClose={() => {}} onImportSuccess={() => {}} />);
    expect(screen.getByText(/匯入時間軸與軌跡/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Records\.json/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/點擊選取或拖曳檔案至此/i)).toBeInTheDocument();
  });

  it('parses dropped Google Timeline JSON file and triggers onImportSuccess', async () => {
    const mockOnImportSuccess = vi.fn();
    const mockOnClose = vi.fn();

    render(
      <TimelineImportModal
        isOpen={true}
        onClose={mockOnClose}
        onImportSuccess={mockOnImportSuccess}
      />
    );

    const jsonContent = JSON.stringify({
      locations: [
        { latitudeE7: 250339640, longitudeE7: 1215644680, timestamp: '2024-03-01T08:00:00Z' },
        { latitudeE7: 250350000, longitudeE7: 1215650000, timestamp: '2024-03-01T08:10:00Z' },
      ],
    });

    const file = new File([jsonContent], 'Records.json', { type: 'application/json' });
    const dropzone = screen.getByTestId('timeline-dropzone');

    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [file],
      },
    });

    await waitFor(() => {
      expect(mockOnImportSuccess).toHaveBeenCalled();
    });
  });
});
