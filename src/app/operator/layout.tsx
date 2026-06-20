import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { requireOperator } from '@/lib/auth/session';
import { logOutAction } from '@/app/(auth)/actions';
import { AppNav } from '@/components/app/app-nav';

export default async function OperatorLayout({ children }: { children: React.ReactNode }) {
  const op = await requireOperator();

  return (
    <div className="min-h-screen bg-background">
      {/* The control room: a graphite chrome marks that you've left the trading app. */}
      <header className="sticky top-0 z-30 bg-graphite text-white shadow-[0_18px_40px_-28px_rgba(28,38,34,.6)]">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
            <Link href="/operator" className="flex items-center gap-2.5 font-display font-semibold tracking-tight text-white">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white">
                <ShieldCheck className="h-4 w-4" />
              </span>
              Operator console
              <span className="ml-1 rounded-md border border-white/15 px-2 py-0.5 text-[11px] font-semibold tracking-[0.12em] text-white/60">
                OPERATOR
              </span>
            </Link>
            <div className="ml-auto flex items-center gap-3 text-sm">
              <span className="text-white/60">{op.email}</span>
              <form action={logOutAction}>
                <button type="submit" className="rounded-md px-2 py-1 text-white/80 transition-colors hover:bg-white/10 hover:text-white">
                  Sign out
                </button>
              </form>
            </div>
          </div>
          <div className="w-full border-t border-white/10 text-white [&_a]:text-white/60 [&_a:hover]:text-white">
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
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
