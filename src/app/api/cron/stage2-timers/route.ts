import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { auctions, bids, users } from '@/lib/db/schema';
import { isAuthorizedCron } from '@/lib/cron/auth';
import { isFinalUrgency } from '@/lib/auction/timing';
import { sendEmail } from '@/lib/email';
import { stage2UrgencyEmail } from '@/lib/email/templates';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Stage-2 final-2-hour urgency. Sends ONE urgent email (₹ rate in the subject)
 * to participants who haven't responded yet, guarded by stage2_urgency_sent so
 * it fires exactly once. Expiry needs no action: a non-responder's null Stage-2
 * rate leaves their Stage-1 bid standing via the lower-of leaderboard rule.
 */
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const live = await db
    .select()
    .from(auctions)
    .where(and(eq(auctions.stage, 'stage2'), eq(auctions.stage2UrgencySent, false), isNotNull(auctions.stage2ClosesAt)));

  let urgentBatches = 0;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  for (const a of live) {
    if (!a.stage2ClosesAt || !isFinalUrgency(a.stage2ClosesAt, now)) continue;

    const pending = await db
      .select({ email: users.email })
      .from(bids)
      .innerJoin(users, eq(bids.sellerUserId, users.id))
      .where(
        and(
          eq(bids.auctionId, a.id),
          eq(bids.status, 'active'),
          isNotNull(bids.stage1Total),
          isNull(bids.stage2Action),
        ),
      );

    await Promise.all(
      pending.map((p) => {
        const tmpl = stage2UrgencyEmail({
          productName: a.name,
          rate: String(a.stage2Target ?? ''),
          unit: a.unit,
          viewUrl: `${appUrl}/requests/${a.id}`,
        });
        return sendEmail({ to: p.email, subject: tmpl.subject, html: tmpl.html, text: tmpl.text });
      }),
    );

    await db.update(auctions).set({ stage2UrgencySent: true }).where(eq(auctions.id, a.id));
    urgentBatches += 1;
  }

  return Response.json({ stage2Auctions: live.length, urgentBatches });
}
