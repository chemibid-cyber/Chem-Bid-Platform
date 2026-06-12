'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { and, eq, isNotNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { auctions, bids, blocks } from '@/lib/db/schema';
import { requireUser } from '@/lib/auth/session';
import { computeTotalRate, validateBidPricing, isValidStage2Rate } from '@/lib/pricing';
import { rankOf } from '@/lib/ranking';
import { uploadFile, signedUrl } from '@/lib/storage';
import { recordAudit, AuditAction } from '@/lib/audit';

export type BidFormState = { error?: string; success?: string } | null;

async function loadSellerBid(auctionId: string, companyId: string) {
  const [bid] = await db
    .select()
    .from(bids)
    .where(and(eq(bids.auctionId, auctionId), eq(bids.sellerCompanyId, companyId)))
    .limit(1);
  return bid ?? null;
}

export async function acceptRequestAction(auctionId: string): Promise<BidFormState> {
  const { user, company } = await requireUser();
  if (!user.canSell && !user.isAdmin) return { error: 'You need sell capability to quote.' };
  const bid = await loadSellerBid(auctionId, company.id);
  if (!bid) return { error: 'You were not invited to this requirement.' };

  await db
    .update(bids)
    .set({ gateState: 'accepted', sellerUserId: user.id, updatedAt: new Date() })
    .where(eq(bids.id, bid.id));
  await recordAudit({
    actorUserId: user.id,
    entityType: 'bid',
    entityId: bid.id,
    action: AuditAction.SellerAccepted,
    snapshot: { auctionId },
  });
  revalidatePath(`/requests/${auctionId}`);
  return { success: 'Accepted. You can now quote.' };
}

export async function ignoreRequestAction(auctionId: string): Promise<BidFormState> {
  const { user, company } = await requireUser();
  const bid = await loadSellerBid(auctionId, company.id);
  if (!bid) return { error: 'Request not found.' };
  await db.update(bids).set({ gateState: 'ignored', updatedAt: new Date() }).where(eq(bids.id, bid.id));
  await recordAudit({
    actorUserId: user.id,
    entityType: 'bid',
    entityId: bid.id,
    action: AuditAction.SellerIgnored,
  });
  revalidatePath('/requests');
  return { success: 'Moved to Ignored.' };
}

export async function unignoreRequestAction(auctionId: string): Promise<BidFormState> {
  const { user, company } = await requireUser();
  const bid = await loadSellerBid(auctionId, company.id);
  if (!bid) return { error: 'Request not found.' };

  // Only while the auction is still open.
  const [auction] = await db.select().from(auctions).where(eq(auctions.id, auctionId)).limit(1);
  if (!auction || auction.status !== 'active') return { error: 'This auction is no longer open.' };

  await db.update(bids).set({ gateState: 'notified', updatedAt: new Date() }).where(eq(bids.id, bid.id));
  await recordAudit({
    actorUserId: user.id,
    entityType: 'bid',
    entityId: bid.id,
    action: AuditAction.SellerUnignored,
  });
  revalidatePath('/requests');
  return { success: 'Restored to your active requests.' };
}

export async function blockPurchaserAction(
  auctionId: string,
  scope: 'this_cas' | 'all',
): Promise<BidFormState> {
  const { user, company } = await requireUser();
  const [auction] = await db.select().from(auctions).where(eq(auctions.id, auctionId)).limit(1);
  if (!auction) return { error: 'Auction not found.' };

  await db.insert(blocks).values({
    blockerCompanyId: company.id,
    blockedCompanyId: auction.buyerCompanyId,
    casNumber: scope === 'this_cas' ? auction.casNumber : null,
    scope,
  });

  const bid = await loadSellerBid(auctionId, company.id);
  if (bid) {
    await db.update(bids).set({ gateState: 'blocked', updatedAt: new Date() }).where(eq(bids.id, bid.id));
  }
  await recordAudit({
    actorUserId: user.id,
    entityType: 'company',
    entityId: auction.buyerCompanyId,
    action: AuditAction.Blocked,
    snapshot: { scope, casNumber: scope === 'this_cas' ? auction.casNumber : null },
  });
  revalidatePath('/requests');
  return { success: scope === 'all' ? 'Purchaser blocked for all requests.' : 'Purchaser blocked for this CAS.' };
}

