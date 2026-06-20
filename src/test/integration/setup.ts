import { vi } from 'vitest';

/**
 * Integration-test setup. Runs before any integration test file.
 *
 * Points the app's lazy Drizzle client at a THROWAWAY Postgres (TEST_DATABASE_URL)
 * and mocks the Next.js request runtime + side-effecting infra so server actions
 * can be invoked directly and asserted against real SQL.
 */
const TEST_URL = process.env.TEST_DATABASE_URL;
if (!TEST_URL) {
  throw new Error(
    'Integration tests require TEST_DATABASE_URL (a disposable Postgres — never your prod DB).',
  );
}
// Hard refuse to run against a hosted Supabase URL — these tests TRUNCATE everything.
if (/supabase\.(co|com)|pooler\.supabase/i.test(TEST_URL)) {
  throw new Error(
    'TEST_DATABASE_URL points at hosted Supabase — refusing. Use a local/CI Postgres.',
  );
}
process.env.DATABASE_URL = TEST_URL;

function requireActor() {
  const actor = (globalThis as Record<string, unknown>).__ACTOR__;
  if (!actor) throw new Error('No test actor set — call actAs(actor) before invoking an action.');
  return actor;
}

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw Object.assign(new Error('NEXT_REDIRECT'), { __redirectTo: url });
  },
  notFound: () => {
    throw Object.assign(new Error('NEXT_NOT_FOUND'), { __notFound: true });
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
}));

// sendEmail is the only runtime export of @/lib/email; stub it so no mail is sent.
vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(async () => ({ ok: true, id: 'test' })),
}));

// The auth boundary — return whichever actor the test set via actAs().
vi.mock('@/lib/auth/session', () => ({
  requireUser: async () => requireActor(),
  requireCapability: async () => requireActor(),
  requireAdmin: async () => requireActor(),
  getCurrentUser: async () => (globalThis as Record<string, unknown>).__ACTOR__ ?? null,
  getAuthUser: async () => {
    const a = (globalThis as Record<string, unknown>).__ACTOR__ as { user?: { id: string } } | undefined;
    return a?.user ? { id: a.user.id } : null;
  },
}));
