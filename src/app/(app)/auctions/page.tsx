import Link from 'next/link';
import { and, eq, desc, sql } from 'drizzle-orm';
import { Plus, FileText } from 'lucide-react';
import { requireUser } from '@/lib/auth/session';
import { ownerScope } from '@/lib/auth/scope';
import { db } from '@/lib/db';
import { auctions, bids } from '@/lib/db/schema';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/help';
import { cn } from '@/lib/utils';
import { formatIST, timeRemaining, UNIT_LABEL } from '@/lib/format';
import { auctionStatusMeta } from '@/lib/auction/status';

export const metadata = { title: 'My auctions' };

const GROUPS: { title: string; statuses: string[] }[] = [
  { title: 'Active', statuses: ['active', 'awaiting_decision'] },
  { title: 'Closed', statuses: ['closed'] },
  { title: 'Unsuccessful / cancelled', statuses: ['unsuccessful', 'cancelled'] },
];

export default async function AuctionsPage() {
  const { user, company } = await requireUser();

  const rows = await db
    .select({
      id: auctions.id,
      name: auctions.name,
      casNumber: auctions.casNumber,
      quantity: auctions.quantity,
      unit: auctions.unit,
      status: auctions.status,
      stage: auctions.stage,
      closesAt: auctions.closesAt,
      blind: auctions.blind,
      bidCount: sql<number>`(select count(*) from ${bids} where ${bids.auctionId} = ${auctions.id} and ${bids.status} <> 'withdrawn' and ${bids.stage1Total} is not null)`,
    })
    .from(auctions)
    .where(and(eq(auctions.buyerCompanyId, company.id), ownerScope(auctions.buyerUserId, user)))
    .orderBy(desc(auctions.createdAt));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-bold tracking-tight">My auctions</h1>
          <p className="text-sm text-muted-foreground">
            A dense, comparable view — because comparison is the job here.
          </p>
        </div>
        <Link href="/auctions/new" className={cn(buttonVariants())}>
          <Plus className="h-4 w-4" /> Post a requirement
        </Link>
      </div>

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={FileText}
            title="No auctions yet"
            description="Post a requirement — CAS, purity, quantity, packing — and qualified sellers bid blindly to your spec. It takes under five minutes."
            action={
              <Link href="/auctions/new" className={cn(buttonVariants())}>
                <Plus className="h-4 w-4" /> Post your first requirement
              </Link>
            }
          />
        </Card>
      ) : (
        GROUPS.map((g) => {
          const items = rows.filter((r) => g.statuses.includes(r.status));
          if (items.length === 0) return null;
          return (
            <section key={g.title} className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  {g.title}
                </h2>
                <span className="text-xs font-medium tabular-nums text-muted-foreground/70">
                  {items.length}
                </span>
              </div>
              <Card className="overflow-hidden">
                <div className="divide-y divide-border">
                  {items.map((a) => {
                    const meta = auctionStatusMeta(a.status);
                    return (
                      <Link
                        key={a.id}
                        href={`/auctions/${a.id}`}
                        className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-muted/40"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-display font-semibold tracking-tight">{a.name}</span>
                            {a.casNumber ? (
                              <span className="text-sm tabular-nums text-muted-foreground">
                                CAS {a.casNumber}
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-0.5 text-sm tabular-nums text-muted-foreground">
                            {a.quantity} {UNIT_LABEL[a.unit] ?? a.unit} ·{' '}
                            {Number(a.bidCount)} bid{Number(a.bidCount) === 1 ? '' : 's'} ·{' '}
                            {a.status === 'active'
                              ? `Closes: ${formatIST(a.closesAt)} (in ${timeRemaining(a.closesAt)})`
                              : formatIST(a.closesAt)}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {a.blind ? <Badge variant="outline">Blind</Badge> : null}
                          <Badge variant={meta.variant}>{meta.label}</Badge>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </Card>
            </section>
          );
        })
      )}
    </div>
  );
}
