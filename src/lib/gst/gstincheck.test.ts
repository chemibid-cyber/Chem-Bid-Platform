import { describe, it, expect } from 'vitest';
import {
  mapGstinCheckData,
  isGstinVerdictError,
  joinGstinCheckAddress,
  type GstinCheckData,
} from './gstincheck';

const GSTIN = '27AAPFU0939F1ZV';
const PAN = 'AAPFU0939F';

describe('mapGstinCheckData', () => {
  it('verifies an Active GSTIN, derives PAN, prefers the flat address string', () => {
    const data: GstinCheckData = {
      gstin: GSTIN,
      lgnm: 'ACME CHEMICALS PRIVATE LIMITED',
      sts: 'Active',
      pradr: { adr: 'Plot 1, MIDC, Mumbai, Maharashtra, 400001' },
    };
    const r = mapGstinCheckData(data, GSTIN);
    expect(r.ok).toBe(true);
    expect(r.status).toBe('verified');
    expect(r.legalName).toBe('ACME CHEMICALS PRIVATE LIMITED');
    expect(r.address).toBe('Plot 1, MIDC, Mumbai, Maharashtra, 400001');
    expect(r.pan).toBe(PAN);
  });

  it('assembles the address from split components when no flat string exists', () => {
    const data: GstinCheckData = {
      lgnm: 'Split Addr Co',
      sts: 'Active',
      pradr: {
        addr: { bno: '12', st: 'MIDC Road', dst: 'Pune', stcd: 'Maharashtra', pncd: '411001' },
      },
    };
    const r = mapGstinCheckData(data, GSTIN);
    expect(r.ok).toBe(true);
    expect(r.address).toBe('12, MIDC Road, Pune, Maharashtra, 411001');
  });

  it('rejects a Cancelled GSTIN even with a legal name', () => {
    const r = mapGstinCheckData({ lgnm: 'Defunct Traders', sts: 'Cancelled' }, GSTIN);
    expect(r.ok).toBe(false);
    expect(r.status).toBe('rejected');
    expect(r.message).toMatch(/Cancelled/);
  });

  it('falls back to the trade name when legal name is missing; rejects when both absent', () => {
    expect(mapGstinCheckData({ tradeNam: 'Acme Traders', sts: 'Active' }, GSTIN).legalName).toBe('Acme Traders');
    expect(mapGstinCheckData({ sts: 'Active' }, GSTIN).status).toBe('rejected');
  });

  it('treats a missing status as acceptable (avoids false negatives)', () => {
    expect(mapGstinCheckData({ lgnm: 'No Status Co' }, GSTIN).ok).toBe(true);
  });
});

describe('isGstinVerdictError', () => {
  it('classifies invalid/not-found GSTIN errors as rejectable verdicts', () => {
    expect(isGstinVerdictError('INVALID_GSTIN', undefined)).toBe(true);
    expect(isGstinVerdictError('GSTIN_NOT_FOUND', undefined)).toBe(true);
    expect(isGstinVerdictError(undefined, 'Invalid GSTIN number')).toBe(true);
  });

  it('classifies upstream/auth/credit errors as operational (must throw, not reject)', () => {
    expect(isGstinVerdictError('GST_SERVER_NOT_RESPOND', 'System error occurred.')).toBe(false);
    expect(isGstinVerdictError('AUTHENTICATION_FAILED', 'Invalid API key')).toBe(false);
    expect(isGstinVerdictError('CREDIT_EXHAUSTED', 'Recharge your account')).toBe(false);
    expect(isGstinVerdictError(undefined, undefined)).toBe(false);
  });
});

describe('joinGstinCheckAddress', () => {
  it('skips empty parts and handles undefined', () => {
    expect(joinGstinCheckAddress(undefined)).toBe('');
    expect(joinGstinCheckAddress({ city: 'Mumbai', pncd: '400001', st: '' })).toBe('Mumbai, 400001');
  });
});
