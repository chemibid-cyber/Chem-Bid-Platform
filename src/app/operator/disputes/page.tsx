import { eq, desc, aliasedTable } from 'drizzle-orm';
import { requireOperator } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { disputes, deals, auctions, companies, users } from '@/lib/db/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatIST, formatRate } from '@/lib/format';
import { ResolveDisputeForm } from '../operator-controls';

export const metadata = { title: 'Dispute queue' };

const buyerCo = aliasedTable(companies, 'buyer_co');
const sellerCo = aliasedTable(companies, 'seller_co');

export default async function OperatorDisputes() {
  await requireOperator();

  const rows = await db
    .select({
      dispute: disputes,
      auctionName: auctions.name,
      finalTotal: deals.finalTotal,
      dealStatus: deals.status,
      buyerName: buyerCo.legalName,
      sellerName: sellerCo.legalName,
      raisedByName: users.firstName,
      raisedByLast: users.lastName,
    })
    .from(disputes)
    .innerJoin(deals, eq(disputes.dealId, deals.id))
    .innerJoin(auctions, eq(deals.auctionId, auctions.id))
    .innerJoin(buyerCo, eq(deals.buyerCompanyId, buyerCo.id))
    .innerJoin(sellerCo, eq(deals.sellerCompanyId, sellerCo.id))
    .innerJoin(users, eq(disputes.raisedByUserId, users.id))
    .orderBy(desc(disputes.createdAt));

  const open = rows.filter((r) => r.dispute.status === 'open');
  const resolved = rows.filter((r) => r.dispute.status === 'resolved');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Dispute queue</h1>

      {open.length === 0 ? (
        <p className="text-muted-foreground">No open disputes. 🎉</p>
      ) : (
        <div className="space-y-4">
          {open.map((r) => (
            <Card key={r.dispute.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{r.auctionName}</CardTitle>
                  <Badge variant="warning">open</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {r.buyerName} ↔ {r.sellerName} · ₹{formatRate(r.finalTotal)} · raised by {r.raisedByName}{' '}
                  {r.raisedByLast} on {formatIST(r.dispute.createdAt)}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-md border bg-muted/30 p-3 text-sm">{r.dispute.reason}</div>
                <ResolveDisputeForm disputeId={r.dispute.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {resolved.length > 0 ? (
        <details>
          <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Resolved ({resolved.length})
          </summary>
          <div className="mt-3 space-y-2">
            {resolved.map((r) => (
              <Card key={r.dispute.id}>
                <CardContent className="py-3 text-sm">
                  <span className="font-medium">{r.auctionName}</span> — {r.dispute.reason}
                  {r.dispute.resolutionNote ? (
                    <p className="mt-1 text-muted-foreground">Resolution: {r.dispute.resolutionNote}</p>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
