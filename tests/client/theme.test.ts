// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { applyTheme, resolveInitialTheme, THEME_STORAGE_KEY } from '../../src/client/lib/theme';

function mockSystemDark(isDark: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('dark') ? isDark : false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.head.innerHTML = '<meta name="theme-color" content="#000000" />';
  });

  it('follows the system preference on first visit', () => {
    mockSystemDark(true);
    expect(resolveInitialTheme()).toBe('dark');
    mockSystemDark(false);
    expect(resolveInitialTheme()).toBe('light');
  });

  it('prefers the theme the user picked last time over the system preference', () => {
    mockSystemDark(true);
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    expect(resolveInitialTheme()).toBe('light');
  });

  it('ignores garbage stored values', () => {
    mockSystemDark(false);
    localStorage.setItem(THEME_STORAGE_KEY, 'navy');
    expect(resolveInitialTheme()).toBe('light');
  });

  it('applyTheme sets data-theme, remembers the choice and updates the browser theme-color', () => {
    applyTheme('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#3a2e27');

    applyTheme('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#f6f1e7');
  });
});
