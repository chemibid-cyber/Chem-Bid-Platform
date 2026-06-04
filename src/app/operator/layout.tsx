import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { requireOperator } from '@/lib/auth/session';
import { logOutAction } from '@/app/(auth)/actions';
import { AppNav } from '@/components/app/app-nav';

export default async function OperatorLayout({ children }: { children: React.ReactNode }) {
  const op = await requireOperator();

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
          <Link href="/operator" className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-5 w-5" />
            Operator console
          </Link>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">{op.email}</span>
            <form action={logOutAction}>
              <button type="submit" className="rounded-md px-2 py-1 text-destructive hover:bg-destructive/10">
                Sign out
              </button>
            </form>
          </div>
          <div className="w-full">
            <AppNav
              items={[
                { href: '/operator', label: 'Dashboard' },
                { href: '/operator/disputes', label: 'Disputes' },
                { href: '/operator/moderation', label: 'Moderation' },
                { href: '/operator/companies', label: 'Companies' },
              ]}
            />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
