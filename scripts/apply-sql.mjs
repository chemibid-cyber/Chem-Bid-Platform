/**
 * Applies the Supabase SQL files (RLS + storage bucket) against DATABASE_URL,
 * in order, using the simple query protocol (supports multi-statement + $$ bodies).
 * Run after `npm run db:migrate`:  node scripts/apply-sql.mjs
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import postgres from 'postgres';
import { readFileSync } from 'node:fs';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set in .env.local');
  process.exit(1);
}

const files = ['supabase/01_enable_rls.sql', 'supabase/02_policies.sql', 'supabase/03_storage.sql'];

const sql = postgres(url, { max: 1 });

try {
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    await sql.unsafe(text).simple();
    console.log(`✓ applied ${file}`);
  }
  console.log('\nAll SQL applied (RLS + policies + storage bucket).');
} catch (err) {
  console.error('\n✗ Failed:', err?.message ?? err);
  console.error('Fallback: paste the three supabase/*.sql files into the Supabase SQL editor.');
  process.exit(1);
} finally {
  await sql.end();
}
