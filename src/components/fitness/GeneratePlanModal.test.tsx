import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { GeneratePlanModal } from './GeneratePlanModal';
import { generatePlan, applyPlan } from '@/lib/botApi';
import React from 'react';

vi.mock('@/lib/botApi', () => ({
  generatePlan: vi.fn(),
  applyPlan: vi.fn(),
}));

describe('GeneratePlanModal Component', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    mockOnClose.mockReset();
    mockOnSuccess.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  test('renders step 1 with form fields and allows settings configuration', () => {
    render(<GeneratePlanModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    // Renders header and settings labels
    expect(screen.getByText('ИИ-генератор планов')).toBeTruthy();
    expect(screen.getByText('Выберите период планирования:')).toBeTruthy();
    expect(screen.getByText('Дата начала плана:')).toBeTruthy();

    // Default period toggle is "Неделя" (week)
    const weekBtn = screen.getByRole('button', { name: 'Неделя' });
    const dayBtn = screen.getByRole('button', { name: 'День' });
    const monthBtn = screen.getByRole('button', { name: 'Месяц' });

    expect(weekBtn).toBeTruthy();
    expect(dayBtn).toBeTruthy();
    expect(monthBtn).toBeTruthy();

    // Switch period to day
    fireEvent.click(dayBtn);
    // Switch period to month
    fireEvent.click(monthBtn);
  });

  test('handles successful workout plan generation and wizard progression', async () => {
    const mockPlanResponse = {
      plan: {
        '2026-05-26': [
          { name: 'Жим лежа', target_muscle_group: 'Грудь', sets: 3, reps: 10, weight_kg: 50, rest_seconds: 90 },
          { name: 'Приседания со штангой', target_muscle_group: 'Ноги', sets: 3, reps: 12, weight_kg: 60, rest_seconds: 120 }
        ],
        '2026-05-27': []
      },
      summary: 'Тестовый сплит на 2 дня'
    };

    vi.mocked(generatePlan).mockResolvedValueOnce(mockPlanResponse);

    render(<GeneratePlanModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    const generateBtn = screen.getByRole('button', { name: 'Сгенерировать план' });
    fireEvent.click(generateBtn);

    // Should transition to Step 2: Loading State
    expect(screen.getByText('🤖 Тренер составляет ваш план...')).toBeTruthy();
    expect(screen.getByText('Это займет около 10–15 секунд')).toBeTruthy();

    // Should transition to Step 3: Review
    await waitFor(() => {
      expect(screen.getByText('Резюме тренера')).toBeTruthy();
      expect(screen.getByText('Тестовый сплит на 2 дня')).toBeTruthy();
      expect(screen.getByText('Расписание дней:')).toBeTruthy();
    });

    // Check plan exercise rendering
    expect(screen.getByText('Жим лежа')).toBeTruthy();
    expect(screen.getByText('Грудь · 3п × 10р · 50 кг · Отдых 90с')).toBeTruthy();
    expect(screen.getByText('Приседания со штангой')).toBeTruthy();
    expect(screen.getByText('Ноги · 3п × 12р · 60 кг · Отдых 120с')).toBeTruthy();

    // Click next day (Wednesday) to verify navigation to a rest day
    const nextDayBtn = screen.getByRole('button', { name: 'ср 27' });
    fireEvent.click(nextDayBtn);
    // Selected day is rest day
    await waitFor(() => {
      expect(screen.getByText('Запланирован день отдыха и восстановления 🧘‍♀️')).toBeTruthy();
    });
  });

  test('handles successful apply plan integration', async () => {
    const mockPlanResponse = {
      plan: {
        '2026-05-26': [
          { name: 'Жим лежа', target_muscle_group: 'Грудь', sets: 3, reps: 10, weight_kg: 50, rest_seconds: 90 }
        ]
      },
      summary: 'Тестовый сплит на 1 день'
    };

    vi.mocked(generatePlan).mockResolvedValueOnce(mockPlanResponse);
    vi.mocked(applyPlan).mockResolvedValueOnce({ ok: true, exercises_created: 1 });

    render(<GeneratePlanModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    fireEvent.click(screen.getByRole('button', { name: 'Сгенерировать план' }));

    // Wait for the third step
    await screen.findByText('Резюме тренера');

    const applyBtn = screen.getByRole('button', { name: 'Применить' });
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(applyPlan).toHaveBeenCalledWith(mockPlanResponse.plan);
      expect(mockOnSuccess).toHaveBeenCalledOnce();
      expect(mockOnClose).toHaveBeenCalledOnce();
    });
  });

  test('handles error state if generator endpoint fails', async () => {
    vi.mocked(generatePlan).mockRejectedValueOnce(new Error('API Error'));

    render(<GeneratePlanModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    fireEvent.click(screen.getByRole('button', { name: 'Сгенерировать план' }));

    // Wait and verify error shows on step 1 (since it goes back on error)
    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeTruthy();
    });
  });

  test('handles error state if generator endpoint returns empty plan', async () => {
    vi.mocked(generatePlan).mockResolvedValueOnce({ plan: {}, summary: '' });

    render(<GeneratePlanModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    fireEvent.click(screen.getByRole('button', { name: 'Сгенерировать план' }));

    // Wait and verify error shows on step 1 (since it goes back on error)
    await waitFor(() => {
      expect(screen.getByText('ИИ вернул пустой план. Попробуйте еще раз.')).toBeTruthy();
    });
  });

  test('handles error state if apply plan endpoint fails', async () => {
    const mockPlanResponse = {
      plan: {
        '2026-05-26': [
          { name: 'Жим лежа', target_muscle_group: 'Грудь', sets: 3, reps: 10, weight_kg: 50, rest_seconds: 90 }
        ]
      },
      summary: 'Тестовый сплит на 1 день'
    };

    vi.mocked(generatePlan).mockResolvedValueOnce(mockPlanResponse);
    vi.mocked(applyPlan).mockResolvedValueOnce({ ok: false, exercises_created: 0 });

    render(<GeneratePlanModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    fireEvent.click(screen.getByRole('button', { name: 'Сгенерировать план' }));

    await screen.findByText('Резюме тренера');

    fireEvent.click(screen.getByRole('button', { name: 'Применить' }));

    await waitFor(() => {
      expect(screen.getByText('Ошибка при сохранении плана в базу данных.')).toBeTruthy();
      expect(mockOnSuccess).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });
});
