import { describe, it, expect } from 'vitest';
import {
  computeTotalRate,
  effectiveFreight,
  validateBidPricing,
  isValidStage2Rate,
  round2,
} from './pricing';

describe('pricing', () => {
  it('sums basic + freight for a Delivered bid', () => {
    expect(computeTotalRate({ basic: 100, freight: 12.5, basis: 'delivered' })).toBe(112.5);
  });

  it('ZEROES freight under Ex-Works (total = basic)', () => {
    expect(effectiveFreight(50, 'exworks')).toBe(0);
    expect(computeTotalRate({ basic: 100, freight: 50, basis: 'exworks' })).toBe(100);
  });

  it('requires freight for Delivered, not for Ex-Works', () => {
    expect(validateBidPricing({ basic: 100, freight: 0, basis: 'delivered' }).ok).toBe(false);
    expect(validateBidPricing({ basic: 100, freight: 0, basis: 'exworks' }).ok).toBe(true);
    expect(validateBidPricing({ basic: 100, freight: 10, basis: 'delivered' }).ok).toBe(true);
  });

  it('rejects a non-positive basic rate', () => {
    expect(validateBidPricing({ basic: 0, freight: 10, basis: 'delivered' }).ok).toBe(false);
  });

  it('enforces the Stage-2 price-drop lock (≤ Stage-1 total)', () => {
    expect(isValidStage2Rate(95, 100)).toBe(true); // lower
    expect(isValidStage2Rate(100, 100)).toBe(true); // equal
    expect(isValidStage2Rate(101, 100)).toBe(false); // higher — rejected
    expect(isValidStage2Rate(0, 100)).toBe(false); // non-positive
  });

  it('rounds currency to 2 dp', () => {
    expect(round2(112.005)).toBe(112.01);
    expect(round2(112.004)).toBe(112);
  });
});
