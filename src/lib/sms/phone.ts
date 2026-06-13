/**
 * Indian mobile normalization → +91 E.164. SMS is restricted to India (+91):
 * the platform is India B2B, and unrestricted destinations are a toll-fraud
 * vector (someone using our SMS sender to pump premium/international numbers).
 */
export function normalizeIndianPhone(input: string): string | null {
  const digits = (input || '').replace(/\D/g, '');
  let local = digits;
  if (local.startsWith('0091')) local = local.slice(4);
  else if (local.length === 12 && local.startsWith('91')) local = local.slice(2);
  else if (local.length === 11 && local.startsWith('0')) local = local.slice(1);
  // Indian mobile numbers are 10 digits and start 6–9.
  if (!/^[6-9]\d{9}$/.test(local)) return null;
  return `+91${local}`;
}

/** True if the string is already a valid +91 E.164 Indian mobile. */
export function isIndianE164(value: string): boolean {
  return /^\+91[6-9]\d{9}$/.test(value);
}
