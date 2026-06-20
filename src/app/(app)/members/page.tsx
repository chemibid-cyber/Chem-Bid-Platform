import { eq, desc } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AddMemberForm } from './add-member-form';
import { MemberCapabilities } from './member-capabilities';
import { MemberRowActions } from './member-row-actions';

export const metadata = { title: 'Members' };

/** Two-letter avatar initials from a member's name. */
function initials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

export default async function MembersPage() {
  const { user, company } = await requireAdmin();

  const members = await db
    .select()
    .from(users)
    .where(eq(users.companyId, company.id))
    .orderBy(desc(users.createdAt));

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Members{' '}
            <span className="text-base font-medium tabular-nums text-muted-foreground">
              · {members.length} {members.length === 1 ? 'person' : 'people'}
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Admins invite colleagues and set what each can do. Members only see their own auctions.
          </p>
        </div>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Can do</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-graphite text-xs font-semibold text-white"
                      >
                        {initials(m.firstName, m.lastName)}
                      </span>
                      <div className="min-w-0">
                        <div className="font-medium">
                          {m.firstName} {m.lastName}
                          {m.id === user.id ? (
                            <span className="ml-1 font-normal text-muted-foreground">(you)</span>
                          ) : null}
                        </div>
                        <div className="text-xs text-muted-foreground">{m.email}</div>
                        {m.team ? <div className="text-xs text-muted-foreground">{m.team}</div> : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {m.isAdmin ? (
                      <Badge variant="brand">Admin</Badge>
                    ) : (
                      <Badge variant="secondary">Member</Badge>
                    )}
                  </TableCell>
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
                    {m.status === 'active' ? (
                      <Badge variant="success">Active</Badge>
                    ) : m.status === 'invited' ? (
                      <Badge variant="warning">Invited — pending</Badge>
                    ) : (
                      <Badge variant="secondary">Disabled</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <MemberRowActions
                      memberId={m.id}
                      memberName={`${m.firstName} ${m.lastName}`}
                      status={m.status}
                      isSelf={m.id === user.id}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="font-display text-lg font-semibold tracking-tight">Invite a colleague</h2>
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
