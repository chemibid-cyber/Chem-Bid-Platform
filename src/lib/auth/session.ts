import { cache } from 'react';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import type { User as AuthUser } from '@supabase/supabase-js';
import { db } from '@/lib/db';
import { users, companies, operators, type User, type Company, type Operator } from '@/lib/db/schema';
import { createClient } from '@/lib/supabase/server';

export interface CurrentUser {
  user: User;
  company: Company;
}

/** The Supabase auth identity for this request (cached per render). */
export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
});

/** The app profile + company for the signed-in user, or null. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const authUser = await getAuthUser();
  if (!authUser) return null;

  const [user] = await db.select().from(users).where(eq(users.id, authUser.id)).limit(1);
  if (!user) return null;

  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, user.companyId))
    .limit(1);
  if (!company) return null;

  return { user, company };
});

/** Gate a route to a signed-in, non-blocked user. Redirects otherwise. */
export async function requireUser(): Promise<CurrentUser> {
  const current = await getCurrentUser();
  if (!current) redirect('/login');
  if (current.user.status === 'disabled') redirect('/blocked?reason=disabled');
  if (current.company.suspended) redirect('/blocked?reason=suspended');
  return current;
}

/** Require a specific capability (admins always pass). */
export async function requireCapability(cap: 'buy' | 'sell'): Promise<CurrentUser> {
  const current = await requireUser();
  const ok = cap === 'buy' ? current.user.canBuy : current.user.canSell;
  if (!ok && !current.user.isAdmin) redirect('/dashboard?error=no_capability');
  return current;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const current = await requireUser();
  if (!current.user.isAdmin) redirect('/dashboard?error=admin_only');
  return current;
}

/** Platform operators are NOT company members — separate table. */
export const getOperator = cache(async (): Promise<Operator | null> => {
  const authUser = await getAuthUser();
  if (!authUser) return null;
  const [op] = await db
    .select()
    .from(operators)
    .where(eq(operators.authUserId, authUser.id))
    .limit(1);
  return op ?? null;
});

export async function requireOperator(): Promise<Operator> {
  const op = await getOperator();
  if (!op) redirect('/login?error=operator_only');
  return op;
}
