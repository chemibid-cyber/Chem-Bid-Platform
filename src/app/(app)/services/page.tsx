import Link from 'next/link';
import { and, eq, desc, ne, inArray } from 'drizzle-orm';
import { Truck, Package2, Wrench, History, ArrowRight } from 'lucide-react';
import { requireUser } from '@/lib/auth/session';
import { ownerScope } from '@/lib/auth/scope';
import { db } from '@/lib/db';
import { serviceProviderProfiles, serviceRequests, serviceQuotes } from '@/lib/db/schema';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmptyState, Hint } from '@/components/ui/help';
import { cn } from '@/lib/utils';
import { formatIST, PAYMENT_TERMS_LABEL } from '@/lib/format';
import {
  SERVICE_KIND_LABEL,
  VEHICLE_TYPE_LABEL,
  PACKING_TYPE_LABEL,
} from '@/lib/services/constants';
import { providerMatchesRequest } from '@/lib/services/totals';

export const metadata = { title: 'Services hub' };

function requestSummary(r: typeof serviceRequests.$inferSelect): string {
  if (r.kind === 'transport') {
    const vehicles = r.vehicleTypes.map((v) => VEHICLE_TYPE_LABEL[v] ?? v).join(', ') || 'Any vehicle';
    return `${r.materialName} · ${r.totalQtyKg} kg · ${vehicles}`;
  }
  const type = r.packingType ? PACKING_TYPE_LABEL[r.packingType] ?? r.packingType : '—';
  return `${type} · ${r.quantityPieces} pcs`;
}

