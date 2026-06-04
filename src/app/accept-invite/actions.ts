'use server';

import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
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
  if (consent !== 'on') return { error: 'You must accept the Terms and Privacy Policy.' };

  const pw = validatePassword(password);
  if (!pw.ok) return { error: pw.errors.join(' ') };

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: 'Your invite link has expired. Ask your Admin to resend it.' };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: 'Could not set your password. The link may have expired.' };

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
