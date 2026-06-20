import { count, eq, isNotNull } from 'drizzle-orm';
import { requireOperator } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { companies, auctions, bids, deals } from '@/lib/db/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = { title: 'Operator dashboard' };

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

async function one(q: Promise<{ value: number | string }[]>): Promise<number> {
  return Number((await q)[0]?.value ?? 0);
}

function Stat({
  label,
  value,
  sub,
  bold,
}: {
  label: string;
  value: string;
  sub?: string;
  bold?: boolean;
}) {
  if (bold) {
    // The one bold dark moment — the headline platform stat on graphite.
    return (
      <div className="rounded-2xl bg-graphite p-6 text-white shadow-card">
        <p className="text-xs font-medium uppercase tracking-wide text-white/70">{label}</p>
        <p className="mt-2 font-display text-3xl font-bold tracking-tight tabular-nums">{value}</p>
        {sub ? <p className="mt-1 text-xs text-white/70">{sub}</p> : null}
      </div>
    );
  }
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-display text-2xl font-bold tracking-tight tabular-nums">{value}</p>
        {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
      </CardContent>
    </Card>
  );
}

export default async function OperatorDashboard() {
  await requireOperator();

  const [totalCompanies, activeCompanies, pendingCompanies, totalAuctions, totalBids, totalDeals] =
    await Promise.all([
      one(db.select({ value: count() }).from(companies)),
      one(db.select({ value: count() }).from(companies).where(eq(companies.suspended, false))),
      one(db.select({ value: count() }).from(companies).where(eq(companies.verificationStatus, 'pending'))),
      one(db.select({ value: count() }).from(auctions)),
      one(db.select({ value: count() }).from(bids).where(isNotNull(bids.stage1Total))),
      one(db.select({ value: count() }).from(deals)),
    ]);

  const statusRows = await db
    .select({ status: auctions.status, value: count() })
    .from(auctions)
    .groupBy(auctions.status);
  const byStatus = Object.fromEntries(statusRows.map((r) => [r.status, Number(r.value)]));
  const reachedDecision = (byStatus.awaiting_decision ?? 0) + (byStatus.closed ?? 0);
  const completionRate = reachedDecision > 0 ? Math.round((totalDeals / reachedDecision) * 100) : 0;

  const perAuction = await db
    .select({ auctionId: bids.auctionId, value: count() })
    .from(bids)
    .where(isNotNull(bids.stage1Total))
    .groupBy(bids.auctionId);
  const medianBids = median(perAuction.map((r) => Number(r.value)));

  const dealRows = await db
    .select({ confirmedAt: deals.confirmedAt, createdAt: auctions.createdAt })
    .from(deals)
    .innerJoin(auctions, eq(deals.auctionId, auctions.id));
  const medianHours = median(
    dealRows.map((r) => (r.confirmedAt.getTime() - r.createdAt.getTime()) / 3_600_000),
  );

  // Rough burn: ~1 GST call/company + ~est. emails. Replace with real billing data.
  const gstCalls = totalCompanies;
  const estEmails = totalBids * 2 + totalAuctions * 3;
  const burnInr = Math.round(gstCalls * 3 + estEmails * 0.1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Platform analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The platform team&rsquo;s workspace — live counts across every company, auction and deal.
        </p>
      </div>

      {/* Divided summary strip — the headline platform counts at a glance. */}
      <Card className="flex flex-col divide-y sm:flex-row sm:divide-x sm:divide-y-0">
        <div className="flex-1 p-6">
          <p className="text-sm text-muted-foreground">Companies</p>
          <p className="mt-1 font-display text-3xl font-bold tracking-tight tabular-nums">
            {totalCompanies}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {activeCompanies} active · {pendingCompanies} pending
          </p>
        </div>
        <div className="flex-1 p-6">
          <p className="text-sm text-muted-foreground">Live auctions</p>
          <p className="mt-1 font-display text-3xl font-bold tracking-tight tabular-nums text-brand">
            {byStatus.active ?? 0}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{totalAuctions} all-time</p>
        </div>
        <div className="flex-1 p-6">
          <p className="text-sm text-muted-foreground">GSTINs to verify</p>
          <p className="mt-1 font-display text-3xl font-bold tracking-tight tabular-nums text-warning">
            {pendingCompanies}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">pending verification</p>
        </div>
        <div className="flex-1 p-6">
          <p className="text-sm text-muted-foreground">Quoted bids</p>
          <p className="mt-1 font-display text-3xl font-bold tracking-tight tabular-nums">
            {totalBids}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">across all auctions</p>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Deals confirmed" value={String(totalDeals)} sub="mutual intent recorded" bold />
        <Stat label="Completion rate" value={`${completionRate}%`} sub="deals ÷ auctions that closed with bids" />
        <Stat label="Median bids / auction" value={medianBids.toFixed(1)} />
        <Stat label="Median time-to-close" value={`${medianHours.toFixed(1)}h`} />
        <Stat label="Companies" value={String(totalCompanies)} sub={`${activeCompanies} active · ${pendingCompanies} pending`} />
        <Stat label="Auctions" value={String(totalAuctions)} sub={`${byStatus.active ?? 0} active · ${byStatus.closed ?? 0} closed`} />
        <Stat label="Quoted bids" value={String(totalBids)} />
        <Stat label="Est. burn (rough)" value={`₹${burnInr.toLocaleString('en-IN')}`} sub={`${gstCalls} GST + ~${estEmails} emails`} />
      </div>

      <p className="text-xs text-muted-foreground">
        Starter metrics. Replace the burn estimate and targets with real billing data after 60 days
        (PRD §12.4).
      </p>
    </div>
  );
}