const bidSchema = z.object({
  auctionId: z.string().uuid(),
  basic: z.string().min(1),
  freight: z.string().optional(),
  tax: z.string().optional(),
  paymentTerms: z.enum(['advance', 'net15', 'net30', 'net45', 'lc']),
  leadTimeDays: z.string().optional(),
  coaOnDispatch: z.string().optional(),
});

export async function submitBidAction(_prev: BidFormState, formData: FormData): Promise<BidFormState> {
  const { user, company } = await requireUser();
  if (!user.canSell && !user.isAdmin) return { error: 'You need sell capability to quote.' };

  const parsed = bidSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: 'Please complete the bid form.' };
  const data = parsed.data;

  const [auction] = await db.select().from(auctions).where(eq(auctions.id, data.auctionId)).limit(1);
  if (!auction) return { error: 'Auction not found.' };
  if (auction.status !== 'active') return { error: 'This auction is closed for bidding.' };

  const bid = await loadSellerBid(data.auctionId, company.id);
  if (!bid) return { error: 'You were not invited to this requirement.' };
  if (bid.gateState !== 'accepted') return { error: 'Accept the requirement before quoting.' };

  const basic = Number(data.basic);
  const freightInput = Number(data.freight ?? '0');
  const tax = Number(data.tax?.trim() ? data.tax : '0');
  const basis = auction.logisticsBasis;
  const pricing = validateBidPricing({ basic, freight: freightInput, tax, basis });
  if (!pricing.ok) return { error: pricing.errors.join(' ') };

  const effFreight = basis === 'exworks' ? 0 : freightInput;
  const total = computeTotalRate({ basic, freight: freightInput, tax, basis });

  // COA: required unless make-to-order ("COA on dispatch").
  const coaOnDispatch = data.coaOnDispatch === 'on';
  let coaFileUrl: string | null = bid.coaFileUrl;
  const coaFile = formData.get('coaFile');
  if (!coaOnDispatch) {
    if (coaFile instanceof File && coaFile.size > 0) {
      const up = await uploadFile(`coa/${company.id}`, coaFile);
      if (!up.ok) return { error: up.error };
      coaFileUrl = up.path ?? null;
    } else if (!coaFileUrl) {
      return { error: 'Upload a COA, or tick "COA on dispatch (make-to-order)".' };
    }
  }

  const isRevision = bid.stage1Total != null;
  await db
    .update(bids)
    .set({
      stage1Basic: String(basic),
      stage1Freight: String(effFreight),
      stage1Tax: String(Math.max(0, tax)),
      stage1Total: String(total),
      paymentTerms: data.paymentTerms,
      leadTimeDays: data.leadTimeDays ? Number(data.leadTimeDays) : null,
      coaOnDispatch,
      coaFileUrl: coaOnDispatch ? null : coaFileUrl,
      status: 'active',
      // The bid row is created as a notification placeholder at targeting time,
      // so created_at must be re-stamped at the FIRST real quote — it's the
      // tie-break timestamp ("rewards first commitment"). Revisions keep it.
      ...(isRevision ? {} : { createdAt: new Date() }),
      updatedAt: new Date(),
    })
    .where(eq(bids.id, bid.id));

  await recordAudit({
    actorUserId: user.id,
    entityType: 'bid',
    entityId: bid.id,
    action: isRevision ? AuditAction.BidRevised : AuditAction.BidSubmitted,
    snapshot: { total, basic, freight: effFreight, tax, paymentTerms: data.paymentTerms },
  });
  revalidatePath(`/requests/${data.auctionId}`);
  return { success: isRevision ? 'Bid revised.' : 'Bid submitted.' };
}

export async function withdrawBidAction(auctionId: string): Promise<BidFormState> {
  const { user, company } = await requireUser();
  const bid = await loadSellerBid(auctionId, company.id);
  if (!bid) return { error: 'Bid not found.' };

  const [auction] = await db.select().from(auctions).where(eq(auctions.id, auctionId)).limit(1);
  if (!auction || auction.status !== 'active') return { error: 'You can only withdraw before close.' };

  // Status change to 'withdrawn' — RETAINED in the audit log, never deleted.
  await db.update(bids).set({ status: 'withdrawn', updatedAt: new Date() }).where(eq(bids.id, bid.id));
  await recordAudit({
    actorUserId: user.id,
    entityType: 'bid',
    entityId: bid.id,
    action: AuditAction.BidWithdrawn,
    snapshot: { stage1Total: bid.stage1Total },
  });
  revalidatePath(`/requests/${auctionId}`);
  return { success: 'Bid withdrawn (retained in the audit trail).' };
}

