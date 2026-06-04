/**
 * Pure CAS helpers (CLAUDE.md §2.7 / FR-2.2). The network + cache live in
 * resolver.ts; this file is the testable logic: CID dedup, 0/1/many branching,
 * and CAS-number format + checksum validation.
 */
export interface CasCandidate {
  cid: string;
  name: string;
}

export type CasResolution =
  | { status: 'found'; name: string; cid: string; candidates: CasCandidate[] }
  | { status: 'not_found' }
  | { status: 'ambiguous'; candidates: CasCandidate[] };

/** Dedup CIDs (a CAS is a PubChem *synonym*, so a lookup can repeat/return many). */
export function dedupeCids(cids: Array<number | string>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of cids) {
    const s = String(c).trim();
    if (s && s !== '0' && !seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}

/** 0 to not_found (manual entry); 1 to found (autofill); 2+ to ambiguous (picker). */
export function classifyCas(candidates: CasCandidate[]): CasResolution {
  if (candidates.length === 0) return { status: 'not_found' };
  if (candidates.length === 1) {
    const only = candidates[0]!;
    return { status: 'found', name: only.name, cid: only.cid, candidates };
  }
  return { status: 'ambiguous', candidates };
}

const CAS_REGEX = /^(\d{2,7})-(\d{2})-(\d)$/;

/** CAS format + check-digit validation (last digit is a weighted mod-10 checksum). */
export function isValidCasFormat(cas: string): boolean {
  const m = CAS_REGEX.exec(cas.trim());
  if (!m) return false;
  const digits = (m[1]! + m[2]!).split('').map(Number);
  const check = Number(m[3]);
  let sum = 0;
  // Weight each digit by its position from the right (1-indexed), excluding check digit.
  for (let i = 0; i < digits.length; i++) {
    sum += digits[digits.length - 1 - i]! * (i + 1);
  }
  return sum % 10 === check;
}
