import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { serviceProviderProfiles } from '@/lib/db/schema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProviderProfileForm } from './provider-form';

export const metadata = { title: 'Service provider profile' };

export default async function ProvidersPage({
  searchParams,
}: {
  searchParams?: { welcome?: string };
}) {
  const { user, company } = await requireUser();

  const [profile] = await db
    .select()
    .from(serviceProviderProfiles)
    .where(eq(serviceProviderProfiles.companyId, company.id))
    .limit(1);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/services" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to services
      </Link>

      {searchParams?.welcome ? (
        <Alert variant="success">
          <AlertDescription>
            Account created — {company.legalName} is registered{' '}
            {company.verificationStatus === 'verified' ? 'and GST-verified' : '(GST verification pending)'}.
            Pick what you serve below; matching inquiries reach you by email the moment they publish.
          </AlertDescription>
        </Alert>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl tracking-tight">Service provider profile</CardTitle>
          <CardDescription>
            Register what your company serves. Matching inquiries land in your inbox the instant
            they publish — quotes carry your full corporate identity ({company.legalName}, GSTIN{' '}
            {company.gstin}).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!user.isAdmin ? (
            <Alert>
              <AlertDescription>
                Only an Admin can change the company&apos;s provider profile. Ask your Admin to set
                this up.
              </AlertDescription>
            </Alert>
          ) : (
            <ProviderProfileForm
              initial={{
                isTransporter: profile?.isTransporter ?? false,
                vehicleTypes: profile?.vehicleTypes ?? [],
                isPackingSupplier: profile?.isPackingSupplier ?? false,
                packingTypes: profile?.packingTypes ?? [],
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
