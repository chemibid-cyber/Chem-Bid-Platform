import Link from 'next/link';
import { Gavel, Bell, ChevronDown, BadgeCheck, Clock, ShieldX } from 'lucide-react';
import { logOutAction } from '@/app/(auth)/actions';
import { AppNav, type NavItem } from '@/components/app/app-nav';
import { ModeToggle } from '@/components/app/mode-toggle';
import { Badge } from '@/components/ui/badge';
import { canToggleMode, type Mode } from '@/lib/auth/mode';
import type { Company, User } from '@/lib/db/schema';

function verificationBadge(status: Company['verificationStatus']) {
  if (status === 'verified')
    return (
      <Badge variant="success" className="gap-1">
        <BadgeCheck className="h-3 w-3" /> Verified
      </Badge>
    );
  if (status === 'pending')
    return (
      <Badge variant="warning" className="gap-1">
        <Clock className="h-3 w-3" /> Verification pending
      </Badge>
    );
  return (
    <Badge variant="destructive" className="gap-1">
      <ShieldX className="h-3 w-3" /> Rejected
    </Badge>
  );
}

const BUY_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/auctions', label: 'My auctions' },
  { href: '/auctions/new', label: 'New auction' },
  { href: '/network', label: 'Network' },
  { href: '/catalog', label: 'Catalog' },
];

const SELL_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/requests', label: 'Requests' },
  { href: '/catalog', label: 'Catalog' },
];

export function AppHeader({
  user,
  company,
  mode,
  unreadCount = 0,
}: {
  user: User;
  company: Company;
  mode: Mode;
  unreadCount?: number;
}) {
  const items = mode === 'buy' ? [...BUY_NAV] : [...SELL_NAV];
  if (user.isAdmin) items.push({ href: '/members', label: 'Members' });

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <Gavel className="h-5 w-5" />
          <span className="hidden sm:inline">Chemical Auction</span>
        </Link>

        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium" title={company.legalName}>
            {company.legalName}
          </span>
          {verificationBadge(company.verificationStatus)}
        </div>

        <div className="ml-auto flex items-center gap-3">
          {canToggleMode(user) ? <ModeToggle mode={mode} /> : null}

          <Link
            href="/notifications"
            className="relative rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 ? (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : null}
          </Link>

          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {user.firstName.charAt(0)}
                {user.lastName.charAt(0)}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </summary>
            <div className="absolute right-0 z-40 mt-2 w-56 rounded-lg border bg-popover p-1 shadow-md">
              <div className="px-3 py-2">
                <p className="text-sm font-medium">
                  {user.firstName} {user.lastName}
                </p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
              <div className="my-1 h-px bg-border" />
              <Link
                href="/settings"
                className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
              >
                Company &amp; profile
              </Link>
              <Link
                href="/settings/data"
                className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
              >
                Privacy &amp; data
              </Link>
              <form action={logOutAction}>
                <button
                  type="submit"
                  className="w-full rounded-md px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
                >
                  Sign out
                </button>
              </form>
            </div>
          </details>
        </div>

        <div className="w-full">
          <AppNav items={items} />
        </div>
      </div>
    </header>
  );
}
