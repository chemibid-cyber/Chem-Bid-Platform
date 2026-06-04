'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { companies, users, registeredPartners, notifications } from '@/lib/db/schema';
import { requireUser } from '@/lib/auth/session';
import { normalizeGstin, isValidGstinFormat } from '@/lib/gstin';
import { isValidCasFormat } from '@/lib/cas/parse';
import { recordAudit, AuditAction } from '@/lib/audit';
import { sendEmail } from '@/lib/email';

export type NetworkFormState = { error?: string; success?: string } | null;

const schema = z.object({
  partnerGstin: z.string().min(1),
  casNumber: z.string().min(1),
  partnerEmail: z.string().email().optional().or(z.literal('')),
});

export async function registerPartnerAction(
  _prev: NetworkFormState,
  formData: FormData,
): Promise<NetworkFormState> {
  const { user, company } = await requireUser();
  if (!user.canBuy && !user.isAdmin) return { error: 'You need buy capability to manage a network.' };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: 'Enter a GSTIN and a CAS number.' };

  const partnerGstin = normalizeGstin(parsed.data.partnerGstin);
  const casNumber = parsed.data.casNumber.trim();
  if (!isValidGstinFormat(partnerGstin)) return { error: 'That partner GSTIN is not valid.' };
  if (!isValidCasFormat(casNumber)) return { error: 'That CAS number is not valid.' };
  if (partnerGstin === company.gstin) return { error: 'You cannot register your own company.' };

  const [dupe] = await db
    .select({ id: registeredPartners.id })
    .from(registeredPartners)
    .where(
      and(
        eq(registeredPartners.buyerCompanyId, company.id),
        eq(registeredPartners.partnerGstin, partnerGstin),
        eq(registeredPartners.casNumber, casNumber),
      ),
    )
    .limit(1);
  if (dupe) return { error: 'That partner + CAS is already registered.' };

  const [partnerCompany] = await db
    .select({ id: companies.id, legalName: companies.legalName })
    .from(companies)
    .where(eq(companies.gstin, partnerGstin))
    .limit(1);

  const status = partnerCompany ? 'active' : 'pending';
  const [created] = await db
    .insert(registeredPartners)
    .values({ buyerCompanyId: company.id, partnerGstin, casNumber, status })
    .returning();

  await recordAudit({
    actorUserId: user.id,
    entityType: 'registered_partner',
    entityId: created?.id ?? partnerGstin,
    action: AuditAction.PartnerRegistered,
    snapshot: { partnerGstin, casNumber, status },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  if (partnerCompany) {
    // Consent: notify the partner's admins that they were added (they can decline).
    const admins = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.companyId, partnerCompany.id), eq(users.isAdmin, true)));
    if (admins.length > 0) {
      await db.insert(notifications).values(
        admins.map((a) => ({
          userId: a.id,
          type: 'network.added',
          payload: {
            partnerId: created?.id,
            buyerName: company.legalName,
            casNumber,
          },
        })),
      );
    }
    return { success: `${partnerCompany.legalName} added to your network for CAS ${casNumber}.` };
  }

  // Pending placeholder + optional invite email (growth loop).
  if (parsed.data.partnerEmail) {
    await sendEmail({
      to: parsed.data.partnerEmail,
      subject: `${company.legalName} wants to source ${casNumber} from you on Chemical Auction`,
      html: `<p><strong>${company.legalName}</strong> registered your company as a preferred supplier for CAS <strong>${casNumber}</strong> on Chemical Auction.</p><p>Create your verified account to receive their requirements: <a href="${appUrl}/signup">${appUrl}/signup</a></p>`,
      text: `${company.legalName} registered you as a supplier for CAS ${casNumber}. Join: ${appUrl}/signup`,
    });
  }
  return {
    success: `Invite created for ${partnerGstin}. They'll appear as active once they join${parsed.data.partnerEmail ? ' (invite emailed)' : ''}.`,
  };
}

export async function removePartnerAction(partnerId: string): Promise<NetworkFormState> {
  const { user, company } = await requireUser();
  const [partner] = await db
    .select()
    .from(registeredPartners)
    .where(and(eq(registeredPartners.id, partnerId), eq(registeredPartners.buyerCompanyId, company.id)))
    .limit(1);
  if (!partner) return { error: 'Partner not found.' };

  await db.delete(registeredPartners).where(eq(registeredPartners.id, partnerId));
  await recordAudit({
    actorUserId: user.id,
    entityType: 'registered_partner',
    entityId: partnerId,
    action: 'partner.removed',
    snapshot: { partnerGstin: partner.partnerGstin, casNumber: partner.casNumber },
  });
  revalidatePath('/network');
  return { success: 'Partner removed.' };
}

/** A company declines being added to someone's private network (DPDP consent). */
export async function declinePartnerAction(partnerId: string): Promise<NetworkFormState> {
  const { user, company } = await requireUser();
  const [partner] = await db
    .select()
    .from(registeredPartners)
    .where(eq(registeredPartners.id, partnerId))
    .limit(1);
  if (!partner) return { error: 'Request not found.' };
  if (partner.partnerGstin !== company.gstin) return { error: 'Not authorised.' };

  await db
    .update(registeredPartners)
    .set({ status: 'declined' })
    .where(eq(registeredPartners.id, partnerId));
  await recordAudit({
    actorUserId: user.id,
    entityType: 'registered_partner',
    entityId: partnerId,
    action: AuditAction.PartnerDeclined,
  });
  revalidatePath('/network');
  return { success: 'You declined this network request.' };
}
