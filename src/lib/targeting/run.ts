import { and, eq, ne, or, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  catalogItems,
  users,
  companies,
  blocks,
  registeredPartners,
  notifications,
  bids,
  auctions,
  type Auction,
} from '@/lib/db/schema';
import { isQualifiedSeller, type AuctionTarget, type SellerCandidate } from '@/lib/targeting';
import { recordAudit, AuditAction } from '@/lib/audit';
import { sendEmail } from '@/lib/email';
import { sellerNotifiedEmail } from '@/lib/email/templates';

interface Candidate extends SellerCandidate {
  ownerUserId: string;
  ownerEmail: string;
  suspended: boolean;
}

/**
 * Find and notify qualified sellers for a published auction.
 *  - CAS exact match (or whole-token match for mixtures)
 *  - role intersection with the buyer's supplier filter
 *  - exclude sellers who blocked this buyer (this-CAS or all)
 *  - Registered-Only: restrict to ACTIVE partners for this CAS
 * Returns the count of seller companies notified.
 */
export async function runTargeting(auction: Auction): Promise<{ notified: number }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  // 1. Candidate sales-catalog items from OTHER companies.
  const baseWhere = and(
    eq(catalogItems.profileType, 'sales'),
    eq(catalogItems.delisted, false),
    ne(catalogItems.companyId, auction.buyerCompanyId),
  );
  const rows = await db
    .select({
      companyId: catalogItems.companyId,
      ownerUserId: catalogItems.ownerUserId,
      ownerEmail: users.email,
      casNumber: catalogItems.casNumber,
      name: catalogItems.name,
      isMixture: catalogItems.isMixture,
      mixtureText: catalogItems.mixtureText,
      grade: catalogItems.grade,
      roles: catalogItems.roles,
      suspended: companies.suspended,
    })
    .from(catalogItems)
    .innerJoin(users, eq(catalogItems.ownerUserId, users.id))
    .innerJoin(companies, eq(catalogItems.companyId, companies.id))
    .where(
      auction.casNumber
        ? and(baseWhere, eq(catalogItems.casNumber, auction.casNumber))
        : baseWhere,
    );

  const candidates: Candidate[] = rows
    .filter((r) => !r.suspended)
    .map((r) => ({
      companyId: r.companyId,
      ownerUserId: r.ownerUserId,
      ownerEmail: r.ownerEmail,
      casNumber: r.casNumber,
      name: r.name,
      isMixture: r.isMixture,
      mixtureText: r.mixtureText,
      grade: r.grade,
      roles: r.roles,
      suspended: r.suspended,
    }));

  // 2. Pure qualification (CAS / mixture token + role intersection).
  const target: AuctionTarget = {
    casNumber: auction.casNumber,
    name: auction.name,
    isMixture: !auction.casNumber,
    matchText: `${auction.name} ${auction.remarks ?? ''}`,
    grade: '',
    supplierFilter: auction.supplierFilter,
  };
  let qualified = candidates.filter((c) => isQualifiedSeller(target, c));

  // 3. Blocks, BOTH directions:
  //    (a) sellers who blocked this buyer never hear from them again;
  //    (b) sellers this buyer blocked are muted for the buyer's future requirements.
  const blockRows = await db
    .select({
      blockerCompanyId: blocks.blockerCompanyId,
      blockedCompanyId: blocks.blockedCompanyId,
      scope: blocks.scope,
      casNumber: blocks.casNumber,
    })
    .from(blocks)
    .where(
      or(
        eq(blocks.blockedCompanyId, auction.buyerCompanyId),
        eq(blocks.blockerCompanyId, auction.buyerCompanyId),
      ),
    );
  const applies = (b: (typeof blockRows)[number]) =>
    b.scope === 'all' || b.casNumber === auction.casNumber;
  const excluded = new Set<string>();
  for (const b of blockRows) {
    if (!applies(b)) continue;
    if (b.blockedCompanyId === auction.buyerCompanyId) excluded.add(b.blockerCompanyId); // (a)
    if (b.blockerCompanyId === auction.buyerCompanyId) excluded.add(b.blockedCompanyId); // (b)
  }
  qualified = qualified.filter((c) => !excluded.has(c.companyId));

  // 4. Registered-Only: restrict to ACTIVE partners for this CAS.
  if (auction.privacyMode === 'registered' && auction.casNumber) {
    const partners = await db
      .select({ gstin: registeredPartners.partnerGstin })
      .from(registeredPartners)
      .where(
        and(
          eq(registeredPartners.buyerCompanyId, auction.buyerCompanyId),
          eq(registeredPartners.casNumber, auction.casNumber),
          eq(registeredPartners.status, 'active'),
        ),
      );
    const gstins = new Set(partners.map((p) => p.gstin));
    if (gstins.size === 0) {
      qualified = [];
    } else {
      const allCompanies = await db
        .select({ id: companies.id, gstin: companies.gstin })
        .from(companies);
      const allowed = new Set(
        allCompanies.filter((c) => gstins.has(c.gstin)).map((c) => c.id),
      );
      qualified = qualified.filter((c) => allowed.has(c.companyId));
    }
  }

  // 5. Dedup by company (one notification per seller company) and notify.
  const byCompany = new Map<string, Candidate>();
  for (const c of qualified) if (!byCompany.has(c.companyId)) byCompany.set(c.companyId, c);

  const recipients = [...byCompany.values()];
  if (recipients.length > 0) {
    // Durable per-seller "request" rows carrying the gate state (notified →
    // accepted/ignored/blocked). One per seller company (unique on auction+company).
    await db
      .insert(bids)
      .values(
        recipients.map((c) => ({
          auctionId: auction.id,
          sellerCompanyId: c.companyId,
          sellerUserId: c.ownerUserId,
          gateState: 'notified' as const,
          status: 'active' as const,
        })),
      )
      .onConflictDoNothing({ target: [bids.auctionId, bids.sellerCompanyId] });

    await db.insert(notifications).values(
      recipients.map((c) => ({
        userId: c.ownerUserId,
        type: 'auction.new',
        payload: {
          auctionId: auction.id,
          name: auction.name,
          quantity: auction.quantity,
          unit: auction.unit,
        },
      })),
    );

    await Promise.all(
      recipients.map((c) => {
        const tmpl = sellerNotifiedEmail({
          productName: auction.name,
          quantity: String(auction.quantity),
          unit: auction.unit,
          viewUrl: `${appUrl}/requests/${auction.id}`,
        });
        return sendEmail({ to: c.ownerEmail, subject: tmpl.subject, html: tmpl.html, text: tmpl.text });
      }),
    );
  }

  return { notified: recipients.length };
}

