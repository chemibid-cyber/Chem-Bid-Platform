'use server';

import { cookies } from 'next/headers';
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
}
