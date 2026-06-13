import { describe, it, expect } from 'vitest';
import { generateOtpCode, hashOtpCode, verifyOtpCode } from './index';

// Pepper required for hashing — set a deterministic one for the suite.
process.env.OTP_HMAC_SECRET = 'test-pepper-0123456789abcdef';

describe('generateOtpCode', () => {
  it('is always a 6-digit numeric string in range', () => {
    for (let i = 0; i < 500; i++) {
      const c = generateOtpCode();
      expect(c).toMatch(/^\d{6}$/);
      const n = Number(c);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(999999);
    }
  });

  it('produces varied values (not a constant)', () => {
    const set = new Set(Array.from({ length: 50 }, () => generateOtpCode()));
    expect(set.size).toBeGreaterThan(5);
  });
});

describe('hashOtpCode / verifyOtpCode', () => {
  it('is deterministic for the same code + pepper', () => {
    expect(hashOtpCode('123456')).toBe(hashOtpCode('123456'));
  });

  it('differs for different codes', () => {
    expect(hashOtpCode('123456')).not.toBe(hashOtpCode('654321'));
  });

  it('verifies a correct code and rejects a wrong one', () => {
    const hash = hashOtpCode('428913');
    expect(verifyOtpCode('428913', hash)).toBe(true);
    expect(verifyOtpCode('428914', hash)).toBe(false);
    expect(verifyOtpCode('', hash)).toBe(false);
  });

  it('rejects a malformed / empty stored hash without throwing', () => {
    expect(verifyOtpCode('123456', '')).toBe(false);
    expect(verifyOtpCode('123456', 'not-hex-zzzz')).toBe(false);
  });

  it('throws when no pepper is available (fail closed)', () => {
    const savedOtp = process.env.OTP_HMAC_SECRET;
    const savedCron = process.env.CRON_SECRET;
    try {
      delete process.env.OTP_HMAC_SECRET;
      delete process.env.CRON_SECRET;
      expect(() => hashOtpCode('123456')).toThrow(/pepper/i);
    } finally {
      if (savedOtp !== undefined) process.env.OTP_HMAC_SECRET = savedOtp;
      if (savedCron !== undefined) process.env.CRON_SECRET = savedCron;
    }
  });
});
