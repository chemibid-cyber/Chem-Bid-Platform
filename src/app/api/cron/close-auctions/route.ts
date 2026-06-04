import { and, eq, lte, isNull, isNotNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { auctions, bids, notifications } from '@/lib/db/schema';
import { isAuthorizedCron } from '@/lib/cron/auth';
import { recordAudit, AuditAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Closes auctions whose deadline has passed (data-driven timer — survives
 * deploys/outages). Idempotent: only acts on status='active' && closesAt<=now,
 * and the status change prevents reprocessing.
 *  - has real quotes  → awaiting_decision (bids preserved), notify buyer
 *  - zero quotes      → unsuccessful, notify buyer (Clone & relist)
 */
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const due = await db
    .select()
    .from(auctions)
    .where(and(eq(auctions.status, 'active'), lte(auctions.closesAt, now)));

  let awaiting = 0;
  let unsuccessful = 0;

  for (const a of due) {
    const realBids = await db
      .select({ id: bids.id })
      .from(bids)
      .where(and(eq(bids.auctionId, a.id), eq(bids.status, 'active'), isNotNull(bids.stage1Total)));

    if (realBids.length > 0) {
      await db
        .update(auctions)
        .set({ status: 'awaiting_decision', awaitingSince: now })
        .where(eq(auctions.id, a.id));
      // Expire un-quoted placeholder rows so they don't linger as "active".
      await db
        .update(bids)
        .set({ status: 'expired' })
        .where(and(eq(bids.auctionId, a.id), eq(bids.status, 'active'), isNull(bids.stage1Total)));
      await db.insert(notifications).values({
        userId: a.buyerUserId,
        type: 'auction.bids_ready',
        payload: { auctionId: a.id, name: a.name, bids: realBids.length },
      });
      await recordAudit({
        actorUserId: null,
        entityType: 'auction',
        entityId: a.id,
        action: AuditAction.AuctionClosed,
        snapshot: { bids: realBids.length, outcome: 'awaiting_decision' },
      });
      awaiting += 1;
    } else {
      await db.update(auctions).set({ status: 'unsuccessful' }).where(eq(auctions.id, a.id));
      await db.insert(notifications).values({
        userId: a.buyerUserId,
        type: 'auction.unsuccessful',
        payload: { auctionId: a.id, name: a.name },
      });
      await recordAudit({
        actorUserId: null,
        entityType: 'auction',
        entityId: a.id,
        action: AuditAction.AuctionUnsuccessful,
      });
      unsuccessful += 1;
    }
  }

  return Response.json({ processed: due.length, awaiting, unsuccessful });
}
