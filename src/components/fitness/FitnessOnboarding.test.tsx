import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { FitnessOnboarding } from './FitnessOnboarding';
import { useUIContext } from '@/context/AppContext';
import React from 'react';

vi.mock('@/context/AppContext', () => ({
  useUIContext: vi.fn(),
  useWorkoutData: vi.fn(),
  useTimerContext: vi.fn(),
}));

describe('FitnessOnboarding Component', () => {
  const mockUpdateFitnessProfile = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    mockUpdateFitnessProfile.mockReset();
    mockOnClose.mockReset();

    vi.mocked(useUIContext).mockReturnValue({
      userProfile: {},
      updateFitnessProfile: mockUpdateFitnessProfile,
    } as any);
  });

  afterEach(() => {
    cleanup();
  });

  test('renders step 1 and validates goal selection', async () => {
    render(<FitnessOnboarding onClose={mockOnClose} />);

    // Header step indicator
    expect(screen.getByText('Шаг 1 из 3')).toBeTruthy();
    expect(screen.getByText('Выберите вашу главную фитнес-цель:')).toBeTruthy();

    // Next button is disabled initially because no goal is selected
    const nextBtn = screen.getByRole('button', { name: 'Далее' });
    expect(nextBtn.hasAttribute('disabled')).toBe(true);

    // Select goal 'lose_weight' (labeled 'Похудеть')
    const loseWeightBtn = screen.getByText('Похудеть').closest('button');
    expect(loseWeightBtn).toBeTruthy();
    fireEvent.click(loseWeightBtn!);

    // Next button should now be enabled
    expect(nextBtn.hasAttribute('disabled')).toBe(false);

    // Click Next to go to Step 2
    fireEvent.click(nextBtn);

    // Verify we are on Step 2
    expect(screen.getByText('Шаг 2 из 3')).toBeTruthy();
    expect(screen.getByText('Где вы планируете тренироваться?')).toBeTruthy();
  });

  test('navigates through all steps and saves data on finish', async () => {
    render(<FitnessOnboarding onClose={mockOnClose} />);

    // Step 1: Select goal and click next
    fireEvent.click(screen.getByText('Похудеть').closest('button')!);
    fireEvent.click(screen.getByRole('button', { name: 'Далее' }));

    // Step 2: Next button should be disabled until location is selected
    const nextBtnStep2 = screen.getByRole('button', { name: 'Далее' });
    expect(nextBtnStep2.hasAttribute('disabled')).toBe(true);

    // Select location 'gym' (labeled 'Зал')
    const gymBtn = screen.getByText('Зал').closest('button');
    expect(gymBtn).toBeTruthy();
    fireEvent.click(gymBtn!);

    expect(nextBtnStep2.hasAttribute('disabled')).toBe(false);

    // Select some equipment
    const dumbbellsBtn = screen.getByText('Гантели');
    fireEvent.click(dumbbellsBtn);

    // Fill custom equipment
    const customInput = screen.getByPlaceholderText(/гиря 16кг/);
    fireEvent.change(customInput, { target: { value: 'гиря 24кг' } });

    // Go to Step 3
    fireEvent.click(nextBtnStep2);

    // Step 3: Verify fields and finish
    expect(screen.getByText('Шаг 3 из 3')).toBeTruthy();
    expect(screen.getByText('Время на одну тренировку:')).toBeTruthy();

    // Select gender
    const maleBtn = screen.getByText('Мужской ♂️');
    fireEvent.click(maleBtn);

    // Fill birth year
    const birthYearInput = screen.getByPlaceholderText('Например, 1992');
    fireEvent.change(birthYearInput, { target: { value: '1990' } });

    // Click Finish
    const finishBtn = screen.getByRole('button', { name: 'Готово' });
    fireEvent.click(finishBtn);

    // Verify it called updateFitnessProfile with correct params
    expect(mockUpdateFitnessProfile).toHaveBeenCalledWith({
      fitness_goal: 'lose_weight',
      fitness_level: 'intermediate',
      training_location: 'gym',
      equipment: 'dumbbells, гиря 24кг',
      available_minutes: 60,
      gender: 'male',
      birth_year: 1990,
    });

    // Verify localStorage dismissed flag is set and onClose called
    await waitFor(() => {
      expect(localStorage.getItem('fitness_onboarding_dismissed')).toBe('true');
      expect(mockOnClose).toHaveBeenCalledOnce();
    });
  });

  test('dismiss onboarding when Choose Later is clicked', () => {
    render(<FitnessOnboarding onClose={mockOnClose} />);

    const dismissBtn = screen.getByRole('button', { name: 'Выбрать позже' });
    fireEvent.click(dismissBtn);

    expect(localStorage.getItem('fitness_onboarding_dismissed')).toBe('true');
    expect(mockOnClose).toHaveBeenCalledOnce();
    expect(mockUpdateFitnessProfile).not.toHaveBeenCalled();
  });
});
