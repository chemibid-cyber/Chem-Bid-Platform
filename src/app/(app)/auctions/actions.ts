'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { and, eq, count, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { auctions, registeredPartners, bids, notifications } from '@/lib/db/schema';
import { requireUser } from '@/lib/auth/session';
import { isValidCasFormat } from '@/lib/cas/parse';
import { validateClosingTime, validateExtension } from '@/lib/auction/timing';
import { istLocalToDate } from '@/lib/format';
import { uploadFile, signedUrl } from '@/lib/storage';
import { runTargeting } from '@/lib/targeting/run';
import { recordAudit, AuditAction } from '@/lib/audit';

export type AuctionFormState = { error?: string; success?: string } | null;

const ROLE_VALUES = ['mfr', 'dist', 'trader'];

const schema = z.object({
  casNumber: z.string().optional(),
  name: z.string().min(1, 'Product name is required.'),
  isMixture: z.string().optional(),
  mixtureText: z.string().optional(),
  quantity: z.string().min(1),
  unit: z.enum(['kg', 'mt', 'l']),
  minPurity: z.string().optional(),
  packing: z.string().optional(),
  deliveryAddress: z.string().min(1, 'Delivery address is required.'),
  logisticsBasis: z.enum(['delivered', 'exworks']),
  remarks: z.string().optional(),
  closesAt: z.string().min(1),
  privacyMode: z.enum(['all', 'registered']),
  blind: z.string().optional(),
});

export async function createAuctionAction(
  _prev: AuctionFormState,
  formData: FormData,
): Promise<AuctionFormState> {
  const { user, company } = await requireUser();

  if (!user.canBuy && !user.isAdmin) return { error: 'You need buy capability to post a requirement.' };
  if (company.verificationStatus !== 'verified') {
    return { error: 'Your GSTIN must be verified before you can publish an auction.' };
  }

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Please complete the form.' };
  }
  const data = parsed.data;
  const isMixture = data.isMixture === 'on';
  const casNumber = isMixture ? null : (data.casNumber ?? '').trim();

  if (!isMixture) {
    if (!casNumber) return { error: 'Enter a CAS number or mark it a custom mixture.' };
    if (!isValidCasFormat(casNumber)) return { error: 'That CAS number is not valid (e.g. 108-88-3).' };
  }

  const quantity = Number(data.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) return { error: 'Quantity must be greater than 0.' };

  const closesAt = istLocalToDate(data.closesAt);
  const timing = validateClosingTime(closesAt);
  if (!timing.ok) return { error: timing.error };

  const supplierFilter = formData.getAll('supplierFilter').map(String).filter((r) => ROLE_VALUES.includes(r));

  // Empty-network safeguard for Registered-Only.
  if (data.privacyMode === 'registered' && casNumber) {
    const [partnerCount] = await db
      .select({ value: count() })
      .from(registeredPartners)
      .where(
        and(
          eq(registeredPartners.buyerCompanyId, company.id),
          eq(registeredPartners.casNumber, casNumber),
          eq(registeredPartners.status, 'active'),
        ),
      );
    if (Number(partnerCount?.value ?? 0) === 0) {
      return {
        error:
          'Registered-Only needs at least one active partner for this CAS. Register/invite a vendor or switch to "Send to All".',
      };
    }
  }

  // Optional spec attachment.
  let specFileUrl: string | null = null;
  const specFile = formData.get('specFile');
  if (specFile instanceof File && specFile.size > 0) {
    const up = await uploadFile(`auctions/${company.id}`, specFile);
    if (!up.ok) return { error: up.error };
    specFileUrl = up.path ?? null;
  }

  const [auction] = await db
    .insert(auctions)
    .values({
      buyerCompanyId: company.id,
      buyerUserId: user.id,
      casNumber,
      name: data.name.trim(),
      quantity: String(quantity),
      unit: data.unit,
      minPurity: data.minPurity?.trim() || null,
      packing: data.packing?.trim() || null,
      deliveryAddress: data.deliveryAddress.trim(),
      logisticsBasis: data.logisticsBasis,
      supplierFilter,
      specFileUrl,
      remarks: data.remarks?.trim() || null,
      privacyMode: data.privacyMode,
      blind: data.blind === 'on',
      status: 'active',
      stage: 'stage1',
      closesAt,
    })
    .returning();

  if (!auction) return { error: 'Could not create the auction. Please try again.' };

  await recordAudit({
    actorUserId: user.id,
    entityType: 'auction',
    entityId: auction.id,
    action: AuditAction.AuctionCreated,
    snapshot: { name: auction.name, casNumber, quantity, unit: data.unit, privacy: data.privacyMode },
  });

  const { notified } = await runTargeting(auction);

  await recordAudit({
    actorUserId: user.id,
    entityType: 'auction',
    entityId: auction.id,
    action: AuditAction.AuctionPublished,
    snapshot: { notified },
  });

  redirect(`/auctions/${auction.id}?published=${notified}`);
}

