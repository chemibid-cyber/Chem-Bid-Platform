/** Password policy (FR-1.7): min 8 chars + complexity. Pure + unit-tested. */
export interface PasswordCheck {
  ok: boolean;
  errors: string[];
}

export function validatePassword(pw: string): PasswordCheck {
  const errors: string[] = [];
  if (pw.length < 8) errors.push('Use at least 8 characters.');

  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(pw)).length;
  if (classes < 3) {
    errors.push('Use at least 3 of: lowercase, uppercase, number, symbol.');
  }
  return { ok: errors.length === 0, errors };
}
