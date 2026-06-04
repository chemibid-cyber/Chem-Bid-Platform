import Link from 'next/link';
import { requireUser } from '@/lib/auth/session';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = { title: 'Privacy & data' };

export default async function DataSettingsPage() {
  await requireUser();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Privacy &amp; data (DPDP)</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your rights</CardTitle>
          <CardDescription>
            Under the DPDP Act you can export your data and request deletion. These tools are wired
            up in the security &amp; privacy pass.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            See our{' '}
            <Link href="/privacy" className="underline">
              Privacy Policy
            </Link>{' '}
            for what we collect and why.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
