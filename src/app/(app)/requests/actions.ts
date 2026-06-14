'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, eq, isNotNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { auctions, bids, blocks, counterProposals, notifications } from '@/lib/db/schema';
import { requireUser } from '@/lib/auth/session';
import { computeTaxFromPct, computeTotalRate, validateBidPricing, isValidStage2Rate, round2 } from '@/lib/pricing';
import { rankOf } from '@/lib/ranking';
import { uploadFile, signedUrl } from '@/lib/storage';
import { istLocalToDate } from '@/lib/format';
import { recordAudit, AuditAction } from '@/lib/audit';
import { canAccessOwned } from '@/lib/auth/scope';

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
  if (!canAccessOwned(bid.sellerUserId, user)) return { error: 'Request not found.' };

  // Do NOT reassign sellerUserId to the caller: the targeted member (the
  // catalog-item owner) remains the owner. An admin accepting on their behalf
  // must not transfer ownership of the request.
  await db
    .update(bids)
    .set({ gateState: 'accepted', updatedAt: new Date() })
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
  if (!canAccessOwned(bid.sellerUserId, user)) return { error: 'Request not found.' };
  await db.update(bids).set({ gateState: 'ignored', updatedAt: new Date() }).where(eq(bids.id, bid.id));
  await recordAudit({
    actorUserId: user.id,
    entityType: 'bid',
    entityId: bid.id,
    action: AuditAction.SellerIgnored,
  });
  revalidatePath('/requests');
  // Leave the (now-ignored) detail page — the seller belongs back on their
  // requests list, not stranded on a page they just dismissed. redirect()
  // throws a NEXT_REDIRECT control-flow signal, so it must be the last call
  // and must NOT be swallowed by a try/catch. (#15)
  redirect('/requests');
}

export async function unignoreRequestAction(auctionId: string): Promise<BidFormState> {
  const { user, company } = await requireUser();
  const bid = await loadSellerBid(auctionId, company.id);
  if (!bid) return { error: 'Request not found.' };
  if (!canAccessOwned(bid.sellerUserId, user)) return { error: 'Request not found.' };

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

/** Add N calendar months to `from`, returning a new Date (mutation-free). */
function addMonths(from: Date, months: number): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d;
}

export async function blockPurchaserAction(
  auctionId: string,
  scope: 'this_cas' | 'all',
  durationMonths: number | null,
): Promise<BidFormState> {
  const { user, company } = await requireUser();
  const [auction] = await db.select().from(auctions).where(eq(auctions.id, auctionId)).limit(1);
  if (!auction) return { error: 'Auction not found.' };

  const bid = await loadSellerBid(auctionId, company.id);
  if (!bid) return { error: 'Request not found.' };
  if (!canAccessOwned(bid.sellerUserId, user)) return { error: 'Request not found.' };

  // null durationMonths = permanent block; a positive count expires N months out. (#16)
  const expiresAt =
    durationMonths && Number.isFinite(durationMonths) && durationMonths > 0
      ? addMonths(new Date(), durationMonths)
      : null;

  await db.insert(blocks).values({
    blockerCompanyId: company.id,
    blockedCompanyId: auction.buyerCompanyId,
    casNumber: scope === 'this_cas' ? auction.casNumber : null,
    scope,
    expiresAt,
  });

  await db.update(bids).set({ gateState: 'blocked', updatedAt: new Date() }).where(eq(bids.id, bid.id));
  await recordAudit({
    actorUserId: user.id,
    entityType: 'company',
    entityId: auction.buyerCompanyId,
    action: AuditAction.Blocked,
    snapshot: {
      scope,
      casNumber: scope === 'this_cas' ? auction.casNumber : null,
      durationMonths: durationMonths ?? null,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
    },
  });
  revalidatePath('/requests');
  const scopeMsg = scope === 'all' ? 'all requests' : 'this CAS';
  const durMsg = expiresAt ? `${durationMonths} month${durationMonths === 1 ? '' : 's'}` : 'permanently';
  return { success: `Purchaser blocked for ${scopeMsg} (${durMsg}).` };
}

