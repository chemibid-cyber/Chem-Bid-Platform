/**
 * GSTIN utilities. A GSTIN is the unit of corporate identity (CLAUDE.md §2.1).
 *
 * Structure (15 chars): [2 state digits][10-char PAN][1 entity char]['Z'][1 checksum].
 * PAN = chars 3–12 (1-indexed) → slice(2, 12).
 */

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const CODEPOINTS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function normalizeGstin(gstin: string): string {
  return gstin.trim().toUpperCase();
}

/** Structural validity only (no checksum). Used as the client/server format guard. */
export function isValidGstinFormat(gstin: string): boolean {
  return GSTIN_REGEX.test(normalizeGstin(gstin));
}

/** PAN is embedded in the GSTIN at chars 3–12. */
export function extractPan(gstin: string): string {
  return normalizeGstin(gstin).slice(2, 12);
}

export function isValidPan(pan: string): boolean {
  return PAN_REGEX.test(pan.trim().toUpperCase());
}

/** Official GSTIN checksum: weighted mod-36 over the first 14 chars. */
export function gstinChecksumChar(first14: string): string {
  const input = first14.toUpperCase();
  const mod = CODEPOINTS.length; // 36
  let factor = 2;
  let sum = 0;
  for (let i = input.length - 1; i >= 0; i--) {
    const cp = CODEPOINTS.indexOf(input[i]!);
    if (cp < 0) return ''; // invalid character
    let digit = factor * cp;
    factor = factor === 2 ? 1 : 2;
    digit = Math.floor(digit / mod) + (digit % mod);
    sum += digit;
  }
  const checkCp = (mod - (sum % mod)) % mod;
  return CODEPOINTS[checkCp]!;
}

/** Full validity: structural format AND a correct 15th checksum char. */
export function isValidGstin(gstin: string): boolean {
  const g = normalizeGstin(gstin);
  if (!isValidGstinFormat(g)) return false;
  return gstinChecksumChar(g.slice(0, 14)) === g[14];
}

/** State code is the first two digits (01–37 + a few special codes). */
export function gstinStateCode(gstin: string): string {
  return normalizeGstin(gstin).slice(0, 2);
}
