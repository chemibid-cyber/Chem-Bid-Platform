import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, eq, inArray } from 'drizzle-orm';
import { Building2, Truck, Package2, Wrench } from 'lucide-react';
import { requireUser } from '@/lib/auth/session';
import { canAccessOwned } from '@/lib/auth/scope';
import { db } from '@/lib/db';
import {
  serviceRequests,
  serviceQuotes,
  serviceProviderProfiles,
  companies,
  users,
} from '@/lib/db/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { Hint } from '@/components/ui/help';
import { cn } from '@/lib/utils';
import { formatIST, formatINR, PAYMENT_TERMS_LABEL } from '@/lib/format';
import {
  SERVICE_KIND_LABEL,
  SERVICE_STATUS_LABEL,
  VEHICLE_TYPE_LABEL,
  PACKING_TYPE_LABEL,
  PACKING_CONDITION_LABEL,
} from '@/lib/services/constants';
import { providerMatchesRequest } from '@/lib/services/totals';
import { ServiceQuoteForm } from './quote-form';
import { AcceptQuoteButton, CancelRequestButton, WithdrawQuoteButton } from './request-actions';

export const metadata = { title: 'Service inquiry' };

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium tabular-nums">{value || '—'}</dd>
    </div>
  );
}

function IdentityCard({
  title,
  legalName,
  gstin,
  address,
  contactName,
  email,
  phone,
  badge,
}: {
  title: string;
  legalName: string;
  gstin: string;
  address: string;
  contactName: string;
  email: string;
  phone: string | null;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Building2 className="mt-0.5 h-5 w-5 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
        <p className="font-display font-semibold tracking-tight">{legalName}</p>
        <p className="text-sm text-muted-foreground">
          GSTIN {gstin} · {address}
        </p>
        <p className="text-sm text-muted-foreground">
          {contactName} · {email}
          {phone ? ` · ${phone}` : ''}
        </p>
      </div>
      {badge}
    </div>
  );
}

