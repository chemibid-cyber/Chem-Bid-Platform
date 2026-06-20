import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, eq, or, desc, aliasedTable } from 'drizzle-orm';
import { FileDown } from 'lucide-react';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { deals, auctions, companies, disputes } from '@/lib/db/schema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatIST, formatRate, UNIT_LABEL, PAYMENT_TERMS_LABEL } from '@/lib/format';
import { DisputeForm } from './dispute-form';

export const metadata = { title: 'Deal Confirmation Record' };

const buyerCo = aliasedTable(companies, 'buyer_co');
const sellerCo = aliasedTable(companies, 'seller_co');

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium tabular-nums">{value || '—'}</dd>
    </div>
  );
}

export default async function DealPage({ params }: { params: { id: string } }) {
  const { company } = await requireUser();

  const [row] = await db
    .select({
      deal: deals,
      auctionName: auctions.name,
      auctionId: auctions.id,
      quantity: auctions.quantity,
      unit: auctions.unit,
      buyerName: buyerCo.legalName,
      buyerGstin: buyerCo.gstin,
      sellerName: sellerCo.legalName,
      sellerGstin: sellerCo.gstin,
    })
    .from(deals)
    .innerJoin(auctions, eq(deals.auctionId, auctions.id))
    .innerJoin(buyerCo, eq(deals.buyerCompanyId, buyerCo.id))
    .innerJoin(sellerCo, eq(deals.sellerCompanyId, sellerCo.id))
    .where(
      and(
        eq(deals.id, params.id),
        or(eq(deals.buyerCompanyId, company.id), eq(deals.sellerCompanyId, company.id)),
      ),
    )
    .limit(1);
  if (!row) notFound();

  const d = row.deal;
  const unit = UNIT_LABEL[row.unit] ?? row.unit;

  const disputeRows = await db
    .select()
    .from(disputes)
    .where(eq(disputes.dealId, d.id))
    .orderBy(desc(disputes.createdAt));

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold tracking-tight">Deal Confirmation Record</h1>
        <Badge variant={d.status === 'disputed' ? 'destructive' : 'success'}>{d.status}</Badge>
      </div>

      <Alert>
        <AlertDescription>
          This record documents the <strong>mutual intent</strong> of both parties under the Terms
          accepted at signup. It is not an automatically enforceable contract.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base tracking-tight">{row.auctionName}</CardTitle>
          <CardDescription>Confirmed {formatIST(d.confirmedAt)}</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Buyer" value={`${row.buyerName} (${row.buyerGstin})`} />
            <Field label="Seller" value={`${row.sellerName} (${row.sellerGstin})`} />
            <Field label="Quantity" value={`${row.quantity} ${unit}`} />
            <Field label="Final total rate" value={`₹${formatRate(d.finalTotal)}/${unit}`} />
            <Field label="Payment terms" value={d.paymentTerms ? PAYMENT_TERMS_LABEL[d.paymentTerms] ?? d.paymentTerms : '—'} />
            <Field label="Lead time" value={d.leadTimeDays != null ? `${d.leadTimeDays} days` : '—'} />
          </dl>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <a href={`/api/export/auction/${row.auctionId}?format=pdf`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
          <FileDown className="h-4 w-4" /> Export PDF
        </a>
        <a href={`/api/export/auction/${row.auctionId}?format=csv`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
          <FileDown className="h-4 w-4" /> Export CSV
        </a>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dispute</CardTitle>
          <CardDescription>
            If this deal falls through off-platform, either party can flag it. The record is never
            deleted — the status change is appended to the audit trail.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {disputeRows.length > 0 ? (
            <div className="space-y-2">
              {disputeRows.map((dp) => (
                <Alert key={dp.id} variant={dp.status === 'resolved' ? 'success' : 'warning'}>
                  <AlertTitle className="capitalize">{dp.status}</AlertTitle>
                  <AlertDescription>
                    {dp.reason}
                    {dp.resolutionNote ? (
                      <p className="mt-1 text-xs">Operator: {dp.resolutionNote}</p>
                    ) : null}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          ) : null}

          {d.status === 'confirmed' ? <DisputeForm dealId={d.id} /> : null}
        </CardContent>
      </Card>
    </div>
  );
}
