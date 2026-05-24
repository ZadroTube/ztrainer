import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { BottomNav } from './BottomNav';
import { useUIContext } from '@/context/AppContext';
import React from 'react';

vi.mock('@/context/AppContext', () => ({
  useUIContext: vi.fn(),
}));

describe('BottomNav Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  test('renders all navigation items', () => {
    vi.mocked(useUIContext).mockReturnValue({
      activeTab: 'home',
      setActiveTab: vi.fn(),
    } as any);

    render(<BottomNav />);

    expect(screen.getByText('Главная')).toBeTruthy();
    expect(screen.getByText('Тренировки')).toBeTruthy();
    expect(screen.getByText('Кино')).toBeTruthy();
    expect(screen.getByText('Профиль')).toBeTruthy();
  });

  test('applies highlight class to active item', () => {
    vi.mocked(useUIContext).mockReturnValue({
      activeTab: 'fitness',
      setActiveTab: vi.fn(),
    } as any);

    render(<BottomNav />);

    // Check that 'fitness' button (labeled 'Тренировки') has 'text-cyan-400' class
    const fitnessBtn = screen.getByText('Тренировки').closest('button');
    expect(fitnessBtn?.className).toContain('text-cyan-400');

    // Check that other buttons like 'home' (labeled 'Главная') do not
    const homeBtn = screen.getByText('Главная').closest('button');
    expect(homeBtn?.className).toContain('text-slate-400');
  });

  test('calls setActiveTab when items are clicked', () => {
    const mockSetActiveTab = vi.fn();
    vi.mocked(useUIContext).mockReturnValue({
      activeTab: 'home',
      setActiveTab: mockSetActiveTab,
    } as any);

    render(<BottomNav />);

    const cinemaBtn = screen.getByText('Кино').closest('button');
    expect(cinemaBtn).toBeTruthy();
    fireEvent.click(cinemaBtn!);

    expect(mockSetActiveTab).toHaveBeenCalledWith('cinema');
  });
});
