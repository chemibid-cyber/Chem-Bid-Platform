import { eq, type SQL, type Column } from 'drizzle-orm';

/**
 * Member-level visibility scope (#40/#41/#42).
 *
 * The platform is COMPANY-isolated at the security boundary (RLS + every query
 * filters by company id). WITHIN a company we additionally restrict each member
 * to the rows THEY created/own — EXCEPT admins, who see everything company-wide.
 *
 * Returns a Drizzle filter on the owner column for non-admins, or `undefined`
 * for admins. Always combine with the existing company filter:
 *
 *   .where(and(eq(t.buyerCompanyId, company.id), ownerScope(t.buyerUserId, user)))
 *
 * `and(...)` ignores `undefined`, so admins get the unrestricted company view.
 * Owner columns: auctions.buyerUserId, bids.sellerUserId, catalogItems.ownerUserId,
 * serviceRequests.neederUserId.
 */
export function ownerScope(
  column: Column,
  user: { id: string; isAdmin: boolean },
): SQL | undefined {
  return user.isAdmin ? undefined : eq(column, user.id);
}

/**
 * Detail-page authorization: true if the user may view/act on a row owned by
 * `ownerUserId` within their own company. Admins always pass; members only pass
 * for their own rows. Use to gate a single record (notFound otherwise):
 *
 *   if (!canAccessOwned(bid.sellerUserId, user)) notFound();
 */
export function canAccessOwned(
  ownerUserId: string | null | undefined,
  user: { id: string; isAdmin: boolean },
): boolean {
  return user.isAdmin || ownerUserId === user.id;
}
