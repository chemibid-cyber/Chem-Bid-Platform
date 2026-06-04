import { describe, it, expect } from 'vitest';
import {
  tokenize,
  wholeTokenMatch,
  rolesIntersect,
  isQualifiedSeller,
  type AuctionTarget,
  type SellerCandidate,
} from './targeting';

describe('targeting', () => {
  it('tokenizes on whitespace + punctuation', () => {
    expect(tokenize('80% Ethanol / 20% Water')).toEqual(['80', 'ethanol', '20', 'water']);
  });

  it('matches WHOLE tokens only — never substrings', () => {
    expect(wholeTokenMatch('99% IPA solvent', 'IPA')).toBe(true);
    expect(wholeTokenMatch('tdIPArt blend', 'IPA')).toBe(false); // the v0.1 substring trap
    expect(wholeTokenMatch('Iso Propyl Alcohol', 'propyl')).toBe(true);
  });

  it('intersects roles, treating an empty buyer filter as "any"', () => {
    expect(rolesIntersect(['mfr', 'trader'], [])).toBe(true);
    expect(rolesIntersect(['mfr'], ['dist'])).toBe(false);
    expect(rolesIntersect(['mfr', 'dist'], ['dist'])).toBe(true);
  });

  const casAuction: AuctionTarget = {
    casNumber: '108-88-3',
    name: 'Toluene',
    isMixture: false,
    matchText: 'Toluene',
    grade: 'pure',
    supplierFilter: ['mfr'],
  };

  it('qualifies a seller on CAS + role match', () => {
    const seller: SellerCandidate = {
      companyId: 's1',
      casNumber: '108-88-3',
      name: 'Toluene',
      isMixture: false,
      mixtureText: null,
      grade: 'pure',
      roles: ['mfr', 'trader'],
    };
    expect(isQualifiedSeller(casAuction, seller)).toBe(true);
  });

  it('drops a CAS mismatch and a role mismatch', () => {
    const wrongCas: SellerCandidate = {
      companyId: 's2',
      casNumber: '67-64-1',
      name: 'Acetone',
      isMixture: false,
      mixtureText: null,
      grade: 'pure',
      roles: ['mfr'],
    };
    expect(isQualifiedSeller(casAuction, wrongCas)).toBe(false);

    const wrongRole: SellerCandidate = {
      companyId: 's3',
      casNumber: '108-88-3',
      name: 'Toluene',
      isMixture: false,
      mixtureText: null,
      grade: 'pure',
      roles: ['dist'],
    };
    expect(isQualifiedSeller(casAuction, wrongRole)).toBe(false);
  });

  it('qualifies a mixture by whole-token match', () => {
    const mixAuction: AuctionTarget = {
      casNumber: null,
      name: 'Ethanol Water Blend',
      isMixture: true,
      matchText: '80% Ethanol / 20% Water',
      grade: 'trade',
      supplierFilter: [],
    };
    const seller: SellerCandidate = {
      companyId: 's4',
      casNumber: null,
      name: 'Ethanol blend',
      isMixture: true,
      mixtureText: '80% Ethanol 20% Water',
      grade: 'trade',
      roles: ['trader'],
    };
    expect(isQualifiedSeller(mixAuction, seller)).toBe(true);
  });
});
