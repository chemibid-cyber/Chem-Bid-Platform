/**
 * OTP core — generation, peppered hashing, constant-time verification.
 *
 * Security model (see the eng review folded into the plan):
 *  - 6-digit code from a CSPRNG (no modulo bias).
 *  - Stored as HMAC-SHA256(code, OTP_HMAC_SECRET) — a read-only DB leak cannot be
 *    cracked offline because the pepper isn't in the DB. We do NOT use bcrypt:
 *    the keyspace is only 10^6 so a slow KDF buys nothing and would tax the hot
 *    serverless path; the pepper is the real protection.
 *  - Verification is constant-time (timingSafeEqual) to avoid leaking via timing.
 *  - Single-use, short-TTL, attempt-capped — all enforced in the DB (lib actions),
 *    because the in-memory rate limiter can't gate cost/abuse across Vercel lambdas.
 */
import { createHmac, randomInt, timingSafeEqual } from 'crypto';

/** Code lifetime. */
export const OTP_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
/** Max wrong guesses before the code is dead. */
export const OTP_MAX_ATTEMPTS = 5;
/** Minimum gap between sends, per user+channel (anti-spam). */
export const OTP_RESEND_COOLDOWN_MS = 45 * 1000;
/** Max sends per rolling hour, per user+channel. */
export const OTP_MAX_SENDS_PER_HOUR = 5;
/** Max sends per rolling hour to any single destination (anti SMS-bomb / toll-fraud). */
export const OTP_MAX_SENDS_PER_DEST_HOUR = 5;
/** Platform-wide SMS sends per rolling day — a hard cost kill-switch. */
export const OTP_GLOBAL_SMS_DAILY_CAP = 500;

function pepper(): string {
  // Prefer a dedicated secret; fall back to CRON_SECRET (already present in every
  // environment) so the feature works without provisioning a new env var. Either
  // way the pepper is a server secret that is NOT stored in otp_codes, so a
  // read-only DB leak still can't crack codes offline.
  const s = process.env.OTP_HMAC_SECRET || process.env.CRON_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      'No OTP pepper available — set OTP_HMAC_SECRET (preferred) or CRON_SECRET (>= 16 chars).',
    );
  }
  return s;
}

/** Cryptographically-random 6-digit code, zero-padded. No modulo bias. */
export function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/** HMAC-SHA256 of the code under the server pepper, hex-encoded. */
export function hashOtpCode(code: string): string {
  return createHmac('sha256', pepper()).update(code).digest('hex');
}

/** Constant-time comparison of a candidate code against a stored hash. */
export function verifyOtpCode(code: string, storedHash: string): boolean {
  const candidate = Buffer.from(hashOtpCode(code), 'hex');
  let stored: Buffer;
  try {
    stored = Buffer.from(storedHash, 'hex');
  } catch {
    return false;
  }
  if (candidate.length === 0 || candidate.length !== stored.length) return false;
  return timingSafeEqual(candidate, stored);
}
