'use server';

import { and, eq, isNull, gt, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { requireUser } from '@/lib/auth/session';

export interface PolledNotification {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

/**
 * Return the current user's UNREAD notifications created after `sinceIso`.
 * Cheap, index-backed (notifications_user_idx) lookup used by the client-side
 * toast poller. Defensive against a bad/empty `sinceIso` (falls back to now).
 */
export async function pollNewNotifications(sinceIso: string): Promise<PolledNotification[]> {
  const { user } = await requireUser();

  const sinceDate = new Date(sinceIso);
  const since = Number.isNaN(sinceDate.getTime()) ? new Date() : sinceDate;

  const rows = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      payload: notifications.payload,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, user.id),
        isNull(notifications.readAt),
        gt(notifications.createdAt, since),
      ),
    )
    .orderBy(desc(notifications.createdAt))
    .limit(10);

  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    payload: (r.payload ?? {}) as Record<string, unknown>,
    createdAt: r.createdAt.toISOString(),
  }));
}
