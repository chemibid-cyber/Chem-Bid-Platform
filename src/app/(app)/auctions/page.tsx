import Link from 'next/link';
import { eq, desc, sql } from 'drizzle-orm';
import { Plus, FileText } from 'lucide-react';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { auctions, bids } from '@/lib/db/schema';
import { Card, CardContent } from '@/components/ui/card';
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
  const { company } = await requireUser();

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
    .where(eq(auctions.buyerCompanyId, company.id))
    .orderBy(desc(auctions.createdAt));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">My auctions</h1>
        <Link href="/auctions/new" className={cn(buttonVariants())}>
          <Plus className="h-4 w-4" /> New auction
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
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {g.title}
              </h2>
              <div className="grid gap-3">
                {items.map((a) => {
                  const meta = auctionStatusMeta(a.status);
                  return (
                    <Link key={a.id} href={`/auctions/${a.id}`}>
                      <Card className="transition-shadow hover:shadow-md">
                        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{a.name}</span>
                              {a.casNumber ? (
                                <span className="text-sm text-muted-foreground">CAS {a.casNumber}</span>
                              ) : null}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {a.quantity} {UNIT_LABEL[a.unit] ?? a.unit} ·{' '}
                              {Number(a.bidCount)} bid{Number(a.bidCount) === 1 ? '' : 's'} ·{' '}
                              {a.status === 'active'
                                ? `Closes: ${formatIST(a.closesAt)} (in ${timeRemaining(a.closesAt)})`
                                : formatIST(a.closesAt)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {a.blind ? <Badge variant="outline">Blind</Badge> : null}
                            <Badge variant={meta.variant}>{meta.label}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
