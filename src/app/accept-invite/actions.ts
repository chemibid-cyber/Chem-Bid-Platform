'use server';

import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import type { EmailOtpType } from '@supabase/supabase-js';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { createClient } from '@/lib/supabase/server';
import { validatePassword } from '@/lib/auth/password';
import { recordAudit } from '@/lib/audit';

export type AcceptState = { error?: string } | null;

export async function acceptInviteAction(
  _prev: AcceptState,
  formData: FormData,
): Promise<AcceptState> {
  const password = String(formData.get('password') ?? '');
  const consent = String(formData.get('consent') ?? '');
  const tokenHash = String(formData.get('token_hash') ?? '');
  const otpType = (String(formData.get('type') ?? 'invite') || 'invite') as EmailOtpType;

  if (consent !== 'on') return { error: 'You must accept the Terms and Privacy Policy.' };

  const pw = validatePassword(password);
  if (!pw.ok) return { error: pw.errors.join(' ') };

  const supabase = createClient();

  // Verify the one-time invite token NOW (on submit) — not on page load — so an
  // email link-scanner that merely opened the link can't have consumed it first.
  // This consumes the single-use token AND establishes the session. The invite
  // token also proves email ownership, so no separate email-verification step is
  // needed. Mirrors updatePasswordAction in (auth)/actions.ts.
  if (tokenHash) {
    const { error: verr } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType });
    if (verr) {
      return { error: 'Your invite link is invalid or has expired. Ask your admin to resend it.' };
    }
  }

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { error: 'Your invite link is invalid or has expired. Ask your admin to resend it.' };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: 'Could not set your password. The link may have expired.' };

  // The company is already linked (users.companyId was set at invite time), so
  // there is no GSTIN/company step for invited users — just activate the row and
  // stamp T&C + DPDP consent.
  await db
    .update(users)
    .set({ status: 'active', tncAcceptedAt: new Date(), dpdpConsentAt: new Date() })
    .where(eq(users.id, auth.user.id));

  await recordAudit({
    actorUserId: auth.user.id,
    entityType: 'user',
    entityId: auth.user.id,
    action: 'user.activated',
  });

  redirect('/dashboard');
}
