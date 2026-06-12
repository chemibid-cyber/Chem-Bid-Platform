'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { Mode } from '@/lib/auth/mode';

export async function setModeAction(mode: Mode) {
  cookies().set('mode', mode, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath('/', 'layout');
  // Switching sides always lands you on that side's dashboard — staying on a
  // buy-only page (e.g. My auctions) in Sell mode is disorienting.
  redirect('/dashboard');
}
