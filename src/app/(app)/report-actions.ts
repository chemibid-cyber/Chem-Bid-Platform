'use server';

import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { reports, companies } from '@/lib/db/schema';
import { requireUser } from '@/lib/auth/session';
import { recordAudit, AuditAction } from '@/lib/audit';

export type ReportState = { error?: string; success?: string } | null;

/** Report a bad actor (beyond block) → operator moderation queue (PRD §6). */
export async function reportActorAction(
  reportedCompanyId: string,
  reason: string,
): Promise<ReportState> {
  const { user, company } = await requireUser();
  const trimmed = reason.trim();
  if (trimmed.length < 5) return { error: 'Describe the issue (a sentence or two).' };
  if (reportedCompanyId === company.id) return { error: 'You cannot report your own company.' };

  const [target] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.id, reportedCompanyId))
    .limit(1);
  if (!target) return { error: 'Company not found.' };

  await db.insert(reports).values({
    reporterCompanyId: company.id,
    reportedCompanyId,
    reason: trimmed,
    status: 'open',
  });
  await recordAudit({
    actorUserId: user.id,
    entityType: 'company',
    entityId: reportedCompanyId,
    action: AuditAction.Reported,
    snapshot: { reason: trimmed },
  });
  return { success: 'Reported to the platform operator.' };
}
