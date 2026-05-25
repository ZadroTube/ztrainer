import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { BodyMetricsTracker } from './BodyMetricsTracker';
import { useWorkoutData } from '@/context/AppContext';
import { saveBodyMetrics, fetchProgressReport } from '@/lib/botApi';
import React from 'react';

vi.mock('@/context/AppContext', () => ({
  useWorkoutData: vi.fn(),
}));

vi.mock('@/lib/botApi', () => ({
  saveBodyMetrics: vi.fn(),
  fetchProgressReport: vi.fn(),
}));

// Mock Recharts ResponsiveContainer to avoid size observer issues in test environment
vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal<typeof import('recharts')>();
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => <div className="responsive-container-mock">{children}</div>,
  };
});

describe('BodyMetricsTracker Component', () => {
  const mockSaveMetricsContext = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    mockSaveMetricsContext.mockReset();
    
    vi.mocked(useWorkoutData).mockReturnValue({
      bodyMetrics: [
        { date: '2026-05-25', weight_kg: 80.0, waist_cm: 90.0 },
        { date: '2026-05-24', weight_kg: 80.5, waist_cm: 90.2 }
      ],
      saveBodyMetrics: mockSaveMetricsContext,
    } as any);
  });

  afterEach(() => {
    cleanup();
  });

  test('renders weights tab by default and switches tabs', () => {
    render(<BodyMetricsTracker />);

    expect(screen.getByText('Замеры и прогресс')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Вес' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Объемы' })).toBeTruthy();

    // Click on Volumes tab
    fireEvent.click(screen.getByRole('button', { name: 'Объемы' }));
    // Click back to Weight tab
    fireEvent.click(screen.getByRole('button', { name: 'Вес' }));
  });

  test('opens logging form, inputs data and successfully saves', async () => {
    vi.mocked(saveBodyMetrics).mockResolvedValueOnce({ ok: true });
    mockSaveMetricsContext.mockResolvedValueOnce(undefined);

    render(<BodyMetricsTracker />);

    // Click "Записать" to open form
    const writeBtn = screen.getByRole('button', { name: 'Записать' });
    fireEvent.click(writeBtn);

    expect(screen.getByText('Добавить новые замеры')).toBeTruthy();

    // Fill in form inputs
    const weightInput = screen.getByPlaceholderText('75.5');
    const waistInput = screen.getByPlaceholderText('80.0');
    
    fireEvent.change(weightInput, { target: { value: '79.2' } });
    fireEvent.change(waistInput, { target: { value: '88.5' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: 'Сохранить замеры' });
    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => {
      expect(saveBodyMetrics).toHaveBeenCalledWith(expect.objectContaining({
        weight_kg: 79.2,
        waist_cm: 88.5
      }));
      expect(mockSaveMetricsContext).toHaveBeenCalled();
      // Form should close on success
      expect(screen.queryByText('Добавить новые замеры')).toBeNull();
    });
  });

  test('handles form save errors gracefully', async () => {
    vi.mocked(saveBodyMetrics).mockResolvedValueOnce({ ok: false });

    render(<BodyMetricsTracker />);

    fireEvent.click(screen.getByRole('button', { name: 'Записать' }));
    fireEvent.change(screen.getByPlaceholderText('75.5'), { target: { value: '79.2' } });
    const submitBtn = screen.getByRole('button', { name: 'Сохранить замеры' });
    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('Ошибка сохранения замеров на сервере.')).toBeTruthy();
    });
  });

  test('requests and displays AI progress report successfully', async () => {
    vi.mocked(fetchProgressReport).mockResolvedValueOnce({ report: '### Отчет ИИ\nОтличный прогресс в потере жира!' });

    render(<BodyMetricsTracker />);

    const reportBtn = screen.getByRole('button', { name: 'Запросить анализ у тренера' });
    fireEvent.click(reportBtn);

    // Should show loading spinner/indicator first
    expect(screen.getByText(/🤖 ИИ-тренер изучает статистику/)).toBeTruthy();

    // Wait and verify markdown output is rendered
    await waitFor(() => {
      expect(screen.getByText('Отличный прогресс в потере жира!')).toBeTruthy();
    });
  });

  test('handles AI progress report fetch errors', async () => {
    vi.mocked(fetchProgressReport).mockRejectedValueOnce(new Error('AI Server Down'));

    render(<BodyMetricsTracker />);

    fireEvent.click(screen.getByRole('button', { name: 'Запросить анализ у тренера' }));

    await waitFor(() => {
      expect(screen.getByText('AI Server Down')).toBeTruthy();
    });
  });
});