const bidSchema = z.object({
  auctionId: z.string().uuid(),
  basic: z.string().min(1),
  freight: z.string().optional(),
  // #19: seller enters a tax PERCENTAGE (optional, >= 0); the absolute ₹/unit
  // amount is computed server-side from it.
  taxPct: z.string().optional(),
  // #18: full payment-terms set MINUS 'other' (a bid has no custom-terms field).
  paymentTerms: z.enum([
    'advance',
    'immediate',
    'net7',
    'net15',
    'net30',
    'net45',
    'net60',
    'net90',
    'net120',
    'lc',
  ]),
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
  if (!canAccessOwned(bid.sellerUserId, user)) return { error: 'Request not found.' };
  if (bid.gateState !== 'accepted') return { error: 'Accept the requirement before quoting.' };

  // #27: money/quantity values store at 2 decimals regardless of input. Round
  // the raw inputs first so tax + total are computed from the persisted figures.
  const basic = round2(Number(data.basic));
  const freightInput = round2(Number(data.freight ?? '0'));
  const basis = auction.logisticsBasis;
  // #19: tax arrives as a percentage; derive the per-unit ₹ amount from
  // material + effective freight. Negatives clamp to 0 inside the helper.
  const taxPct = round2(Number(data.taxPct?.trim() ? data.taxPct : '0'));
  const tax = computeTaxFromPct(taxPct, basic, freightInput, basis);
  const pricing = validateBidPricing({ basic, freight: freightInput, tax, basis });
  if (!pricing.ok) return { error: pricing.errors.join(' ') };
  if (!Number.isFinite(taxPct) || taxPct < 0) return { error: 'Tax % cannot be negative.' };

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
      stage1Tax: String(Math.max(0, tax)), // computed absolute ₹/unit
      stage1TaxPct: String(Math.max(0, taxPct)), // the % the seller entered (#19)
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
    snapshot: { total, basic, freight: effFreight, tax, taxPct, paymentTerms: data.paymentTerms },
  });
  revalidatePath(`/requests/${data.auctionId}`);
  return { success: isRevision ? 'Bid revised.' : 'Bid submitted.' };
}

