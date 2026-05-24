import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { OfflineIndicator } from './OfflineIndicator';
import React from 'react';

describe('OfflineIndicator Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  test('renders nothing when navigator.onLine is true', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    const { container } = render(<OfflineIndicator />);
    expect(container.firstChild).toBeNull();
  });

  test('renders offline message when navigator.onLine is false', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    render(<OfflineIndicator />);
    expect(screen.getByText(/Нет соединения/)).toBeTruthy();
  });

  test('toggles visibility on window online/offline events', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    const { container } = render(<OfflineIndicator />);
    expect(container.firstChild).toBeNull();

    // Fire offline event
    fireEvent(window, new Event('offline'));
    expect(screen.getByText(/Нет соединения/)).toBeTruthy();

    // Fire online event
    fireEvent(window, new Event('online'));
    expect(screen.queryByText(/Нет соединения/)).toBeNull();
  });
});
