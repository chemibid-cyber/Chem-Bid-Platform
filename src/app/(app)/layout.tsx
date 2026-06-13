import Link from 'next/link';
import { and, eq, isNull, count } from 'drizzle-orm';
import { AlertTriangle } from 'lucide-react';
import { requireUser } from '@/lib/auth/session';
import { getActiveMode } from '@/lib/auth/mode';
import { AppHeader } from '@/components/app/app-header';
import { Toaster } from '@/components/ui/toaster';
import { NotificationToaster } from '@/components/app/notification-toaster';
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, company } = await requireUser();
  const mode = getActiveMode(user);

  const unreadRows = await db
    .select({ value: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
  const unread = Number(unreadRows[0]?.value ?? 0);

  return (
    <Toaster>
      <NotificationToaster />
      <div className="min-h-screen bg-muted/20">
        <AppHeader user={user} company={company} mode={mode} unreadCount={unread} />

      {company.verificationStatus !== 'verified' ? (
        <div className="border-b border-warning/40 bg-warning/10">
          <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
            <span>
              Your GSTIN verification is{' '}
              <strong>{company.verificationStatus === 'pending' ? 'pending' : 'rejected'}</strong>.
              You can set up your catalog, but publishing auctions and bidding are blocked until
              verification succeeds.
            </span>
            <Link href="/settings" className="ml-auto shrink-0 font-medium underline">
              Review
            </Link>
          </div>
        </div>
      ) : null}

        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </div>
    </Toaster>
  );
}
