'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { and, eq, inArray, count } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, catalogItems, auctions, bids, notifications } from '@/lib/db/schema';
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

  // #34: a member must have at least one capability. Mirrors the client guard in
  // add-member-form; enforced here so the invite can't be created capability-less.
  const wantsBuy = data.canBuy === 'on';
  const wantsSell = data.canSell === 'on';
  if (!wantsBuy && !wantsSell) {
    return { error: 'Select at least one capability: Buy or Sell.' };
  }

  const [dupe] = await db.select({ id: users.id }).from(users).where(eq(users.email, data.email)).limit(1);
  if (dupe) return { error: 'A user with that email already exists.' };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const svc = createServiceClient();
  const { data: linkData, error: linkErr } = await svc.auth.admin.generateLink({
    type: 'invite',
    email: data.email,
    options: {
      data: { first_name: data.firstName, last_name: data.lastName },
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
      canBuy: wantsBuy,
      canSell: wantsSell,
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
    snapshot: { email: data.email, canBuy: wantsBuy, canSell: wantsSell },
  });

  // Email a link to OUR OWN /accept-invite page carrying the one-time
  // `hashed_token` — NOT Supabase's /auth/v1/verify action_link. The token is only
  // consumed when the invited user submits the form (see acceptInviteAction), so
  // inbox link-scanners (Gmail/Outlook) that pre-fetch the URL can't burn it first.
  // This mirrors the password-reset flow in (auth)/actions.ts requestResetAction.
  if (linkData.properties?.hashed_token) {
    const acceptUrl = `${appUrl}/accept-invite?token_hash=${encodeURIComponent(
      linkData.properties.hashed_token,
    )}&type=invite`;
    const tmpl = inviteEmail({
      companyName: company.legalName,
      inviterName: `${user.firstName} ${user.lastName}`,
      acceptUrl,
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

/**
 * (Re)generate a fresh Supabase `invite` link for an invited member and email
 * them our own /accept-invite URL carrying the one-time hashed token. Shared by
 * resendInviteAction and editInvitedMemberAction (after an email change).
 * Mirrors addMemberAction's email block. Returns an error string on failure.
 */
async function sendInviteLink(opts: {
  email: string;
  firstName: string;
  lastName: string;
  companyName: string;
  inviterName: string;
}): Promise<string | null> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const svc = createServiceClient();
  const { data: linkData, error: linkErr } = await svc.auth.admin.generateLink({
    type: 'invite',
    email: opts.email,
    options: { data: { first_name: opts.firstName, last_name: opts.lastName } },
  });
  if (linkErr || !linkData.properties?.hashed_token) {
    return 'Could not generate a fresh invite link. Please try again.';
  }
  const acceptUrl = `${appUrl}/accept-invite?token_hash=${encodeURIComponent(
    linkData.properties.hashed_token,
  )}&type=invite`;
  const tmpl = inviteEmail({
    companyName: opts.companyName,
    inviterName: opts.inviterName,
    acceptUrl,
  });
  await sendEmail({ to: opts.email, subject: tmpl.subject, html: tmpl.html, text: tmpl.text });
  return null;
}

/** #30: flip a disabled member back to active. Admin + same-company only. */
export async function reEnableMemberAction(memberId: string): Promise<MemberFormState> {
  const { user, company } = await requireAdmin();

  const [member] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, memberId), eq(users.companyId, company.id)))
    .limit(1);
  if (!member) return { error: 'Member not found.' };
  if (member.status !== 'disabled') return { error: 'Only a disabled member can be re-enabled.' };

  await db.update(users).set({ status: 'active' }).where(eq(users.id, memberId));
  await recordAudit({
    actorUserId: user.id,
    entityType: 'user',
    entityId: memberId,
    action: 'user.reenabled',
  });
  revalidatePath('/members');
  return { success: 'Member re-enabled.' };
}

/**
 * #30: HARD-delete a member — only when SAFE, i.e. they are referenced nowhere
 * that would break an FK or erase audit history. Safe = owns no catalog_items,
 * has no auctions (buyerUserId) and no bids (sellerUserId) of ANY status. We use
 * any-status (not just live) because deleting the users row would dangle those
 * FKs and orphan the historical record. If anything exists, we refuse and direct
 * the admin to Disable (which reassigns) instead — keeping the append-only trail
 * and all FK references intact. The audit_log.actorUserId for THIS member's past
 * actions is left untouched (audit is append-only and not FK-cascaded here).
 */