function RequestRow({ r, quoteCount }: { r: typeof serviceRequests.$inferSelect; quoteCount?: number }) {
  return (
    <Link href={`/services/${r.id}`}>
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-3">
            {r.kind === 'transport' ? (
              <Truck className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Package2 className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <p className="font-semibold">{requestSummary(r)}</p>
              <p className="text-sm text-muted-foreground">
                {SERVICE_KIND_LABEL[r.kind]} · {PAYMENT_TERMS_LABEL[r.paymentTerms]} ·{' '}
                {formatIST(r.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {typeof quoteCount === 'number' ? (
              <span className="text-sm text-muted-foreground">
                {quoteCount} quote{quoteCount === 1 ? '' : 's'}
              </span>
            ) : null}
            <Badge variant={r.status === 'open' ? 'success' : 'secondary'}>{r.status}</Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function ServicesPage() {
  const { user, company } = await requireUser();
  // Pure service providers: this page IS their dashboard (Active Requests Board).
  const providerOnly = !user.canBuy && !user.canSell;

  const [profile] = await db
    .select()
    .from(serviceProviderProfiles)
    .where(eq(serviceProviderProfiles.companyId, company.id))
    .limit(1);

  // My open inquiries (as needer), with quote counts.
  // #41 member isolation: a member sees only their own company needs; admins see all.
  const mine = await db
    .select()
    .from(serviceRequests)
    .where(
      and(
        eq(serviceRequests.neederCompanyId, company.id),
        eq(serviceRequests.status, 'open'),
        ownerScope(serviceRequests.neederUserId, user),
      ),
    )
    .orderBy(desc(serviceRequests.createdAt));

  const counts = new Map<string, number>();
  if (mine.length > 0) {
    const quoteRows = await db
      .select({ requestId: serviceQuotes.requestId })
      .from(serviceQuotes)
      .where(
        and(
          inArray(serviceQuotes.requestId, mine.map((m) => m.id)),
          eq(serviceQuotes.status, 'active'),
        ),
      );
    for (const q of quoteRows) counts.set(q.requestId, (counts.get(q.requestId) ?? 0) + 1);
  }

  // Open inquiries matching my provider profile (workspace).
  let workspace: (typeof serviceRequests.$inferSelect)[] = [];
  if (profile?.active) {
    const open = await db
      .select()
      .from(serviceRequests)
      .where(and(eq(serviceRequests.status, 'open'), ne(serviceRequests.neederCompanyId, company.id)))
      .orderBy(desc(serviceRequests.createdAt));
    workspace = open.filter((r) => providerMatchesRequest(profile, r));
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Services hub</h1>
          <p className="text-muted-foreground">
            Transport &amp; packing-material marketplace — open identity, no blind bidding.
          </p>
        </div>
        <Link href="/services/history" className={cn(buttonVariants({ variant: 'outline' }))}>
          <History className="h-4 w-4" /> Service history
        </Link>
      </div>

      {providerOnly && !profile?.active ? (
        <Alert variant="warning">
          <AlertDescription>
            One step left: pick the vehicle classes / packing types you serve so matching inquiries
            reach you by email.{' '}
            <Link href="/services/providers" className="font-medium underline">
              Finish your provider profile
            </Link>
            .
          </AlertDescription>
        </Alert>
      ) : null}

      <Hint>
        Unlike chemical auctions, service inquiries are fully open: the moment you publish, matching
        providers see your complete corporate profile — and the moment they quote, you see theirs.
        Speed over secrecy, because trucks and drums can&apos;t wait.
      </Hint>

      <div
        className={cn(
          'grid gap-4',
          providerOnly ? 'sm:grid-cols-1' : profile?.active ? 'sm:grid-cols-3' : 'sm:grid-cols-2',
        )}
      >
        {!providerOnly ? (
          <>
            <Link href="/services/new/transport">
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="flex h-full flex-col gap-2 py-5">
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
                      <Truck className="h-5 w-5" />
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="font-semibold">Request transport</p>
                  <p className="text-sm text-muted-foreground">
                    Tankers, trucks, trailers or containers for a chemical movement.
                  </p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/services/new/packing">
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="flex h-full flex-col gap-2 py-5">
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
                      <Package2 className="h-5 w-5" />
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="font-semibold">Request packing material</p>
                  <p className="text-sm text-muted-foreground">
                    FIBC bags, drums, ISO tanks or carboys — new or used.
                  </p>
                </CardContent>
              </Card>
            </Link>
          </>
        ) : null}
        {/* Provider-profile card: only for provider-only accounts (who need it to set
            up/edit their profile), or for a trader who already has an active profile to
            manage. Hidden from the normal buyer/seller view. */}
        {providerOnly || profile?.active ? (
          <Link href="/services/providers">
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardContent className="flex h-full flex-col gap-2 py-5">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <Wrench className="h-5 w-5" />
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="font-semibold">{profile?.active ? 'My provider profile' : 'Become a provider'}</p>
                <p className="text-sm text-muted-foreground">
                  {profile?.active
                    ? 'Update the vehicle classes / packing types you serve.'
                    : 'Offer transport or packing supply — get matching inquiries by email.'}
                </p>
              </CardContent>
            </Card>
          </Link>
        ) : null}
      </div>

      {profile?.active ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Open inquiries for you ({workspace.length})
          </h2>
          {workspace.length === 0 ? (
            <Card>
              <EmptyState
                icon={Wrench}
                title="No matching inquiries right now"
                description="You'll get an email the moment a needer publishes an inquiry matching your vehicle classes or packing types."
              />
            </Card>
          ) : (
            <div className="grid gap-3">
              {workspace.map((r) => (
                <RequestRow key={r.id} r={r} />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {!providerOnly ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            My open inquiries ({mine.length})
          </h2>
          {mine.length === 0 ? (
            <Card>
              <EmptyState
                icon={Truck}
                title="No open inquiries"
                description="Post a transport or packing request — matching providers get an instant email and quote with full identity on both sides."
              />
            </Card>
          ) : (
            <div className="grid gap-3">
              {mine.map((r) => (
                <RequestRow key={r.id} r={r} quoteCount={counts.get(r.id) ?? 0} />
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
