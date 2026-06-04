'use server';

import { and, eq, count } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { requireUser } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { recordAudit, AuditAction } from '@/lib/audit';

export type DataFormState = { error?: string; success?: string } | null;

export async function setMarketingOptOutAction(optOut: boolean): Promise<void> {
  const { user } = await requireUser();
  await db.update(users).set({ marketingOptOut: optOut }).where(eq(users.id, user.id));
  revalidatePath('/settings/data');
}

/**
 * DPDP account-deletion request: soft-disable the user + stamp deletion_requested_at.
 * A purge job (operator-run) respects open-dispute legal holds. Audit history is
 * never broken. The last active Admin must hand over first.
 */
export async function requestDeletionAction(
  _prev: DataFormState,
  formData: FormData,
): Promise<DataFormState> {
  const { user, company } = await requireUser();
  if (String(formData.get('confirm')) !== 'DELETE') {
    return { error: 'Type DELETE to confirm.' };
  }

  if (user.isAdmin) {
    const [admins] = await db
      .select({ value: count() })
      .from(users)
      .where(and(eq(users.companyId, company.id), eq(users.isAdmin, true), eq(users.status, 'active')));
    if (Number(admins?.value ?? 0) <= 1) {
      return { error: 'You are the last active Admin. Assign another Admin before requesting deletion.' };
    }
  }

  await db
    .update(users)
    .set({ deletionRequestedAt: new Date(), status: 'disabled' })
    .where(eq(users.id, user.id));

  await recordAudit({
    actorUserId: user.id,
    entityType: 'user',
    entityId: user.id,
    action: AuditAction.UserDeletionRequested,
  });

  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/login?error=account_disabled');
}
