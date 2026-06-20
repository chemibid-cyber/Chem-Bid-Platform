import Link from 'next/link';
import { FileJson } from 'lucide-react';
import { requireUser } from '@/lib/auth/session';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatIST } from '@/lib/format';
import { MarketingToggle, DeletionForm } from './data-controls';

export const metadata = { title: 'Privacy & data' };

export default async function DataSettingsPage() {
  const { user } = await requireUser();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Privacy &amp; data (DPDP)</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your consent, your records and your right to be forgotten — all in one place.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base tracking-tight">Consent</CardTitle>
          <CardDescription>You accepted the Terms and Privacy Policy at signup.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Consent recorded:{' '}
            <span className="tabular-nums text-foreground">
              {user.dpdpConsentAt ? formatIST(user.dpdpConsentAt) : '—'}
            </span>
          </p>
          <p className="mt-2">
            Read our{' '}
            <Link href="/privacy" className="text-brand hover:underline">
              Privacy Policy
            </Link>{' '}
            and{' '}
            <Link href="/terms" className="text-brand hover:underline">
              Terms
            </Link>
            .
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base tracking-tight">Email preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <MarketingToggle optOut={user.marketingOptOut} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base tracking-tight">Export my data</CardTitle>
          <CardDescription>Download your profile and your company&apos;s records as JSON.</CardDescription>
        </CardHeader>
        <CardContent>
          <a href="/api/export/me" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
            <FileJson className="h-4 w-4" /> Download my data (JSON)
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base tracking-tight text-destructive">
            Delete my account
          </CardTitle>
          <CardDescription>Request deletion of your personal data.</CardDescription>
        </CardHeader>
        <CardContent>
          <DeletionForm />
        </CardContent>
      </Card>
    </div>
  );
}
