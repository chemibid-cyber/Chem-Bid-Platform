import Link from 'next/link';
import { redirect } from 'next/navigation';
import { and, eq, asc } from 'drizzle-orm';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { auctions, catalogItems } from '@/lib/db/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AuctionForm, type AuctionInitial, type CatalogPick } from '../auction-form';

export const metadata = { title: 'New auction' };

export default async function NewAuctionPage({ searchParams }: { searchParams: { clone?: string } }) {
  const { user, company } = await requireUser();
  if (!user.canBuy && !user.isAdmin) redirect('/dashboard?error=no_capability');

  let initial: AuctionInitial | undefined;
  if (searchParams.clone) {
    const [src] = await db
      .select()
      .from(auctions)
      .where(and(eq(auctions.id, searchParams.clone), eq(auctions.buyerCompanyId, company.id)))
      .limit(1);
    if (src) {
      initial = {
        casNumber: src.casNumber,
        name: src.name,
        isMixture: !src.casNumber,
        mixtureText: src.remarks,
        quantity: src.quantity,
        unit: src.unit,
        minPurity: src.minPurity,
        packing: src.packing,
        logisticsBasis: src.logisticsBasis,
        deliveryTermsCustom: src.deliveryTermsCustom,
        paymentTerms: src.paymentTerms,
        paymentTermsCustom: src.paymentTermsCustom,
        freightTerms: src.freightTerms,
        supplierFilter: src.supplierFilter,
        remarks: src.remarks,
        privacyMode: src.privacyMode,
        blind: src.blind,
      };
    }
  }

  // The buyer's procurement list — drives the product picker on the form.
  const catalog: CatalogPick[] = await db
    .select({
      id: catalogItems.id,
      casNumber: catalogItems.casNumber,
      name: catalogItems.name,
      isMixture: catalogItems.isMixture,
      mixtureText: catalogItems.mixtureText,
    })
    .from(catalogItems)
    .where(
      and(
        eq(catalogItems.companyId, company.id),
        eq(catalogItems.profileType, 'purchase'),
        eq(catalogItems.delisted, false),
      ),
    )
    .orderBy(asc(catalogItems.name));

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/auctions" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to auctions
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Post a requirement</CardTitle>
        </CardHeader>
        <CardContent>
          {company.verificationStatus !== 'verified' ? (
            <Alert variant="warning">
              <AlertTitle>Verification required</AlertTitle>
              <AlertDescription>
                Publishing is blocked until your GSTIN is verified.{' '}
                <Link href="/settings" className={cn(buttonVariants({ variant: 'link', size: 'sm' }), 'px-1')}>
                  Review verification
                </Link>
              </AlertDescription>
            </Alert>
          ) : (
            <AuctionForm defaultAddress={company.registeredAddress} initial={initial} catalog={catalog} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
