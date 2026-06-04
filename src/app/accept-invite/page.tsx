import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { Gavel } from 'lucide-react';
import { getAuthUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { users, companies } from '@/lib/db/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AcceptInviteForm } from './accept-form';

export const metadata = { title: 'Accept invite' };

export default async function AcceptInvitePage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect('/login');

  const [profile] = await db.select().from(users).where(eq(users.id, authUser.id)).limit(1);
  if (profile && profile.status === 'active') redirect('/dashboard');

  let companyName = 'your company';
  if (profile) {
    const [company] = await db
      .select({ legalName: companies.legalName })
      .from(companies)
      .where(eq(companies.id, profile.companyId))
      .limit(1);
    if (company) companyName = company.legalName;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4">
      <div className="mb-6 flex items-center gap-2 font-semibold">
        <Gavel className="h-5 w-5" /> Chemical Auction
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">Welcome aboard</CardTitle>
        </CardHeader>
        <CardContent>
          <AcceptInviteForm companyName={companyName} />
        </CardContent>
      </Card>
    </div>
  );
}
