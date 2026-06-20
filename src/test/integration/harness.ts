import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { companies, users, auctions, bids, catalogItems, blocks } from '@/lib/db/schema';
import type { Company, User } from '@/lib/db/schema';

export { db };

export type Actor = { user: User; company: Company };

/** Set the actor that the mocked requireUser()/getCurrentUser() will return. */
export function actAs(actor: Actor): void {
  (globalThis as Record<string, unknown>).__ACTOR__ = actor;
}
export function actAsNobody(): void {
  (globalThis as Record<string, unknown>).__ACTOR__ = undefined;
}

let seq = 0;
const uniq = () => `${Date.now().toString(36)}${(seq++).toString(36)}${randomUUID().slice(0, 6)}`;

/**
 * Invoke a server action, translating a Next redirect()/notFound() (which throw)
 * into a returned result so success paths are assertable.
 */
export async function callAction<T>(
  p: Promise<T>,
): Promise<T | { redirectedTo: string } | { notFound: true }> {
  try {
    return await p;
  } catch (e) {
    const err = e as { __redirectTo?: string; __notFound?: boolean };
    if (err?.__redirectTo) return { redirectedTo: err.__redirectTo };
    if (err?.__notFound) return { notFound: true };
    throw e;
  }
}

/** Truncate every public table — call in beforeEach for isolation. */
export async function resetDb(): Promise<void> {
  const rows = (await db.execute(
    sql`select tablename from pg_tables where schemaname = 'public'`,
  )) as unknown as Array<{ tablename: string }>;
  const names = rows.map((r) => `"${r.tablename}"`).join(', ');
  if (names) await db.execute(sql.raw(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`));
}

export async function seedCompany(
  over: Partial<typeof companies.$inferInsert> = {},
): Promise<Company> {
  const [c] = await db
    .insert(companies)
    .values({
      gstin: `GST${uniq()}`.slice(0, 15),
      pan: `PAN${uniq()}`.slice(0, 10),
      legalName: 'Test Co Pvt Ltd',
      registeredAddress: 'Plot 1, Test Industrial Estate',
      verificationStatus: 'verified',
      ...over,
    })
    .returning();
  return c!;
}

export async function seedUser(
  companyId: string,
  over: Partial<typeof users.$inferInsert> = {},
): Promise<User> {
  const [u] = await db
    .insert(users)
    .values({
      id: randomUUID(),
      companyId,
      firstName: 'Test',
      lastName: 'User',
      email: `u${uniq()}@test.local`,
      canBuy: true,
      canSell: true,
      isAdmin: false,
      status: 'active',
      ...over,
    })
    .returning();
  return u!;
}

/** A company + a member of it. Pass an existing company to add a colleague. */
export async function seedActor(
  opts: { company?: Company; isAdmin?: boolean } = {},
): Promise<Actor> {
  const company = opts.company ?? (await seedCompany());
  const user = await seedUser(company.id, { isAdmin: opts.isAdmin ?? false });
  return { user, company };
}

export async function seedAuction(
  over: Partial<typeof auctions.$inferInsert> & { buyerCompanyId: string; buyerUserId: string },
): Promise<typeof auctions.$inferSelect> {
  const [a] = await db
    .insert(auctions)
    .values({
      casNumber: '67-64-1',
      name: 'Acetone',
      quantity: '1000',
      unit: 'kg',
      minPurity: '99',
      packing: 'drums',
      deliveryAddress: 'Plot 1, Test Industrial Estate',
      logisticsBasis: 'delivered',
      privacyMode: 'all',
      blind: true,
      status: 'active',
      stage: 'stage1',
      closesAt: new Date(Date.now() + 24 * 3600 * 1000),
      ...over,
    })
    .returning();
  return a!;
}

/** A sales-catalog item — what runTargeting() matches sellers on. */
export async function seedSalesCatalog(
  over: Partial<typeof catalogItems.$inferInsert> & { companyId: string; ownerUserId: string },
): Promise<typeof catalogItems.$inferSelect> {
  const [item] = await db
    .insert(catalogItems)
    .values({
      profileType: 'sales',
      casNumber: '67-64-1',
      name: 'Acetone',
      isMixture: false,
      roles: ['mfr'],
      grade: 'trade',
      minPurity: '99',
      delisted: false,
      ...over,
    })
    .returning();
  return item!;
}

/** A block (buyer mutes a seller, or vice-versa) for a CAS or all. */
export async function seedBlock(over: {
  blockerCompanyId: string;
  blockedCompanyId: string;
  casNumber?: string | null;
  scope?: 'this_cas' | 'all';
}): Promise<void> {
  await db.insert(blocks).values({
    blockerCompanyId: over.blockerCompanyId,
    blockedCompanyId: over.blockedCompanyId,
    casNumber: over.casNumber ?? '67-64-1',
    scope: over.scope ?? 'this_cas',
  });
}

/** A targeted/placeholder bid row (gateState='notified', no pricing). */
export async function seedBid(
  over: Partial<typeof bids.$inferInsert> & {
    auctionId: string;
    sellerCompanyId: string;
    sellerUserId: string;
  },
): Promise<typeof bids.$inferSelect> {
  const [b] = await db.insert(bids).values({ ...over }).returning();
  return b!;
}
