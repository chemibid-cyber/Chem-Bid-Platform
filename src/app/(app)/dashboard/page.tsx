import Link from 'next/link';
import { and, eq, count, isNotNull, desc } from 'drizzle-orm';
import {
  Plus,
  Package,
  Network,
  Users,
  Inbox,
  FileText,
  ArrowRight,
  LineChart,
  Megaphone,
  Star,
  Gavel,
  Truck,
} from 'lucide-react';
import { requireUser } from '@/lib/auth/session';
import { getActiveMode, canToggleMode } from '@/lib/auth/mode';
import { db } from '@/lib/db';
import { auctions, bids, deals } from '@/lib/db/schema';
import { Card, CardContent } from '@/components/ui/card';
import { Hint } from '@/components/ui/help';
import { ComingSoonCard } from '@/components/ui/coming-soon';
import { cn } from '@/lib/utils';
import { UNIT_LABEL, timeRemaining } from '@/lib/format';

export const metadata = { title: 'Dashboard' };

async function cnt(q: Promise<{ value: number | string }[]>): Promise<number> {
  return Number((await q)[0]?.value ?? 0);
}

const BUY_ACTIONS = [
  { href: '/auctions/new', label: 'Post a requirement', icon: Plus, desc: 'Launch a blind reverse auction in minutes.' },
  { href: '/auctions', label: 'My auctions', icon: FileText, desc: 'Active, closed and unsuccessful requests.' },
  { href: '/network', label: 'Vendor network', icon: Network, desc: 'Register trusted suppliers by GSTIN + CAS.' },
  { href: '/catalog', label: 'Purchase catalog', icon: Package, desc: 'Track the chemicals you buy.' },
  { href: '/services', label: 'Services hub', icon: Truck, desc: 'Transport & packing — open-identity quotes.' },
];

const SELL_ACTIONS = [
  { href: '/requests', label: 'Incoming requests', icon: Inbox, desc: 'Accept & quote, ignore, or block.' },
  { href: '/catalog', label: 'Sales catalog', icon: Package, desc: 'List what you supply, with CAS + grade.' },
  { href: '/services', label: 'Services hub', icon: Truck, desc: 'Transport & packing — open-identity quotes.' },
];

