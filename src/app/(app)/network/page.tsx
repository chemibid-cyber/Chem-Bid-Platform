import { eq, desc, inArray } from 'drizzle-orm';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { registeredPartners, companies } from '@/lib/db/schema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AddPartnerForm } from './add-partner-form';
import { RemovePartnerButton, DeclinePartnerButton } from './partner-actions';

export const metadata = { title: 'Vendor network' };

export default async function NetworkPage() {
  const { company } = await requireUser();

  const outgoing = await db
    .select()
    .from(registeredPartners)
    .where(eq(registeredPartners.buyerCompanyId, company.id))
    .orderBy(desc(registeredPartners.createdAt));

  const incoming = await db
    .select()
    .from(registeredPartners)
    .where(eq(registeredPartners.partnerGstin, company.gstin))
    .orderBy(desc(registeredPartners.createdAt));

  const buyerIds = [...new Set(incoming.map((i) => i.buyerCompanyId))];
  const buyerNames = new Map<string, string>();
  if (buyerIds.length > 0) {
    const buyers = await db
      .select({ id: companies.id, legalName: companies.legalName })
      .from(companies)
      .where(inArray(companies.id, buyerIds));
    buyers.forEach((b) => buyerNames.set(b.id, b.legalName));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vendor network</h1>
          <p className="text-muted-foreground">
            Register trusted suppliers by GSTIN + CAS. &quot;Registered Only&quot; auctions go to
            active partners; pending ones are skipped until they join.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your registered partners</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {outgoing.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">No partners registered yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Partner GSTIN</TableHead>
                    <TableHead>CAS</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outgoing.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-sm">{p.partnerGstin}</TableCell>
                      <TableCell>{p.casNumber}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            p.status === 'active' ? 'success' : p.status === 'pending' ? 'warning' : 'secondary'
                          }
                        >
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <RemovePartnerButton partnerId={p.id} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {incoming.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Companies that added you</CardTitle>
              <CardDescription>You can decline being in a private network (DPDP consent).</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Buyer</TableHead>
                    <TableHead>CAS</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incoming.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{buyerNames.get(p.buyerCompanyId) ?? '—'}</TableCell>
                      <TableCell>{p.casNumber}</TableCell>
                      <TableCell>
                        <Badge variant={p.status === 'declined' ? 'secondary' : 'success'}>
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {p.status !== 'declined' ? <DeclinePartnerButton partnerId={p.id} /> : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Register a partner</h2>
        <Card>
          <CardContent className="pt-6">
            <AddPartnerForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
