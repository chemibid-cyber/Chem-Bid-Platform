'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { companies, deals, disputes, reports } from '@/lib/db/schema';
import { requireOperator } from '@/lib/auth/session';
import { recordAudit, AuditAction } from '@/lib/audit';

export type OperatorFormState = { error?: string; success?: string } | null;

export async function resolveDisputeAction(
  _prev: OperatorFormState,
  formData: FormData,
): Promise<OperatorFormState> {
  const op = await requireOperator();
  const disputeId = String(formData.get('disputeId') ?? '');
  const note = String(formData.get('note') ?? '').trim();
  if (!note) return { error: 'Add a resolution note.' };

  const [dispute] = await db.select().from(disputes).where(eq(disputes.id, disputeId)).limit(1);
  if (!dispute) return { error: 'Dispute not found.' };

  await db
    .update(disputes)
    .set({ status: 'resolved', resolutionNote: note, resolvedByOperatorId: op.id })
    .where(eq(disputes.id, disputeId));
  // The deal returns to confirmed; the dispute history is retained.
  await db.update(deals).set({ status: 'confirmed' }).where(eq(deals.id, dispute.dealId));

  await recordAudit({
    actorUserId: op.authUserId,
    entityType: 'dispute',
    entityId: disputeId,
    action: AuditAction.DisputeResolved,
    snapshot: { note },
  });
  revalidatePath('/operator/disputes');
  return { success: 'Dispute resolved.' };
}

const gstSchema = z.object({
  companyId: z.string().uuid(),
  status: z.enum(['verified', 'rejected']),
});

export async function setGstVerificationAction(
  companyId: string,
  status: 'verified' | 'rejected',
): Promise<OperatorFormState> {
  const op = await requireOperator();
  const parsed = gstSchema.safeParse({ companyId, status });
  if (!parsed.success) return { error: 'Invalid input.' };

  await db.update(companies).set({ verificationStatus: status }).where(eq(companies.id, companyId));
  await recordAudit({
    actorUserId: op.authUserId,
    entityType: 'company',
    entityId: companyId,
    action: status === 'verified' ? AuditAction.CompanyVerified : AuditAction.CompanyRejected,
    snapshot: { manualOverride: true },
  });
  revalidatePath('/operator/companies');
  return { success: `Company marked ${status}.` };
}

export async function setSuspensionAction(
  companyId: string,
  suspend: boolean,
): Promise<OperatorFormState> {
  const op = await requireOperator();
  await db.update(companies).set({ suspended: suspend }).where(eq(companies.id, companyId));
  await recordAudit({
    actorUserId: op.authUserId,
    entityType: 'company',
    entityId: companyId,
    action: suspend ? AuditAction.CompanySuspended : AuditAction.CompanyUnsuspended,
  });
  revalidatePath('/operator/companies');
  return { success: suspend ? 'Company suspended.' : 'Company reinstated.' };
}

export async function resolveReportAction(reportId: string): Promise<OperatorFormState> {
  const op = await requireOperator();
  await db.update(reports).set({ status: 'resolved' }).where(eq(reports.id, reportId));
  await recordAudit({
    actorUserId: op.authUserId,
    entityType: 'report',
    entityId: reportId,
    action: 'report.resolved',
  });
  revalidatePath('/operator/moderation');
  return { success: 'Report resolved.' };
}