/**
 * Server-computed blind rank — competitor totals NEVER leave the server.
 * Returns this seller's 1-based rank among active quotes, by lowest total,
 * ties broken by earlier created_at.
 */
export async function getMyRankAction(
  auctionId: string,
): Promise<{ rank: number | null; of: number; blind: boolean }> {
  const { company } = await requireUser();
  const [auction] = await db
    .select({ blind: auctions.blind })
    .from(auctions)
    .where(eq(auctions.id, auctionId))
    .limit(1);

  const active = await db
    .select({ id: bids.id, companyId: bids.sellerCompanyId, total: bids.stage1Total, createdAt: bids.createdAt })
    .from(bids)
    .where(and(eq(bids.auctionId, auctionId), eq(bids.status, 'active'), isNotNull(bids.stage1Total)));

  const ranked = active.map((b) => ({ id: b.id, total: Number(b.total), createdAt: b.createdAt }));
  const mine = active.find((b) => b.companyId === company.id);
  const rank = mine ? rankOf(ranked, mine.id) : null;
  return { rank, of: active.length, blind: auction?.blind ?? true };
}

export async function getRequestSpecUrlAction(
  auctionId: string,
): Promise<{ url?: string; error?: string }> {
  const { company } = await requireUser();
  const bid = await loadSellerBid(auctionId, company.id);
  if (!bid || bid.gateState !== 'accepted') return { error: 'Accept the requirement first.' };
  const [auction] = await db
    .select({ specFileUrl: auctions.specFileUrl })
    .from(auctions)
    .where(eq(auctions.id, auctionId))
    .limit(1);
  if (!auction?.specFileUrl) return { error: 'No spec file attached.' };
  const url = await signedUrl(auction.specFileUrl);
  return url ? { url } : { error: 'Could not generate a download link.' };
}

/**
 * Seller responds to the Stage-2 counter: Accept / Reject / Final alternative.
 * Negotiation is on the MATERIAL rate — the seller's Stage-1 freight + tax
 * carry over unchanged. PRICE-DROP LOCK: a Final material rate may never
 * exceed the seller's Stage-1 material rate.
 * Reject leaves Stage-1 standing (the leaderboard takes the lower of the two).
 */
export async function stage2RespondAction(
  auctionId: string,
  action: 'accept' | 'reject' | 'final',
  finalRateRaw?: string,
): Promise<BidFormState> {
  const { user, company } = await requireUser();
  const bid = await loadSellerBid(auctionId, company.id);
  if (!bid || bid.stage1Total == null) return { error: 'You did not bid in Stage-1.' };

  const [auction] = await db.select().from(auctions).where(eq(auctions.id, auctionId)).limit(1);
  if (!auction || auction.stage !== 'stage2') return { error: 'Stage-2 is not active.' };
  if (auction.stage2ClosesAt && auction.stage2ClosesAt.getTime() <= Date.now()) {
    return { error: 'The Stage-2 window has closed.' };
  }

  const stage1Material = Number(bid.stage1Basic ?? bid.stage1Total);
  let stage2Rate: string | null = null;
  if (action === 'accept') {
    stage2Rate = auction.stage2Target;
  } else if (action === 'final') {
    const rate = Number(finalRateRaw);
    if (!isValidStage2Rate(rate, stage1Material)) {
      return {
        error: `Your final material rate must be greater than 0 and at most your Stage-1 material rate (₹${stage1Material}). Transport + tax carry over from Stage-1.`,
      };
    }
    stage2Rate = String(rate);
  }
  // 'reject' → stage2Rate stays null; Stage-1 stands.

  await db
    .update(bids)
    .set({ stage2Action: action, stage2Rate, updatedAt: new Date() })
    .where(eq(bids.id, bid.id));
  await recordAudit({
    actorUserId: user.id,
    entityType: 'bid',
    entityId: bid.id,
    action: AuditAction.Stage2Response,
    snapshot: { response: action, stage2Rate },
  });
  revalidatePath(`/requests/${auctionId}`);
  return {
    success:
      action === 'accept'
        ? 'You accepted the counter rate.'
        : action === 'final'
          ? 'Final rate submitted.'
          : 'You rejected the counter — your Stage-1 bid stands.',
  };
}
