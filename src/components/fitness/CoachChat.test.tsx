import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { CoachChat } from './CoachChat';
import { useWorkoutData } from '@/context/AppContext';
import React from 'react';

vi.mock('@/context/AppContext', () => ({
  useWorkoutData: vi.fn(),
}));

describe('CoachChat Component', () => {
  const mockSendCoachMessage = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    mockSendCoachMessage.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  test('renders welcome state with suggestions when chat is empty', () => {
    vi.mocked(useWorkoutData).mockReturnValue({
      coachMessages: [],
      sendCoachMessage: mockSendCoachMessage,
    } as any);

    render(<CoachChat />);

    expect(screen.getByText('ИИ-Тренер ZTrainer')).toBeTruthy();
    expect(screen.getByText('Ваш персональный тренер')).toBeTruthy();
    expect(screen.getByText('Частые вопросы:')).toBeTruthy();
    expect(screen.getByText('Как правильно делать приседания?')).toBeTruthy();
    expect(screen.getByText('Составь разминку на 5 минут перед тренировкой')).toBeTruthy();
  });

  test('clicking suggestion immediately sends message', async () => {
    vi.mocked(useWorkoutData).mockReturnValue({
      coachMessages: [],
      sendCoachMessage: mockSendCoachMessage,
    } as any);

    mockSendCoachMessage.mockResolvedValueOnce(undefined);

    render(<CoachChat />);

    const suggestionBtn = screen.getByText('Как правильно делать приседания?');
    fireEvent.click(suggestionBtn);

    await waitFor(() => {
      expect(mockSendCoachMessage).toHaveBeenCalledWith('Как правильно делать приседания?');
    });
  });

  test('renders user and trainer messages correctly', () => {
    vi.mocked(useWorkoutData).mockReturnValue({
      coachMessages: [
        { id: 'msg-1', sender: 'user', message: 'Привет, тренер!', created_at: '2026-05-25T12:00:00.000Z' },
        { id: 'msg-2', sender: 'coach', message: 'Привет! Чем я могу помочь?', created_at: '2026-05-25T12:00:05.000Z' },
      ],
      sendCoachMessage: mockSendCoachMessage,
    } as any);

    render(<CoachChat />);

    // User message
    expect(screen.getByText('Привет, тренер!')).toBeTruthy();
    // Coach message
    expect(screen.getByText('Привет! Чем я могу помочь?')).toBeTruthy();
  });

  test('submitting typed message triggers sendCoachMessage and clears input', async () => {
    vi.mocked(useWorkoutData).mockReturnValue({
      coachMessages: [],
      sendCoachMessage: mockSendCoachMessage,
    } as any);

    mockSendCoachMessage.mockResolvedValueOnce(undefined);

    render(<CoachChat />);

    const input = screen.getByPlaceholderText('Спроси меня о тренировках...');
    const form = input.closest('form')!;

    fireEvent.change(input, { target: { value: 'Болит колено' } });
    expect((input as HTMLInputElement).value).toBe('Болит колено');

    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockSendCoachMessage).toHaveBeenCalledWith('Болит колено');
      expect((input as HTMLInputElement).value).toBe('');
    });
  });

  test('shows typing loader while response is loading', async () => {
    vi.mocked(useWorkoutData).mockReturnValue({
      coachMessages: [],
      sendCoachMessage: mockSendCoachMessage,
    } as any);

    // Keep the promise pending
    let resolvePromise: any;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockSendCoachMessage.mockReturnValueOnce(pendingPromise);

    render(<CoachChat />);

    const input = screen.getByPlaceholderText('Спроси меня о тренировках...');
    const form = input.closest('form')!;

    fireEvent.change(input, { target: { value: 'Тест загрузки' } });
    fireEvent.submit(form);

    // Should render typing loader
    expect(screen.getByText('Тренер подбирает рекомендации')).toBeTruthy();

    // Resolve the promise to clean up
    resolvePromise();
    await waitFor(() => {
      expect(mockSendCoachMessage).toHaveBeenCalled();
    });
  });
});
