'use server';

import { and, eq, gt, isNull, lt, sql, desc, count } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { otpCodes, users } from '@/lib/db/schema';
import { requireUser } from '@/lib/auth/session';
import { recordAudit, recordAuditTx, AuditAction } from '@/lib/audit';
import { sendEmail } from '@/lib/email';
import { otpEmail } from '@/lib/email/templates';
import { getSmsProvider, isSmsLive, normalizeIndianPhone } from '@/lib/sms';
import {
  generateOtpCode,
  hashOtpCode,
  verifyOtpCode,
  OTP_CODE_TTL_MS,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_MAX_SENDS_PER_HOUR,
  OTP_MAX_SENDS_PER_DEST_HOUR,
  OTP_GLOBAL_SMS_DAILY_CAP,
} from '@/lib/otp';

export type VerifyFormState = { error?: string; success?: string } | null;

type Channel = 'email' | 'phone';

// Identical message for every verify failure — no oracle (don't reveal whether a
// code exists, expired, was wrong, or hit the attempt cap).
const GENERIC_VERIFY_FAIL = 'That code is invalid or has expired. Request a new one.';

function maskEmail(e: string): string {
  const [u, d] = e.split('@');
  if (!d) return e;
  const head = u.length <= 2 ? u[0] ?? '' : `${u.slice(0, 2)}`;
  return `${head}${'*'.repeat(Math.max(1, u.length - head.length))}@${d}`;
}
function maskPhone(p: string): string {
  return p.length >= 4 ? `${'*'.repeat(p.length - 4)}${p.slice(-4)}` : p;
}

async function countSince(where: ReturnType<typeof and>): Promise<number> {
  const [row] = await db.select({ c: count() }).from(otpCodes).where(where);
  return Number(row?.c ?? 0);
}

/**
 * Send a fresh OTP to the signed-in user's email or phone.
 * Rate limits are enforced in Postgres (created_at windows) because the in-memory
 * limiter can't gate cost across Vercel lambdas. SMS is +91-only and the phone
 * destination is the user's own number (toll-fraud guard). A code row is only kept
 * if the provider accepted the send.
 */
export async function requestContactOtpAction(
  channel: Channel,
  phoneInput?: string,
): Promise<VerifyFormState> {
  if (channel !== 'email' && channel !== 'phone') return { error: 'Unknown channel.' };
  const { user } = await requireUser();

  // Resolve + lock the destination server-side.
  let destination: string;
  if (channel === 'email') {
    destination = user.email;
  } else {
    const normalized = normalizeIndianPhone(phoneInput ?? user.phone ?? '');
    if (!normalized) {
      return { error: 'Enter a valid Indian mobile number (10 digits, starting 6–9).' };
    }
    destination = normalized;
    if (!isSmsLive()) {
      // No real SMS provider configured. In prod, don't pretend to send.
      const prod = (process.env.VERCEL_ENV ?? process.env.NODE_ENV) === 'production';
      if (prod) {
        return {
          error:
            'Phone verification isn’t switched on yet (awaiting our SMS provider + DLT approval). Your email can be verified now.',
        };
      }
    }
  }

  const hourAgo = sql`now() - interval '1 hour'`;
  const cooldownAgo = sql`now() - ${`${Math.round(OTP_RESEND_COOLDOWN_MS / 1000)} seconds`}::interval`;

  // Cooldown (per user+channel).
  const recent = await countSince(
    and(eq(otpCodes.userId, user.id), eq(otpCodes.channel, channel), gt(otpCodes.createdAt, cooldownAgo)),
  );
  if (recent > 0) {
    return { error: 'Please wait a few seconds before requesting another code.' };
  }
  // Per user+channel hourly cap.
  const perUser = await countSince(
    and(eq(otpCodes.userId, user.id), eq(otpCodes.channel, channel), gt(otpCodes.createdAt, hourAgo)),
  );
  if (perUser >= OTP_MAX_SENDS_PER_HOUR) {
    return { error: 'Too many codes requested. Please try again in an hour.' };
  }
  // Per-destination hourly cap (anti SMS-bomb / abuse of one number).
  const perDest = await countSince(
    and(eq(otpCodes.destination, destination), gt(otpCodes.createdAt, hourAgo)),
  );
  if (perDest >= OTP_MAX_SENDS_PER_DEST_HOUR) {
    return { error: 'Too many codes requested for that contact. Please try again later.' };
  }
  // Global SMS kill-switch (cost ceiling) — phone only.
  if (channel === 'phone') {
    const dayAgo = sql`now() - interval '24 hours'`;
    const globalSms = await countSince(
      and(eq(otpCodes.channel, 'phone'), gt(otpCodes.createdAt, dayAgo)),
    );
    if (globalSms >= OTP_GLOBAL_SMS_DAILY_CAP) {
      // eslint-disable-next-line no-console
      console.error('[otp] GLOBAL SMS daily cap hit — phone OTP sending paused.');
      return { error: 'Phone verification is temporarily unavailable. Please try again later.' };
    }
  }

  // Invalidate any prior unconsumed codes for this user+channel → only one live code.
  await db
    .update(otpCodes)
    .set({ consumedAt: sql`now()` })
    .where(and(eq(otpCodes.userId, user.id), eq(otpCodes.channel, channel), isNull(otpCodes.consumedAt)));

  const code = generateOtpCode();
  const [row] = await db
    .insert(otpCodes)
    .values({
      userId: user.id,
      channel,
      destination,
      codeHash: hashOtpCode(code),
      expiresAt: new Date(Date.now() + OTP_CODE_TTL_MS),
    })
    .returning({ id: otpCodes.id });

  // Deliver. If sending fails, kill the row so it can't be used, then report.
  let sent = false;
  if (channel === 'email') {
    const tmpl = otpEmail({ code });
    const r = await sendEmail({ to: destination, subject: tmpl.subject, html: tmpl.html, text: tmpl.text });
    sent = r.ok;
  } else {
    const r = await getSmsProvider().send(destination, code);
    sent = r.ok;
  }

  if (!sent) {
    if (row?.id) {
      await db.update(otpCodes).set({ consumedAt: sql`now()` }).where(eq(otpCodes.id, row.id));
    }
    return { error: 'We couldn’t send the code right now. Please try again in a moment.' };
  }

  await recordAudit({
    actorUserId: user.id,
    entityType: 'user',
    entityId: user.id,
    action: AuditAction.OtpSent,
    snapshot: { channel, destination: channel === 'email' ? maskEmail(destination) : maskPhone(destination) },
  });

  const where = channel === 'email' ? maskEmail(destination) : maskPhone(destination);
  return { success: `Code sent to ${where}. It expires in 10 minutes.` };
}

