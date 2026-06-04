import { requireUser } from '@/lib/auth/session';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatIST } from '@/lib/format';
import { GstRefreshForm } from './refresh-form';

export const metadata = { title: 'Company & profile' };

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{value || '—'}</dd>
    </div>
  );
}

export default async function SettingsPage() {
  const { user, company } = await requireUser();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Company &amp; profile</h1>

      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">Corporate identity</CardTitle>
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
          <CardTitle className="text-lg">Your profile</CardTitle>
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
    </div>
  );
}
