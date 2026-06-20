import Link from 'next/link';
import { requireUser } from '@/lib/auth/session';
import { getActiveMode } from '@/lib/auth/mode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CatalogForm } from '../catalog-form';

export const metadata = { title: 'Add product' };

export default async function NewCatalogItemPage() {
  const { user } = await requireUser();
  const mode = getActiveMode(user);
  const profileLabel = mode === 'sell' ? 'sales' : 'purchase';

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/catalog" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to catalog
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl tracking-tight">Add a product</CardTitle>
        </CardHeader>
        <CardContent>
          <CatalogForm profileLabel={profileLabel} />
        </CardContent>
      </Card>
    </div>
  );
}
