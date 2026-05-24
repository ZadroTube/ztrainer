import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { WorkoutTracker } from './WorkoutTracker';
import { useWorkoutData, useTimerContext, useUIContext } from '@/context/AppContext';
import React from 'react';

vi.mock('@/context/AppContext', () => ({
  useWorkoutData: vi.fn(),
  useTimerContext: vi.fn(),
  useUIContext: vi.fn(),
}));

vi.mock('./InlineRestTimer', () => ({
  InlineRestTimer: () => <div data-testid="inline-rest-timer">MockedInlineRestTimer</div>,
}));

describe('WorkoutTracker Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  test('renders empty plan state when there are no exercises planned', () => {
    vi.mocked(useUIContext).mockReturnValue({
      selectedDate: new Date('2026-05-25T12:00:00Z'),
      viewMode: 'plan',
    } as any);

    vi.mocked(useWorkoutData).mockReturnValue({
      plannedWorkouts: {},
      completedSets: {},
      dailyDurations: {},
      actualExerciseRests: {},
    } as any);

    vi.mocked(useTimerContext).mockReturnValue({
      workoutStartTime: null,
      workoutAccumulatedMs: 0,
    } as any);

    const mockGoToPlan = vi.fn();
    render(<WorkoutTracker onGoToPlan={mockGoToPlan} />);

    expect(screen.getByText('План пуст')).toBeTruthy();
    expect(screen.getByText(/На этот день нет тренировок/)).toBeTruthy();

    const planBtn = screen.getByRole('button', { name: 'Составить план' });
    fireEvent.click(planBtn);
    expect(mockGoToPlan).toHaveBeenCalledOnce();
  });

  test('renders active plan with progress bar and toggles sets', () => {
    vi.mocked(useUIContext).mockReturnValue({
      selectedDate: new Date('2026-05-25T12:00:00Z'),
      viewMode: 'plan',
    } as any);

    const mockToggleSetCompletion = vi.fn();
    vi.mocked(useWorkoutData).mockReturnValue({
      plannedWorkouts: {
        '2026-05-25': [
          {
            workoutId: 'ex123',
            name: 'Отжимания',
            targetMuscleGroup: 'Грудь',
            sets: 2,
            reps: 12,
            weightKg: 15,
            restTimeSeconds: 60,
          }
        ]
      },
      completedSets: {
        '2026-05-25_ex123_0': true, // first set completed
      },
      dailyDurations: {},
      toggleSetCompletion: mockToggleSetCompletion,
      actualExerciseRests: {},
    } as any);

    const mockStartRestTimer = vi.fn();
    vi.mocked(useTimerContext).mockReturnValue({
      workoutStartTime: 1716630000000,
      workoutAccumulatedMs: 0,
      startRestTimer: mockStartRestTimer,
      restContext: null,
    } as any);

    render(<WorkoutTracker />);

    // Renders exercise name and target muscle group
    expect(screen.getByText('Отжимания')).toBeTruthy();
    expect(screen.getByText('Грудь')).toBeTruthy();

    // Renders progress bar: 1 completed, 2 total -> 50%
    expect(screen.getByText('1 / 2 подходов')).toBeTruthy();

    // Renders sets details
    expect(screen.getAllByText('15 кг × 12 повторений').length).toBe(2);

    // First set toggle (completed -> uncompleted)
    const firstSetRow = screen.getByText('1').closest('div');
    expect(firstSetRow).toBeTruthy();
    fireEvent.click(firstSetRow!);
    expect(mockToggleSetCompletion).toHaveBeenCalledWith('2026-05-25', 'ex123', 0, false);
  });

  test('exercise deletion confirmation logic works', () => {
    vi.mocked(useUIContext).mockReturnValue({
      selectedDate: new Date('2026-05-25T12:00:00Z'),
      viewMode: 'plan',
    } as any);

    const mockRemoveExerciseFromPlan = vi.fn();
    vi.mocked(useWorkoutData).mockReturnValue({
      plannedWorkouts: {
        '2026-05-25': [
          {
            workoutId: 'ex123',
            name: 'Отжимания',
            sets: 1,
            reps: 10,
          }
        ]
      },
      completedSets: {},
      dailyDurations: {},
      removeExerciseFromPlan: mockRemoveExerciseFromPlan,
      actualExerciseRests: {},
    } as any);

    vi.mocked(useTimerContext).mockReturnValue({
      workoutStartTime: null,
      workoutAccumulatedMs: 0,
    } as any);

    render(<WorkoutTracker />);

    const deleteBtn = screen.getByTitle('Удалить');
    expect(deleteBtn).toBeTruthy();

    // First click: changes title to confirm delete
    fireEvent.click(deleteBtn);
    expect(mockRemoveExerciseFromPlan).not.toHaveBeenCalled();
    expect(deleteBtn.title).toBe('Нажмите ещё раз');

    // Second click: calls delete
    fireEvent.click(deleteBtn);
    expect(mockRemoveExerciseFromPlan).toHaveBeenCalledWith('2026-05-25', 'ex123');
  });

  test('renders diary mode showing daily durations and only completed exercises', () => {
    vi.mocked(useUIContext).mockReturnValue({
      selectedDate: new Date('2026-05-25T12:00:00Z'),
      viewMode: 'diary',
    } as any);

    vi.mocked(useWorkoutData).mockReturnValue({
      plannedWorkouts: {
        '2026-05-25': [
          {
            workoutId: 'completed-ex',
            name: 'Подтягивания',
            sets: 3,
            reps: 8,
          },
          {
            workoutId: 'uncompleted-ex',
            name: 'Приседания',
            sets: 3,
            reps: 12,
          }
        ]
      },
      completedSets: {
        '2026-05-25_completed-ex_0': true, // only one completed set in first exercise
      },
      dailyDurations: {
        '2026-05-25': 450, // 7m 30s
      },
      actualExerciseRests: {
        '2026-05-25_completed-ex': 90, // 1m 30s
      },
    } as any);

    vi.mocked(useTimerContext).mockReturnValue({
      workoutStartTime: null,
      workoutAccumulatedMs: 0,
    } as any);

    render(<WorkoutTracker />);

    // Renders summary card
    expect(screen.getByText('Сводка за день')).toBeTruthy();
    expect(screen.getByText('7м 30с')).toBeTruthy();

    // Shows completed-ex, hides uncompleted-ex
    expect(screen.getByText('Подтягивания')).toBeTruthy();
    expect(screen.queryByText('Приседания')).toBeNull();

    // Shows rest duration
    expect(screen.getByText('Отдых: 1м 30с')).toBeTruthy();
  });
});