export async function deleteMemberAction(memberId: string): Promise<MemberFormState> {
  const { user, company } = await requireAdmin();

  if (memberId === user.id) return { error: 'You cannot delete yourself.' };

  const [member] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, memberId), eq(users.companyId, company.id)))
    .limit(1);
  if (!member) return { error: 'Member not found.' };

  // Never delete the last active admin (mirrors the disable guard).
  if (member.isAdmin) {
    const [admins] = await db
      .select({ value: count() })
      .from(users)
      .where(and(eq(users.companyId, company.id), eq(users.isAdmin, true), eq(users.status, 'active')));
    if (Number(admins?.value ?? 0) <= 1) {
      return { error: 'This is the last active Admin. Promote another member first.' };
    }
  }

  // Referential safety: ANY catalog item / auction / bid blocks a hard delete.
  const ownedItems = await db
    .select({ id: catalogItems.id })
    .from(catalogItems)
    .where(and(eq(catalogItems.companyId, company.id), eq(catalogItems.ownerUserId, memberId)));
  const ownedAuctions = await db
    .select({ id: auctions.id })
    .from(auctions)
    .where(and(eq(auctions.buyerCompanyId, company.id), eq(auctions.buyerUserId, memberId)));
  const ownedBids = await db
    .select({ id: bids.id })
    .from(bids)
    .where(and(eq(bids.sellerCompanyId, company.id), eq(bids.sellerUserId, memberId)));

  const disableInstead =
    'This member has activity on the platform and cannot be deleted. Disable them instead (their records will be reassigned).';

  if (ownedItems.length + ownedAuctions.length + ownedBids.length > 0) {
    return { error: disableInstead };
  }

  // Notifications are the member's transient inbox — no audit value and the only
  // users.id FK a never-accepted invite is likely to hold. Clear them so a clean
  // member can be deleted. (The append-only audit_log has NO FK to users, so the
  // member's historical audit entries survive the delete untouched.)
  await db.delete(notifications).where(eq(notifications.userId, memberId));

  // Attempt the hard delete. Any OTHER residual users.id FK (service rows,
  // disputes, proactive shares) is a NO ACTION constraint and will throw — we
  // map that to the same "disable instead" guidance rather than a 500.
  try {
    await db.delete(users).where(and(eq(users.id, memberId), eq(users.companyId, company.id)));
  } catch {
    return { error: disableInstead };
  }

  // App row is gone; now remove the Supabase auth identity (best-effort).
  const svc = createServiceClient();
  await svc.auth.admin.deleteUser(memberId).catch(() => {});

  await recordAudit({
    actorUserId: user.id,
    entityType: 'user',
    entityId: memberId,
    action: 'user.deleted',
    snapshot: { email: member.email, status: member.status },
  });
  revalidatePath('/members');
  return { success: `${member.firstName} ${member.lastName} was deleted.` };
}

/** #32: resend a fresh invite to a still-pending (status='invited') member. */
export async function resendInviteAction(memberId: string): Promise<MemberFormState> {
  const { user, company } = await requireAdmin();

  const [member] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, memberId), eq(users.companyId, company.id)))
    .limit(1);
  if (!member) return { error: 'Member not found.' };
  if (member.status !== 'invited') return { error: 'This member has already accepted their invite.' };

  const err = await sendInviteLink({
    email: member.email,
    firstName: member.firstName,
    lastName: member.lastName,
    companyName: company.legalName,
    inviterName: `${user.firstName} ${user.lastName}`,
  });
  if (err) return { error: err };

  await recordAudit({
    actorUserId: user.id,
    entityType: 'user',
    entityId: memberId,
    action: 'user.invite_resent',
    snapshot: { email: member.email },
  });
  revalidatePath('/members');
  return { success: `Invite re-sent to ${member.email}.` };
}

const editInviteSchema = z.object({
  memberId: z.string().uuid(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  designation: z.string().optional(),
});

/**
 * #32: edit a PENDING invite's profile fields + email. Changing the email also
 * updates the Supabase auth user and the unique users.email column, then re-sends
 * the invite (the old token was bound to the old email and is now stale).
 * Gated to status='invited' only; admin + same-company.
 */
export async function editInvitedMemberAction(
  _prev: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  const { user, company } = await requireAdmin();
  const parsed = editInviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: 'Please provide a name and a valid email.' };
  const data = parsed.data;

  const [member] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, data.memberId), eq(users.companyId, company.id)))
    .limit(1);
  if (!member) return { error: 'Member not found.' };
  if (member.status !== 'invited') return { error: 'Only pending invites can be edited here.' };

  const emailChanged = data.email.toLowerCase() !== member.email.toLowerCase();

  // If the email changed, make sure it's not taken by anyone else first.
  if (emailChanged) {
    const [dupe] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);
    if (dupe) return { error: 'A user with that email already exists.' };

    const svc = createServiceClient();
    const { error: updErr } = await svc.auth.admin.updateUserById(member.id, { email: data.email });
    if (updErr) return { error: 'Could not update the email on the auth account. Try again.' };
  }

  await db
    .update(users)
    .set({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone ?? null,
      designation: data.designation ?? null,
    })
    .where(eq(users.id, member.id));

  await recordAudit({
    actorUserId: user.id,
    entityType: 'user',
    entityId: member.id,
    action: 'user.invite_edited',
    snapshot: {
      firstName: data.firstName,
      lastName: data.lastName,
      emailChanged,
      ...(emailChanged ? { oldEmail: member.email, newEmail: data.email } : {}),
    },
  });

  // A changed email invalidates the prior invite token → issue a fresh one.
  if (emailChanged) {
    const err = await sendInviteLink({
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      companyName: company.legalName,
      inviterName: `${user.firstName} ${user.lastName}`,
    });
    if (err) return { error: err };
    await recordAudit({
      actorUserId: user.id,
      entityType: 'user',
      entityId: member.id,
      action: 'user.invite_resent',
      snapshot: { email: data.email, reason: 'email_changed' },
    });
  }

  revalidatePath('/members');
  redirect('/members');
}
