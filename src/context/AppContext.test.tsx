import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { AppProvider, useAppContext } from './AppContext';
import React from 'react';

// Global variable to control Supabase mock response values dynamically
let nextSupaResult: { data: any; error: any } = { data: null, error: null };

const mockBuilder: any = {
  select: vi.fn(() => mockBuilder),
  is: vi.fn(() => mockBuilder),
  order: vi.fn(() => mockBuilder),
  gte: vi.fn(() => mockBuilder),
  lte: vi.fn(() => mockBuilder),
  eq: vi.fn(() => mockBuilder),
  not: vi.fn(() => mockBuilder),
  maybeSingle: vi.fn(() => Promise.resolve(nextSupaResult)),
  insert: vi.fn(() => mockBuilder),
  update: vi.fn(() => mockBuilder),
  upsert: vi.fn(() => mockBuilder),
  delete: vi.fn(() => mockBuilder),
  then: vi.fn((onfulfilled) => {
    if (onfulfilled) {
      return Promise.resolve(onfulfilled(nextSupaResult));
    }
  }),
};

// Mock Supabase
vi.mock('@/lib/supabase', () => {
  return {
    supabase: {
      auth: {
        getSession: vi.fn(() => Promise.resolve({ data: { session: { user: { user_metadata: { telegram_id: 123 } } } }, error: null })),
        getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'user-123', user_metadata: { telegram_id: 123 } } }, error: null })),
        signOut: vi.fn(() => Promise.resolve({ error: null })),
      },
      from: vi.fn(() => mockBuilder),
      functions: {
        invoke: vi.fn(() => Promise.resolve({ data: null, error: null })),
      },
    },
    authViaTelegram: vi.fn(() => Promise.resolve({ first_name: 'Test', username: 'test_user', photo_url: '' })),
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
  const ui = useAppContext();
  return (
    <div>
      <span data-testid="loading">{String(ui.loading)}</span>
      <span data-testid="needsLogin">{String(ui.needsLogin)}</span>
      <span data-testid="isTelegram">{String(ui.isTelegram)}</span>
      <span data-testid="loadError">{ui.loadError ?? 'none'}</span>
    </div>
  );
}

// Full Test harness component for functional tests
function TestComponent() {
  const {
    workoutAccumulatedMs,
    workoutStartTime,
    isWorkoutPaused,
    startWorkoutTimer,
    pauseWorkoutTimer,
    resetWorkoutTimer,
    restTimerEnd,
    restTimerDuration,
    restContext,
    isRestPaused,
    startRestTimer,
    pauseRestTimer,
    resumeRestTimer,
    clearRestTimer,
    adjustRestTimer,
    plannedWorkouts,
    addExerciseToPlan,
    toggleSetCompletion,
    completedSets,
    syncError,
  } = useAppContext();

  const restRemaining = restTimerEnd ? Math.max(0, Math.round((restTimerEnd - Date.now()) / 1000)) : 0;
  
  return (
    <div>
      <div data-testid="accumulated-ms">{workoutAccumulatedMs}</div>
      <div data-testid="is-paused">{String(isWorkoutPaused)}</div>
      <div data-testid="timer-active">{String(!!workoutStartTime)}</div>
      <div data-testid="rest-duration">{restTimerDuration}</div>
      <div data-testid="rest-remaining">{restRemaining}</div>
      <div data-testid="rest-active">{String(!!restTimerEnd)}</div>
      <div data-testid="rest-paused">{String(isRestPaused)}</div>
      <div data-testid="sync-error">{syncError ?? 'none'}</div>
      
      <button data-testid="start-timer-btn" onClick={startWorkoutTimer}>Start</button>
      <button data-testid="pause-timer-btn" onClick={pauseWorkoutTimer}>Pause</button>
      <button data-testid="reset-timer-btn" onClick={resetWorkoutTimer}>Reset</button>
      
      <button data-testid="start-rest-btn" onClick={() => startRestTimer(90, { type: 'set', workoutId: 'w-1', setIndex: 1 })}>Start Rest</button>
      <button data-testid="pause-rest-btn" onClick={pauseRestTimer}>Pause Rest</button>
      <button data-testid="resume-rest-btn" onClick={resumeRestTimer}>Resume Rest</button>
      <button data-testid="adjust-rest-plus-btn" onClick={() => adjustRestTimer(15)}>Adjust +15</button>
      <button data-testid="adjust-rest-minus-btn" onClick={() => adjustRestTimer(-15)}>Adjust -15</button>
      
      <button data-testid="add-plan-btn" onClick={() => addExerciseToPlan('2026-05-25', { id: 'ex-1', name: 'Exercise 1', defaultWeightKg: 10 } as any, 3, 10, 90)}>Add Exercise</button>
      <button data-testid="toggle-set-btn" onClick={() => toggleSetCompletion('2026-05-25', 'w-1', 0, true)}>Toggle Set</button>
      
      <div data-testid="plan-count">{plannedWorkouts['2026-05-25']?.length ?? 0}</div>
      <div data-testid="completed-sets-count">{Object.keys(completedSets).length}</div>
    </div>
  );
}

