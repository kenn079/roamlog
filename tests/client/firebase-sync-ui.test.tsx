// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { FirebaseSyncModal } from '../../src/client/components/FirebaseSyncModal';

describe('FirebaseSyncModal', () => {
  it('renders Google 1-click login button when logged out', () => {
    const handleLogin = vi.fn();
    render(
      <FirebaseSyncModal
        onClose={vi.fn()}
        onLogin={handleLogin}
        onLogout={vi.fn()}
        onManualSync={vi.fn()}
        isLoggedIn={false}
        syncStatus="idle"
      />
    );

    expect(screen.getByText(/Google 雲端同步/i)).toBeInTheDocument();
    const loginBtn = screen.getByText(/以 Google 帳號一鍵登入/i);
    expect(loginBtn).toBeInTheDocument();

    fireEvent.click(loginBtn);
    expect(handleLogin).toHaveBeenCalledTimes(1);
  });

  it('renders user info and sync controls when logged in', () => {
    const handleSync = vi.fn();
    const handleLogout = vi.fn();

    render(
      <FirebaseSyncModal
        onClose={vi.fn()}
        onLogin={vi.fn()}
        onLogout={handleLogout}
        onManualSync={handleSync}
        isLoggedIn={true}
        userEmail="ken@example.com"
        userName="Ken Wu"
        lastSyncedAt="23:05"
        syncStatus="synced"
      />
    );

    expect(screen.getByText(/Ken Wu/i)).toBeInTheDocument();
    expect(screen.getByText(/ken@example.com/i)).toBeInTheDocument();
    expect(screen.getByText(/23:05/i)).toBeInTheDocument();

    const syncBtn = screen.getByText(/立即同步/i);
    fireEvent.click(syncBtn);
    expect(handleSync).toHaveBeenCalled();

    const logoutBtn = screen.getByText(/登出/i);
    fireEvent.click(logoutBtn);
    expect(handleLogout).toHaveBeenCalled();
  });
});
