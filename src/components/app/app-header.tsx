import Link from 'next/link';
import { Gavel, Bell, ChevronDown, BadgeCheck, Clock, ShieldX } from 'lucide-react';
import { AppNav, type NavItem } from '@/components/app/app-nav';
import { ModeToggle } from '@/components/app/mode-toggle';
import { ProfileMenu } from '@/components/app/profile-menu';
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
  { href: '/services', label: 'Services' },
];

const SELL_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/requests', label: 'Requests' },
  { href: '/catalog', label: 'Catalog' },
  { href: '/services', label: 'Services' },
];

const PROVIDER_NAV: NavItem[] = [
  { href: '/services', label: 'Services hub' },
  { href: '/services/history', label: 'Service history' },
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
  // Pure service providers get the provider workspace, not buy/sell nav.
  const providerOnly = !user.canBuy && !user.canSell;
  const items = providerOnly ? [...PROVIDER_NAV] : mode === 'buy' ? [...BUY_NAV] : [...SELL_NAV];
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
          {/* Buy/Sell is meaningless for pure service providers (admin or not). */}
          {!providerOnly && canToggleMode(user) ? <ModeToggle mode={mode} /> : null}

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
            <ProfileMenu
              firstName={user.firstName}
              lastName={user.lastName}
              email={user.email}
            />
          </details>
        </div>

        <div className="w-full">
          <AppNav items={items} />
        </div>
      </div>
    </header>
  );
}
