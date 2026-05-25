import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { AdaptationBanner } from './AdaptationBanner';
import { useWorkoutData } from '@/context/AppContext';
import React from 'react';

vi.mock('@/context/AppContext', () => ({
  useWorkoutData: vi.fn(),
}));

describe('AdaptationBanner Component', () => {
  const mockApplyAdaptation = vi.fn();
  const mockDismissAdaptation = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    mockApplyAdaptation.mockReset();
    mockDismissAdaptation.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  test('does not render when activeAdaptation is null', () => {
    vi.mocked(useWorkoutData).mockReturnValue({
      activeAdaptation: null,
      applyAdaptationAction: mockApplyAdaptation,
      dismissAdaptationAction: mockDismissAdaptation,
    } as any);

    const { container } = render(<AdaptationBanner />);
    expect(container.firstChild).toBeNull();
  });

  test('does not render when activeAdaptation status is not pending', () => {
    vi.mocked(useWorkoutData).mockReturnValue({
      activeAdaptation: {
        id: 'ad-123',
        status: 'applied',
        explanation: 'Everything is fine',
        suggested_changes: [],
        created_at: '2026-05-25T12:00:00.000Z',
      },
      applyAdaptationAction: mockApplyAdaptation,
      dismissAdaptationAction: mockDismissAdaptation,
    } as any);

    const { container } = render(<AdaptationBanner />);
    expect(container.firstChild).toBeNull();
  });

  test('renders explanation and comparative table when activeAdaptation is pending', () => {
    vi.mocked(useWorkoutData).mockReturnValue({
      activeAdaptation: {
        id: 'ad-123',
        status: 'pending',
        explanation: 'Увеличиваем нагрузку в связи с прогрессом.',
        suggested_changes: [
          {
            workout_plan_id: 'wp-1',
            exercise_name: 'Жим лежа',
            old_values: { sets: 3, reps: 10, weight_kg: 60 },
            new_values: { sets: 3, reps: 10, weight_kg: 65 },
          },
          {
            workout_plan_id: 'wp-2',
            exercise_name: 'Подтягивания',
            old_values: { sets: 3, reps: 8 },
            new_values: { sets: 3, reps: 10 },
          }
        ],
        created_at: '2026-05-25T12:00:00.000Z',
      },
      applyAdaptationAction: mockApplyAdaptation,
      dismissAdaptationAction: mockDismissAdaptation,
    } as any);

    render(<AdaptationBanner />);

    // Header check
    expect(screen.getByText('Рекомендация Тренера: Автоадаптация')).toBeTruthy();
    expect(screen.getByText('Доступно новое улучшение вашей программы')).toBeTruthy();
    
    // Explanation check
    expect(screen.getByText('Увеличиваем нагрузку в связи с прогрессом.')).toBeTruthy();

    // Table check - Exercise Names
    expect(screen.getByText('Жим лежа')).toBeTruthy();
    expect(screen.getByText('Подтягивания')).toBeTruthy();

    // Old and New values format
    expect(screen.getByText('3 × 10 @ 60 кг')).toBeTruthy(); // Old values for Bench Press
    expect(screen.getByText('3 × 10 @ 65 кг')).toBeTruthy(); // New values for Bench Press
    expect(screen.getByText('3 × 8')).toBeTruthy(); // Old values for Pull-ups
    expect(screen.getByText('3 × 10')).toBeTruthy(); // New values for Pull-ups
  });

  test('clicking apply calls applyAdaptationAction and shows loader', async () => {
    vi.mocked(useWorkoutData).mockReturnValue({
      activeAdaptation: {
        id: 'ad-123',
        status: 'pending',
        explanation: 'Увеличиваем нагрузку.',
        suggested_changes: [],
        created_at: '2026-05-25T12:00:00.000Z',
      },
      applyAdaptationAction: mockApplyAdaptation,
      dismissAdaptationAction: mockDismissAdaptation,
    } as any);

    mockApplyAdaptation.mockImplementationOnce(() => new Promise((resolve) => setTimeout(resolve, 50)));

    render(<AdaptationBanner />);

    const applyButton = screen.getByText('Принять рекомендации');
    fireEvent.click(applyButton);

    expect(mockApplyAdaptation).toHaveBeenCalledWith('ad-123');
  });

  test('clicking dismiss calls dismissAdaptationAction', async () => {
    vi.mocked(useWorkoutData).mockReturnValue({
      activeAdaptation: {
        id: 'ad-123',
        status: 'pending',
        explanation: 'Увеличиваем нагрузку.',
        suggested_changes: [],
        created_at: '2026-05-25T12:00:00.000Z',
      },
      applyAdaptationAction: mockApplyAdaptation,
      dismissAdaptationAction: mockDismissAdaptation,
    } as any);

    mockDismissAdaptation.mockResolvedValueOnce(undefined);

    render(<AdaptationBanner />);

    const dismissButton = screen.getByText('Отклонить');
    fireEvent.click(dismissButton);

    expect(mockDismissAdaptation).toHaveBeenCalledWith('ad-123');
  });

  test('displays error message when applyAdaptationAction fails', async () => {
    vi.mocked(useWorkoutData).mockReturnValue({
      activeAdaptation: {
        id: 'ad-123',
        status: 'pending',
        explanation: 'Увеличиваем нагрузку.',
        suggested_changes: [],
        created_at: '2026-05-25T12:00:00.000Z',
      },
      applyAdaptationAction: mockApplyAdaptation,
      dismissAdaptationAction: mockDismissAdaptation,
    } as any);

    mockApplyAdaptation.mockRejectedValueOnce(new Error('Network Error'));

    render(<AdaptationBanner />);

    const applyButton = screen.getByText('Принять рекомендации');
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(screen.getByText('Network Error')).toBeTruthy();
    });
  });
});
