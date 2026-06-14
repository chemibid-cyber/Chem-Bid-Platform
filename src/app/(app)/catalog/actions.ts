'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { catalogItems, users, auctions, bids, notifications } from '@/lib/db/schema';
import { requireUser } from '@/lib/auth/session';
import { canAccessOwned } from '@/lib/auth/scope';
import { getActiveMode } from '@/lib/auth/mode';
import { resolveCas } from '@/lib/cas/resolver';
import { isValidCasFormat, type CasResolution } from '@/lib/cas/parse';
import { recordAudit, AuditAction } from '@/lib/audit';
import { retroMatchSalesItem } from '@/lib/targeting/run';
import { ROLES } from '@/lib/catalog/constants';
import { round2 } from '@/lib/pricing';

/** Round an optional purity-% string to 2dp; '' / undefined → null. (#27) */
function round2Purity(raw: string | undefined): string | null {
  if (!raw || raw.trim() === '') return null;
  return String(round2(Number(raw)));
}

const GRADE_VALUES = ['pure', 'distilled', 'trade'] as const;
const ROLE_VALUES: readonly string[] = ROLES.map((r) => r.value);

export interface Collision {
  itemId: string;
  ownerName: string;
  designation: string;
  team: string;
  email: string;
}

export type CatalogFormState = {
  error?: string;
  success?: string;
  collision?: Collision;
} | null;

/** Client-callable CAS lookup (authed). */
export async function resolveCasAction(cas: string): Promise<CasResolution> {
  await requireUser();
  return resolveCas(cas);
}

const itemSchema = z.object({
  casNumber: z.string().optional(),
  name: z.string().min(1, 'Name is required.'),
  isMixture: z.string().optional(),
  mixtureText: z.string().optional(),
  nameVerified: z.string().optional(),
  grade: z.enum(GRADE_VALUES),
  minPurity: z.string().optional(),
});

function profileForMode(mode: 'buy' | 'sell'): 'sales' | 'purchase' {
  return mode === 'sell' ? 'sales' : 'purchase';
}

export async function createCatalogItemAction(
  _prev: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  const { user, company } = await requireUser();
  const mode = getActiveMode(user);
  const profileType = profileForMode(mode);

  const parsed = itemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Please check the form.' };
  }
  const data = parsed.data;
  const isMixture = data.isMixture === 'on';
  const roles = formData.getAll('roles').map(String).filter((r) => ROLE_VALUES.includes(r));
  const casNumber = isMixture ? null : (data.casNumber ?? '').trim();

  if (roles.length === 0) return { error: 'Pick at least one role (Manufacturer/Distributor/Trader).' };

  if (!isMixture) {
    if (!casNumber) return { error: 'Enter a CAS number, or switch on "Custom mixture (N/A)".' };
    if (!isValidCasFormat(casNumber)) {
      return { error: 'That CAS number is not valid. Check the format (e.g. 108-88-3).' };
    }

    // Cross-user uniqueness: one CAS per company per profile (FR-2.5).
    const [existing] = await db
      .select({
        id: catalogItems.id,
        ownerUserId: catalogItems.ownerUserId,
        firstName: users.firstName,
        lastName: users.lastName,
        designation: users.designation,
        team: users.team,
        email: users.email,
      })
      .from(catalogItems)
      .innerJoin(users, eq(catalogItems.ownerUserId, users.id))
      .where(
        and(
          eq(catalogItems.companyId, user.companyId),
          eq(catalogItems.casNumber, casNumber),
          eq(catalogItems.profileType, profileType),
        ),
      )
      .limit(1);

    if (existing) {
      if (existing.ownerUserId === user.id) {
        return { error: `You already manage ${data.name} in your ${profileType} catalog.` };
      }
      return {
        collision: {
          itemId: existing.id,
          ownerName: `${existing.firstName} ${existing.lastName}`,
          designation: existing.designation ?? '—',
          team: existing.team ?? '—',
          email: existing.email,
        },
      };
    }
  }

  const minPurity = round2Purity(data.minPurity); // #27 — 2dp

  const [created] = await db
    .insert(catalogItems)
    .values({
      companyId: user.companyId,
      ownerUserId: user.id,
      profileType,
      casNumber,
      name: data.name.trim(),
      nameVerified: data.nameVerified === 'true',
      isMixture,
      mixtureText: isMixture ? (data.mixtureText ?? data.name).trim() : null,
      roles,
      grade: data.grade,
      minPurity,
    })
    .returning();

  let matched = 0;
  if (created) {
    await recordAudit({
      actorUserId: user.id,
      entityType: 'catalog_item',
      entityId: created.id,
      action: AuditAction.CatalogItemCreated,
      snapshot: { casNumber, name: created.name, profileType, roles, grade: created.grade },
    });

    // A new SALES item also qualifies the seller for auctions already live —
    // pull those requests into their inbox right now (FR gap fix).
    if (profileType === 'sales') {
      const res = await retroMatchSalesItem({
        itemId: created.id,
        companyId: company.id,
        companyGstin: company.gstin,
        companySuspended: company.suspended,
        ownerUserId: user.id,
        ownerEmail: user.email,
        casNumber: created.casNumber,
        name: created.name,
        isMixture: created.isMixture,
        mixtureText: created.mixtureText,
        grade: created.grade,
        roles: created.roles,
      });
      matched = res.matched;
    }
  }

  revalidatePath('/catalog');
  redirect(matched > 0 ? `/catalog?matched=${matched}` : '/catalog');
}

