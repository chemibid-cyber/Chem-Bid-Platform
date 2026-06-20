import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import {
  db,
  resetDb,
  seedCompany,
  seedActor,
  seedAuction,
  seedBid,
  actAs,
  callAction,
} from '@/test/integration/harness';
import { bids } from '@/lib/db/schema';
import { getMyRankAction, withdrawBidAction } from './actions';

/**
 * Blind-mode privacy — THE core security guarantee: a seller sees only their own
 * standing, never a competitor's price or identity.
 */
describe('getMyRankAction — blind privacy', () => {
  beforeEach(resetDb);

  it('returns only {rank, of, blind} and never leaks a rival price or identity', async () => {
    const buyer = await seedActor();
    const auction = await seedAuction({
      buyerCompanyId: buyer.company.id,
      buyerUserId: buyer.user.id,
    });

    const sellers: { company: { id: string; legalName: string }; user: { id: string }; total: number }[] = [];
    for (const total of [90, 86, 88]) {
      const s = await seedActor();
      await seedBid({
        auctionId: auction.id,
        sellerCompanyId: s.company.id,
        sellerUserId: s.user.id,
        gateState: 'accepted',
        stage1Total: String(total),
        status: 'active',
      });
      sellers.push({ company: s.company, user: s.user, total });
    }

    // The seller at ₹88 should rank #2 (86 < 88 < 90), of 3.
    const me = sellers.find((s) => s.total === 88)!;
    actAs({ company: me.company as never, user: me.user as never });
    const res = await getMyRankAction(auction.id);

    expect(res).toEqual({ rank: 2, of: 3, blind: true });

    // The payload must carry NOTHING about rivals — not their price, not their id/name.
    const json = JSON.stringify(res);
    for (const other of sellers.filter((s) => s !== me)) {
      expect(json).not.toContain(String(other.total));
      expect(json).not.toContain(other.company.id);
      expect(json).not.toContain(other.company.legalName);
    }
  });

  it('a seller who has not quoted gets rank null', async () => {
    const buyer = await seedActor();
    const auction = await seedAuction({
      buyerCompanyId: buyer.company.id,
      buyerUserId: buyer.user.id,
    });
    const lonely = await seedActor();
    actAs(lonely);
    const res = await getMyRankAction(auction.id);
    expect(res).toMatchObject({ rank: null, of: 0 });
  });
});

/** Member-level write isolation on the seller side (#42). */
describe('withdrawBidAction — member write isolation', () => {
  beforeEach(resetDb);

  async function scenario() {
    const company = await seedCompany();
    const alice = await seedActor({ company }); // owns the bid
    const bob = await seedActor({ company }); // colleague, non-admin
    const buyer = await seedActor();
    const auction = await seedAuction({
      buyerCompanyId: buyer.company.id,
      buyerUserId: buyer.user.id,
    });
    const bid = await seedBid({
      auctionId: auction.id,
      sellerCompanyId: company.id,
      sellerUserId: alice.user.id,
      gateState: 'accepted',
      stage1Total: '100',
      status: 'active',
    });
    return { alice, bob, auction, bid };
  }

  const statusOf = async (id: string) =>
    (await db.select().from(bids).where(eq(bids.id, id)))[0]?.status;

  it("a colleague cannot withdraw another member's bid", async () => {
    const { bob, auction, bid } = await scenario();
    actAs(bob);
    const res = await callAction(withdrawBidAction(auction.id));
    expect(res).toMatchObject({ error: expect.stringMatching(/not found/i) });
    expect(await statusOf(bid.id)).toBe('active'); // untouched
  });

  it('the bid owner can withdraw their own bid (retained, not deleted)', async () => {
    const { alice, auction, bid } = await scenario();
    actAs(alice);
    const res = await callAction(withdrawBidAction(auction.id));
    expect(res).toMatchObject({ success: expect.any(String) });
    expect(await statusOf(bid.id)).toBe('withdrawn'); // row still exists, status changed
  });
});
