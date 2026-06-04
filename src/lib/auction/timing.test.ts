import { describe, it, expect } from 'vitest';
import { validateClosingTime, validateExtension, isFinalUrgency } from './timing';

const NOW = new Date('2026-06-04T12:00:00Z');
const hours = (h: number) => new Date(NOW.getTime() + h * 3_600_000);

describe('auction timing', () => {
  it('rejects a closing time under 6h', () => {
    expect(validateClosingTime(hours(5), NOW).ok).toBe(false);
  });

  it('rejects a closing time over 14 days', () => {
    expect(validateClosingTime(hours(14 * 24 + 1), NOW).ok).toBe(false);
  });

  it('accepts a closing time within bounds', () => {
    expect(validateClosingTime(hours(6), NOW).ok).toBe(true);
    expect(validateClosingTime(hours(48), NOW).ok).toBe(true);
    expect(validateClosingTime(hours(14 * 24), NOW).ok).toBe(true);
  });

  it('allows an extension up to 48h, later than current', () => {
    const current = hours(10);
    expect(validateExtension(current, hours(10 + 48)).ok).toBe(true);
    expect(validateExtension(current, hours(10 + 49)).ok).toBe(false);
    expect(validateExtension(current, hours(9)).ok).toBe(false);
  });

  it('detects the final-2-hour urgency window', () => {
    expect(isFinalUrgency(hours(1), NOW)).toBe(true);
    expect(isFinalUrgency(hours(3), NOW)).toBe(false);
    expect(isFinalUrgency(hours(-1), NOW)).toBe(false);
  });
});
