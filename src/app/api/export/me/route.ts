import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import {
  companies,
  users,
  catalogItems,
  auctions,
  bids,
  deals,
  notifications,
} from '@/lib/db/schema';
import { recordAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** DPDP "Export my data": the user's profile + their company's records, as JSON. */
export async function GET() {
  const current = await getCurrentUser();
  if (!current) return new Response('Unauthorized', { status: 401 });
  const companyId = current.company.id;

  // "My data": the requester's own profile + their company's business records.
  // Other members' PII is deliberately NOT included (export is per-subject).
  const [company, profile, catalog, buyerAuctions, sellerBids, companyDeals, myNotifications] =
    await Promise.all([
      db.select().from(companies).where(eq(companies.id, companyId)),
      db.select().from(users).where(eq(users.id, current.user.id)),
      db.select().from(catalogItems).where(eq(catalogItems.companyId, companyId)),
      db.select().from(auctions).where(eq(auctions.buyerCompanyId, companyId)),
      db.select().from(bids).where(eq(bids.sellerCompanyId, companyId)),
      db.select().from(deals).where(eq(deals.buyerCompanyId, companyId)),
      db.select().from(notifications).where(eq(notifications.userId, current.user.id)),
    ]);

  await recordAudit({
    actorUserId: current.user.id,
    entityType: 'user',
    entityId: current.user.id,
    action: 'user.data_exported',
  });

  const payload = {
    exportedAt: new Date().toISOString(),
    requestedBy: current.user.email,
    company: company[0] ?? null,
    profile: profile[0] ?? null,
    catalog,
    auctions: buyerAuctions,
    bids: sellerBids,
    deals: companyDeals,
    notifications: myNotifications,
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="my-data.json"',
    },
  });
}
