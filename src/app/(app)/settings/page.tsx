import { requireUser } from '@/lib/auth/session';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ShieldCheck } from 'lucide-react';
import { formatIST } from '@/lib/format';
import { isSmsLive } from '@/lib/sms';
import { GstRefreshForm } from './refresh-form';
import { VerifyPanel } from './verify-panel';

export const metadata = { title: 'Company & profile' };

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium tabular-nums">{value || '—'}</dd>
    </div>
  );
}

export default async function SettingsPage() {
  const { user, company } = await requireUser();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">My Company Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Quiet, sectioned and read-only. The verification status is what matters most here.
        </p>
      </div>

      {company.verificationStatus === 'verified' ? (
        <div className="flex items-center gap-4 rounded-2xl bg-brand p-6 text-white">
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white/15">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <div className="font-display text-lg font-bold tracking-tight">GSTIN verified</div>
            <div className="mt-0.5 truncate text-sm tabular-nums text-white/70">
              {company.gstin}
              {company.gstLastRefreshedAt ? ` · confirmed ${formatIST(company.gstLastRefreshedAt)}` : ''}
            </div>
          </div>
        </div>
      ) : null}

      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="font-display text-lg tracking-tight">Corporate identity</CardTitle>
            <CardDescription>
              Sourced from the GST network and locked — it cannot be hand-edited.
            </CardDescription>
          </div>
          <Badge
            variant={
              company.verificationStatus === 'verified'
                ? 'success'
                : company.verificationStatus === 'pending'
                  ? 'warning'
                  : 'destructive'
            }
          >
            {company.verificationStatus}
          </Badge>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Legal name" value={company.legalName} />
            <Field label="GSTIN" value={company.gstin} />
            <Field label="PAN" value={company.pan} />
            <Field label="Completion score" value={String(company.completionScore)} />
            <div className="sm:col-span-2">
              <Field label="Registered address" value={company.registeredAddress} />
            </div>
          </dl>
          <Separator className="my-4" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Last refreshed: {company.gstLastRefreshedAt ? formatIST(company.gstLastRefreshedAt) : 'never'}
            </p>
            {user.isAdmin ? <GstRefreshForm /> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg tracking-tight">Your profile</CardTitle>
          <CardDescription>Managed by your Admin. Capabilities control what you can do.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" value={`${user.firstName} ${user.lastName}`} />
            <Field label="Email" value={user.email} />
            <Field label="Phone" value={user.phone ?? ''} />
            <Field label="Designation" value={user.designation ?? ''} />
            <Field label="Team" value={user.team ?? ''} />
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Capabilities</dt>
              <dd className="mt-1 flex flex-wrap gap-1">
                {user.isAdmin ? <Badge>Admin</Badge> : null}
                {user.canBuy || user.isAdmin ? <Badge variant="secondary">Buy</Badge> : null}
                {user.canSell || user.isAdmin ? <Badge variant="secondary">Sell</Badge> : null}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg tracking-tight">Verify contact details</CardTitle>
          <CardDescription>
            Confirm your email with a one-time code, so notifications and account recovery
            reliably reach you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VerifyPanel
            email={user.email}
            emailVerified={!!user.emailVerifiedAt}
            phone={user.phone ?? ''}
            phoneVerified={!!user.phoneVerifiedAt}
            smsLive={isSmsLive()}
          />
        </CardContent>
      </Card>
    </div>
  );
}