export async function requestTransferAction(itemId: string): Promise<CatalogFormState> {
  const { user, company } = await requireUser();

  const [item] = await db
    .select()
    .from(catalogItems)
    .where(and(eq(catalogItems.id, itemId), eq(catalogItems.companyId, user.companyId)))
    .limit(1);
  if (!item) return { error: 'That catalog item no longer exists.' };

  // Notify the current owner + all admins of the company.
  const admins = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.companyId, company.id), eq(users.isAdmin, true)));

  const recipientIds = new Set<string>([item.ownerUserId, ...admins.map((a) => a.id)]);
  recipientIds.delete(user.id);

  if (recipientIds.size > 0) {
    await db.insert(notifications).values(
      [...recipientIds].map((uid) => ({
        userId: uid,
        type: 'catalog.transfer_requested',
        payload: {
          itemId: item.id,
          name: item.name,
          casNumber: item.casNumber,
          requestedBy: `${user.firstName} ${user.lastName}`,
          requestedByUserId: user.id,
        },
      })),
    );
  }

  await recordAudit({
    actorUserId: user.id,
    entityType: 'catalog_item',
    entityId: item.id,
    action: AuditAction.CatalogTransferRequested,
    snapshot: { name: item.name, currentOwner: item.ownerUserId },
  });

  return { success: 'Transfer requested. The current owner and your Admin have been notified.' };
}

const updateSchema = z.object({
  id: z.string().uuid(),
  grade: z.enum(GRADE_VALUES),
  minPurity: z.string().optional(),
  mixtureText: z.string().optional(),
});

export async function updateCatalogItemAction(
  _prev: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  const { user } = await requireUser();
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: 'Please check the form.' };

  const [item] = await db
    .select()
    .from(catalogItems)
    .where(and(eq(catalogItems.id, parsed.data.id), eq(catalogItems.companyId, user.companyId)))
    .limit(1);
  if (!item) return { error: 'Item not found.' };
  if (item.ownerUserId !== user.id && !user.isAdmin) {
    return { error: 'Only the owner or an Admin can edit this item.' };
  }

  const roles = formData.getAll('roles').map(String).filter((r) => ROLE_VALUES.includes(r));
  const minPurity = round2Purity(parsed.data.minPurity); // #27 — 2dp

  await db
    .update(catalogItems)
    .set({
      grade: parsed.data.grade,
      minPurity,
      mixtureText: item.isMixture ? (parsed.data.mixtureText ?? item.mixtureText) : item.mixtureText,
      roles: roles.length > 0 ? roles : item.roles,
    })
    .where(eq(catalogItems.id, item.id));

  await recordAudit({
    actorUserId: user.id,
    entityType: 'catalog_item',
    entityId: item.id,
    action: AuditAction.CatalogItemUpdated,
  });

  revalidatePath('/catalog');
  redirect('/catalog');
}

/** Delist — BLOCKED if the item backs a live auction or an active bid (FR-2.6). */
export async function delistCatalogItemAction(itemId: string): Promise<CatalogFormState> {
  const { user } = await requireUser();

  const [item] = await db
    .select()
    .from(catalogItems)
    .where(and(eq(catalogItems.id, itemId), eq(catalogItems.companyId, user.companyId)))
    .limit(1);
  if (!item) return { error: 'Item not found.' };
  if (!canAccessOwned(item.ownerUserId, user)) return { error: 'Item not found.' };

  if (item.casNumber) {
    // Live buyer auctions for this CAS by this company.
    const liveAuctions = await db
      .select({ id: auctions.id })
      .from(auctions)
      .where(
        and(
          eq(auctions.buyerCompanyId, user.companyId),
          eq(auctions.casNumber, item.casNumber),
          inArray(auctions.status, ['active', 'awaiting_decision']),
        ),
      )
      .limit(1);

    // Active seller bids on auctions for this CAS.
    const activeBids = await db
      .select({ id: bids.id })
      .from(bids)
      .innerJoin(auctions, eq(bids.auctionId, auctions.id))
      .where(
        and(
          eq(bids.sellerCompanyId, user.companyId),
          eq(auctions.casNumber, item.casNumber),
          eq(bids.status, 'active'),
        ),
      )
      .limit(1);

    if (liveAuctions.length > 0 || activeBids.length > 0) {
      return {
        error:
          'This product backs a live auction or an active bid. Close or withdraw it before delisting.',
      };
    }
  }

  await db.update(catalogItems).set({ delisted: true }).where(eq(catalogItems.id, item.id));
  await recordAudit({
    actorUserId: user.id,
    entityType: 'catalog_item',
    entityId: item.id,
    action: AuditAction.CatalogItemDelisted,
  });

  revalidatePath('/catalog');
  return { success: 'Item delisted.' };
}
