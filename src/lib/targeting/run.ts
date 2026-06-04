import { and, eq, ne } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  catalogItems,
  users,
  companies,
  blocks,
  registeredPartners,
  notifications,
  type Auction,
} from '@/lib/db/schema';
import { isQualifiedSeller, type AuctionTarget, type SellerCandidate } from '@/lib/targeting';
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

  // 3. Exclude sellers who blocked this buyer (all-scope or this CAS).
  const blockRows = await db
    .select({ blockerCompanyId: blocks.blockerCompanyId, scope: blocks.scope, casNumber: blocks.casNumber })
    .from(blocks)
    .where(eq(blocks.blockedCompanyId, auction.buyerCompanyId));
  const blockedBy = new Set(
    blockRows
      .filter((b) => b.scope === 'all' || b.casNumber === auction.casNumber)
      .map((b) => b.blockerCompanyId),
  );
  qualified = qualified.filter((c) => !blockedBy.has(c.companyId));

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
