import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchAbout, fetchWeather, pullTarot, BotApiError } from './botApi';

// Mock Supabase
vi.mock('@/lib/supabase', () => {
  return {
    supabase: {
      auth: {
        getSession: vi.fn(() =>
          Promise.resolve({
            data: {
              session: {
                access_token: 'mock-supabase-jwt-token',
              },
            },
            error: null,
          })
        ),
      },
    },
  };
});

describe('botApi Client Utilities', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Clean global objects
    delete (window as any).Telegram;
    
    // Mock global fetch
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  test('tma header selection when inside Telegram', async () => {
    (window as any).Telegram = {
      WebApp: {
        initData: 'query_id=ABC&user=123',
      },
    };

    const mockFetch = vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ text: 'ZTrainer is active' }),
    } as any);

    const result = await fetchAbout();
    expect(result.text).toBe('ZTrainer is active');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/about'),
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'tma query_id=ABC&user=123',
        },
      })
    );
  });

  test('Bearer header selection when outside Telegram but with active Supabase session', async () => {
    // window.Telegram is undefined
    const mockFetch = vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ advice: 'Wear a jacket' }),
    } as any);

    const result = await fetchWeather();
    expect(result.advice).toBe('Wear a jacket');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/weather'),
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-supabase-jwt-token',
        },
      })
    );
  });

  test('throws error when no authentication sources are available', async () => {
    // Set mock supabase session to null
    const { supabase } = await import('@/lib/supabase');
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });

    await expect(fetchAbout()).rejects.toThrow(
      'No auth available — open the app from Telegram or sign in via the Login Widget.'
    );
  });

  test('BotApiError throws with correct status and error message on unsuccessful response', async () => {
    (window as any).Telegram = {
      WebApp: {
        initData: 'query_id=ABC',
      },
    };

    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'Invalid parameter schema' }),
    } as any);

    try {
      await pullTarot();
      throw new Error('Should have thrown');
    } catch (e: any) {
      expect(e).toBeInstanceOf(BotApiError);
      expect(e.status).toBe(400);
      expect(e.message).toBe('Invalid parameter schema');
      expect(e.detail).toEqual({ error: 'Invalid parameter schema' });
    }
  });

  test('BotApiError handles non-JSON error payloads', async () => {
    (window as any).Telegram = {
      WebApp: {
        initData: 'query_id=ABC',
      },
    };

    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 503,
      json: () => Promise.reject(new Error('SyntaxError')),
    } as any);

    try {
      await pullTarot();
      throw new Error('Should have failed');
    } catch (e: any) {
      expect(e).toBeInstanceOf(BotApiError);
      expect(e.status).toBe(503);
      expect(e.message).toContain('returned non-JSON response');
    }
  });

  test('handles 204 No Content with non-JSON response', async () => {
    (window as any).Telegram = {
      WebApp: {
        initData: 'query_id=ABC',
      },
    };

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 204,
      json: () => Promise.reject(new Error('Unexpected end of JSON input')),
    } as any);

    // Call pullTarot (204 response is considered successful, returning null payload)
    const result = await pullTarot();
    expect(result).toBeNull();
  });
});
