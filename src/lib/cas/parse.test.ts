import { describe, it, expect } from 'vitest';
import { dedupeCids, classifyCas, isValidCasFormat, type CasCandidate } from './parse';

describe('cas parse', () => {
  it('dedupes CIDs and drops zeros/blanks', () => {
    expect(dedupeCids([1140, 1140, '1140', 0, ' '])).toEqual(['1140']);
    expect(dedupeCids([2, 3, 2, 4])).toEqual(['2', '3', '4']);
  });

  it('classifies 0 / 1 / many', () => {
    expect(classifyCas([]).status).toBe('not_found');

    const one: CasCandidate[] = [{ cid: '1140', name: 'Toluene' }];
    const res = classifyCas(one);
    expect(res.status).toBe('found');
    if (res.status === 'found') {
      expect(res.name).toBe('Toluene');
      expect(res.cid).toBe('1140');
    }

    const many: CasCandidate[] = [
      { cid: '1', name: 'A' },
      { cid: '2', name: 'B' },
    ];
    expect(classifyCas(many).status).toBe('ambiguous');
  });

  it('validates CAS check digits', () => {
    expect(isValidCasFormat('108-88-3')).toBe(true); // Toluene
    expect(isValidCasFormat('67-64-1')).toBe(true); // Acetone
    expect(isValidCasFormat('7732-18-5')).toBe(true); // Water
    expect(isValidCasFormat('108-88-4')).toBe(false); // wrong check digit
    expect(isValidCasFormat('not-a-cas')).toBe(false);
  });
});
