import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { AppProvider, useUIContext } from './AppContext';
import React from 'react';

// Mock Supabase
vi.mock('@/lib/supabase', () => {
  return {
    supabase: {
      auth: {
        getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
        getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
        signOut: vi.fn(() => Promise.resolve({ error: null })),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
      functions: {
        invoke: vi.fn(() => Promise.resolve({ data: null, error: null })),
      },
    },
    authViaTelegram: vi.fn(() => Promise.resolve(null)),
    authViaTelegramWidget: vi.fn(() => Promise.resolve(null)),
    fetchExerciseHistory: vi.fn(() => Promise.resolve([])),
  };
});

// Mock Realtime
vi.mock('@/lib/realtime', () => {
  return {
    subscribeFitnessRealtime: vi.fn().mockReturnValue(() => {}),
  };
});

// Helper component to check the context state
function ContextChecker() {
  const ui = useUIContext();
  return (
    <div>
      <span data-testid="loading">{String(ui.loading)}</span>
      <span data-testid="needsLogin">{String(ui.needsLogin)}</span>
      <span data-testid="isTelegram">{String(ui.isTelegram)}</span>
      <span data-testid="loadError">{ui.loadError ?? 'none'}</span>
    </div>
  );
}

describe('AppContext initialization', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Reset window Telegram proxy and variables
    delete (window as any).Telegram;
    delete (window as any).TelegramWebviewProxy;
  });

  afterEach(() => {
    cleanup();
  });

  test('when outside Telegram and no session, prompts for login', async () => {
    render(
      <AppProvider>
        <ContextChecker />
      </AppProvider>
    );

    // AppContext waits up to 500ms before determining it is outside Telegram
    // Let's advance time by 600ms
    await act(async () => {
      await new Promise((r) => setTimeout(r, 600));
    });

    expect(screen.getByTestId('loading').textContent).toBe('false');
    expect(screen.getByTestId('needsLogin').textContent).toBe('true');
    expect(screen.getByTestId('isTelegram').textContent).toBe('false');
  });

  test('when inside Telegram, attempts auto-login', async () => {
    // Mock Telegram WebApp object
    (window as any).Telegram = {
      WebApp: {
        initData: 'query_id=123&user=%7B%22id%22%3A123%2C%22first_name%22%3A%22Test%22%7D&auth_date=12345&hash=abc',
        platform: 'ios',
        ready: vi.fn(),
      },
    };

    render(
      <AppProvider>
        <ContextChecker />
      </AppProvider>
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    // It should detect Telegram environment immediately due to initData
    expect(screen.getByTestId('isTelegram').textContent).toBe('true');
  });
});
