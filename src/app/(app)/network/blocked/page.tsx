import Link from 'next/link';
import { eq, desc, inArray } from 'drizzle-orm';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { blocks, companies } from '@/lib/db/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatIST } from '@/lib/format';
import { UnblockButton } from './unblock-button';

export const metadata = { title: 'Blocked companies' };

export default async function BlockedCompaniesPage() {
  const { company } = await requireUser();

  const rows = await db
    .select({
      id: blocks.id,
      blockedCompanyId: blocks.blockedCompanyId,
      scope: blocks.scope,
      casNumber: blocks.casNumber,
      expiresAt: blocks.expiresAt,
      createdAt: blocks.createdAt,
    })
    .from(blocks)
    .where(eq(blocks.blockerCompanyId, company.id))
    .orderBy(desc(blocks.createdAt));

  const blockedIds = [...new Set(rows.map((r) => r.blockedCompanyId))];
  const blockedCompanies = new Map<string, { legalName: string; gstin: string }>();
  if (blockedIds.length > 0) {
    const found = await db
      .select({ id: companies.id, legalName: companies.legalName, gstin: companies.gstin })
      .from(companies)
      .where(inArray(companies.id, blockedIds));
    found.forEach((c) => blockedCompanies.set(c.id, { legalName: c.legalName, gstin: c.gstin }));
  }

  const now = new Date();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/network" className="text-sm font-medium text-brand hover:underline">
        ← Back to network
      </Link>

      <div className="space-y-1">
        <h1 className="font-display text-2xl font-bold tracking-tight">Blocked companies</h1>
        <p className="max-w-2xl text-muted-foreground">
          Companies you&apos;ve muted from your requirements. An expired block no longer applies —
          unblock anytime to make a company eligible again.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base tracking-tight">Your blocks</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              You haven&apos;t blocked any companies.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const info = blockedCompanies.get(r.blockedCompanyId);
                  const name = info?.legalName ?? 'Unknown company';
                  const expired = r.expiresAt != null && new Date(r.expiresAt) <= now;
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium">{name}</div>
                        {info?.gstin ? (
                          <div className="font-mono text-xs tabular-nums text-muted-foreground">{info.gstin}</div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.scope === 'all' ? 'All products' : `CAS ${r.casNumber ?? '—'}`}
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">{r.expiresAt ? formatIST(r.expiresAt) : 'Permanent'}</TableCell>
                      <TableCell>
                        <Badge variant={expired ? 'secondary' : 'destructive'}>
                          {expired ? 'Expired' : 'Active'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <UnblockButton blockId={r.id} companyName={name} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
