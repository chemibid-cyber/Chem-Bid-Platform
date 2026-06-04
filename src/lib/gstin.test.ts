import { describe, it, expect } from 'vitest';
import {
  isValidGstinFormat,
  isValidGstin,
  extractPan,
  isValidPan,
  gstinChecksumChar,
  normalizeGstin,
  gstinStateCode,
} from './gstin';

describe('gstin', () => {
  it('accepts a well-formed GSTIN format', () => {
    expect(isValidGstinFormat('27AAPFU0939F1ZV')).toBe(true);
    expect(isValidGstinFormat('  27aapfu0939f1zv  ')).toBe(true); // normalized
  });

  it('rejects malformed GSTINs', () => {
    expect(isValidGstinFormat('27AAPFU0939F1Z')).toBe(false); // 14 chars
    expect(isValidGstinFormat('AA27APFU0939F1ZV')).toBe(false); // letters first
    expect(isValidGstinFormat('27AAPFU0939F1AV')).toBe(false); // 13th char not Z
  });

  it('extracts PAN from chars 3–12', () => {
    expect(extractPan('27AAPFU0939F1ZV')).toBe('AAPFU0939F');
    expect(isValidPan(extractPan('27AAPFU0939F1ZV'))).toBe(true);
  });

  it('computes a self-consistent checksum (round-trip)', () => {
    const first14 = '27AAPFU0939F1Z';
    const check = gstinChecksumChar(first14);
    expect(check).toHaveLength(1);
    expect(isValidGstin(first14 + check)).toBe(true);
  });

  it('rejects a GSTIN with a wrong checksum char', () => {
    const first14 = '27AAPFU0939F1Z';
    const correct = gstinChecksumChar(first14);
    const wrong = correct === 'A' ? 'B' : 'A';
    expect(isValidGstin(first14 + wrong)).toBe(false);
  });

  it('exposes state code and normalization', () => {
    expect(gstinStateCode('27AAPFU0939F1ZV')).toBe('27');
    expect(normalizeGstin(' 27aapfu0939f1zv ')).toBe('27AAPFU0939F1ZV');
  });
});
