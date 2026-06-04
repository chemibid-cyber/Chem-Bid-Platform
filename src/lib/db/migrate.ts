/**
 * Standalone migration runner: `npm run db:migrate`.
 * Applies the SQL in ./drizzle against DATABASE_URL.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import 'dotenv/config';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set — cannot migrate.');

  const client = postgres(url, { max: 1 });
  try {
    console.log('Applying migrations from ./drizzle …');
    await migrate(drizzle(client), { migrationsFolder: './drizzle' });
    console.log('Migrations applied.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
