import { eq, desc } from 'drizzle-orm';
import { Bell } from 'lucide-react';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { Card, CardContent } from '@/components/ui/card';
import { formatIST, UNIT_LABEL } from '@/lib/format';
import { MarkAllReadButton, NotificationItem } from './notification-controls';

export const metadata = { title: 'Notifications' };

type Payload = Record<string, unknown>;
const s = (v: unknown) => (v == null ? '' : String(v));

function view(type: string, p: Payload): { title: string; href: string | null } {
  const auctionId = s(p.auctionId);
  const unit = UNIT_LABEL[s(p.unit)] ?? s(p.unit);
  switch (type) {
    case 'auction.new':
      return { title: `New requirement: ${s(p.name)} (${s(p.quantity)} ${unit})`, href: `/requests/${auctionId}` };
    case 'auction.bids_ready':
      return { title: `Bids are in for "${s(p.name)}" — review and settle`, href: `/auctions/${auctionId}/review` };
    case 'auction.unsuccessful':
      return { title: `"${s(p.name)}" closed with no bids — clone & relist?`, href: `/auctions/${auctionId}` };
    case 'auction.cancelled':
      return { title: `A requirement you engaged with was cancelled: "${s(p.name)}"`, href: `/requests/${auctionId}` };
    case 'auction.stage2':
      return { title: `Counter-offer: ₹${s(p.rate)}/${unit} for "${s(p.name)}"`, href: `/requests/${auctionId}` };
    case 'deal.won':
      return { title: `You won the deal for "${s(p.name)}"`, href: `/deals/${s(p.dealId)}` };
    case 'deal.confirmed':
      return { title: `Deal confirmed for "${s(p.name)}"`, href: `/deals/${s(p.dealId)}` };
    case 'network.added':
      return { title: `${s(p.buyerName)} added you to their vendor network (CAS ${s(p.casNumber)})`, href: `/network` };
    case 'catalog.transfer_requested':
      return { title: `${s(p.requestedBy)} requested transfer of "${s(p.name)}"`, href: `/catalog` };
    default:
      return { title: type, href: null };
  }
}

export default async function NotificationsPage() {
  const { user } = await requireUser();
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(100);

  const unreadCount = rows.filter((r) => !r.readAt).length;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        <MarkAllReadButton disabled={unreadCount === 0} />
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Bell className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">No notifications yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((n) => {
            const v = view(n.type, (n.payload ?? {}) as Payload);
            return (
              <NotificationItem
                key={n.id}
                id={n.id}
                href={v.href}
                title={v.title}
                time={formatIST(n.createdAt)}
                unread={!n.readAt}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