describe('AppContext initialization', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    nextSupaResult = { data: null, error: null };
    delete (window as any).Telegram;
    delete (window as any).TelegramWebviewProxy;
  });

  afterEach(() => {
    cleanup();
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

    expect(screen.getByTestId('isTelegram').textContent).toBe('true');
  });
});

describe('AppContext Timer and Rest Timer logic', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    nextSupaResult = { data: null, error: null };
    
    // Fake Telegram
    (window as any).Telegram = {
      WebApp: {
        initData: 'query_id=123&user=%7B%22id%22%3A123%7D&auth_date=12345&hash=abc',
        platform: 'ios',
        ready: vi.fn(),
      },
    };
  });

  afterEach(() => {
    cleanup();
  });

  test('Workout timer start, pause, and reset', async () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    // Wait for load
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    const startBtn = screen.getByTestId('start-timer-btn');
    const pauseBtn = screen.getByTestId('pause-timer-btn');
    const resetBtn = screen.getByTestId('reset-timer-btn');

    expect(screen.getByTestId('timer-active').textContent).toBe('false');
    expect(screen.getByTestId('is-paused').textContent).toBe('false');

    // Start timer
    await act(async () => {
      startBtn.click();
    });
    expect(screen.getByTestId('timer-active').textContent).toBe('true');
    expect(screen.getByTestId('is-paused').textContent).toBe('false');

    // Pause timer
    await act(async () => {
      pauseBtn.click();
    });
    expect(screen.getByTestId('timer-active').textContent).toBe('false');
    expect(screen.getByTestId('is-paused').textContent).toBe('true');

    // Reset timer
    await act(async () => {
      resetBtn.click();
    });
    expect(screen.getByTestId('timer-active').textContent).toBe('false');
    expect(screen.getByTestId('is-paused').textContent).toBe('false');
  });

  test('Rest timer control and adjustment', async () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    const startRestBtn = screen.getByTestId('start-rest-btn');
    const adjustPlusBtn = screen.getByTestId('adjust-rest-plus-btn');
    const adjustMinusBtn = screen.getByTestId('adjust-rest-minus-btn');

    expect(screen.getByTestId('rest-active').textContent).toBe('false');
    expect(screen.getByTestId('rest-remaining').textContent).toBe('0');

    // Start rest timer
    await act(async () => {
      startRestBtn.click();
    });
    expect(screen.getByTestId('rest-active').textContent).toBe('true');
    expect(Math.round(Number(screen.getByTestId('rest-remaining').textContent))).toBe(90);

    // Adjust rest timer +15s
    await act(async () => {
      adjustPlusBtn.click();
    });
    expect(Math.round(Number(screen.getByTestId('rest-remaining').textContent))).toBe(105);

    // Adjust rest timer -15s
    await act(async () => {
      adjustMinusBtn.click();
    });
    expect(Math.round(Number(screen.getByTestId('rest-remaining').textContent))).toBe(90);
  });
});

describe('AppContext Optimistic Updates and Rollback logic', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    nextSupaResult = { data: null, error: null };
    
    // Fake Telegram
    (window as any).Telegram = {
      WebApp: {
        initData: 'query_id=123&user=%7B%22id%22%3A123%7D&auth_date=12345&hash=abc',
        platform: 'ios',
        ready: vi.fn(),
      },
    };
  });

  afterEach(() => {
    cleanup();
  });

  test('optimistic update for addExerciseToPlan rolls back on Supabase error', async () => {
    // Set mock to yield database error
    nextSupaResult = { data: null, error: { message: 'Database constraint failed' } };
    
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    const addBtn = screen.getByTestId('add-plan-btn');

    // Click button to add exercise
    await act(async () => {
      addBtn.click();
      // Wait for supaSafe to process the promise rejection/error and run rollback
      await new Promise((r) => setTimeout(r, 50));
    });

    // The query failure triggers a rollback, so plan-count stays 0 and sync-error contains message
    expect(screen.getByTestId('plan-count').textContent).toBe('0');
    expect(screen.getByTestId('sync-error').textContent).toContain('Ошибка сохранения');
  });

  test('optimistic update for toggleSetCompletion rolls back on Supabase error', async () => {
    nextSupaResult = { data: null, error: { message: 'Network Timeout' } };
    
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    const toggleBtn = screen.getByTestId('toggle-set-btn');

    await act(async () => {
      toggleBtn.click();
      // Wait for supaSafe to process the promise rejection/error and run rollback
      await new Promise((r) => setTimeout(r, 50));
    });

    // Rollback is triggered on error, so completed-sets-count stays 0
    expect(screen.getByTestId('completed-sets-count').textContent).toBe('0');
    expect(screen.getByTestId('sync-error').textContent).toContain('Ошибка сохранения');
  });
});
