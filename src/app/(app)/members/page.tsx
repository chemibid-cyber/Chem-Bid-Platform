import Link from 'next/link';
import { eq, desc } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AddMemberForm } from './add-member-form';
import { MemberCapabilities } from './member-capabilities';

export const metadata = { title: 'Members' };

export default async function MembersPage() {
  const { user, company } = await requireAdmin();

  const members = await db
    .select()
    .from(users)
    .where(eq(users.companyId, company.id))
    .orderBy(desc(users.createdAt));

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Members</h1>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Capabilities</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="font-medium">
                      {m.firstName} {m.lastName}
                      {m.id === user.id ? <span className="ml-1 text-muted-foreground">(you)</span> : null}
                    </div>
                    <div className="text-xs text-muted-foreground">{m.email}</div>
                    {m.team ? <div className="text-xs text-muted-foreground">{m.team}</div> : null}
                  </TableCell>
                  <TableCell>{m.isAdmin ? <Badge>Admin</Badge> : <Badge variant="secondary">Member</Badge>}</TableCell>
                  <TableCell>
                    {m.isAdmin ? (
                      <span className="text-sm text-muted-foreground">Buy + Sell</span>
                    ) : m.status === 'disabled' ? (
                      <span className="text-sm text-muted-foreground">—</span>
                    ) : (
                      <MemberCapabilities memberId={m.id} canBuy={m.canBuy} canSell={m.canSell} />
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        m.status === 'active' ? 'success' : m.status === 'invited' ? 'warning' : 'secondary'
                      }
                    >
                      {m.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {m.id !== user.id && m.status !== 'disabled' ? (
                      <Link
                        href={`/members/${m.id}/disable`}
                        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-destructive')}
                      >
                        Disable
                      </Link>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Invite a member</h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New member</CardTitle>
          </CardHeader>
          <CardContent>
            <AddMemberForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
