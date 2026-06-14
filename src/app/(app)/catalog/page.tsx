import Link from 'next/link';
import { and, eq, desc } from 'drizzle-orm';
import { Plus, Package } from 'lucide-react';
import { requireUser } from '@/lib/auth/session';
import { ownerScope } from '@/lib/auth/scope';
import { getActiveMode } from '@/lib/auth/mode';
import { db } from '@/lib/db';
import { catalogItems, users } from '@/lib/db/schema';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { buttonVariants } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/help';
import { cn } from '@/lib/utils';
import { GRADE_LABEL } from '@/lib/format';
import { ROLE_LABEL } from '@/lib/catalog/constants';
import { CatalogItemActions } from './item-actions';

export const metadata = { title: 'Catalog' };

export default async function CatalogPage({
  searchParams,
}: {
  searchParams?: { matched?: string };
}) {
  const { user } = await requireUser();
  const mode = getActiveMode(user);
  const profileType = mode === 'sell' ? 'sales' : 'purchase';
  const matched = Number(searchParams?.matched ?? 0);

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
    .where(
      and(
        eq(catalogItems.companyId, user.companyId),
        eq(catalogItems.profileType, profileType),
        // Member-level isolation (#40): a member sees only their own catalog items; admins see all.
        ownerScope(catalogItems.ownerUserId, user),
      ),
    )
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

      {matched > 0 ? (
        <Alert variant="success">
          <AlertDescription>
            Your new product matched {matched} live requirement{matched === 1 ? '' : 's'} —{' '}
            <Link href="/requests" className="font-medium underline">
              open your Requests inbox
            </Link>{' '}
            to accept &amp; quote.
          </AlertDescription>
        </Alert>
      ) : null}

      {items.length === 0 ? (
        <Card>
          <EmptyState
            icon={Package}
            title="No products yet"
            description={
              mode === 'sell'
                ? 'Add what you supply (CAS + grade) so matching buyer requirements reach you automatically.'
                : 'Add the chemicals you buy to track them and get matched to proactive offers.'
            }
            action={
              <Link href="/catalog/new" className={cn(buttonVariants())}>
                <Plus className="h-4 w-4" /> Add your first product
              </Link>
            }
          />
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
