import { desc } from 'drizzle-orm';
import { requireOperator } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { companies } from '@/lib/db/schema';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GstOverrideButtons, SuspendButton } from '../operator-controls';

export const metadata = { title: 'Companies' };

export default async function OperatorCompanies() {
  await requireOperator();

  const rows = await db.select().from(companies).orderBy(desc(companies.createdAt)).limit(200);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Companies</h1>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>GSTIN</TableHead>
              <TableHead>Verification</TableHead>
              <TableHead>Score</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => (
              <TableRow key={c.id} className={c.suspended ? 'opacity-60' : ''}>
                <TableCell>
                  <div className="font-medium">{c.legalName}</div>
                  {c.suspended ? <Badge variant="destructive">Suspended</Badge> : null}
                </TableCell>
                <TableCell className="font-mono text-xs">{c.gstin}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      c.verificationStatus === 'verified'
                        ? 'success'
                        : c.verificationStatus === 'pending'
                          ? 'warning'
                          : 'destructive'
                    }
                  >
                    {c.verificationStatus}
                  </Badge>
                </TableCell>
                <TableCell>{c.completionScore}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    {c.verificationStatus === 'pending' ? <GstOverrideButtons companyId={c.id} /> : null}
                    <SuspendButton companyId={c.id} suspended={c.suspended} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
