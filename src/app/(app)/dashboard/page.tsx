import Link from 'next/link';
import { redirect } from 'next/navigation';
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
import { ownerScope } from '@/lib/auth/scope';
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

function StatMetric({ href, label, value, tone }: { href: string; label: string; value: number; tone?: 'brand' | 'warning' }) {
  return (
    <Link href={href} className="group flex-1 px-6 py-5 transition-colors hover:bg-muted/40">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-1.5 font-display text-4xl font-bold leading-none tabular',
          tone === 'warning' && value > 0 && 'text-warning',
          tone === 'brand' && value > 0 && 'text-brand',
        )}
      >
        {value}
      </p>
    </Link>
  );
}

function ActionCard({ href, label, desc, icon: Icon }: (typeof BUY_ACTIONS)[number]) {
  return (
    <Link href={href} className="group">
      <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-md">
        <CardContent className="flex h-full flex-col p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <Icon className="h-5 w-5" />
            </span>
            <h3 className="font-semibold tracking-tight">{label}</h3>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{desc}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: { error?: string } }) {
  const { user, company } = await requireUser();

  // Pure service providers (no buy/sell capability) live in the Services hub —
  // their dashboard IS the Active Requests Board.
  if (!user.canBuy && !user.canSell) redirect('/services');

  const mode = getActiveMode(user);
  const isBuy = mode === 'buy';

  // ── Mode-aware stats + "needs attention" ──────────────────────────────────
  let stats: { href: string; label: string; value: number; tone?: 'brand' | 'warning' }[] = [];
  let attention: { id: string; title: string; sub: string; href: string }[] = [];

  // Member-level isolation (#42): a member's dashboard counts only the auctions they
  // created (ownerScope on auctions.buyerUserId); admins get full company-wide counts.
  if (isBuy) {
    const [active, awaiting, dealCount] = await Promise.all([
      cnt(db.select({ value: count() }).from(auctions).where(and(eq(auctions.buyerCompanyId, company.id), ownerScope(auctions.buyerUserId, user), eq(auctions.status, 'active')))),
      cnt(db.select({ value: count() }).from(auctions).where(and(eq(auctions.buyerCompanyId, company.id), ownerScope(auctions.buyerUserId, user), eq(auctions.status, 'awaiting_decision')))),
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
      .where(and(eq(auctions.buyerCompanyId, company.id), ownerScope(auctions.buyerUserId, user), eq(auctions.status, 'awaiting_decision')))
      .orderBy(desc(auctions.createdAt))
      .limit(5);
    attention = rows.map((r) => ({
      id: r.id,
      title: r.name,
      sub: `${r.quantity} ${UNIT_LABEL[r.unit] ?? r.unit} · bids ready to review`,
      href: `/auctions/${r.id}/review`,
    }));
  } else {
    // Member-level isolation (#42): a member's seller dashboard counts only the bids
    // THEY own (ownerScope on bids.sellerUserId); admins get full company-wide counts.
    const [newReq, quoting, won] = await Promise.all([
      cnt(
        db.select({ value: count() }).from(bids).innerJoin(auctions, eq(bids.auctionId, auctions.id))
          .where(and(eq(bids.sellerCompanyId, company.id), ownerScope(bids.sellerUserId, user), eq(bids.gateState, 'notified'), eq(auctions.status, 'active'))),
      ),
      cnt(
        db.select({ value: count() }).from(bids).innerJoin(auctions, eq(bids.auctionId, auctions.id))
          .where(and(eq(bids.sellerCompanyId, company.id), ownerScope(bids.sellerUserId, user), eq(bids.gateState, 'accepted'), isNotNull(bids.stage1Total), eq(auctions.status, 'active'))),
      ),
      cnt(db.select({ value: count() }).from(bids).where(and(eq(bids.sellerCompanyId, company.id), ownerScope(bids.sellerUserId, user), eq(bids.status, 'won')))),
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
      .where(and(eq(bids.sellerCompanyId, company.id), ownerScope(bids.sellerUserId, user), eq(bids.gateState, 'notified'), eq(auctions.status, 'active')))
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
  const [primary, ...secondaryActions] = actions;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Welcome, {user.firstName}.</h1>
        <p className="mt-1 text-muted-foreground">
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

      {/* Stats — one card, divided into metrics */}
      <Card>
        <CardContent className="flex flex-col divide-y p-0 sm:flex-row sm:divide-x sm:divide-y-0">
          {stats.map((s) => (
            <StatMetric key={s.label} {...s} />
          ))}
        </CardContent>
      </Card>

      {/* Needs attention */}
      {attention.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground/80">
            Needs your attention
          </h2>
          <Card>
            <CardContent className="divide-y p-0">
              {attention.map((a) => (
                <Link key={a.id} href={a.href} className="group flex items-center gap-4 p-4 transition-colors hover:bg-muted/40">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-warning" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{a.title}</p>
                    <p className="text-sm tabular text-muted-foreground">{a.sub}</p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 whitespace-nowrap text-sm font-semibold text-brand">
                    {isBuy ? 'Review bids' : 'View request'}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </section>
      ) : null}

      {/* Primary action — solid green hero banner */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground/80">
          {isBuy ? 'Buy' : 'Sell'} · quick actions
        </h2>
        <Link href={primary.href} className="group block">
          <div className="flex items-center gap-5 rounded-2xl bg-brand p-6 text-white shadow-card transition-all hover:-translate-y-0.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <primary.icon className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-lg font-bold tracking-tight">{primary.label}</h3>
              <p className="mt-0.5 text-sm text-white/80">{primary.desc}</p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-brand">
              Start
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </Link>

        {/* Supporting quick-link cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {secondaryActions.map((a) => (
            <ActionCard key={a.href} {...a} />
          ))}
          {user.isAdmin ? (
            <ActionCard href="/members" label="Members" desc="Invite colleagues and set capabilities." icon={Users} />
          ) : null}
        </div>
      </section>

      {/* Roadmap — deferred, but signposted */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground/80">
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
