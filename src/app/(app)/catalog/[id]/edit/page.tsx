import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { catalogItems } from '@/lib/db/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CatalogEditForm } from './edit-form';

export const metadata = { title: 'Edit product' };

export default async function EditCatalogItemPage({ params }: { params: { id: string } }) {
  const { user } = await requireUser();

  const [item] = await db
    .select()
    .from(catalogItems)
    .where(and(eq(catalogItems.id, params.id), eq(catalogItems.companyId, user.companyId)))
    .limit(1);

  if (!item) notFound();
  if (item.ownerUserId !== user.id && !user.isAdmin) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/catalog" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to catalog
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl tracking-tight">Edit product</CardTitle>
        </CardHeader>
        <CardContent>
          <CatalogEditForm
            item={{
              id: item.id,
              name: item.name,
              grade: item.grade,
              minPurity: item.minPurity,
              roles: item.roles,
              isMixture: item.isMixture,
              mixtureText: item.mixtureText,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
