import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import {
  db,
  resetDb,
  seedCompany,
  seedActor,
  seedAuction,
  actAs,
  callAction,
} from '@/test/integration/harness';
import { auctions, auditLog } from '@/lib/db/schema';
import { cancelAuctionAction } from './actions';

/**
 * Member-level write isolation (#42) — the exact bug class that shipped and was
 * fixed: a non-admin member could ACT on a colleague's auction by id even though
 * the UI hid it. These lock that the server action gate holds.
 */
describe('cancelAuctionAction — member + company write isolation', () => {
  beforeEach(resetDb);

  async function scenario() {
    const company = await seedCompany();
    const alice = await seedActor({ company }); // owns the auction
    const bob = await seedActor({ company }); // colleague, non-admin
    const admin = await seedActor({ company, isAdmin: true });
    const auction = await seedAuction({
      buyerCompanyId: company.id,
      buyerUserId: alice.user.id,
    });
    return { company, alice, bob, admin, auction };
  }

  const statusOf = async (id: string) =>
    (await db.select().from(auctions).where(eq(auctions.id, id)))[0]?.status;

  it("a non-admin member CANNOT cancel a colleague's auction", async () => {
    const { bob, auction } = await scenario();
    actAs(bob);
    const res = await callAction(cancelAuctionAction(auction.id));
    expect(res).toMatchObject({ error: expect.stringMatching(/not found/i) });
    expect(await statusOf(auction.id)).toBe('active'); // untouched
  });

  it('the owner CAN cancel their own auction', async () => {
    const { alice, auction } = await scenario();
    actAs(alice);
    const res = await callAction(cancelAuctionAction(auction.id));
    expect(res).toMatchObject({ redirectedTo: '/auctions' });
    expect(await statusOf(auction.id)).toBe('cancelled');
  });

  it('an admin CAN cancel any auction in the company', async () => {
    const { admin, auction } = await scenario();
    actAs(admin);
    const res = await callAction(cancelAuctionAction(auction.id));
    expect(res).toMatchObject({ redirectedTo: '/auctions' });
    expect(await statusOf(auction.id)).toBe('cancelled');
  });

  it('a member of ANOTHER company cannot cancel it (company boundary)', async () => {
    const { auction } = await scenario();
    const outsider = await seedActor(); // different company entirely
    actAs(outsider);
    const res = await callAction(cancelAuctionAction(auction.id));
    expect(res).toMatchObject({ error: expect.stringMatching(/not found/i) });
    expect(await statusOf(auction.id)).toBe('active');
  });

  it('a successful cancel writes an append-only audit row', async () => {
    const { admin, auction } = await scenario();
    actAs(admin);
    await callAction(cancelAuctionAction(auction.id));
    const audits = await db.select().from(auditLog).where(eq(auditLog.entityId, auction.id));
    expect(audits.length).toBeGreaterThan(0);
  });
});
