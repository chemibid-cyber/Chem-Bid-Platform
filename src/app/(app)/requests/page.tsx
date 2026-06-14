import Link from 'next/link';
import { eq, and, desc } from 'drizzle-orm';
import { Inbox } from 'lucide-react';
import { requireUser } from '@/lib/auth/session';
import { ownerScope } from '@/lib/auth/scope';
import { db } from '@/lib/db';
import { auctions, bids } from '@/lib/db/schema';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/help';
import { cn } from '@/lib/utils';
import { formatIST, timeRemaining, UNIT_LABEL } from '@/lib/format';

export const metadata = { title: 'Requests' };

export default async function RequestsPage() {
  const { user, company } = await requireUser();

  const rows = await db
    .select({
      auctionId: auctions.id,
      name: auctions.name,
      casNumber: auctions.casNumber,
      quantity: auctions.quantity,
      unit: auctions.unit,
      status: auctions.status,
      closesAt: auctions.closesAt,
      blind: auctions.blind,
      gateState: bids.gateState,
      bidStatus: bids.status,
      hasQuote: bids.stage1Total,
    })
    .from(bids)
    .innerJoin(auctions, eq(bids.auctionId, auctions.id))
    .where(and(eq(bids.sellerCompanyId, company.id), ownerScope(bids.sellerUserId, user)))
    .orderBy(desc(auctions.createdAt));

  const isActive = (s: string) => s === 'active';
  const fresh = rows.filter((r) => r.gateState === 'notified' && isActive(r.status));
  const quoting = rows.filter((r) => r.gateState === 'accepted' && isActive(r.status));
  const ignored = rows.filter((r) => r.gateState === 'ignored' && isActive(r.status));
  const past = rows.filter((r) => !isActive(r.status) && r.gateState !== 'blocked');

  function Row({ r }: { r: (typeof rows)[number] }) {
    return (
      <Link href={`/requests/${r.auctionId}`}>
        <Card className="transition-shadow hover:shadow-md">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{r.name}</span>
                {r.casNumber ? <span className="text-sm text-muted-foreground">CAS {r.casNumber}</span> : null}
              </div>
              <div className="text-sm text-muted-foreground">
                {r.quantity} {UNIT_LABEL[r.unit] ?? r.unit} ·{' '}
                {isActive(r.status)
                  ? `Closes: ${formatIST(r.closesAt)} (in ${timeRemaining(r.closesAt)})`
                  : formatIST(r.closesAt)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {r.hasQuote ? <Badge variant="success">Bid placed</Badge> : null}
              {r.bidStatus === 'withdrawn' ? <Badge variant="secondary">Withdrawn</Badge> : null}
              {r.bidStatus === 'won' ? <Badge variant="success">Won</Badge> : null}
              {r.bidStatus === 'lost' ? <Badge variant="secondary">Not selected</Badge> : null}
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Incoming requests</h1>

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={Inbox}
            title="No requests yet"
            description="Buyers reach you automatically when their requirement matches your sales catalog. Add the chemicals you supply (with CAS + grade) to start receiving requests."
            action={
              <Link href="/catalog/new" className={cn(buttonVariants({ variant: 'outline' }))}>
                Add to sales catalog
              </Link>
            }
          />
        </Card>
      ) : null}

      {fresh.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">New</h2>
          <div className="grid gap-3">{fresh.map((r) => <Row key={r.auctionId} r={r} />)}</div>
        </section>
      ) : null}

      {quoting.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Quoting</h2>
          <div className="grid gap-3">{quoting.map((r) => <Row key={r.auctionId} r={r} />)}</div>
        </section>
      ) : null}

      {past.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Closed</h2>
          <div className="grid gap-3">{past.map((r) => <Row key={r.auctionId} r={r} />)}</div>
        </section>
      ) : null}

      {ignored.length > 0 ? (
        <details className="space-y-3">
          <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Ignored ({ignored.length})
          </summary>
          <div className="mt-3 grid gap-3">{ignored.map((r) => <Row key={r.auctionId} r={r} />)}</div>
        </details>
      ) : null}
    </div>
  );
}