/**
 * Verify a submitted code. Attempt-counting is atomic (single UPDATE guarded by
 * attempts<max / not-consumed / not-expired) to defeat the TOCTOU race, the hash
 * compare is constant-time, and consume + set verified flag + audit commit in one
 * transaction. All failure modes return the same generic message.
 */
export async function verifyContactOtpAction(
  channel: Channel,
  codeInput: string,
): Promise<VerifyFormState> {
  if (channel !== 'email' && channel !== 'phone') return { error: 'Unknown channel.' };
  const { user } = await requireUser();

  const code = (codeInput ?? '').replace(/\D/g, '');
  if (code.length !== 6) return { error: GENERIC_VERIFY_FAIL };

  // Latest live code for this user+channel (expiry checked in the DB predicate).
  const [live] = await db
    .select({ id: otpCodes.id, codeHash: otpCodes.codeHash, destination: otpCodes.destination })
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.userId, user.id),
        eq(otpCodes.channel, channel),
        isNull(otpCodes.consumedAt),
        gt(otpCodes.expiresAt, sql`now()`),
      ),
    )
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);
  if (!live) return { error: GENERIC_VERIFY_FAIL };

  // Atomically claim one attempt (defeats parallel-guess race).
  const claimed = await db
    .update(otpCodes)
    .set({ attempts: sql`${otpCodes.attempts} + 1` })
    .where(
      and(
        eq(otpCodes.id, live.id),
        isNull(otpCodes.consumedAt),
        lt(otpCodes.attempts, OTP_MAX_ATTEMPTS),
        gt(otpCodes.expiresAt, sql`now()`),
      ),
    )
    .returning({ id: otpCodes.id });
  if (claimed.length === 0) return { error: GENERIC_VERIFY_FAIL };

  if (!verifyOtpCode(code, live.codeHash)) return { error: GENERIC_VERIFY_FAIL };

  // Correct code → consume + set verified flag + audit, atomically.
  try {
    await db.transaction(async (tx) => {
      const consumed = await tx
        .update(otpCodes)
        .set({ consumedAt: sql`now()` })
        .where(and(eq(otpCodes.id, live.id), isNull(otpCodes.consumedAt)))
        .returning({ id: otpCodes.id });
      if (consumed.length === 0) throw new Error('race'); // someone else consumed it

      if (channel === 'email') {
        await tx.update(users).set({ emailVerifiedAt: sql`now()` }).where(eq(users.id, user.id));
      } else {
        // Bind the verified number to the account.
        await tx
          .update(users)
          .set({ phone: live.destination, phoneVerifiedAt: sql`now()` })
          .where(eq(users.id, user.id));
      }

      await recordAuditTx(tx, {
        actorUserId: user.id,
        entityType: 'user',
        entityId: user.id,
        action: channel === 'email' ? AuditAction.EmailVerified : AuditAction.PhoneVerified,
        snapshot: { channel },
      });
    });
  } catch {
    return { error: GENERIC_VERIFY_FAIL };
  }

  revalidatePath('/settings');
  return { success: channel === 'email' ? 'Your email is verified. ✅' : 'Your phone number is verified. ✅' };
}
