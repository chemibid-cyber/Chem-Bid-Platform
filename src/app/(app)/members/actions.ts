'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { and, eq, inArray, count } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, catalogItems, auctions, bids } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/auth/session';
import { createServiceClient } from '@/lib/supabase/service';
import { recordAudit, AuditAction } from '@/lib/audit';
import { sendEmail } from '@/lib/email';
import { inviteEmail } from '@/lib/email/templates';

export type MemberFormState = { error?: string; success?: string } | null;

const addSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  designation: z.string().optional(),
  team: z.string().optional(),
  canBuy: z.string().optional(),
  canSell: z.string().optional(),
});

export async function addMemberAction(
  _prev: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  const { user, company } = await requireAdmin();
  const parsed = addSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: 'Please fill in name and a valid email.' };
  const data = parsed.data;

  const [dupe] = await db.select({ id: users.id }).from(users).where(eq(users.email, data.email)).limit(1);
  if (dupe) return { error: 'A user with that email already exists.' };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const svc = createServiceClient();
  const { data: linkData, error: linkErr } = await svc.auth.admin.generateLink({
    type: 'invite',
    email: data.email,
    options: {
      data: { first_name: data.firstName, last_name: data.lastName },
      redirectTo: `${appUrl}/auth/callback?next=/accept-invite`,
    },
  });
  if (linkErr || !linkData.user) {
    return { error: 'Could not create the invite. The email may already be in use.' };
  }

  try {
    await db.insert(users).values({
      id: linkData.user.id,
      companyId: company.id,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone ?? null,
      designation: data.designation ?? null,
      team: data.team ?? null,
      canBuy: data.canBuy === 'on',
      canSell: data.canSell === 'on',
      isAdmin: false,
      status: 'invited',
    });
  } catch {
    await svc.auth.admin.deleteUser(linkData.user.id).catch(() => {});
    return { error: 'Could not add the member. Please try again.' };
  }

  await recordAudit({
    actorUserId: user.id,
    entityType: 'user',
    entityId: linkData.user.id,
    action: AuditAction.UserInvited,
    snapshot: { email: data.email, canBuy: data.canBuy === 'on', canSell: data.canSell === 'on' },
  });

  if (linkData.properties?.action_link) {
    const tmpl = inviteEmail({
      companyName: company.legalName,
      inviterName: `${user.firstName} ${user.lastName}`,
      acceptUrl: linkData.properties.action_link,
    });
    await sendEmail({ to: data.email, subject: tmpl.subject, html: tmpl.html, text: tmpl.text });
  }

  revalidatePath('/members');
  return { success: `Invite sent to ${data.email}.` };
}

export async function setCapabilitiesAction(
  memberId: string,
  canBuy: boolean,
  canSell: boolean,
): Promise<MemberFormState> {
  const { user, company } = await requireAdmin();
  const [member] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, memberId), eq(users.companyId, company.id)))
    .limit(1);
  if (!member) return { error: 'Member not found.' };
  if (member.isAdmin) return { error: 'Admins always have both capabilities.' };

  await db.update(users).set({ canBuy, canSell }).where(eq(users.id, memberId));
  await recordAudit({
    actorUserId: user.id,
    entityType: 'user',
    entityId: memberId,
    action: 'user.capabilities_changed',
    snapshot: { canBuy, canSell },
  });
  revalidatePath('/members');
  return { success: 'Capabilities updated.' };
}

/** Reassign a member's catalog/auctions/bids to a target, then disable (FR-1.6). */
export async function confirmDisableAction(
  _prev: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  const { user, company } = await requireAdmin();
  const memberId = String(formData.get('memberId') ?? '');
  const targetId = String(formData.get('targetId') ?? '');

  if (memberId === user.id) return { error: 'You cannot disable yourself.' };

  const [member] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, memberId), eq(users.companyId, company.id)))
    .limit(1);
  if (!member) return { error: 'Member not found.' };

  // Don't disable the last active admin.
  if (member.isAdmin) {
    const [admins] = await db
      .select({ value: count() })
      .from(users)
      .where(and(eq(users.companyId, company.id), eq(users.isAdmin, true), eq(users.status, 'active')));
    if (Number(admins?.value ?? 0) <= 1) {
      return { error: 'This is the last active Admin. Promote another member first.' };
    }
  }

  const ownedItems = await db
    .select({ id: catalogItems.id })
    .from(catalogItems)
    .where(and(eq(catalogItems.companyId, company.id), eq(catalogItems.ownerUserId, memberId)));
  const liveAuctions = await db
    .select({ id: auctions.id })
    .from(auctions)
    .where(
      and(
        eq(auctions.buyerCompanyId, company.id),
        eq(auctions.buyerUserId, memberId),
        inArray(auctions.status, ['active', 'awaiting_decision']),
      ),
    );
  const activeBids = await db
    .select({ id: bids.id })
    .from(bids)
    .where(
      and(
        eq(bids.sellerCompanyId, company.id),
        eq(bids.sellerUserId, memberId),
        inArray(bids.status, ['active']),
      ),
    );

  const needsReassign = ownedItems.length + liveAuctions.length + activeBids.length > 0;

  if (needsReassign) {
    if (!targetId) return { error: 'Pick a colleague to reassign this member’s items to.' };
    const [target] = await db
      .select()
      .from(users)
      .where(
        and(eq(users.id, targetId), eq(users.companyId, company.id), eq(users.status, 'active')),
      )
      .limit(1);
    if (!target || target.id === memberId) return { error: 'Pick a valid active colleague.' };

    if (ownedItems.length > 0) {
      await db
        .update(catalogItems)
        .set({ ownerUserId: targetId })
        .where(and(eq(catalogItems.companyId, company.id), eq(catalogItems.ownerUserId, memberId)));
    }
    if (liveAuctions.length > 0) {
      await db
        .update(auctions)
        .set({ buyerUserId: targetId })
        .where(
          and(
            eq(auctions.buyerCompanyId, company.id),
            eq(auctions.buyerUserId, memberId),
            inArray(auctions.status, ['active', 'awaiting_decision']),
          ),
        );
    }
    if (activeBids.length > 0) {
      await db
        .update(bids)
        .set({ sellerUserId: targetId })
        .where(
          and(
            eq(bids.sellerCompanyId, company.id),
            eq(bids.sellerUserId, memberId),
            eq(bids.status, 'active'),
          ),
        );
    }
    await recordAudit({
      actorUserId: user.id,
      entityType: 'user',
      entityId: memberId,
      action: AuditAction.UserReassigned,
      snapshot: {
        targetId,
        items: ownedItems.length,
        auctions: liveAuctions.length,
        bids: activeBids.length,
      },
    });
  }

  await db.update(users).set({ status: 'disabled' }).where(eq(users.id, memberId));
  await recordAudit({
    actorUserId: user.id,
    entityType: 'user',
    entityId: memberId,
    action: AuditAction.UserDisabled,
  });

  revalidatePath('/members');
  redirect('/members');
}