function StatCard({ href, label, value, tone }: { href: string; label: string; value: number; tone?: 'brand' | 'warning' }) {
  return (
    <Link href={href} className="group">
      <Card className="transition-all hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md">
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p
            className={cn(
              'mt-1 text-3xl font-bold tabular',
              tone === 'warning' && value > 0 && 'text-warning-foreground',
              tone === 'brand' && value > 0 && 'text-brand',
            )}
          >
            {value}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

function ActionCard({ href, label, desc, icon: Icon }: (typeof BUY_ACTIONS)[number]) {
  return (
    <Link href={href} className="group">
      <Card className="h-full transition-all hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md">
        <CardContent className="flex h-full flex-col p-5">
          <div className="flex items-center justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Icon className="h-5 w-5" />
            </span>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
          </div>
          <h3 className="mt-3 font-semibold tracking-tight">{label}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{desc}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: { error?: string } }) {
  const { user, company } = await requireUser();
  const mode = getActiveMode(user);
  const isBuy = mode === 'buy';

  // ── Mode-aware stats + "needs attention" ──────────────────────────────────
  let stats: { href: string; label: string; value: number; tone?: 'brand' | 'warning' }[] = [];
  let attention: { id: string; title: string; sub: string; href: string }[] = [];

  if (isBuy) {
    const [active, awaiting, dealCount] = await Promise.all([
      cnt(db.select({ value: count() }).from(auctions).where(and(eq(auctions.buyerCompanyId, company.id), eq(auctions.status, 'active')))),
      cnt(db.select({ value: count() }).from(auctions).where(and(eq(auctions.buyerCompanyId, company.id), eq(auctions.status, 'awaiting_decision')))),
      cnt(db.select({ value: count() }).from(deals).where(eq(deals.buyerCompanyId, company.id))),
    ]);
    stats = [
      { href: '/auctions', label: 'Active auctions', value: active },
      { href: '/auctions', label: 'Awaiting your decision', value: awaiting, tone: 'warning' },
      { href: '/auctions', label: 'Deals confirmed', value: dealCount, tone: 'brand' },
    ];
    const rows = await db
      .select({ id: auctions.id, name: auctions.name, quantity: auctions.quantity, unit: auctions.unit })
      .from(auctions)
      .where(and(eq(auctions.buyerCompanyId, company.id), eq(auctions.status, 'awaiting_decision')))
      .orderBy(desc(auctions.createdAt))
      .limit(5);
    attention = rows.map((r) => ({
      id: r.id,
      title: r.name,
      sub: `${r.quantity} ${UNIT_LABEL[r.unit] ?? r.unit} · bids ready to review`,
      href: `/auctions/${r.id}/review`,
    }));
  } else {
    const [newReq, quoting, won] = await Promise.all([
      cnt(
        db.select({ value: count() }).from(bids).innerJoin(auctions, eq(bids.auctionId, auctions.id))
          .where(and(eq(bids.sellerCompanyId, company.id), eq(bids.gateState, 'notified'), eq(auctions.status, 'active'))),
      ),
      cnt(
        db.select({ value: count() }).from(bids).innerJoin(auctions, eq(bids.auctionId, auctions.id))
          .where(and(eq(bids.sellerCompanyId, company.id), eq(bids.gateState, 'accepted'), isNotNull(bids.stage1Total), eq(auctions.status, 'active'))),
      ),
      cnt(db.select({ value: count() }).from(bids).where(and(eq(bids.sellerCompanyId, company.id), eq(bids.status, 'won')))),
    ]);
    stats = [
      { href: '/requests', label: 'New requests', value: newReq, tone: 'warning' },
      { href: '/requests', label: 'Quoting', value: quoting },
      { href: '/requests', label: 'Deals won', value: won, tone: 'brand' },
    ];
    const rows = await db
      .select({ id: auctions.id, name: auctions.name, quantity: auctions.quantity, unit: auctions.unit, closesAt: auctions.closesAt })
      .from(bids)
      .innerJoin(auctions, eq(bids.auctionId, auctions.id))
      .where(and(eq(bids.sellerCompanyId, company.id), eq(bids.gateState, 'notified'), eq(auctions.status, 'active')))
      .orderBy(desc(auctions.createdAt))
      .limit(5);
    attention = rows.map((r) => ({
      id: r.id,
      title: r.name,
      sub: `${r.quantity} ${UNIT_LABEL[r.unit] ?? r.unit} · closes in ${timeRemaining(r.closesAt)}`,
      href: `/requests/${r.id}`,
    }));
  }

  const actions = isBuy ? BUY_ACTIONS : SELL_ACTIONS;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome, {user.firstName}.</h1>
        <p className="text-muted-foreground">
          You&apos;re in <strong className="capitalize">{mode}</strong> mode for {company.legalName}.
        </p>
        {canToggleMode(user) ? (
          <Hint className="mt-1.5">
            Use the <strong className="text-foreground">Buy / Sell</strong> toggle in the top bar to
            switch sides — your stats, auctions and requests follow the mode you&apos;re in.
          </Hint>
        ) : null}
      </div>

      {searchParams.error === 'no_capability' ? (
        <Card className="border-warning/40 bg-warning/10">
          <CardContent className="py-3 text-sm">
            You don&apos;t have that capability. Ask your Admin to enable it.
          </CardContent>
        </Card>
      ) : null}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Needs attention */}
      {attention.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Needs your attention
          </h2>
          <Card>
            <CardContent className="divide-y p-0">
              {attention.map((a) => (
                <Link key={a.id} href={a.href} className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-muted/40">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{a.title}</p>
                    <p className="text-sm text-muted-foreground">{a.sub}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </section>
      ) : null}

      {/* Quick actions */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {isBuy ? 'Buy' : 'Sell'} · quick actions
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {actions.map((a) => (
            <ActionCard key={a.href} {...a} />
          ))}
          {user.isAdmin ? (
            <ActionCard href="/members" label="Members" desc="Invite colleagues and set capabilities." icon={Users} />
          ) : null}
        </div>
      </section>

      {/* Roadmap — deferred, but signposted */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          On the roadmap
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <ComingSoonCard
            icon={Megaphone}
            title="Proactive shares"
            description="Sellers broadcast available stock to matching buyers — the mirror of an auction."
          />
          <ComingSoonCard
            icon={LineChart}
            title="Market insights"
            description="Price trends, logistics and govt-rule updates, personalised to your chemicals."
          />
          <ComingSoonCard
            icon={Star}
            title="Reputation"
            description="Track record and ratings beyond the completion score, to build trust faster."
          />
        </div>
      </section>

      {/* Subtle wordmark footer for cohesion */}
      <div className="flex items-center gap-1.5 pt-2 text-xs text-muted-foreground/70">
        <Gavel className="h-3.5 w-3.5" /> Chemical Auction
      </div>
    </div>
  );
}
