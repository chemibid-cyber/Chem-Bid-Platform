'use server';

import { and, eq, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { requireUser } from '@/lib/auth/session';

export async function markAllReadAction(): Promise<void> {
  const { user } = await requireUser();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
  revalidatePath('/notifications');
  revalidatePath('/', 'layout');
}

export async function markReadAction(id: string): Promise<void> {
  const { user } = await requireUser();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, user.id)));
  revalidatePath('/notifications');
  revalidatePath('/', 'layout');
}
