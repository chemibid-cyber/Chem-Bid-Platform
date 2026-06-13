import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EditInviteForm } from './edit-invite-form';

export const metadata = { title: 'Edit invite' };

export default async function EditInvitePage({ params }: { params: { id: string } }) {
  const { company } = await requireAdmin();

  const [member] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, params.id), eq(users.companyId, company.id)))
    .limit(1);
  // Editing is only for still-pending invites; anything else 404s.
  if (!member || member.status !== 'invited') notFound();

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link href="/members" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to members
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Edit pending invite</CardTitle>
          <CardDescription>
            Fix the name, contact details, or email before {member.firstName} accepts. Changing the
            email re-sends the invite.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EditInviteForm
            defaults={{
              memberId: member.id,
              firstName: member.firstName,
              lastName: member.lastName,
              email: member.email,
              phone: member.phone ?? '',
              designation: member.designation ?? '',
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
