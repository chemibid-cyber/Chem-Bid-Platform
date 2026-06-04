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
  return (
    <nav className="flex items-center gap-1 overflow-x-auto">
      {items.map((it) => {
        const active = pathname === it.href || pathname.startsWith(`${it.href}/`);
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