export interface RetroMatchInput {
  itemId: string;
  companyId: string;
  companyGstin: string;
  companySuspended: boolean;
  ownerUserId: string;
  ownerEmail: string;
  casNumber: string | null;
  name: string;
  isMixture: boolean;
  mixtureText: string | null;
  grade: string;
  roles: string[];
}

/**
 * The mirror of runTargeting: when a seller adds a SALES catalog item, check
 * auctions that are ALREADY live and pull the seller into any they qualify for
 * (same rules: CAS/token match, supplier filter, blocks both ways,
 * Registered-Only). Idempotent — sellers already invited are never re-notified.
 */
export async function retroMatchSalesItem(input: RetroMatchInput): Promise<{ matched: number }> {
  if (input.companySuspended) return { matched: 0 };
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  // Live auctions from OTHER companies that could match this item:
  // exact-CAS auctions for a CAS item, plus mixture auctions (token match) for all.
  const candidates = await db
    .select()
    .from(auctions)
    .where(
      and(
        eq(auctions.status, 'active'),
        ne(auctions.buyerCompanyId, input.companyId),
        input.casNumber
          ? or(eq(auctions.casNumber, input.casNumber), isNull(auctions.casNumber))
          : isNull(auctions.casNumber),
      ),
    );
  if (candidates.length === 0) return { matched: 0 };

  // All blocks touching this seller company, once.
  const blockRows = await db
    .select({
      blockerCompanyId: blocks.blockerCompanyId,
      blockedCompanyId: blocks.blockedCompanyId,
      scope: blocks.scope,
      casNumber: blocks.casNumber,
    })
    .from(blocks)
    .where(
      or(eq(blocks.blockerCompanyId, input.companyId), eq(blocks.blockedCompanyId, input.companyId)),
    );

  const seller: SellerCandidate = {
    companyId: input.companyId,
    casNumber: input.casNumber,
    name: input.name,
    isMixture: input.isMixture,
    mixtureText: input.mixtureText,
    grade: input.grade,
    roles: input.roles,
  };

  let matched = 0;
  for (const auction of candidates) {
    const target: AuctionTarget = {
      casNumber: auction.casNumber,
      name: auction.name,
      isMixture: !auction.casNumber,
      matchText: `${auction.name} ${auction.remarks ?? ''}`,
      grade: '',
      supplierFilter: auction.supplierFilter,
    };
    if (!isQualifiedSeller(target, seller)) continue;

    // Blocks, both directions, scoped to this auction's CAS.
    const blocked = blockRows.some((b) => {
      if (b.scope !== 'all' && b.casNumber !== auction.casNumber) return false;
      const sellerBlockedBuyer =
        b.blockerCompanyId === input.companyId && b.blockedCompanyId === auction.buyerCompanyId;
      const buyerBlockedSeller =
        b.blockerCompanyId === auction.buyerCompanyId && b.blockedCompanyId === input.companyId;
      return sellerBlockedBuyer || buyerBlockedSeller;
    });
    if (blocked) continue;

    // Registered-Only auctions stay restricted to the buyer's active partners.
    if (auction.privacyMode === 'registered') {
      if (!auction.casNumber) continue;
      const [partner] = await db
        .select({ id: registeredPartners.id })
        .from(registeredPartners)
        .where(
          and(
            eq(registeredPartners.buyerCompanyId, auction.buyerCompanyId),
            eq(registeredPartners.casNumber, auction.casNumber),
            eq(registeredPartners.partnerGstin, input.companyGstin),
            eq(registeredPartners.status, 'active'),
          ),
        )
        .limit(1);
      if (!partner) continue;
    }

    // Idempotency: only act when the request row is genuinely new.
    const inserted = await db
      .insert(bids)
      .values({
        auctionId: auction.id,
        sellerCompanyId: input.companyId,
        sellerUserId: input.ownerUserId,
        gateState: 'notified',
        status: 'active',
      })
      .onConflictDoNothing({ target: [bids.auctionId, bids.sellerCompanyId] })
      .returning({ id: bids.id });
    if (inserted.length === 0) continue;

    matched += 1;
    await db.insert(notifications).values({
      userId: input.ownerUserId,
      type: 'auction.new',
      payload: {
        auctionId: auction.id,
        name: auction.name,
        quantity: auction.quantity,
        unit: auction.unit,
      },
    });
    const tmpl = sellerNotifiedEmail({
      productName: auction.name,
      quantity: String(auction.quantity),
      unit: auction.unit,
      viewUrl: `${appUrl}/requests/${auction.id}`,
    });
    await sendEmail({ to: input.ownerEmail, subject: tmpl.subject, html: tmpl.html, text: tmpl.text });
    await recordAudit({
      actorUserId: input.ownerUserId,
      entityType: 'auction',
      entityId: auction.id,
      action: AuditAction.AuctionRetroMatched,
      snapshot: { sellerCompanyId: input.companyId, catalogItemId: input.itemId },
    });
  }

  return { matched };
}
