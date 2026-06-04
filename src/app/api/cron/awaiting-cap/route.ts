import { and, eq, lte, isNotNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { auctions } from '@/lib/db/schema';
import { isAuthorizedCron } from '@/lib/cron/auth';
import { recordAudit, AuditAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Prevents zombie auctions: anything sitting in awaiting_decision for 14 days
 * auto-archives to closed (bids preserved). Idempotent via the status change.
 */
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - FOURTEEN_DAYS_MS);
  const stale = await db
    .select({ id: auctions.id })
    .from(auctions)
    .where(
      and(
        eq(auctions.status, 'awaiting_decision'),
        isNotNull(auctions.awaitingSince),
        lte(auctions.awaitingSince, cutoff),
      ),
    );

  for (const a of stale) {
    await db.update(auctions).set({ status: 'closed', stage: 'closed' }).where(eq(auctions.id, a.id));
    await recordAudit({
      actorUserId: null,
      entityType: 'auction',
      entityId: a.id,
      action: AuditAction.AuctionClosed,
      snapshot: { reason: 'awaiting_decision_cap_14d' },
    });
  }

  return Response.json({ archived: stale.length });
}
