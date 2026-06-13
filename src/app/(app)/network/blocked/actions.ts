'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { blocks } from '@/lib/db/schema';
import { requireUser } from '@/lib/auth/session';
import { recordAudit, AuditAction } from '@/lib/audit';

export type UnblockResult = { error?: string } | undefined;

/**
 * Remove a block this company created. Authz: the block's blockerCompanyId MUST
 * equal the current company — a company can only lift its own blocks.
 */
export async function unblockAction(blockId: string): Promise<UnblockResult> {
  const { user, company } = await requireUser();

  const [block] = await db
    .select({
      id: blocks.id,
      blockerCompanyId: blocks.blockerCompanyId,
      blockedCompanyId: blocks.blockedCompanyId,
      scope: blocks.scope,
      casNumber: blocks.casNumber,
    })
    .from(blocks)
    .where(eq(blocks.id, blockId))
    .limit(1);

  if (!block) return { error: 'That block no longer exists.' };
  if (block.blockerCompanyId !== company.id) {
    return { error: 'You can only remove blocks your company created.' };
  }

  await db.delete(blocks).where(and(eq(blocks.id, blockId), eq(blocks.blockerCompanyId, company.id)));

  await recordAudit({
    actorUserId: user.id,
    entityType: 'block',
    entityId: block.id,
    action: AuditAction.Unblocked,
    snapshot: {
      blockedCompanyId: block.blockedCompanyId,
      scope: block.scope,
      casNumber: block.casNumber,
    },
  });

  revalidatePath('/network/blocked');
  return undefined;
}
