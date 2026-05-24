import { describe, it, expect } from 'vitest';
import { timeAgo } from './utils';

describe('timeAgo helper function', () => {
  it('should return empty string for empty input', () => {
    expect(timeAgo(null)).toBe('');
    expect(timeAgo(undefined)).toBe('');
    expect(timeAgo('')).toBe('');
  });

  it('should return empty string for invalid date string', () => {
    expect(timeAgo('invalid-date')).toBe('');
  });

  it('should format recent times correctly', () => {
    const justNow = new Date(Date.now() - 30 * 1000).toISOString(); // 30 seconds ago
    expect(timeAgo(justNow)).toBe('только что');

    const minutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 minutes ago
    expect(timeAgo(minutesAgo)).toBe('5 мин назад');

    const hoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(); // 3 hours ago
    expect(timeAgo(hoursAgo)).toBe('3 ч назад');
  });
});
