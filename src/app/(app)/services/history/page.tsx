import Link from 'next/link';
import { and, eq, desc, ne, inArray } from 'drizzle-orm';
import { History, Truck, Package2 } from 'lucide-react';
import { requireUser } from '@/lib/auth/session';
import { ownerScope } from '@/lib/auth/scope';
import { db } from '@/lib/db';
import { serviceRequests, serviceQuotes, companies } from '@/lib/db/schema';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/help';
import { formatIST, formatINR, PAYMENT_TERMS_LABEL } from '@/lib/format';
import {
  SERVICE_KIND_LABEL,
  SERVICE_STATUS_LABEL,
  VEHICLE_TYPE_LABEL,
  PACKING_TYPE_LABEL,
} from '@/lib/services/constants';

export const metadata = { title: 'Service history' };

function summary(r: typeof serviceRequests.$inferSelect): string {
  if (r.kind === 'transport') {
    const vehicles = r.vehicleTypes.map((v) => VEHICLE_TYPE_LABEL[v] ?? v).join(', ') || 'Any vehicle';
    return `${r.materialName} · ${r.totalQtyKg} kg · ${vehicles}`;
  }
  const type = r.packingType ? PACKING_TYPE_LABEL[r.packingType] ?? r.packingType : '—';
  return `${type} · ${r.quantityPieces} pcs`;
}

export default async function ServiceHistoryPage() {
  const { user, company } = await requireUser();

  // As needer: every non-open inquiry (the permanent audit folder).
  // #41 member isolation: a member sees only their own; admins see all company history.
  const asNeeder = await db
    .select()
    .from(serviceRequests)
    .where(
      and(
        eq(serviceRequests.neederCompanyId, company.id),
        ne(serviceRequests.status, 'open'),
        ownerScope(serviceRequests.neederUserId, user),
      ),
    )
    .orderBy(desc(serviceRequests.createdAt));

  // As provider: every request we quoted (any terminal state).
  const myQuotes = await db
    .select({
      quoteId: serviceQuotes.id,
      quoteStatus: serviceQuotes.status,
      total: serviceQuotes.total,
      requestId: serviceQuotes.requestId,
    })
    .from(serviceQuotes)
    .where(eq(serviceQuotes.providerCompanyId, company.id))
    .orderBy(desc(serviceQuotes.createdAt));

  const quotedRequestIds = myQuotes.map((q) => q.requestId);
  const quotedRequests =
    quotedRequestIds.length > 0
      ? await db
          .select({
            request: serviceRequests,
            neederName: companies.legalName,
          })
          .from(serviceRequests)
          .innerJoin(companies, eq(serviceRequests.neederCompanyId, companies.id))
          .where(inArray(serviceRequests.id, quotedRequestIds))
      : [];
  const requestById = new Map(quotedRequests.map((r) => [r.request.id, r]));

  // Accepted totals for the needer's closed rows.
  const acceptedByRequest = new Map<string, string>();
  const closedIds = asNeeder.filter((r) => r.acceptedQuoteId).map((r) => r.id);
  if (closedIds.length > 0) {
    const accepted = await db
      .select({ requestId: serviceQuotes.requestId, total: serviceQuotes.total })
      .from(serviceQuotes)
      .where(and(inArray(serviceQuotes.requestId, closedIds), eq(serviceQuotes.status, 'accepted')));
    for (const a of accepted) acceptedByRequest.set(a.requestId, a.total);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Service history</h1>
        <p className="mt-1 text-muted-foreground">
          The permanent record of every closed or cancelled service transaction — for audits, legal
          verification and cost-basis analysis. Nothing here is ever deleted.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          As needer ({asNeeder.length})
        </h2>
        {asNeeder.length === 0 ? (
          <Card>
            <EmptyState
              icon={History}
              title="Nothing archived yet"
              description="Closed and cancelled inquiries land here automatically."
            />
          </Card>
        ) : (
          <div className="grid gap-3">
            {asNeeder.map((r) => (
              <Link key={r.id} href={`/services/${r.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                    <div className="flex items-center gap-3">
                      {r.kind === 'transport' ? (
                        <Truck className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <Package2 className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-display font-semibold tracking-tight">{summary(r)}</p>
                        <p className="text-sm tabular-nums text-muted-foreground">
                          {SERVICE_KIND_LABEL[r.kind]} · {PAYMENT_TERMS_LABEL[r.paymentTerms]} ·{' '}
                          {formatIST(r.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {acceptedByRequest.has(r.id) ? (
                        <span className="font-display text-sm font-semibold tabular-nums">
                          {formatINR(acceptedByRequest.get(r.id))}
                        </span>
                      ) : null}
                      <Badge variant="secondary">{SERVICE_STATUS_LABEL[r.status]}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          As provider ({myQuotes.length})
        </h2>
        {myQuotes.length === 0 ? (
          <Card>
            <EmptyState
              icon={History}
              title="No quotes yet"
              description="Every quote you submit is tracked here with its outcome."
            />
          </Card>
        ) : (
          <div className="grid gap-3">
            {myQuotes.map((q) => {
              const r = requestById.get(q.requestId);
              if (!r) return null;
              return (
                <Link key={q.quoteId} href={`/services/${q.requestId}`}>
                  <Card className="transition-shadow hover:shadow-md">
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                      <div className="flex items-center gap-3">
                        {r.request.kind === 'transport' ? (
                          <Truck className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <Package2 className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <p className="font-display font-semibold tracking-tight">{summary(r.request)}</p>
                          <p className="text-sm tabular-nums text-muted-foreground">
                            for {r.neederName} · quoted {formatINR(q.total)}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          q.quoteStatus === 'accepted'
                            ? 'success'
                            : q.quoteStatus === 'active'
                              ? 'outline'
                              : 'secondary'
                        }
                      >
                        {q.quoteStatus === 'active' ? 'awaiting decision' : q.quoteStatus}
                      </Badge>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