export default async function ServiceRequestPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { published?: string };
}) {
  const { user, company } = await requireUser();

  const [request] = await db
    .select()
    .from(serviceRequests)
    .where(eq(serviceRequests.id, params.id))
    .limit(1);
  if (!request) notFound();

  const isNeeder = request.neederCompanyId === company.id;
  const open = request.status === 'open';

  // #41 member isolation: within the needer company, a non-admin member can only
  // open inquiries they created. Providers from OTHER companies keep the open
  // marketplace view (the gate applies only when this viewer is the needer).
  if (isNeeder && !canAccessOwned(request.neederUserId, user)) notFound();

  // OPEN IDENTITY: the needer's full corporate footprint is visible to everyone
  // who can see the inquiry — that's the module's core design.
  const [neederCompany] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, request.neederCompanyId))
    .limit(1);
  const [neederUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, request.neederUserId))
    .limit(1);

  // Viewer's provider standing.
  const [profile] = await db
    .select()
    .from(serviceProviderProfiles)
    .where(eq(serviceProviderProfiles.companyId, company.id))
    .limit(1);
  const canQuote = !isNeeder && Boolean(profile && providerMatchesRequest(profile, request));

  // Quotes: the needer sees all; a provider sees their own.
  const quoteRows = await db
    .select({
      id: serviceQuotes.id,
      providerCompanyId: serviceQuotes.providerCompanyId,
      baseRate: serviceQuotes.baseRate,
      taxAmount: serviceQuotes.taxAmount,
      total: serviceQuotes.total,
      altPaymentTerms: serviceQuotes.altPaymentTerms,
      note: serviceQuotes.note,
      status: serviceQuotes.status,
      createdAt: serviceQuotes.createdAt,
      providerName: companies.legalName,
      providerGstin: companies.gstin,
      providerAddress: companies.registeredAddress,
      contactFirst: users.firstName,
      contactLast: users.lastName,
      contactEmail: users.email,
      contactPhone: users.phone,
    })
    .from(serviceQuotes)
    .innerJoin(companies, eq(serviceQuotes.providerCompanyId, companies.id))
    .innerJoin(users, eq(serviceQuotes.providerUserId, users.id))
    .where(
      and(
        eq(serviceQuotes.requestId, request.id),
        inArray(serviceQuotes.status, ['active', 'accepted', 'declined']),
      ),
    )
    .orderBy(serviceQuotes.total);

  const visibleQuotes = isNeeder ? quoteRows : quoteRows.filter((q) => q.providerCompanyId === company.id);
  const myQuote = quoteRows.find((q) => q.providerCompanyId === company.id) ?? null;

  const quantity = request.kind === 'transport' ? Number(request.totalQtyKg ?? 0) : Number(request.quantityPieces ?? 0);
  const published = Number(searchParams.published ?? -1);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/services" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to services
      </Link>

      {published >= 0 ? (
        <Alert variant="success">
          <AlertDescription>
            Published — {published} matching provider{published === 1 ? '' : 's'} notified by email.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            {request.kind === 'transport' ? <Truck className="h-5 w-5" /> : <Package2 className="h-5 w-5" />}
            <h1 className="font-display text-2xl font-bold tracking-tight">
              {SERVICE_KIND_LABEL[request.kind]} inquiry
            </h1>
            <Badge variant={open ? 'success' : 'secondary'}>{SERVICE_STATUS_LABEL[request.status]}</Badge>
          </div>
          <p className="text-muted-foreground">Posted {formatIST(request.createdAt)}</p>
        </div>
        {isNeeder && open ? <CancelRequestButton requestId={request.id} /> : null}
      </div>

      {/* Needer identity — open from the moment of publication */}
      <Card>
        <CardContent className="py-4">
          <IdentityCard
            title="Needer (full identity — open)"
            legalName={neederCompany?.legalName ?? ''}
            gstin={neederCompany?.gstin ?? ''}
            address={neederCompany?.registeredAddress ?? ''}
            contactName={`${neederUser?.firstName ?? ''} ${neederUser?.lastName ?? ''}`.trim()}
            email={neederUser?.email ?? ''}
            phone={neederUser?.phone ?? null}
          />
        </CardContent>
      </Card>

      {/* Requirement */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Requirement</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            {request.kind === 'transport' ? (
              <>
                <Detail label="Material" value={request.materialName ?? ''} />
                <Detail label="Total quantity (gross)" value={`${request.totalQtyKg} kg`} />
                <Detail
                  label="One-lot quantity"
                  value={request.lotQtyKg ? `${request.lotQtyKg} kg / vehicle` : 'Single lot'}
                />
                <Detail
                  label="Vehicle type"
                  value={request.vehicleTypes.map((v) => VEHICLE_TYPE_LABEL[v] ?? v).join(', ')}
                />
                <div className="sm:col-span-2">
                  <Detail label="Pickup" value={request.pickupAddress ?? ''} />
                </div>
                <div className="sm:col-span-2">
                  <Detail label="Drop" value={request.dropAddress ?? ''} />
                </div>
                <div className="sm:col-span-2">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(request.pickupAddress ?? '')}&destination=${encodeURIComponent(request.dropAddress ?? '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-brand underline-offset-4 hover:underline"
                  >
                    View route on Google Maps ↗
                  </a>
                </div>
              </>
            ) : (
              <>
                <Detail
                  label="Packing type"
                  value={request.packingType ? PACKING_TYPE_LABEL[request.packingType] ?? request.packingType : ''}
                />
                <Detail
                  label="Condition"
                  value={request.condition ? PACKING_CONDITION_LABEL[request.condition] : ''}
                />
                <Detail label="Quantity" value={`${request.quantityPieces} pieces`} />
                <Detail label="Weight / capacity per piece" value={request.weightPerPiece ?? ''} />
                <div className="sm:col-span-2">
                  <Detail label="Specification" value={request.materialSpec ?? ''} />
                </div>
                <Detail
                  label="Logistics basis"
                  value={request.logisticsBasis === 'exworks' ? 'Ex-Works (needer fetches)' : 'Delivered'}
                />
              </>
            )}
            <Detail label="Baseline payment terms" value={PAYMENT_TERMS_LABEL[request.paymentTerms]} />
            {request.description ? (
              <div className="sm:col-span-2">
                <Detail label="Other description" value={request.description} />
              </div>
            ) : null}
          </dl>
        </CardContent>
      </Card>

      {/* Quotes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isNeeder ? `Quotes (${visibleQuotes.length})` : 'Your quote'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isNeeder && visibleQuotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No quotes yet — matching providers were emailed the moment you published.
            </p>
          ) : null}

          {visibleQuotes.map((q) => (
            <div
              key={q.id}
              className={cn(
                'space-y-3 rounded-xl border p-4',
                q.status === 'accepted' && 'border-success bg-success/5',
                q.status === 'declined' && 'opacity-60',
              )}
            >
              <IdentityCard
                title="Provider (full identity — open)"
                legalName={q.providerName}
                gstin={q.providerGstin}
                address={q.providerAddress}
                contactName={`${q.contactFirst} ${q.contactLast}`}
                email={q.contactEmail}
                phone={q.contactPhone}
                badge={
                  q.status === 'accepted' ? (
                    <Badge variant="success">Accepted</Badge>
                  ) : q.status === 'declined' ? (
                    <Badge variant="secondary">Declined</Badge>
                  ) : null
                }
              />
              <div className="grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">
                    Base rate ({request.kind === 'transport' ? '₹/kg' : '₹/piece'})
                  </p>
                  <p className="font-medium tabular-nums">{q.baseRate}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Tax (₹, absolute)</p>
                  <p className="font-medium tabular-nums">{q.taxAmount}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Total cost</p>
                  <p className="font-display text-base font-bold tabular-nums">{formatINR(q.total)}</p>
                </div>
              </div>
              <div className="text-sm">
                <p className="text-xs uppercase text-muted-foreground">Payment terms</p>
                {q.altPaymentTerms ? (
                  <p className="font-medium text-warning-foreground">
                    Alternative proposed: {q.altPaymentTerms}
                  </p>
                ) : (
                  <p className="font-medium">
                    Accepts baseline ({PAYMENT_TERMS_LABEL[request.paymentTerms]})
                  </p>
                )}
              </div>
              {q.note ? <p className="text-sm text-muted-foreground">{q.note}</p> : null}
              {isNeeder && open && q.status === 'active' ? (
                <AcceptQuoteButton
                  requestId={request.id}
                  quoteId={q.id}
                  providerName={q.providerName}
                  total={Number(q.total).toLocaleString('en-IN')}
                />
              ) : null}
            </div>
          ))}

          {/* Provider-side quoting */}
          {!isNeeder ? (
            open ? (
              canQuote ? (
                <>
                  {myQuote?.status === 'active' ? (
                    <div className="border-t pt-3">
                      <WithdrawQuoteButton requestId={request.id} />
                    </div>
                  ) : null}
                  <ServiceQuoteForm
                    requestId={request.id}
                    kind={request.kind}
                    quantity={quantity}
                    baselineTerms={PAYMENT_TERMS_LABEL[request.paymentTerms]}
                    initial={{
                      baseRate: myQuote?.baseRate ?? null,
                      taxAmount: myQuote?.taxAmount ?? null,
                      altPaymentTerms: myQuote?.altPaymentTerms ?? null,
                      note: myQuote?.note ?? null,
                    }}
                  />
                </>
              ) : (
                <Alert>
                  <AlertDescription>
                    To quote, register a matching service profile first —{' '}
                    <Link href="/services/providers" className="font-medium underline">
                      become a provider
                    </Link>
                    .
                  </AlertDescription>
                </Alert>
              )
            ) : (
              <p className="text-sm text-muted-foreground">This inquiry is {request.status}.</p>
            )
          ) : null}
        </CardContent>
      </Card>

      {!isNeeder && open && canQuote ? (
        <Hint>
          <Wrench className="mr-1 inline h-3.5 w-3.5" />
          Quoting reveals your full corporate profile to the needer instantly — that&apos;s the
          point: both sides vet capacity, compliance and payment terms directly, with no blind
          round-trips.
        </Hint>
      ) : null}

      {isNeeder ? (
        <Link href="/services/history" className={cn(buttonVariants({ variant: 'outline' }), 'w-fit')}>
          Service history
        </Link>
      ) : null}
    </div>
  );
}
