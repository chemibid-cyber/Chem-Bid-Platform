import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, eq, desc } from 'drizzle-orm';
import { Lock, Building2 } from 'lucide-react';
import { requireUser } from '@/lib/auth/session';
import { canAccessOwned } from '@/lib/auth/scope';
import { db } from '@/lib/db';
import { auctions, bids, companies, users, deals, counterProposals } from '@/lib/db/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  formatIST,
  timeRemaining,
  UNIT_LABEL,
  PAYMENT_TERMS_LABEL,
  FREIGHT_TERMS_LABEL,
  LOGISTICS_BASIS_LABEL,
  dateToIstLocal,
} from '@/lib/format';
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
import { CounterProposalForm, type CurrentProposal } from './counter-form';
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
  const { user, company } = await requireUser();

  const [auction] = await db.select().from(auctions).where(eq(auctions.id, params.id)).limit(1);
  if (!auction) notFound();

  const [bid] = await db
    .select()
    .from(bids)
    .where(and(eq(bids.auctionId, params.id), eq(bids.sellerCompanyId, company.id)))
    .limit(1);
  if (!bid) notFound(); // not invited to this requirement
  // #42 member isolation: a member sees only requests assigned to them; admins see all.
  if (!canAccessOwned(bid.sellerUserId, user)) notFound();

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

  // The seller's most recent counter-proposal for this auction (#21). A pending
  // one is shown read-only with Withdraw; a terminal one (accepted/rejected) is
  // shown as a status banner above a fresh form so they can re-propose.
  let currentProposal: CurrentProposal | null = null;
  if (accepted) {
    const [cp] = await db
      .select()
      .from(counterProposals)
      .where(
        and(
          eq(counterProposals.auctionId, auction.id),
          eq(counterProposals.sellerCompanyId, company.id),
        ),
      )
      .orderBy(desc(counterProposals.createdAt))
      .limit(1);
    if (cp && cp.status !== 'withdrawn') {
      currentProposal = {
        id: cp.id,
        status: cp.status,
        proposedQuantity: cp.proposedQuantity,
        proposedUnit: cp.proposedUnit,
        proposedPacking: cp.proposedPacking,
        proposedLogisticsBasis: cp.proposedLogisticsBasis,
        proposedDeliveryAddress: cp.proposedDeliveryAddress,
        proposedOfferValidUntil: cp.proposedOfferValidUntil?.toISOString() ?? null,
        proposedSupplyValidUntil: cp.proposedSupplyValidUntil?.toISOString() ?? null,
        note: cp.note,
        buyerResponseNote: cp.buyerResponseNote,
      };
    }
  }

  // Buyer identity + contact is revealed only AFTER this seller accepts (or
  // post-close). Everything in this block is gated by (accepted || !open).
  let buyerName = 'A verified buyer';
  let buyerActor = '';
  let buyerScore: number | null = null;
  let buyerEmail: string | null = null;
  let buyerPhone: string | null = null;
  let buyerAddress: string | null = null;
  if (accepted || !open) {
    const [buyerCompany] = await db
      .select({
        legalName: companies.legalName,
        completionScore: companies.completionScore,
        registeredAddress: companies.registeredAddress,
      })
      .from(companies)
      .where(eq(companies.id, auction.buyerCompanyId))
      .limit(1);
    buyerScore = buyerCompany?.completionScore ?? null;
    buyerAddress = buyerCompany?.registeredAddress ?? null;
    const [buyerUser] = await db
      .select({
        firstName: users.firstName,
        lastName: users.lastName,
        designation: users.designation,
        email: users.email,
        phone: users.phone,
      })
      .from(users)
      .where(eq(users.id, auction.buyerUserId))
      .limit(1);
    buyerName = buyerCompany?.legalName ?? buyerName;
    if (buyerUser) {
      buyerActor = `${buyerUser.firstName} ${buyerUser.lastName}${buyerUser.designation ? `, ${buyerUser.designation}` : ''}`;
      buyerEmail = buyerUser.email ?? null;
      buyerPhone = buyerUser.phone ?? null;
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
            {open
              ? `Closes: ${formatIST(auction.closesAt)} (in ${timeRemaining(auction.closesAt)})`
              : `closed ${formatIST(auction.closesAt)}`}
          </p>
        </div>
        {accepted ? <SellerSpecDownload auctionId={auction.id} /> : null}
      </div>

      {/* Buyer identity card — identity + contact only inside the post-accept gate */}
      <Card>
        <CardContent className="space-y-3 py-4">
          <div className="flex items-center gap-3">
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
          </div>
          {buyerEmail || buyerPhone || buyerAddress ? (
            <dl className="grid gap-3 border-t pt-3 text-sm sm:grid-cols-2">
              {buyerEmail ? <Detail label="Email" value={buyerEmail} /> : null}
              {buyerPhone ? <Detail label="Phone" value={buyerPhone} /> : null}
              {buyerAddress ? (
                <div className="sm:col-span-2">
                  <Detail label="Location" value={buyerAddress} />
                </div>
              ) : null}
            </dl>
          ) : null}
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
            <Detail
              label="Delivery terms"
              value={
                auction.logisticsBasis === 'other'
                  ? auction.deliveryTermsCustom ?? LOGISTICS_BASIS_LABEL.other
                  : LOGISTICS_BASIS_LABEL[auction.logisticsBasis] ?? auction.logisticsBasis
              }
            />
            {auction.paymentTerms ? (
              <Detail
                label="Payment terms"
                value={
                  auction.paymentTerms === 'other'
                    ? auction.paymentTermsCustom ?? PAYMENT_TERMS_LABEL.other
                    : PAYMENT_TERMS_LABEL[auction.paymentTerms] ?? auction.paymentTerms
                }
              />
            ) : null}
            {auction.freightTerms ? (
              <Detail
                label="Freight handling"
                value={FREIGHT_TERMS_LABEL[auction.freightTerms] ?? auction.freightTerms}
              />
            ) : null}
            {auction.offerValidUntil ? (
              <Detail label="Offer valid until" value={formatIST(auction.offerValidUntil)} />
            ) : null}
            {auction.supplyValidUntil ? (
              <Detail label="Supply valid until" value={formatIST(auction.supplyValidUntil)} />
            ) : null}
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
              stage1Material={String(bid.stage1Basic ?? bid.stage1Total)}
              addOn={Number(bid.stage1Freight ?? 0) + Number(bid.stage1Tax ?? 0)}
              unit={UNIT_LABEL[auction.unit] ?? auction.unit}
              existing={bid.stage2Action}
            />
          </CardContent>
        </Card>
      ) : null}

      {/* Seller structured counter-proposal (#21) — only once accepted & open */}
      {accepted && open ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Propose changes to the requirement</CardTitle>
          </CardHeader>
          <CardContent>
            <CounterProposalForm
              auctionId={auction.id}
              prefill={{
                quantity: String(auction.quantity),
                unit: auction.unit,
                packing: auction.packing ?? '',
                logisticsBasis: auction.logisticsBasis,
                deliveryAddress: auction.deliveryAddress,
                offerValidUntilLocal: dateToIstLocal(auction.offerValidUntil),
                supplyValidUntilLocal: dateToIstLocal(auction.supplyValidUntil),
              }}
              current={currentProposal}
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
                  taxPct: bid.stage1TaxPct,
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
