import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, eq, count, isNotNull } from 'drizzle-orm';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { auctions, bids } from '@/lib/db/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatIST, timeRemaining, UNIT_LABEL } from '@/lib/format';
import { auctionStatusMeta } from '@/lib/auction/status';
import { ROLE_LABEL } from '@/lib/catalog/constants';
import { ExtendForm, CancelButton, SpecDownloadButton } from './auction-controls';

export const metadata = { title: 'Auction' };

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{value || '—'}</dd>
    </div>
  );
}

export default async function AuctionDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { published?: string };
}) {
  const { company } = await requireUser();
  const [auction] = await db
    .select()
    .from(auctions)
    .where(and(eq(auctions.id, params.id), eq(auctions.buyerCompanyId, company.id)))
    .limit(1);
  if (!auction) notFound();

  const [bidStat] = await db
    .select({ value: count() })
    .from(bids)
    .where(and(eq(bids.auctionId, auction.id), isNotNull(bids.stage1Total)));
  const bidCount = Number(bidStat?.value ?? 0);
  const meta = auctionStatusMeta(auction.status);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/auctions" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to auctions
      </Link>

      {searchParams.published !== undefined ? (
        <Alert variant="success">
          <AlertDescription>
            Published — {searchParams.published} qualified seller
            {searchParams.published === '1' ? '' : 's'} notified.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{auction.name}</h1>
            {auction.blind ? <Badge variant="outline">Blind</Badge> : null}
            <Badge variant={meta.variant}>{meta.label}</Badge>
          </div>
          {auction.casNumber ? (
            <p className="text-muted-foreground">CAS {auction.casNumber}</p>
          ) : (
            <p className="text-muted-foreground">Custom mixture</p>
          )}
        </div>
        {auction.specFileUrl ? <SpecDownloadButton auctionId={auction.id} /> : null}
      </div>

      <Card>
        <CardContent className="pt-6">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Detail label="Quantity" value={`${auction.quantity} ${UNIT_LABEL[auction.unit] ?? auction.unit}`} />
            <Detail label="Minimum purity" value={auction.minPurity ? `${auction.minPurity}%` : '—'} />
            <Detail label="Packing" value={auction.packing ?? ''} />
            <Detail
              label="Logistics basis"
              value={auction.logisticsBasis === 'exworks' ? 'Ex-Works (buyer pickup)' : 'Delivered'}
            />
            <Detail
              label="Supplier filter"
              value={auction.supplierFilter.map((r) => ROLE_LABEL[r] ?? r).join(', ') || 'Any'}
            />
            <Detail label="Visibility" value={auction.privacyMode === 'registered' ? 'Registered partners only' : 'All qualified sellers'} />
            <div className="sm:col-span-2">
              <Detail label="Delivery address" value={auction.deliveryAddress} />
            </div>
            {auction.remarks ? (
              <div className="sm:col-span-2">
                <Detail label="Remarks" value={auction.remarks} />
              </div>
            ) : null}
            <Detail
              label="Closes"
              value={
                auction.status === 'active'
                  ? `${formatIST(auction.closesAt)} (in ${timeRemaining(auction.closesAt)})`
                  : formatIST(auction.closesAt)
              }
            />
            <Detail label="Bids received" value={String(bidCount)} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bids</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {auction.status === 'active' ? (
            <p className="text-sm text-muted-foreground">
              {auction.blind
                ? 'Bids are sealed in blind mode — totals are revealed when the auction closes.'
                : 'Bids will be sortable once the auction closes.'}
            </p>
          ) : (
            <Link href={`/auctions/${auction.id}/review`} className={cn(buttonVariants())}>
              Review bids &amp; settle
            </Link>
          )}

          {auction.status === 'active' ? (
            <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4">
              {auction.extendedOnce ? (
                <p className="text-xs text-muted-foreground">Already extended once.</p>
              ) : (
                <ExtendForm auctionId={auction.id} />
              )}
              <CancelButton auctionId={auction.id} />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
