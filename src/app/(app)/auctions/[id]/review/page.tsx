import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { and, eq, asc, isNotNull, inArray } from 'drizzle-orm';
import { Building2 } from 'lucide-react';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { auctions, bids, companies, users, blocks, deals } from '@/lib/db/schema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { averageTotal, effectiveTotal } from '@/lib/ranking';
import { formatRate, timeRemaining, UNIT_LABEL, PAYMENT_TERMS_LABEL } from '@/lib/format';
import { Stage2LaunchForm } from './stage2-launch-form';
import { CoaDownload } from './coa-download';
import { ConfirmDealForm, BlockSellerButton } from './settle-actions';
import { ReportButton } from '@/components/app/report-button';

export const metadata = { title: 'Review bids' };

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { confirmed?: string };
}) {
  const { company } = await requireUser();

  const [auction] = await db
    .select()
    .from(auctions)
    .where(and(eq(auctions.id, params.id), eq(auctions.buyerCompanyId, company.id)))
    .limit(1);
  if (!auction) notFound();
  if (auction.status === 'active') redirect(`/auctions/${auction.id}`);

  const rows = await db
    .select({
      bidId: bids.id,
      sellerCompanyId: bids.sellerCompanyId,
      stage1Basic: bids.stage1Basic,
      stage1Freight: bids.stage1Freight,
      stage1Total: bids.stage1Total,
      paymentTerms: bids.paymentTerms,
      leadTimeDays: bids.leadTimeDays,
      coaOnDispatch: bids.coaOnDispatch,
      coaFileUrl: bids.coaFileUrl,
      stage2Action: bids.stage2Action,
      stage2Rate: bids.stage2Rate,
      status: bids.status,
      sellerName: companies.legalName,
      contactFirst: users.firstName,
      contactLast: users.lastName,
      contactEmail: users.email,
      contactPhone: users.phone,
      contactDesignation: users.designation,
    })
    .from(bids)
    .innerJoin(companies, eq(bids.sellerCompanyId, companies.id))
    .innerJoin(users, eq(bids.sellerUserId, users.id))
    .where(
      and(
        eq(bids.auctionId, auction.id),
        isNotNull(bids.stage1Total),
        inArray(bids.status, ['active', 'won', 'lost']),
      ),
    )
    .orderBy(asc(bids.stage1Total));

  // Super-comparison: rank by the LOWER of Stage-1 / Stage-2 (effective) total.
  const ranked = rows
    .map((r) => ({
      ...r,
      effective: effectiveTotal(Number(r.stage1Total), r.stage2Rate ? Number(r.stage2Rate) : null),
    }))
    .sort((a, b) => a.effective - b.effective || Number(a.stage1Total) - Number(b.stage1Total));

  // Sellers this buyer has blocked for this CAS (show a tag; bids retained).
  const blockedRows = await db
    .select({ blockedCompanyId: blocks.blockedCompanyId, scope: blocks.scope, casNumber: blocks.casNumber })
    .from(blocks)
    .where(eq(blocks.blockerCompanyId, company.id));
  const blocked = new Set(
    blockedRows
      .filter((b) => b.scope === 'all' || b.casNumber === auction.casNumber)
      .map((b) => b.blockedCompanyId),
  );

  const unit = UNIT_LABEL[auction.unit] ?? auction.unit;
  const avg = averageTotal(rows.map((r) => Number(r.stage1Total)));
  const lowest = ranked[0]?.stage1Total ?? '';
  const inStage2 = auction.stage === 'stage2';
  const stage2Open = inStage2 && auction.stage2ClosesAt && auction.stage2ClosesAt.getTime() > Date.now();
  const closed = auction.status === 'closed';

  let dealId: string | null = null;
  if (closed) {
    const [deal] = await db.select({ id: deals.id }).from(deals).where(eq(deals.auctionId, auction.id)).limit(1);
    dealId = deal?.id ?? null;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link href={`/auctions/${auction.id}`} className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to auction
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Review bids — {auction.name}</h1>
        <p className="text-muted-foreground">
          {rows.length} bid{rows.length === 1 ? '' : 's'} · average total ₹{formatRate(avg)}/{unit}
          {inStage2 && !closed ? ' · Stage-2 in progress' : ''}
        </p>
      </div>

      {searchParams.confirmed || closed ? (
        <Alert variant="success">
          <AlertDescription>
            Deal confirmed and the auction is closed.{' '}
            {dealId ? (
              <Link href={`/deals/${dealId}`} className="font-medium underline">
                View the Deal Confirmation Record
              </Link>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Stage-2 control (hidden once closed) */}
      {!closed ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stage-2 counter (single round, all participants)</CardTitle>
            <CardDescription>
              Optional. Send one counter rate to every bidder for 24 hours, or settle directly from
              the leaderboard below (sorted by the lower of each seller&apos;s Stage-1 / Stage-2 rate).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!inStage2 ? (
              ranked.length > 0 ? (
                <Stage2LaunchForm auctionId={auction.id} unit={unit} lowest={String(lowest)} />
              ) : (
                <p className="text-sm text-muted-foreground">No bids to counter.</p>
              )
            ) : (
              <div className="space-y-1 text-sm">
                <p>
                  Counter sent: <span className="font-semibold">₹{formatRate(auction.stage2Target)}/{unit}</span>
                </p>
                <p className="text-muted-foreground">
                  {stage2Open
                    ? `Responses close in ${timeRemaining(auction.stage2ClosesAt!)}.`
                    : 'Stage-2 responses are closed. Confirm a winner below.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Leaderboard */}
      <div className="space-y-3">
        {ranked.map((r, i) => {
          const isWinner = r.status === 'won';
          return (
            <Card key={r.bidId} className={isWinner ? 'border-success' : undefined}>
              <CardContent className="space-y-3 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                      {i + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{r.sellerName}</span>
                        {isWinner ? <Badge variant="success">Winner</Badge> : null}
                        {r.status === 'lost' ? <Badge variant="secondary">Not selected</Badge> : null}
                        {blocked.has(r.sellerCompanyId) ? (
                          <Badge variant="destructive">🔴 Blocked</Badge>
                        ) : null}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {r.contactFirst} {r.contactLast}
                        {r.contactDesignation ? `, ${r.contactDesignation}` : ''} · {r.contactEmail}
                        {r.contactPhone ? ` · ${r.contactPhone}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">₹{formatRate(r.effective)}/{unit}</p>
                    <p className="text-xs text-muted-foreground">effective (lower of S1/S2)</p>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-3 text-sm sm:grid-cols-4">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Stage-1 total</p>
                    <p className="font-medium">₹{formatRate(r.stage1Total)}/{unit}</p>
                    <p className="text-xs text-muted-foreground">
                      basic {formatRate(r.stage1Basic)} + freight {formatRate(r.stage1Freight)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Payment</p>
                    <p className="font-medium">{r.paymentTerms ? PAYMENT_TERMS_LABEL[r.paymentTerms] : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Lead time</p>
                    <p className="font-medium">{r.leadTimeDays != null ? `${r.leadTimeDays} days` : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Stage-2</p>
                    <p className="font-medium">
                      {r.stage2Action === 'accept'
                        ? `Accepted ${formatRate(auction.stage2Target)}`
                        : r.stage2Action === 'final'
                          ? `Final ${formatRate(r.stage2Rate)}`
                          : r.stage2Action === 'reject'
                            ? 'Rejected'
                            : inStage2 && !closed
                              ? 'No response'
                              : '—'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {r.coaOnDispatch ? (
                    <Badge variant="warning">COA on dispatch (MTO)</Badge>
                  ) : r.coaFileUrl ? (
                    <CoaDownload bidId={r.bidId} />
                  ) : (
                    <Badge variant="secondary">No COA</Badge>
                  )}
                  <div className="ml-auto flex items-center gap-2">
                    <ReportButton companyId={r.sellerCompanyId} label="Report seller" />
                    {auction.status === 'awaiting_decision' ? (
                      <>
                        <BlockSellerButton auctionId={auction.id} sellerCompanyId={r.sellerCompanyId} />
                        <ConfirmDealForm auctionId={auction.id} bidId={r.bidId} sellerName={r.sellerName} />
                      </>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {closed && dealId ? (
        <Link href={`/deals/${dealId}`} className={cn(buttonVariants({ variant: 'outline' }))}>
          View Deal Confirmation Record &amp; export
        </Link>
      ) : null}
    </div>
  );
}