export async function extendAuctionAction(
  _prev: AuctionFormState,
  formData: FormData,
): Promise<AuctionFormState> {
  const { user, company } = await requireUser();
  const auctionId = String(formData.get('auctionId') ?? '');
  const newCloses = istLocalToDate(String(formData.get('closesAt') ?? ''));

  const [auction] = await db
    .select()
    .from(auctions)
    .where(and(eq(auctions.id, auctionId), eq(auctions.buyerCompanyId, company.id)))
    .limit(1);
  if (!auction) return { error: 'Auction not found.' };
  if (auction.extendedOnce) return { error: 'This auction has already been extended once.' };
  if (auction.status !== 'active') return { error: 'Only an active auction can be extended.' };

  const check = validateExtension(auction.closesAt, newCloses);
  if (!check.ok) return { error: check.error };

  await db
    .update(auctions)
    .set({ closesAt: newCloses, extendedOnce: true })
    .where(eq(auctions.id, auctionId));
  await recordAudit({
    actorUserId: user.id,
    entityType: 'auction',
    entityId: auctionId,
    action: AuditAction.AuctionExtended,
    snapshot: { closesAt: newCloses.toISOString() },
  });
  revalidatePath(`/auctions/${auctionId}`);
  return { success: 'Auction extended.' };
}

export async function cancelAuctionAction(auctionId: string): Promise<AuctionFormState> {
  const { user, company } = await requireUser();
  const [auction] = await db
    .select()
    .from(auctions)
    .where(and(eq(auctions.id, auctionId), eq(auctions.buyerCompanyId, company.id)))
    .limit(1);
  if (!auction) return { error: 'Auction not found.' };
  if (!['active', 'awaiting_decision'].includes(auction.status)) {
    return { error: 'This auction can no longer be cancelled.' };
  }

  await db.update(auctions).set({ status: 'cancelled' }).where(eq(auctions.id, auctionId));

  // Notify sellers who had engaged.
  const engaged = await db
    .select({ sellerUserId: bids.sellerUserId })
    .from(bids)
    .where(and(eq(bids.auctionId, auctionId), inArray(bids.status, ['active'])));
  if (engaged.length > 0) {
    await db.insert(notifications).values(
      engaged.map((b) => ({
        userId: b.sellerUserId,
        type: 'auction.cancelled',
        payload: { auctionId, name: auction.name },
      })),
    );
  }

  await recordAudit({
    actorUserId: user.id,
    entityType: 'auction',
    entityId: auctionId,
    action: AuditAction.AuctionCancelled,
  });
  revalidatePath('/auctions');
  redirect('/auctions');
}

/** Clone & relist a past auction (FR-8.2 zero-bid retention). */
export async function cloneAuctionAction(auctionId: string): Promise<AuctionFormState> {
  const { company } = await requireUser();
  const [src] = await db
    .select({ id: auctions.id })
    .from(auctions)
    .where(and(eq(auctions.id, auctionId), eq(auctions.buyerCompanyId, company.id)))
    .limit(1);
  if (!src) return { error: 'Auction not found.' };

  // The new-auction form prefills from the clone source; the buyer re-confirms timing.
  redirect(`/auctions/new?clone=${auctionId}`);
}

/** Buyer downloads their own auction's spec sheet via a short-lived signed URL. */
export async function getAuctionSpecUrlAction(
  auctionId: string,
): Promise<{ url?: string; error?: string }> {
  const { company } = await requireUser();
  const [a] = await db
    .select({ specFileUrl: auctions.specFileUrl, buyerCompanyId: auctions.buyerCompanyId })
    .from(auctions)
    .where(eq(auctions.id, auctionId))
    .limit(1);
  if (!a || a.buyerCompanyId !== company.id) return { error: 'Not found.' };
  if (!a.specFileUrl) return { error: 'No spec file attached.' };
  const url = await signedUrl(a.specFileUrl);
  return url ? { url } : { error: 'Could not generate a download link.' };
}
