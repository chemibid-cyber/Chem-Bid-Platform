import Link from 'next/link';
import { and, eq, desc } from 'drizzle-orm';
import { Plus, Package } from 'lucide-react';
import { requireUser } from '@/lib/auth/session';
import { getActiveMode } from '@/lib/auth/mode';
import { db } from '@/lib/db';
import { catalogItems, users } from '@/lib/db/schema';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { GRADE_LABEL } from '@/lib/format';
import { ROLE_LABEL } from '@/lib/catalog/constants';
import { CatalogItemActions } from './item-actions';

export const metadata = { title: 'Catalog' };

export default async function CatalogPage() {
  const { user } = await requireUser();
  const mode = getActiveMode(user);
  const profileType = mode === 'sell' ? 'sales' : 'purchase';

  const items = await db
    .select({
      id: catalogItems.id,
      name: catalogItems.name,
      casNumber: catalogItems.casNumber,
      nameVerified: catalogItems.nameVerified,
      isMixture: catalogItems.isMixture,
      grade: catalogItems.grade,
      minPurity: catalogItems.minPurity,
      roles: catalogItems.roles,
      delisted: catalogItems.delisted,
      ownerUserId: catalogItems.ownerUserId,
      ownerFirst: users.firstName,
      ownerLast: users.lastName,
    })
    .from(catalogItems)
    .innerJoin(users, eq(catalogItems.ownerUserId, users.id))
    .where(and(eq(catalogItems.companyId, user.companyId), eq(catalogItems.profileType, profileType)))
    .orderBy(desc(catalogItems.createdAt));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight capitalize">{profileType} catalog</h1>
          <p className="text-muted-foreground">
            {mode === 'sell'
              ? 'What you supply — used to match you to buyer requirements.'
              : 'Chemicals you buy — used to target you for proactive offers.'}
          </p>
        </div>
        <Link href="/catalog/new" className={cn(buttonVariants())}>
          <Plus className="h-4 w-4" /> Add product
        </Link>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Package className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">No products yet in this catalog.</p>
            <Link href="/catalog/new" className={cn(buttonVariants({ variant: 'outline' }))}>
              Add your first product
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>CAS</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Min purity</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it) => (
                <TableRow key={it.id} className={it.delisted ? 'opacity-50' : ''}>
                  <TableCell className="font-medium">
                    {it.name}
                    {it.isMixture ? (
                      <Badge variant="outline" className="ml-2">
                        Mixture
                      </Badge>
                    ) : null}
                    {!it.nameVerified && !it.isMixture ? (
                      <Badge variant="warning" className="ml-2">
                        Unverified
                      </Badge>
                    ) : null}
                    {it.delisted ? (
                      <Badge variant="secondary" className="ml-2">
                        Delisted
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{it.casNumber ?? '—'}</TableCell>
                  <TableCell>{GRADE_LABEL[it.grade] ?? it.grade}</TableCell>
                  <TableCell>{it.minPurity ? `${it.minPurity}%` : '—'}</TableCell>
                  <TableCell className="text-sm">
                    {it.roles.map((r) => ROLE_LABEL[r] ?? r).join(', ') || '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {it.ownerFirst} {it.ownerLast}
                  </TableCell>
                  <TableCell className="text-right">
                    {(it.ownerUserId === user.id || user.isAdmin) && !it.delisted ? (
                      <CatalogItemActions itemId={it.id} />
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
