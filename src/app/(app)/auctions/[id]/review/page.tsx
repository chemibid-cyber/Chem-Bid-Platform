import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { and, eq, asc, isNotNull } from 'drizzle-orm';
import { Building2 } from 'lucide-react';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { auctions, bids, companies, users } from '@/lib/db/schema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { averageTotal, effectiveTotal } from '@/lib/ranking';
import { formatRate, timeRemaining, UNIT_LABEL, PAYMENT_TERMS_LABEL } from '@/lib/format';
import { Stage2LaunchForm } from './stage2-launch-form';
import { CoaDownload } from './coa-download';

export const metadata = { title: 'Review bids' };

export default async function ReviewPage({ params }: { params: { id: string } }) {
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
      and(eq(bids.auctionId, auction.id), isNotNull(bids.stage1Total), eq(bids.status, 'active')),
    )
    .orderBy(asc(bids.stage1Total), asc(bids.createdAt));

  const unit = UNIT_LABEL[auction.unit] ?? auction.unit;
  const avg = averageTotal(rows.map((r) => Number(r.stage1Total)));
  const lowest = rows[0]?.stage1Total ?? '';
  const inStage2 = auction.stage === 'stage2';
  const stage2Open = inStage2 && auction.stage2ClosesAt && auction.stage2ClosesAt.getTime() > Date.now();

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link href={`/auctions/${auction.id}`} className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to auction
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Review bids — {auction.name}</h1>
        <p className="text-muted-foreground">
          {rows.length} bid{rows.length === 1 ? '' : 's'} · average total ₹{formatRate(avg)}/{unit}
          {inStage2 ? ' · Stage-2 in progress' : ''}
        </p>
      </div>

      {/* Stage-2 control */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stage-2 counter (single round, all participants)</CardTitle>
          <CardDescription>
            Optional. Send one counter rate to every bidder for a 24-hour round, or settle directly
            from the Stage-1 bids below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!inStage2 ? (
            rows.length > 0 ? (
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
                  : 'Stage-2 responses are closed. Settle using the lower of each seller’s Stage-1 / Stage-2 rate.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bids, sorted lowest Stage-1 total first */}
      <div className="space-y-3">
        {rows.map((r, i) => {
          const eff = effectiveTotal(Number(r.stage1Total), r.stage2Rate ? Number(r.stage2Rate) : null);
          return (
            <Card key={r.bidId}>
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
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {r.contactFirst} {r.contactLast}
                        {r.contactDesignation ? `, ${r.contactDesignation}` : ''} · {r.contactEmail}
                        {r.contactPhone ? ` · ${r.contactPhone}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">₹{formatRate(eff)}/{unit}</p>
                    <p className="text-xs text-muted-foreground">effective (lower of S1/S2)</p>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-3 text-sm sm:grid-cols-4">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Stage-1 total</p>
                    <p className="font-medium">₹{formatRate(r.stage1Total)}/{unit}</p>
                    <p className="text-xs text-muted-foreground">
                      basic ₹{formatRate(r.stage1Basic)} + freight ₹{formatRate(r.stage1Freight)}
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
                        ? `Accepted ₹${formatRate(auction.stage2Target)}`
                        : r.stage2Action === 'final'
                          ? `Final ₹${formatRate(r.stage2Rate)}`
                          : r.stage2Action === 'reject'
                            ? 'Rejected'
                            : inStage2
                              ? 'No response'
                              : '—'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {r.coaOnDispatch ? (
                    <Badge variant="warning">COA on dispatch (make-to-order)</Badge>
                  ) : r.coaFileUrl ? (
                    <CoaDownload bidId={r.bidId} />
                  ) : (
                    <Badge variant="secondary">No COA</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
