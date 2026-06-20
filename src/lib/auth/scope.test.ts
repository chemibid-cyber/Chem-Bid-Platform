import { describe, it, expect } from 'vitest';
import { SQL, is } from 'drizzle-orm';
import { pgTable, uuid } from 'drizzle-orm/pg-core';
import { ownerScope, canAccessOwned } from './scope';

/**
 * Member-level data isolation (#40/#41/#42) — the guarantee the whole
 * within-company authz layer rests on. A throwaway column stands in for any
 * real owner column (auctions.buyerUserId, bids.sellerUserId, …).
 */
const fixture = pgTable('fixture', { ownerId: uuid('owner_id') });

const admin = { id: 'admin-1', isAdmin: true };
const member = { id: 'member-1', isAdmin: false };

describe('ownerScope — member-level list filter', () => {
  it('admins get no filter (undefined) → unrestricted company-wide view', () => {
    // undefined drops out of and(...), so admins are never restricted.
    expect(ownerScope(fixture.ownerId, admin)).toBeUndefined();
  });

  it('non-admin members get an eq() SQL condition on the owner column', () => {
    const filter = ownerScope(fixture.ownerId, member);
    expect(filter).toBeDefined();
    expect(is(filter, SQL)).toBe(true); // a real drizzle predicate, scopes the query to own rows
  });
});

describe('canAccessOwned — detail/action gate', () => {
  it('an admin may access any row in the company', () => {
    expect(canAccessOwned('a-colleague', admin)).toBe(true);
  });

  it('a member may access only its own row', () => {
    expect(canAccessOwned('member-1', member)).toBe(true);
    expect(canAccessOwned('member-2', member)).toBe(false);
  });

  it('a null/undefined owner is denied for members (never a silent allow), allowed for admins', () => {
    // This is the safety property: an unowned/ownerless row must not leak to a member.
    expect(canAccessOwned(null, member)).toBe(false);
    expect(canAccessOwned(undefined, member)).toBe(false);
    expect(canAccessOwned(null, admin)).toBe(true);
  });
});
