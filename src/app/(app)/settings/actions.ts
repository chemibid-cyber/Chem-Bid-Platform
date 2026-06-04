'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { companies } from '@/lib/db/schema';
import { requireUser } from '@/lib/auth/session';
import { getGstProvider } from '@/lib/gst';
import { recordAudit, AuditAction } from '@/lib/audit';

const QUARTER_MS = 90 * 24 * 60 * 60 * 1000;

export type SettingsFormState = { error?: string; success?: string } | null;

/** Re-fetch legal name + address from the GST network (FR-1.3, once/quarter). */
export async function refreshGstAction(): Promise<SettingsFormState> {
  const { user, company } = await requireUser();
  if (!user.isAdmin) return { error: 'Only an Admin can refresh GST details.' };

  if (
    company.gstLastRefreshedAt &&
    Date.now() - new Date(company.gstLastRefreshedAt).getTime() < QUARTER_MS
  ) {
    return { error: 'GST details can only be refreshed once a quarter.' };
  }

  try {
    const v = await getGstProvider().verify(company.gstin);
    if (!v.ok) return { error: v.message ?? 'GST refresh failed.' };

    await db
      .update(companies)
      .set({
        legalName: v.legalName,
        registeredAddress: v.address,
        pan: v.pan,
        verificationStatus: 'verified',
        gstLastRefreshedAt: new Date(),
      })
      .where(eq(companies.id, company.id));

    await recordAudit({
      actorUserId: user.id,
      entityType: 'company',
      entityId: company.id,
      action: AuditAction.CompanyGstRefreshed,
      snapshot: { legalName: v.legalName },
    });

    revalidatePath('/settings');
    return { success: 'Company details refreshed from the GST network.' };
  } catch {
    return { error: 'The GST service is unavailable right now. Please try again later.' };
  }
}
