'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export interface NavItem {
  href: string;
  label: string;
}

export function AppNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  // Highlight only the single most-specific match: among all items whose href
  // matches the current path (exact, or as a path prefix), the longest href wins.
  // e.g. '/auctions/new' → only 'New auction'; '/auctions/123' → only 'My auctions'.
  const activeHref = items.reduce<string | null>((best, it) => {
    const matches = pathname === it.href || pathname.startsWith(`${it.href}/`);
    if (!matches) return best;
    if (best === null || it.href.length > best.length) return it.href;
    return best;
  }, null);
  return (
    <nav className="flex items-center gap-1 overflow-x-auto">
      {items.map((it) => {
        const active = it.href === activeHref;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              'whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors',
              active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
