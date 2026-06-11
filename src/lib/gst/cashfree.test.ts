import { describe, it, expect } from 'vitest';
import {
  mapCashfreeResponse,
  isOperationalError,
  joinSplitAddress,
  type CashfreeGstResponse,
} from './cashfree';

const GSTIN = '27AAPFU0939F1ZV'; // PAN is chars 3-12
const PAN = 'AAPFU0939F';

describe('mapCashfreeResponse', () => {
  it('verifies an active GSTIN and derives PAN from the GSTIN', () => {
    const json: CashfreeGstResponse = {
      valid: true,
      message: 'GSTIN Exists',
      legal_name_of_business: 'Acme Chemicals Pvt Ltd',
      gst_in_status: 'Active',
      principal_place_address: 'Plot 1, MIDC, Mumbai, Maharashtra - 400001',
    };
    const r = mapCashfreeResponse(json, GSTIN);
    expect(r.ok).toBe(true);
    expect(r.status).toBe('verified');
    expect(r.legalName).toBe('Acme Chemicals Pvt Ltd');
    expect(r.address).toBe('Plot 1, MIDC, Mumbai, Maharashtra - 400001');
    expect(r.pan).toBe(PAN);
  });

  it('rejects when the GSTIN does not exist (valid:false)', () => {
    const json: CashfreeGstResponse = { valid: false, message: "GSTIN Doesn't Exist" };
    const r = mapCashfreeResponse(json, GSTIN);
    expect(r.ok).toBe(false);
    expect(r.status).toBe('rejected');
    expect(r.message).toMatch(/Doesn't Exist/i);
  });

  it('rejects when no legal name is returned', () => {
    const r = mapCashfreeResponse({ valid: true, gst_in_status: 'Active' }, GSTIN);
    expect(r.ok).toBe(false);
    expect(r.status).toBe('rejected');
  });

  it('rejects a cancelled GSTIN even when a legal name is present', () => {
    const json: CashfreeGstResponse = {
      valid: true,
      legal_name_of_business: 'Defunct Traders',
      gst_in_status: 'Cancelled',
    };
    const r = mapCashfreeResponse(json, GSTIN);
    expect(r.ok).toBe(false);
    expect(r.status).toBe('rejected');
    expect(r.message).toMatch(/Cancelled/);
  });

  it('treats a missing status as acceptable (avoids false negatives)', () => {
    const json: CashfreeGstResponse = { valid: true, legal_name_of_business: 'No Status Co' };
    expect(mapCashfreeResponse(json, GSTIN).ok).toBe(true);
  });

  it('falls back to the split address when the flat address string is empty', () => {
    const json: CashfreeGstResponse = {
      valid: true,
      legal_name_of_business: 'Split Address Co',
      gst_in_status: 'Active',
      principal_place_split_address: {
        building_number: '12',
        street: 'MIDC Road',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411001',
      },
    };
    const r = mapCashfreeResponse(json, GSTIN);
    expect(r.ok).toBe(true);
    expect(r.address).toBe('12, MIDC Road, Pune, Maharashtra, 411001');
  });
});

describe('joinSplitAddress', () => {
  it('skips empty components and returns empty for undefined', () => {
    expect(joinSplitAddress(undefined)).toBe('');
    expect(joinSplitAddress({ city: 'Mumbai', state: '', pincode: '400001' })).toBe('Mumbai, 400001');
  });
});

describe('isOperationalError', () => {
  it('treats auth/quota/rate-limit/5xx as our-side (throwable) failures', () => {
    for (const s of [401, 403, 422, 429, 500, 503]) expect(isOperationalError(s)).toBe(true);
  });
  it('treats 2xx and input errors as verdicts, not operational failures', () => {
    for (const s of [200, 400, 404]) expect(isOperationalError(s)).toBe(false);
  });
});
