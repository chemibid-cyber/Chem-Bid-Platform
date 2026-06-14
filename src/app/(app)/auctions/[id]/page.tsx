import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, eq, count, isNotNull, asc } from 'drizzle-orm';
import { Building2 } from 'lucide-react';
import { requireUser } from '@/lib/auth/session';
import { canAccessOwned } from '@/lib/auth/scope';
import { db } from '@/lib/db';
import { auctions, bids, companies, counterProposals } from '@/lib/db/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatIST, timeRemaining, UNIT_LABEL, LOGISTICS_BASIS_LABEL } from '@/lib/format';
import { auctionStatusMeta } from '@/lib/auction/status';
import { ROLE_LABEL } from '@/lib/catalog/constants';
import { ExtendForm, CancelButton, CloneButton, SpecDownloadButton } from './auction-controls';
import { CounterProposalControls } from './counter-controls';

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
  const { user, company } = await requireUser();
  const [auction] = await db
    .select()
    .from(auctions)
    .where(and(eq(auctions.id, params.id), eq(auctions.buyerCompanyId, company.id)))
    .limit(1);
  if (!auction) notFound();
  // Member-level isolation (#42): a member sees only auctions they created; admins see all.
  if (!canAccessOwned(auction.buyerUserId, user)) notFound();

  const [bidStat] = await db
    .select({ value: count() })
    .from(bids)
    .where(and(eq(bids.auctionId, auction.id), isNotNull(bids.stage1Total)));
  const bidCount = Number(bidStat?.value ?? 0);
  const meta = auctionStatusMeta(auction.status);

  // Pending seller counter-proposals (#21) — buyer reviews + accepts/rejects.
  // Accepting records the agreed term modification for that seller; it does NOT
  // rewrite the auction base spec, so ranking / other sellers are unaffected.
  const proposals = await db
    .select({
      id: counterProposals.id,
      sellerName: companies.legalName,
      proposedQuantity: counterProposals.proposedQuantity,
      proposedUnit: counterProposals.proposedUnit,
      proposedPacking: counterProposals.proposedPacking,
      proposedLogisticsBasis: counterProposals.proposedLogisticsBasis,
      proposedDeliveryAddress: counterProposals.proposedDeliveryAddress,
      proposedOfferValidUntil: counterProposals.proposedOfferValidUntil,
      proposedSupplyValidUntil: counterProposals.proposedSupplyValidUntil,
      note: counterProposals.note,
      createdAt: counterProposals.createdAt,
    })
    .from(counterProposals)
    .innerJoin(companies, eq(counterProposals.sellerCompanyId, companies.id))
    .where(and(eq(counterProposals.auctionId, auction.id), eq(counterProposals.status, 'pending')))
    .orderBy(asc(counterProposals.createdAt));

  const auctionUnitLabel = UNIT_LABEL[auction.unit] ?? auction.unit;
  // A proposed field "changed" only when it differs from the auction's value.
  const proposalRows = proposals.map((p) => {
    const changes: { label: string; value: string }[] = [];
    if (p.proposedQuantity != null && Number(p.proposedQuantity) !== Number(auction.quantity)) {
      const u = p.proposedUnit ? UNIT_LABEL[p.proposedUnit] ?? p.proposedUnit : auctionUnitLabel;
      changes.push({
        label: 'Quantity',
        value: `${p.proposedQuantity} ${u} (was ${auction.quantity} ${auctionUnitLabel})`,
      });
    } else if (p.proposedUnit && p.proposedUnit !== auction.unit) {
      changes.push({
        label: 'Unit',
        value: `${UNIT_LABEL[p.proposedUnit] ?? p.proposedUnit} (was ${auctionUnitLabel})`,
      });
    }
    if (p.proposedPacking && p.proposedPacking !== (auction.packing ?? '')) {
      changes.push({ label: 'Packing', value: `${p.proposedPacking} (was ${auction.packing ?? '—'})` });
    }
    if (p.proposedLogisticsBasis && p.proposedLogisticsBasis !== auction.logisticsBasis) {
      changes.push({
        label: 'Delivery terms',
        value: `${LOGISTICS_BASIS_LABEL[p.proposedLogisticsBasis] ?? p.proposedLogisticsBasis} (was ${LOGISTICS_BASIS_LABEL[auction.logisticsBasis] ?? auction.logisticsBasis})`,
      });
    }
    if (p.proposedDeliveryAddress && p.proposedDeliveryAddress !== auction.deliveryAddress) {
      changes.push({ label: 'Delivery address', value: p.proposedDeliveryAddress });
    }
    if (p.proposedOfferValidUntil) {
      changes.push({ label: 'Offer valid until', value: formatIST(p.proposedOfferValidUntil) });
    }
    if (p.proposedSupplyValidUntil) {
      changes.push({ label: 'Supply valid until', value: formatIST(p.proposedSupplyValidUntil) });
    }
    return { ...p, changes };
  });

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

      {proposalRows.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Seller proposals{' '}
              <Badge variant="warning" className="ml-1 align-middle">
                {proposalRows.length} pending
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              A seller has proposed revised terms. Accepting records the agreed modification for that
              seller only — it does not change the requirement for other bidders or affect ranking.
            </p>
            {proposalRows.map((p) => (
              <div key={p.id} className="rounded-lg border p-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">{p.sellerName}</span>
                  <span className="text-xs text-muted-foreground">· {formatIST(p.createdAt)}</span>
                </div>
                {p.changes.length > 0 ? (
                  <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    {p.changes.map((c) => (
                      <div key={c.label}>
                        <dt className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</dt>
                        <dd className="font-medium">{c.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    No field changes proposed — see the seller&apos;s note below.
                  </p>
                )}
                {p.note ? (
                  <p className="mt-3 rounded-md bg-muted/40 px-3 py-2 text-sm">
                    <span className="font-medium">Seller&apos;s note: </span>
                    {p.note}
                  </p>
                ) : null}
                {auction.status === 'active' ? (
                  <CounterProposalControls proposalId={p.id} />
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">
                    The auction has closed — proposals can no longer be answered here.
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

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
          ) : auction.status === 'unsuccessful' || auction.status === 'cancelled' ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {auction.status === 'unsuccessful'
                  ? 'This requirement closed with no bids.'
                  : 'This auction was cancelled.'}
              </p>
              <CloneButton auctionId={auction.id} />
            </div>
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
