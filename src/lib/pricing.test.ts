import { describe, it, expect } from 'vitest';
import {
  computeTotalRate,
  effectiveFreight,
  validateBidPricing,
  isValidStage2Rate,
  stage2Total,
  round2,
} from './pricing';

describe('pricing', () => {
  it('sums material + transport for a Delivered bid (tax defaults to 0)', () => {
    expect(computeTotalRate({ basic: 100, freight: 12.5, basis: 'delivered' })).toBe(112.5);
  });

  it('sums material + transport + tax — the full three-tier total', () => {
    expect(computeTotalRate({ basic: 100, freight: 12.5, tax: 5.25, basis: 'delivered' })).toBe(117.75);
    expect(computeTotalRate({ basic: 100, freight: 0, tax: 18, basis: 'exworks' })).toBe(118);
  });

  it('ZEROES freight under Ex-Works (total = material + tax)', () => {
    expect(effectiveFreight(50, 'exworks')).toBe(0);
    expect(computeTotalRate({ basic: 100, freight: 50, basis: 'exworks' })).toBe(100);
    expect(computeTotalRate({ basic: 100, freight: 50, tax: 10, basis: 'exworks' })).toBe(110);
  });

  it('requires freight for Delivered, not for Ex-Works', () => {
    expect(validateBidPricing({ basic: 100, freight: 0, basis: 'delivered' }).ok).toBe(false);
    expect(validateBidPricing({ basic: 100, freight: 0, basis: 'exworks' }).ok).toBe(true);
    expect(validateBidPricing({ basic: 100, freight: 10, basis: 'delivered' }).ok).toBe(true);
  });

  it('rejects a non-positive material rate and a negative tax', () => {
    expect(validateBidPricing({ basic: 0, freight: 10, basis: 'delivered' }).ok).toBe(false);
    expect(validateBidPricing({ basic: 100, freight: 10, tax: -1, basis: 'delivered' }).ok).toBe(false);
    expect(validateBidPricing({ basic: 100, freight: 10, tax: 0, basis: 'delivered' }).ok).toBe(true);
  });

  it('enforces the Stage-2 price-drop lock on the MATERIAL rate', () => {
    expect(isValidStage2Rate(95, 100)).toBe(true); // lower material
    expect(isValidStage2Rate(100, 100)).toBe(true); // equal
    expect(isValidStage2Rate(101, 100)).toBe(false); // higher — rejected
    expect(isValidStage2Rate(0, 100)).toBe(false); // non-positive
  });

  it('carries Stage-1 transport + tax into the all-in Stage-2 total', () => {
    expect(stage2Total(90, 5, 4.5)).toBe(99.5);
    expect(stage2Total(90, null, null)).toBe(90); // legacy rows: no freight/tax recorded
    expect(stage2Total(90, '5', undefined)).toBe(95); // numeric-as-string from DB
  });

  it('rounds currency to 2 dp', () => {
    expect(round2(112.005)).toBe(112.01);
    expect(round2(112.004)).toBe(112);
  });
});
