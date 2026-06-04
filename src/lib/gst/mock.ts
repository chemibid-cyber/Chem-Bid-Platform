import { extractPan, isValidGstinFormat, normalizeGstin, gstinStateCode } from '@/lib/gstin';
import type { GstVerificationProvider, GstVerificationResult } from './provider';

const STATE: Record<string, { state: string; city: string }> = {
  '27': { state: 'Maharashtra', city: 'Mumbai' },
  '24': { state: 'Gujarat', city: 'Ahmedabad' },
  '07': { state: 'Delhi', city: 'New Delhi' },
  '29': { state: 'Karnataka', city: 'Bengaluru' },
  '33': { state: 'Tamil Nadu', city: 'Chennai' },
  '06': { state: 'Haryana', city: 'Gurugram' },
  '09': { state: 'Uttar Pradesh', city: 'Noida' },
  '36': { state: 'Telangana', city: 'Hyderabad' },
};

const SUFFIXES = ['Chemicals', 'Industries', 'Specialities', 'Organics', 'Polymers', 'Enterprises'];

/** Deterministic pseudo-name so the same GSTIN always yields the same identity. */
function deterministicName(pan: string): string {
  const letters = pan.slice(0, 5);
  const seed = letters.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const suffix = SUFFIXES[seed % SUFFIXES.length];
  // Title-case the first three PAN letters into a readable stem.
  const stem = letters.charAt(0) + letters.slice(1, 3).toLowerCase();
  return `${stem}${letters.slice(3, 5).toLowerCase()} ${suffix} Pvt Ltd`;
}

/**
 * MockGstProvider — deterministic fake data, no network, no key.
 * Convention for testing the unhappy path: a GSTIN whose state code is "00"
 * is treated as rejected (mirrors a real "GSTIN not found").
 */
export class MockGstProvider implements GstVerificationProvider {
  readonly name = 'mock';

  async verify(gstinRaw: string): Promise<GstVerificationResult> {
    const gstin = normalizeGstin(gstinRaw);

    if (!isValidGstinFormat(gstin)) {
      return {
        ok: false,
        status: 'rejected',
        gstin,
        pan: '',
        legalName: '',
        address: '',
        message: 'GSTIN format is invalid.',
      };
    }

    const sc = gstinStateCode(gstin);
    if (sc === '00') {
      return {
        ok: false,
        status: 'rejected',
        gstin,
        pan: extractPan(gstin),
        legalName: '',
        address: '',
        message: 'GSTIN not found on the GST network (mock rejection).',
      };
    }

    const pan = extractPan(gstin);
    const loc = STATE[sc] ?? { state: 'India', city: 'Industrial Area' };
    const pin = 100000 + (pan.charCodeAt(4) % 90) * 1000 + (pan.charCodeAt(5) % 10) * 100 + 1;

    return {
      ok: true,
      status: 'verified',
      gstin,
      pan,
      legalName: deterministicName(pan),
      address: `Plot ${pan.charCodeAt(0) % 200}, MIDC Industrial Estate, ${loc.city}, ${loc.state} - ${pin}`,
      message: 'Verified (mock).',
    };
  }
}
