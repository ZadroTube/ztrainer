import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { GuessGameModal } from './GuessGameModal';
import { cinemaGuessNew, cinemaGuessCheck, cinemaGuessReveal } from '@/lib/botApi';
import React from 'react';

// Mock botApi
vi.mock('@/lib/botApi', () => {
  return {
    cinemaGuessNew: vi.fn(),
    cinemaGuessCheck: vi.fn(),
    cinemaGuessReveal: vi.fn(),
    BotApiError: class BotApiError extends Error {
      constructor(public status: number, message: string) {
        super(message);
      }
    },
  };
});

describe('GuessGameModal Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  test('loads and displays a riddle on mount', async () => {
    vi.mocked(cinemaGuessNew).mockResolvedValueOnce({
      riddle_id: 'riddle-123',
      riddle: 'I am a famous sci-fi movie about dreams.',
    });

    render(<GuessGameModal onClose={() => {}} />);

    // Shows loading first
    expect(screen.getByText('ИИ загадывает фильм…')).toBeTruthy();

    // Wait for the riddle to load
    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });

    expect(screen.queryByText('ИИ загадывает фильм…')).toBeNull();
    expect(screen.getByText('I am a famous sci-fi movie about dreams.')).toBeTruthy();
    expect(screen.getByPlaceholderText('Название фильма…')).toBeTruthy();
  });

  test('incorrect guess shows feedback and increments attempts count', async () => {
    vi.mocked(cinemaGuessNew).mockResolvedValueOnce({
      riddle_id: 'riddle-123',
      riddle: 'I am a famous sci-fi movie about dreams.',
    });
    vi.mocked(cinemaGuessCheck).mockResolvedValueOnce({
      correct: false,
      message: 'Close but not correct!',
    });

    render(<GuessGameModal onClose={() => {}} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });

    const input = screen.getByPlaceholderText('Название фильма…');
    const submitBtn = screen.getByRole('button', { name: 'Угадать' });

    // Type a guess and click submit
    fireEvent.change(input, { target: { value: 'Interstellar' } });
    await act(async () => {
      submitBtn.click();
    });

    // Should call cinemaGuessCheck with correct params
    expect(cinemaGuessCheck).toHaveBeenCalledWith('riddle-123', 'Interstellar');
    expect(screen.getByText('Не угадал. Попробуй ещё раз!')).toBeTruthy();
    expect(screen.getByText('Попыток: 1')).toBeTruthy();
  });

  test('correct guess transitions phase to won and displays Trophy', async () => {
    vi.mocked(cinemaGuessNew).mockResolvedValueOnce({
      riddle_id: 'riddle-123',
      riddle: 'I am a famous sci-fi movie about dreams.',
    });
    vi.mocked(cinemaGuessCheck).mockResolvedValueOnce({
      correct: true,
      message: 'Spot on!',
      correct_title: 'Inception',
    });

    render(<GuessGameModal onClose={() => {}} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });

    const input = screen.getByPlaceholderText('Название фильма…');
    const submitBtn = screen.getByRole('button', { name: 'Угадать' });

    // Type correct answer and click submit
    fireEvent.change(input, { target: { value: 'Inception' } });
    await act(async () => {
      submitBtn.click();
    });

    // Phase transitions to won
    expect(screen.getByText('Угадал!')).toBeTruthy();
    expect(screen.getByText('Inception')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ещё одну загадку' })).toBeTruthy();
  });

  test('reveals the correct title on surrender', async () => {
    vi.mocked(cinemaGuessNew).mockResolvedValueOnce({
      riddle_id: 'riddle-123',
      riddle: 'I am a famous sci-fi movie about dreams.',
    });
    vi.mocked(cinemaGuessReveal).mockResolvedValueOnce({
      correct_title: 'Inception',
    });

    render(<GuessGameModal onClose={() => {}} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });

    const revealBtn = screen.getByRole('button', { name: 'Не могу угадать — показать ответ' });
    await act(async () => {
      revealBtn.click();
    });

    expect(cinemaGuessReveal).toHaveBeenCalledWith('riddle-123');
    expect(screen.getByText('Ответ:')).toBeTruthy();
    expect(screen.getByText('Inception')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Попробовать ещё' })).toBeTruthy();
  });

  test('displays error page when loading fails and allows retry', async () => {
    vi.mocked(cinemaGuessNew).mockRejectedValueOnce(new Error('Network error'));
    
    // For retry
    vi.mocked(cinemaGuessNew).mockResolvedValueOnce({
      riddle_id: 'riddle-123',
      riddle: 'I am a famous sci-fi movie about dreams.',
    });

    render(<GuessGameModal onClose={() => {}} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });

    expect(screen.getByText('Ошибка: Network error')).toBeTruthy();
    const retryBtn = screen.getByRole('button', { name: 'Повторить' });

    // Click retry
    await act(async () => {
      retryBtn.click();
    });

    // Retrying should load the riddle
    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });
    expect(screen.getByText('I am a famous sci-fi movie about dreams.')).toBeTruthy();
  });
});
