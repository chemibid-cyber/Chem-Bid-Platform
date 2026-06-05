/**
 * Seeds Platform Operator accounts from OPERATOR_EMAILS.
 * Run once after migrating: npx tsx scripts/seed-operator.ts
 *
 * Needs: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL,
 * OPERATOR_EMAILS (comma-separated). Prints a temporary password per operator —
 * they should log in and reset it immediately.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { operators } from '../src/lib/db/schema';

function randomPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
  let out = '';
  for (let i = 0; i < 16; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const dbUrl = process.env.DATABASE_URL;
  const emails = (process.env.OPERATOR_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);

  if (!url || !serviceKey || !dbUrl) throw new Error('Missing Supabase/DATABASE_URL env.');
  if (emails.length === 0) throw new Error('Set OPERATOR_EMAILS (comma-separated).');

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const sql = postgres(dbUrl, { max: 1 });
  const db = drizzle(sql);

  for (const email of emails) {
    const [existing] = await db.select().from(operators).where(eq(operators.email, email)).limit(1);
    if (existing) {
      console.log(`• ${email} already an operator — skipping.`);
      continue;
    }

    const password = randomPassword();
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'operator' },
    });
    if (error || !data.user) {
      console.error(`✗ ${email}: ${error?.message ?? 'createUser failed'}`);
      continue;
    }

    await db.insert(operators).values({
      authUserId: data.user.id,
      email,
      name: email.split('@')[0] ?? 'Operator',
    });
    console.log(`✓ ${email} — temporary password: ${password}  (log in, then reset)`);
  }

  await sql.end();
  console.log('\nDone. Operators sign in at /login and are routed to /operator.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
