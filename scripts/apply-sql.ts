/**
 * Apply a raw .sql file against DATABASE_URL (live Supabase).
 *   npx tsx scripts/apply-sql.ts supabase/05_otp.sql
 * Used for the supabase/*.sql RLS policy files (not Drizzle migrations).
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { readFileSync } from 'fs';
import postgres from 'postgres';

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: npx tsx scripts/apply-sql.ts <file.sql>');
    process.exit(1);
  }
  const sqlText = readFileSync(file, 'utf8');
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  const client = postgres(url, { max: 1 });
  try {
    await client.unsafe(sqlText);
    console.log(`Applied ${file}`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('FAILED:', e instanceof Error ? e.message : e);
  process.exit(1);
});
