import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import {
  db,
  resetDb,
  seedActor,
  seedAuction,
  seedSalesCatalog,
  seedBlock,
  seedBid,
} from '@/test/integration/harness';
import { bids } from '@/lib/db/schema';
import { runTargeting } from '@/lib/targeting/run';
import { rankOf } from '@/lib/ranking';

/**
 * The core loop's front half, against the REAL targeting engine + Postgres:
 * who gets pulled into a blind auction, and how blind ranks tie-break.
 * (Ported from scripts/sim-multiuser.ts so it runs deterministically in CI.)
 */
describe('runTargeting — seller matching', () => {
  beforeEach(resetDb);

  it('notifies only unblocked sellers carrying the CAS; excludes wrong-CAS, blocked, and self', async () => {
    const buyer = await seedActor();

    const matching = [];
    for (let i = 0; i < 3; i++) {
      const s = await seedActor();
      await seedSalesCatalog({ companyId: s.company.id, ownerUserId: s.user.id, casNumber: '67-64-1' });
      matching.push(s);
    }
    // Two sellers carrying a different chemical — must NOT be targeted.
    for (const cas of ['64-17-5', '71-43-2']) {
      const s = await seedActor();
      await seedSalesCatalog({ companyId: s.company.id, ownerUserId: s.user.id, casNumber: cas, name: 'Other' });
    }
    // An Acetone seller the buyer has blocked for this CAS — must NOT be targeted.
    const blocked = await seedActor();
    await seedSalesCatalog({ companyId: blocked.company.id, ownerUserId: blocked.user.id, casNumber: '67-64-1' });
    // The buyer themselves carry Acetone — self must NOT be targeted.
    await seedSalesCatalog({ companyId: buyer.company.id, ownerUserId: buyer.user.id, casNumber: '67-64-1' });

    const auction = await seedAuction({
      buyerCompanyId: buyer.company.id,
      buyerUserId: buyer.user.id,
      casNumber: '67-64-1',
    });
    await seedBlock({
      blockerCompanyId: buyer.company.id,
      blockedCompanyId: blocked.company.id,
      casNumber: '67-64-1',
    });

    const { notified } = await runTargeting(auction);
    expect(notified).toBe(3);

    const rows = await db
      .select({ companyId: bids.sellerCompanyId })
      .from(bids)
      .where(eq(bids.auctionId, auction.id));
    const targeted = new Set(rows.map((r) => r.companyId));
    expect(targeted.size).toBe(3);
    for (const s of matching) expect(targeted.has(s.company.id)).toBe(true);
    expect(targeted.has(blocked.company.id)).toBe(false);
    expect(targeted.has(buyer.company.id)).toBe(false);
  });
});

describe('blind rank — lowest total wins, ties break on the earlier quote', () => {
  beforeEach(resetDb);

  it('ranks by total ascending; equal totals → earlier createdAt ahead', async () => {
    const buyer = await seedActor();
    const auction = await seedAuction({
      buyerCompanyId: buyer.company.id,
      buyerUserId: buyer.user.id,
    });

    const t = Date.now();
    const specs = [
      { total: 90, at: new Date(t) }, // tie, earlier
      { total: 90, at: new Date(t + 2000) }, // tie, later
      { total: 86, at: new Date(t + 4000) }, // lowest
    ];
    const made: { id: string; total: number; at: Date }[] = [];
    for (const sp of specs) {
      const s = await seedActor();
      const b = await seedBid({
        auctionId: auction.id,
        sellerCompanyId: s.company.id,
        sellerUserId: s.user.id,
        gateState: 'accepted',
        stage1Total: String(sp.total),
        status: 'active',
        createdAt: sp.at,
      });
      made.push({ id: b.id, total: sp.total, at: sp.at });
    }

    const ranked = made.map((m) => ({ id: m.id, total: m.total, createdAt: m.at }));
    expect(rankOf(ranked, made[2].id)).toBe(1); // ₹86 — lowest
    expect(rankOf(ranked, made[0].id)).toBe(2); // ₹90 earlier
    expect(rankOf(ranked, made[1].id)).toBe(3); // ₹90 later
  });
});
