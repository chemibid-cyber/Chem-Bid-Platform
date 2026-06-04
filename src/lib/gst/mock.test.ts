import { describe, it, expect } from 'vitest';
import { MockGstProvider } from './mock';
import { extractPan } from '@/lib/gstin';

const provider = new MockGstProvider();

describe('MockGstProvider', () => {
  it('verifies a well-formed GSTIN deterministically', async () => {
    const a = await provider.verify('27AAPFU0939F1ZV');
    const b = await provider.verify('27AAPFU0939F1ZV');
    expect(a.ok).toBe(true);
    expect(a.status).toBe('verified');
    expect(a.pan).toBe(extractPan('27AAPFU0939F1ZV'));
    expect(a.legalName).toBe(b.legalName); // deterministic
    expect(a.legalName.length).toBeGreaterThan(0);
    expect(a.address).toContain('Maharashtra'); // state code 27
  });

  it('rejects an invalid GSTIN format', async () => {
    const r = await provider.verify('NOT-A-GSTIN');
    expect(r.ok).toBe(false);
    expect(r.status).toBe('rejected');
  });

  it('rejects the 00 sentinel state code (mock "not found")', async () => {
    const r = await provider.verify('00AAPFU0939F1ZV');
    expect(r.ok).toBe(false);
    expect(r.status).toBe('rejected');
  });
});
