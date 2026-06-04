import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * Lazy, HMR-safe Drizzle client.
 *
 * The client is created on first query (not at import time) so `next build`
 * never crashes when DATABASE_URL is absent at build. `prepare: false` keeps it
 * compatible with the Supabase transaction pooler (pgBouncer).
 */
declare global {
  // eslint-disable-next-line no-var
  var __pgClient: ReturnType<typeof postgres> | undefined;
}

let _db: PostgresJsDatabase<typeof schema> | undefined;

function getDb(): PostgresJsDatabase<typeof schema> {
  if (_db) return _db;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.',
    );
  }
  const client = global.__pgClient ?? postgres(connectionString, { prepare: false });
  if (process.env.NODE_ENV !== 'production') global.__pgClient = client;
  _db = drizzle(client, { schema });
  return _db;
}

/** Proxy so `import { db }` stays ergonomic while initialization stays lazy. */
export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, prop) {
    const instance = getDb();
    const value = instance[prop as keyof typeof instance];
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

export { schema };
