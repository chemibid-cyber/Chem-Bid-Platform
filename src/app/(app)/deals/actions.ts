'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { and, eq, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import { deals, disputes } from '@/lib/db/schema';
import { requireUser } from '@/lib/auth/session';
import { uploadFile } from '@/lib/storage';
import { recordAudit, AuditAction } from '@/lib/audit';

export type DealFormState = { error?: string; success?: string } | null;

const schema = z.object({
  dealId: z.string().uuid(),
  reason: z.string().min(5, 'Describe the issue (at least a sentence).'),
});

/** Either party flags a confirmed deal as disputed. Append-only: the deal record
 *  is never deleted — its status changes and the change is audit-logged. */
export async function raiseDisputeAction(
  _prev: DealFormState,
  formData: FormData,
): Promise<DealFormState> {
  const { user, company } = await requireUser();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Check the form.' };

  const [deal] = await db
    .select()
    .from(deals)
    .where(
      and(
        eq(deals.id, parsed.data.dealId),
        or(eq(deals.buyerCompanyId, company.id), eq(deals.sellerCompanyId, company.id)),
      ),
    )
    .limit(1);
  if (!deal) return { error: 'Deal not found.' };
  if (deal.status === 'disputed') return { error: 'This deal is already under dispute.' };

  let evidenceUrl: string | null = null;
  const evidence = formData.get('evidence');
  if (evidence instanceof File && evidence.size > 0) {
    const up = await uploadFile(`disputes/${company.id}`, evidence);
    if (!up.ok) return { error: up.error };
    evidenceUrl = up.path ?? null;
  }

  await db.insert(disputes).values({
    dealId: deal.id,
    raisedByUserId: user.id,
    reason: parsed.data.reason,
    evidenceUrl,
    status: 'open',
  });
  await db.update(deals).set({ status: 'disputed' }).where(eq(deals.id, deal.id));

  await recordAudit({
    actorUserId: user.id,
    entityType: 'deal',
    entityId: deal.id,
    action: AuditAction.DealDisputed,
    snapshot: { reason: parsed.data.reason },
  });

  revalidatePath(`/deals/${deal.id}`);
  return { success: 'Dispute raised — a platform operator will review it.' };
}
