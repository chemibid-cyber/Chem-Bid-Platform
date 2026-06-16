import { describe, it, expect } from 'vitest';
import {
  transportTotal,
  packingTotal,
  validateQuote,
  providerMatchesRequest,
} from './totals';

describe('service totals', () => {
  it('transport: rate × qty + absolute tax', () => {
    expect(transportTotal(2.5, 10000, 4500)).toBe(29500); // 25,000 + 4,500
    expect(transportTotal(2.5, 10000, 0)).toBe(25000);
  });

  it('packing: price × pieces + absolute tax', () => {
    expect(packingTotal(450, 200, 16200)).toBe(106200); // 90,000 + 16,200
    expect(packingTotal(450.5, 3, 0)).toBe(1351.5);
  });

  it('rejects non-positive rates and negative tax', () => {
    expect(validateQuote(0, 0).ok).toBe(false);
    expect(validateQuote(10, -1).ok).toBe(false);
    expect(validateQuote(10, 0).ok).toBe(true);
  });
});

describe('provider matching', () => {
  const transporter = {
    active: true,
    isTransporter: true,
    vehicleTypes: ['ss_tanker', 'trailer'],
    isPackingSupplier: false,
    packingTypes: [],
  };
  const packer = {
    active: true,
    isTransporter: false,
    vehicleTypes: [],
    isPackingSupplier: true,
    packingTypes: ['drums', 'carboys'],
  };

  it('matches transporters on ANY requested vehicle class', () => {
    expect(
      providerMatchesRequest(transporter, { kind: 'transport', vehicleTypes: ['trailer'], packingType: null }),
    ).toBe(true);
    expect(
      providerMatchesRequest(transporter, {
        kind: 'transport',
        vehicleTypes: ['hdpe_tanker', 'ss_tanker'],
        packingType: null,
      }),
    ).toBe(true);
    expect(
      providerMatchesRequest(transporter, { kind: 'transport', vehicleTypes: ['body_truck'], packingType: null }),
    ).toBe(false);
  });

  it('matches packing suppliers on the exact packaging type', () => {
    expect(providerMatchesRequest(packer, { kind: 'packing', vehicleTypes: [], packingType: 'drums' })).toBe(true);
    expect(providerMatchesRequest(packer, { kind: 'packing', vehicleTypes: [], packingType: 'iso_tank' })).toBe(false);
  });

  it('reaches ANY packing supplier for a custom ("Other") packing type', () => {
    // A free-text type the standard list doesn't cover can't be matched exactly,
    // so every packing supplier sees it (they read the spec and decide).
    expect(
      providerMatchesRequest(packer, { kind: 'packing', vehicleTypes: [], packingType: 'Glass bottles' }),
    ).toBe(true);
    // …but a transporter still never matches a packing inquiry.
    expect(
      providerMatchesRequest(transporter, { kind: 'packing', vehicleTypes: [], packingType: 'Glass bottles' }),
    ).toBe(false);
  });

  it('never matches across service kinds or inactive profiles', () => {
    expect(providerMatchesRequest(packer, { kind: 'transport', vehicleTypes: ['trailer'], packingType: null })).toBe(false);
    expect(providerMatchesRequest(transporter, { kind: 'packing', vehicleTypes: [], packingType: 'drums' })).toBe(false);
    expect(
      providerMatchesRequest({ ...transporter, active: false }, { kind: 'transport', vehicleTypes: ['trailer'], packingType: null }),
    ).toBe(false);
  });
});