export async function withdrawBidAction(auctionId: string): Promise<BidFormState> {
  const { user, company } = await requireUser();
  const bid = await loadSellerBid(auctionId, company.id);
  if (!bid) return { error: 'Bid not found.' };
  if (!canAccessOwned(bid.sellerUserId, user)) return { error: 'Bid not found.' };

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
  if (!canAccessOwned(bid.sellerUserId, user)) return { error: 'Request not found.' };

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
    const rate = round2(Number(finalRateRaw)); // #27 — store at 2dp
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

// ── Seller structured counter-proposal (#21) ──────────────────────────────────
// NOT a partial bid: the seller still bids the FULL quantity and the leaderboard
// ranking is untouched. This proposes a REVISED SPEC (qty / packing / delivery /
// validity) the buyer may approve. On accept the auction's base spec is NOT
// rewritten — the accepted terms are recorded as the agreed modification for THIS
// seller only, shown to both parties. Each seller has at most ONE pending
// proposal per auction at a time (re-proposing after a reject is allowed).

const counterProposalSchema = z.object({
  auctionId: z.string().uuid(),
  proposedQuantity: z.string().optional(),
  proposedUnit: z.enum(['kg', 'mt', 'l']).optional().or(z.literal('')),
  proposedPacking: z.string().optional(),
  proposedLogisticsBasis: z.enum(['delivered', 'exworks', 'other']).optional().or(z.literal('')),
  proposedDeliveryAddress: z.string().optional(),
  proposedOfferValidUntil: z.string().optional(),
  proposedSupplyValidUntil: z.string().optional(),
  note: z.string().optional(),
});

export async function counterProposeAction(
  _prev: BidFormState,
  formData: FormData,
): Promise<BidFormState> {
  const { user, company } = await requireUser();
  if (!user.canSell && !user.isAdmin) return { error: 'You need sell capability to propose changes.' };

  const parsed = counterProposalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: 'Please check the proposal form.' };
  const data = parsed.data;

  const [auction] = await db.select().from(auctions).where(eq(auctions.id, data.auctionId)).limit(1);
  if (!auction) return { error: 'Auction not found.' };
  if (auction.status !== 'active') return { error: 'This auction is no longer open.' };

  const bid = await loadSellerBid(data.auctionId, company.id);
  if (!bid) return { error: 'You were not invited to this requirement.' };
  if (!canAccessOwned(bid.sellerUserId, user)) return { error: 'Request not found.' };
  if (bid.gateState !== 'accepted') return { error: 'Accept the requirement before proposing changes.' };

  // Validity dates (optional) — if set, must be in the future and well-formed.
  const now = Date.now();
  let proposedOfferValidUntil: Date | null = null;
  if (data.proposedOfferValidUntil) {
    const d = istLocalToDate(data.proposedOfferValidUntil);
    if (Number.isNaN(d.getTime())) return { error: 'Offer validity date is invalid.' };
    if (d.getTime() <= now) return { error: 'Offer validity must be in the future.' };
    proposedOfferValidUntil = d;
  }
  let proposedSupplyValidUntil: Date | null = null;
  if (data.proposedSupplyValidUntil) {
    const d = istLocalToDate(data.proposedSupplyValidUntil);
    if (Number.isNaN(d.getTime())) return { error: 'Supply validity date is invalid.' };
    if (d.getTime() <= now) return { error: 'Supply validity must be in the future.' };
    proposedSupplyValidUntil = d;
  }

  // Quantity (optional) — if provided, must be a positive number. #27: store at 2dp.
  let proposedQuantity: string | null = null;
  if (data.proposedQuantity?.trim()) {
    const q = round2(Number(data.proposedQuantity));
    if (!Number.isFinite(q) || q <= 0) return { error: 'Proposed quantity must be greater than 0.' };
    proposedQuantity = String(q);
  }

  const values = {
    proposedQuantity,
    proposedUnit: data.proposedUnit ? data.proposedUnit : null,
    proposedPacking: data.proposedPacking?.trim() || null,
    proposedLogisticsBasis: data.proposedLogisticsBasis ? data.proposedLogisticsBasis : null,
    proposedDeliveryAddress: data.proposedDeliveryAddress?.trim() || null,
    proposedOfferValidUntil,
    proposedSupplyValidUntil,
    note: data.note?.trim() || null,
  };

  // At most one PENDING proposal per auction per seller — update it if it exists.
  const [existing] = await db
    .select()
    .from(counterProposals)
    .where(
      and(
        eq(counterProposals.auctionId, data.auctionId),
        eq(counterProposals.sellerCompanyId, company.id),
        eq(counterProposals.status, 'pending'),
      ),
    )
    .limit(1);

  let proposalId: string;
  if (existing) {
    await db
      .update(counterProposals)
      .set({ ...values, createdAt: new Date() })
      .where(eq(counterProposals.id, existing.id));
    proposalId = existing.id;
  } else {
    const [created] = await db
      .insert(counterProposals)
      .values({
        auctionId: data.auctionId,
        bidId: bid.id,
        sellerCompanyId: company.id,
        ...values,
      })
      .returning({ id: counterProposals.id });
    if (!created) return { error: 'Could not submit the proposal. Please try again.' };
    proposalId = created.id;
  }

  await recordAudit({
    actorUserId: user.id,
    entityType: 'counter_proposal',
    entityId: proposalId,
    action: AuditAction.CounterProposed,
    snapshot: { auctionId: data.auctionId, bidId: bid.id, ...values },
  });

  // Notify the buyer (the auction owner) in-app.
  await db.insert(notifications).values({
    userId: auction.buyerUserId,
    type: 'counter_proposal.received',
    payload: { auctionId: data.auctionId, proposalId, name: auction.name },
  });

  revalidatePath(`/requests/${data.auctionId}`);
  return { success: existing ? 'Proposal updated.' : 'Proposal sent to the buyer.' };
}

export async function withdrawCounterProposalAction(proposalId: string): Promise<BidFormState> {
  const { user, company } = await requireUser();
  const [proposal] = await db
    .select()
    .from(counterProposals)
    .where(eq(counterProposals.id, proposalId))
    .limit(1);
  if (!proposal || proposal.sellerCompanyId !== company.id) return { error: 'Proposal not found.' };
  // Member gate: a non-admin may only withdraw a proposal tied to a bid THEY own.
  const [proposalBid] = await db.select().from(bids).where(eq(bids.id, proposal.bidId)).limit(1);
  if (!proposalBid || !canAccessOwned(proposalBid.sellerUserId, user)) return { error: 'Proposal not found.' };
  if (proposal.status !== 'pending') return { error: 'Only a pending proposal can be withdrawn.' };

  await db
    .update(counterProposals)
    .set({ status: 'withdrawn', respondedAt: new Date() })
    .where(eq(counterProposals.id, proposalId));
  await recordAudit({
    actorUserId: user.id,
    entityType: 'counter_proposal',
    entityId: proposalId,
    action: AuditAction.CounterProposed,
    snapshot: { withdrawn: true, auctionId: proposal.auctionId },
  });
  revalidatePath(`/requests/${proposal.auctionId}`);
  return { success: 'Proposal withdrawn.' };
}
