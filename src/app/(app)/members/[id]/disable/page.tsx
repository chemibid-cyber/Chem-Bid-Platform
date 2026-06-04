import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, eq, inArray, or, count } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { users, catalogItems, auctions, bids } from '@/lib/db/schema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DisableForm } from './disable-form';

export const metadata = { title: 'Disable member' };

async function countWhere(q: Promise<{ value: number | string }[]>): Promise<number> {
  const rows = await q;
  return Number(rows[0]?.value ?? 0);
}

export default async function DisableMemberPage({ params }: { params: { id: string } }) {
  const { user, company } = await requireAdmin();
  if (params.id === user.id) notFound();

  const [member] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, params.id), eq(users.companyId, company.id)))
    .limit(1);
  if (!member) notFound();

  const items = await countWhere(
    db
      .select({ value: count() })
      .from(catalogItems)
      .where(and(eq(catalogItems.companyId, company.id), eq(catalogItems.ownerUserId, member.id))),
  );
  const liveAuctions = await countWhere(
    db
      .select({ value: count() })
      .from(auctions)
      .where(
        and(
          eq(auctions.buyerCompanyId, company.id),
          eq(auctions.buyerUserId, member.id),
          inArray(auctions.status, ['active', 'awaiting_decision']),
        ),
      ),
  );
  const activeBids = await countWhere(
    db
      .select({ value: count() })
      .from(bids)
      .where(
        and(
          eq(bids.sellerCompanyId, company.id),
          eq(bids.sellerUserId, member.id),
          eq(bids.status, 'active'),
        ),
      ),
  );

  const needsReassign = items + liveAuctions + activeBids > 0;

  // Eligible targets: active colleagues who can cover both profiles (admins or both caps).
  const targetRows = await db
    .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
    .from(users)
    .where(
      and(
        eq(users.companyId, company.id),
        eq(users.status, 'active'),
        or(eq(users.isAdmin, true), and(eq(users.canBuy, true), eq(users.canSell, true))),
      ),
    );
  const targets = targetRows
    .filter((t) => t.id !== member.id)
    .map((t) => ({ id: t.id, name: `${t.firstName} ${t.lastName}` }));

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link href="/members" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to members
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>
            Disable {member.firstName} {member.lastName}
          </CardTitle>
          <CardDescription>
            Disabling revokes access. Any items they own must be reassigned first so nothing is
            orphaned.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {needsReassign ? (
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <p className="mb-1 font-medium">To be reassigned:</p>
              <ul className="list-inside list-disc text-muted-foreground">
                {items > 0 ? <li>{items} catalog item(s)</li> : null}
                {liveAuctions > 0 ? <li>{liveAuctions} live auction(s)</li> : null}
                {activeBids > 0 ? <li>{activeBids} active bid(s)</li> : null}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              This member owns no live items — they can be disabled directly.
            </p>
          )}

          <DisableForm memberId={member.id} needsReassign={needsReassign} targets={targets} />
        </CardContent>
      </Card>
    </div>
  );
}
