// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { GoogleSyncModal } from '../../src/client/components/GoogleSyncModal';

describe('GoogleSyncModal', () => {
  it('renders Google Cloud sync setup modal with instructions and input', () => {
    render(
      <GoogleSyncModal
        onClose={vi.fn()}
        onSaveClientId={vi.fn()}
        onLogin={vi.fn()}
        clientId=""
        isLoggedIn={false}
        onManualSync={vi.fn()}
        onDisconnect={vi.fn()}
        syncStatus="idle"
      />
    );

    expect(screen.getByText(/Google 雲端同步/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Client ID/i)).toBeInTheDocument();
    expect(screen.getByText(/儲存設定/i)).toBeInTheDocument();
  });

  it('renders logged in state with user email and manual sync button', () => {
    const handleSync = vi.fn();
    const handleDisconnect = vi.fn();

    render(
      <GoogleSyncModal
        onClose={vi.fn()}
        onSaveClientId={vi.fn()}
        onLogin={vi.fn()}
        clientId="my-client-id"
        isLoggedIn={true}
        userEmail="traveler@example.com"
        lastSyncedAt="2026-10-21 18:30"
        onManualSync={handleSync}
        onDisconnect={handleDisconnect}
        syncStatus="synced"
      />
    );

    expect(screen.getByText(/traveler@example.com/i)).toBeInTheDocument();
    expect(screen.getByText(/立即同步/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/立即同步/i));
    expect(handleSync).toHaveBeenCalled();

    fireEvent.click(screen.getByText(/中斷連結/i));
    expect(handleDisconnect).toHaveBeenCalled();
  });
});
