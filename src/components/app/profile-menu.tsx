'use client';

import Link from 'next/link';
import { logOutAction } from '@/app/(auth)/actions';

function closeMenu(el: HTMLElement) {
  el.closest('details')?.removeAttribute('open');
}

export function ProfileMenu({
  firstName,
  lastName,
  email,
}: {
  firstName: string;
  lastName: string;
  email: string;
}) {
  return (
    <div className="absolute right-0 z-40 mt-2 w-56 rounded-lg border bg-popover p-1 shadow-md">
      <div className="px-3 py-2">
        <p className="text-sm font-medium">
          {firstName} {lastName}
        </p>
        <p className="truncate text-xs text-muted-foreground">{email}</p>
      </div>
      <div className="my-1 h-px bg-border" />
      <Link
        href="/settings"
        onClick={(e) => closeMenu(e.currentTarget)}
        className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
      >
        My Company Profile
      </Link>
      <Link
        href="/settings/data"
        onClick={(e) => closeMenu(e.currentTarget)}
        className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
      >
        Privacy &amp; data
      </Link>
      <form action={logOutAction}>
        <button
          type="submit"
          onClick={(e) => closeMenu(e.currentTarget)}
          className="w-full rounded-md px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
