'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { and, eq, count, inArray, isNotNull, ne } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  auctions,
  registeredPartners,
  bids,
  notifications,
  users,
  companies,
  deals,
  blocks,
} from '@/lib/db/schema';
import { requireUser } from '@/lib/auth/session';
import { isValidCasFormat } from '@/lib/cas/parse';
import { validateClosingTime, validateExtension, stage2CloseTime } from '@/lib/auction/timing';
import { istLocalToDate, PAYMENT_TERMS_LABEL } from '@/lib/format';
import { uploadFile, signedUrl } from '@/lib/storage';
import { runTargeting } from '@/lib/targeting/run';
import { effectiveTotal } from '@/lib/ranking';
import { stage2Total } from '@/lib/pricing';
import { rateLimit, dayKey } from '@/lib/ratelimit';
import { recordAudit, AuditAction } from '@/lib/audit';
import { sendEmail } from '@/lib/email';
import { counterReceivedEmail, dealConfirmationEmail } from '@/lib/email/templates';

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

  // Anti-spam: max 20 auctions per company per day (FR-1.7 / §6 trust).
  const cap = rateLimit(`auction:${company.id}:${dayKey()}`, 20, 24 * 60 * 60 * 1000);
  if (!cap.ok) {
    return { error: 'Daily auction limit reached (20/day). Try again tomorrow.' };
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

/** Launch Stage-2: ONE counter rate blasted to ALL Stage-1 participants, 24h timer. */
export async function launchStage2Action(
  _prev: AuctionFormState,
  formData: FormData,
): Promise<AuctionFormState> {
  const { user, company } = await requireUser();
  const auctionId = String(formData.get('auctionId') ?? '');
  const targetRate = Number(formData.get('targetRate') ?? '');

  const [auction] = await db
    .select()
    .from(auctions)
    .where(and(eq(auctions.id, auctionId), eq(auctions.buyerCompanyId, company.id)))
    .limit(1);
  if (!auction) return { error: 'Auction not found.' };
  if (auction.status !== 'awaiting_decision') {
    return { error: 'Stage-2 can only start after the auction closes with bids.' };
  }
  if (auction.stage === 'stage2') return { error: 'Stage-2 is already running.' };
  if (!Number.isFinite(targetRate) || targetRate <= 0) {
    return { error: 'Enter a valid counter rate.' };
  }

  const closesAt = stage2CloseTime();
  await db
    .update(auctions)
    .set({
      stage: 'stage2',
      stage2Target: String(targetRate),
      stage2ClosesAt: closesAt,
      stage2UrgencySent: false,
    })
    .where(eq(auctions.id, auctionId));

  // Blast to ALL Stage-1 participants (those who actually quoted).
  const participants = await db
    .select({ sellerUserId: bids.sellerUserId, email: users.email })
    .from(bids)
    .innerJoin(users, eq(bids.sellerUserId, users.id))
    .where(and(eq(bids.auctionId, auctionId), eq(bids.status, 'active'), isNotNull(bids.stage1Total)));

  if (participants.length > 0) {
    await db.insert(notifications).values(
      participants.map((p) => ({
        userId: p.sellerUserId,
        type: 'auction.stage2',
        payload: { auctionId, name: auction.name, rate: targetRate, unit: auction.unit },
      })),
    );
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
    await Promise.all(
      participants.map((p) => {
        const tmpl = counterReceivedEmail({
          productName: auction.name,
          rate: String(targetRate),
          unit: auction.unit,
          viewUrl: `${appUrl}/requests/${auctionId}`,
        });
        return sendEmail({ to: p.email, subject: tmpl.subject, html: tmpl.html, text: tmpl.text });
      }),
    );
  }

  await recordAudit({
    actorUserId: user.id,
    entityType: 'auction',
    entityId: auctionId,
    action: AuditAction.Stage2Launched,
    snapshot: { targetRate, participants: participants.length, closesAt: closesAt.toISOString() },
  });

  revalidatePath(`/auctions/${auctionId}/review`);
  return { success: `Counter sent to ${participants.length} participant(s).` };
}

/** Buyer downloads a bidder's COA (only for their own auction's bids). */
export async function getBidCoaUrlAction(bidId: string): Promise<{ url?: string; error?: string }> {
  const { company } = await requireUser();
  const [row] = await db
    .select({ coaFileUrl: bids.coaFileUrl, buyerCompanyId: auctions.buyerCompanyId })
    .from(bids)
    .innerJoin(auctions, eq(bids.auctionId, auctions.id))
    .where(eq(bids.id, bidId))
    .limit(1);
  if (!row || row.buyerCompanyId !== company.id) return { error: 'Not found.' };
  if (!row.coaFileUrl) return { error: 'No COA attached (or make-to-order).' };
  const url = await signedUrl(row.coaFileUrl);
  return url ? { url } : { error: 'Could not generate a download link.' };
}

/**
 * Confirm a single winner → Deal Confirmation Record (NOT "legally binding").
 * Winner = won, others = lost, deal row created, auction locked. Both parties
 * emailed identical confirmations stating mutual intent under the signup T&Cs.
 */
export async function confirmDealAction(
  _prev: AuctionFormState,
  formData: FormData,
): Promise<AuctionFormState> {
  const { user, company } = await requireUser();
  const auctionId = String(formData.get('auctionId') ?? '');
  const bidId = String(formData.get('bidId') ?? '');

  const [auction] = await db
    .select()
    .from(auctions)
    .where(and(eq(auctions.id, auctionId), eq(auctions.buyerCompanyId, company.id)))
    .limit(1);
  if (!auction) return { error: 'Auction not found.' };
  if (auction.status !== 'awaiting_decision') return { error: 'This auction is not awaiting a decision.' };

  const [winner] = await db
    .select()
    .from(bids)
    .where(and(eq(bids.id, bidId), eq(bids.auctionId, auctionId), isNotNull(bids.stage1Total)))
    .limit(1);
  if (!winner) return { error: 'That bid is not eligible.' };

  // Stage-2 re-prices the material only — freight + tax carry over into the
  // all-in Stage-2 total before taking the lower of the two.
  const finalTotal = effectiveTotal(
    Number(winner.stage1Total),
    winner.stage2Rate
      ? stage2Total(Number(winner.stage2Rate), winner.stage1Freight, winner.stage1Tax)
      : null,
  );

  let dealId = '';
  await db.transaction(async (tx) => {
    await tx.update(bids).set({ status: 'won', updatedAt: new Date() }).where(eq(bids.id, winner.id));
    await tx
      .update(bids)
      .set({ status: 'lost', updatedAt: new Date() })
      .where(
        and(eq(bids.auctionId, auctionId), ne(bids.id, winner.id), eq(bids.status, 'active'), isNotNull(bids.stage1Total)),
      );
    const [deal] = await tx
      .insert(deals)
      .values({
        auctionId,
        bidId: winner.id,
        buyerCompanyId: company.id,
        sellerCompanyId: winner.sellerCompanyId,
        finalTotal: String(finalTotal),
        paymentTerms: winner.paymentTerms,
        leadTimeDays: winner.leadTimeDays,
        status: 'confirmed',
      })
      .returning();
    dealId = deal?.id ?? '';
    await tx.update(auctions).set({ status: 'closed', stage: 'closed' }).where(eq(auctions.id, auctionId));
    await tx.insert(notifications).values([
      { userId: winner.sellerUserId, type: 'deal.won', payload: { auctionId, dealId, name: auction.name } },
      { userId: user.id, type: 'deal.confirmed', payload: { auctionId, dealId, name: auction.name } },
    ]);
  });

  await recordAudit({
    actorUserId: user.id,
    entityType: 'deal',
    entityId: dealId,
    action: AuditAction.DealConfirmed,
    snapshot: { auctionId, winningBid: winner.id, finalTotal },
  });

  // Email BOTH parties identical confirmations.
  const [sellerCompany] = await db
    .select({ legalName: companies.legalName })
    .from(companies)
    .where(eq(companies.id, winner.sellerCompanyId))
    .limit(1);
  const [sellerUser] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, winner.sellerUserId))
    .limit(1);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const tncUrl = `${appUrl}/terms`;
  const common = {
    productName: auction.name,
    quantity: String(auction.quantity),
    unit: auction.unit,
    finalTotal: String(finalTotal),
    paymentTerms: winner.paymentTerms ? PAYMENT_TERMS_LABEL[winner.paymentTerms] ?? winner.paymentTerms : '—',
    leadTimeDays: winner.leadTimeDays,
    tncUrl,
  };
  const buyerEmail = dealConfirmationEmail({ ...common, counterpartyName: sellerCompany?.legalName ?? 'the seller' });
  const sellerEmail = dealConfirmationEmail({ ...common, counterpartyName: company.legalName });
  await sendEmail({ to: user.email, subject: buyerEmail.subject, html: buyerEmail.html, text: buyerEmail.text });
  if (sellerUser?.email) {
    await sendEmail({ to: sellerUser.email, subject: sellerEmail.subject, html: sellerEmail.html, text: sellerEmail.text });
  }

  redirect(`/auctions/${auctionId}/review?confirmed=1`);
}

/** Buyer blocks a seller for THIS CAS (permanent mute; historical bids retained). */
export async function blockSellerAction(auctionId: string, sellerCompanyId: string): Promise<AuctionFormState> {
  const { user, company } = await requireUser();
  const [auction] = await db
    .select()
    .from(auctions)
    .where(and(eq(auctions.id, auctionId), eq(auctions.buyerCompanyId, company.id)))
    .limit(1);
  if (!auction) return { error: 'Auction not found.' };

  await db.insert(blocks).values({
    blockerCompanyId: company.id,
    blockedCompanyId: sellerCompanyId,
    casNumber: auction.casNumber,
    scope: 'this_cas',
  });
  await recordAudit({
    actorUserId: user.id,
    entityType: 'company',
    entityId: sellerCompanyId,
    action: AuditAction.Blocked,
    snapshot: { casNumber: auction.casNumber, scope: 'this_cas', context: 'buyer_blocks_seller' },
  });
  revalidatePath(`/auctions/${auctionId}/review`);
  return { success: 'Seller blocked for this CAS.' };
}
