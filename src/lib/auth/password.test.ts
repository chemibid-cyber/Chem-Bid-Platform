import { describe, it, expect } from 'vitest';
import { validatePassword } from './password';

describe('validatePassword', () => {
  it('rejects short passwords', () => {
    expect(validatePassword('Ab1!').ok).toBe(false);
  });

  it('rejects low-complexity passwords', () => {
    expect(validatePassword('alllowercase').ok).toBe(false);
    expect(validatePassword('12345678').ok).toBe(false);
  });

  it('accepts a strong password (3+ classes, 8+ chars)', () => {
    expect(validatePassword('Toluene99!').ok).toBe(true);
    expect(validatePassword('acetone7K').ok).toBe(true); // lower+upper+digit
  });
});
