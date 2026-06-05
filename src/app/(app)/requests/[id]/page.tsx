import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { Lock, Building2 } from 'lucide-react';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { auctions, bids, companies, users, deals } from '@/lib/db/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatIST, timeRemaining, UNIT_LABEL } from '@/lib/format';
import {
  AcceptButton,
  IgnoreButton,
  BlockControls,
  WithdrawButton,
  SellerSpecDownload,
} from './gate-actions';
import { BidForm } from './bid-form';
import { RankWidget } from './rank-widget';
import { Stage2Respond } from './stage2-respond';
import { ReportButton } from '@/components/app/report-button';
import { Hint } from '@/components/ui/help';

export const metadata = { title: 'Requirement' };

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{value || '—'}</dd>
    </div>
  );
}

export default async function RequestDetailPage({ params }: { params: { id: string } }) {
  const { company } = await requireUser();

  const [auction] = await db.select().from(auctions).where(eq(auctions.id, params.id)).limit(1);
  if (!auction) notFound();

  const [bid] = await db
    .select()
    .from(bids)
    .where(and(eq(bids.auctionId, params.id), eq(bids.sellerCompanyId, company.id)))
    .limit(1);
  if (!bid) notFound(); // not invited to this requirement

  const accepted = bid.gateState === 'accepted';
  const open = auction.status === 'active';
  const stage2Active =
    auction.stage === 'stage2' &&
    auction.stage2ClosesAt != null &&
    auction.stage2ClosesAt.getTime() > Date.now();

  let wonDealId: string | null = null;
  if (bid.status === 'won') {
    const [deal] = await db.select({ id: deals.id }).from(deals).where(eq(deals.bidId, bid.id)).limit(1);
    wonDealId = deal?.id ?? null;
  }

  // Buyer identity is revealed only AFTER this seller accepts (or post-close).
  let buyerName = 'A verified buyer';
  let buyerActor = '';
  let buyerScore: number | null = null;
  if (accepted || !open) {
    const [buyerCompany] = await db
      .select({ legalName: companies.legalName, completionScore: companies.completionScore })
      .from(companies)
      .where(eq(companies.id, auction.buyerCompanyId))
      .limit(1);
    buyerScore = buyerCompany?.completionScore ?? null;
    const [buyerUser] = await db
      .select({ firstName: users.firstName, lastName: users.lastName, designation: users.designation })
      .from(users)
      .where(eq(users.id, auction.buyerUserId))
      .limit(1);
    buyerName = buyerCompany?.legalName ?? buyerName;
    if (buyerUser) {
      buyerActor = `${buyerUser.firstName} ${buyerUser.lastName}${buyerUser.designation ? `, ${buyerUser.designation}` : ''}`;
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/requests" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to requests
      </Link>

      {bid.gateState === 'blocked' ? (
        <Alert variant="destructive">
          <AlertTitle>Blocked</AlertTitle>
          <AlertDescription>You have blocked this purchaser. They can no longer reach you.</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{auction.name}</h1>
            {auction.blind ? <Badge variant="outline">Blind</Badge> : null}
          </div>
          <p className="text-muted-foreground">
            {auction.casNumber ? `CAS ${auction.casNumber}` : 'Custom mixture'} ·{' '}
            {open ? `closes in ${timeRemaining(auction.closesAt)}` : `closed ${formatIST(auction.closesAt)}`}
          </p>
        </div>
        {accepted ? <SellerSpecDownload auctionId={auction.id} /> : null}
      </div>

      {/* Buyer identity card */}
      <Card>
        <CardContent className="flex items-center gap-3 py-4">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="font-medium">{buyerName}</p>
            {buyerActor ? (
              <p className="text-sm text-muted-foreground">{buyerActor}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Identity is revealed once you Accept &amp; Quote.
              </p>
            )}
          </div>
          {buyerScore != null ? (
            <Badge variant={buyerScore >= 70 ? 'success' : buyerScore >= 40 ? 'warning' : 'destructive'}>
              Completion score {buyerScore}
            </Badge>
          ) : null}
          {accepted ? <ReportButton companyId={auction.buyerCompanyId} label="Report buyer" /> : null}
        </CardContent>
      </Card>

      {/* Requirements (pricing locked pre-accept) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Requirement</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Detail label="Quantity" value={`${auction.quantity} ${UNIT_LABEL[auction.unit] ?? auction.unit}`} />
            <Detail label="Minimum purity" value={auction.minPurity ? `${auction.minPurity}%` : '—'} />
            <Detail label="Packing" value={auction.packing ?? ''} />
            <Detail label="Logistics" value={auction.logisticsBasis === 'exworks' ? 'Ex-Works (you pickup)' : 'Delivered'} />
            {accepted ? (
              <div className="sm:col-span-2">
                <Detail label="Delivery address" value={auction.deliveryAddress} />
              </div>
            ) : null}
            {auction.remarks ? (
              <div className="sm:col-span-2">
                <Detail label="Remarks" value={auction.remarks} />
              </div>
            ) : null}
          </dl>
        </CardContent>
      </Card>

      {/* Deal won */}
      {bid.status === 'won' ? (
        <Alert variant="success">
          <AlertTitle>You won this deal</AlertTitle>
          <AlertDescription>
            {wonDealId ? (
              <Link href={`/deals/${wonDealId}`} className="font-medium underline">
                View the Deal Confirmation Record
              </Link>
            ) : (
              'The buyer confirmed the deal with you.'
            )}
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Stage-2 counter response */}
      {stage2Active && bid.stage1Total ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stage-2 counter-offer</CardTitle>
          </CardHeader>
          <CardContent>
            <Stage2Respond
              auctionId={auction.id}
              targetRate={String(auction.stage2Target ?? '')}
              stage1Total={String(bid.stage1Total)}
              unit={UNIT_LABEL[auction.unit] ?? auction.unit}
              existing={bid.stage2Action}
            />
          </CardContent>
        </Card>
      ) : null}

      {/* Gate / bid */}
      {!open && !stage2Active ? (
        <Alert>
          <AlertDescription>
            This auction is closed for bidding{bid.stage1Total ? ' — your final bid is on record.' : '.'}
          </AlertDescription>
        </Alert>
      ) : open && !accepted && bid.gateState !== 'blocked' ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="h-4 w-4" /> Pricing is locked until you accept
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <AcceptButton auctionId={auction.id} />
              <IgnoreButton auctionId={auction.id} ignored={bid.gateState === 'ignored'} />
              <BlockControls auctionId={auction.id} />
            </div>
            <Hint>
              Accepting reveals the buyer&apos;s identity to you and opens the quote form. Until
              then the buyer can&apos;t see who you are — and you stay anonymous to rival sellers
              throughout.
            </Hint>
          </CardContent>
        </Card>
      ) : open && accepted ? (
        <>
          {auction.blind && bid.stage1Total ? <RankWidget auctionId={auction.id} /> : null}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {bid.stage1Total ? 'Your bid' : 'Submit your bid'} — full quantity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <BidForm
                auctionId={auction.id}
                basis={auction.logisticsBasis}
                unit={auction.unit}
                initial={{
                  basic: bid.stage1Basic,
                  freight: bid.stage1Freight,
                  paymentTerms: bid.paymentTerms,
                  leadTimeDays: bid.leadTimeDays,
                  coaOnDispatch: bid.coaOnDispatch,
                  hasCoa: Boolean(bid.coaFileUrl),
                }}
              />
              {bid.stage1Total ? (
                <div className="border-t pt-3">
                  <WithdrawButton auctionId={auction.id} />
                </div>
              ) : null}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
