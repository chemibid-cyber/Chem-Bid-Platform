import { describe, it, expect } from 'vitest';
import { normalizeIndianPhone, isIndianE164 } from './phone';

describe('normalizeIndianPhone', () => {
  it('accepts the common Indian mobile formats → +91XXXXXXXXXX', () => {
    expect(normalizeIndianPhone('9876543210')).toBe('+919876543210');
    expect(normalizeIndianPhone('09876543210')).toBe('+919876543210');
    expect(normalizeIndianPhone('919876543210')).toBe('+919876543210');
    expect(normalizeIndianPhone('+919876543210')).toBe('+919876543210');
    expect(normalizeIndianPhone('0091 98765 43210')).toBe('+919876543210');
    expect(normalizeIndianPhone('+91 98765-43210')).toBe('+919876543210');
  });

  it('rejects non-Indian-mobile inputs', () => {
    expect(normalizeIndianPhone('1234567890')).toBeNull(); // starts with 1
    expect(normalizeIndianPhone('98765')).toBeNull(); // too short
    expect(normalizeIndianPhone('598765432101')).toBeNull(); // bad length / prefix
    expect(normalizeIndianPhone('abcdefghij')).toBeNull();
    expect(normalizeIndianPhone('')).toBeNull();
    expect(normalizeIndianPhone('+15551234567')).toBeNull(); // US number
  });
});

describe('isIndianE164', () => {
  it('matches only well-formed +91 mobiles', () => {
    expect(isIndianE164('+919876543210')).toBe(true);
    expect(isIndianE164('9876543210')).toBe(false);
    expect(isIndianE164('+9198765432')).toBe(false);
    expect(isIndianE164('+911234567890')).toBe(false); // starts with 1
  });
});
