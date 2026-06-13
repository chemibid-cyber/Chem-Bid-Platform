/**
 * Live end-to-end check of the OTP mechanism against the real Supabase:
 *   1. insert an otp_codes row (mirrors sendOtp) and read it back
 *   2. verifyOtpCode() accepts the right code, rejects a wrong one
 *   3. RLS: the anon/PostgREST surface CANNOT read otp_codes (service-role only)
 * Cleans up the test row. No email/SMS is sent.
 *   npx tsx scripts/test-otp.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';
import { createClient } from '@supabase/supabase-js';
import { generateOtpCode, hashOtpCode, verifyOtpCode } from '../src/lib/otp';

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  try {
    const [u] = await sql`select id, email from users limit 1`;
    if (!u) throw new Error('no users to test with');
    const code = generateOtpCode();
    const hash = hashOtpCode(code);
    const [row] = await sql`
      insert into otp_codes (user_id, channel, destination, code_hash, expires_at)
      values (${u.id}, 'email', ${u.email}, ${hash}, now() + interval '10 minutes')
      returning id, code_hash`;
    console.log('STEP 1 insert + readback:', row?.id ? 'ok' : 'FAILED');
    const wrong = code === '000000' ? '111111' : '000000';
    console.log('STEP 2 accepts correct code:', verifyOtpCode(code, row.code_hash));
    console.log('STEP 2 rejects wrong code  :', verifyOtpCode(wrong, row.code_hash) === false);
    await sql`delete from otp_codes where id = ${row.id}`;
    console.log('cleanup: test row deleted');
  } finally {
    await sql.end();
  }

  // RLS — anon client (no session) must not be able to read otp_codes.
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data, error } = await anon.from('otp_codes').select('id').limit(1);
  const blocked = (data?.length ?? 0) === 0;
  console.log(`STEP 3 RLS anon read → rows=${data?.length ?? 0} error=${error?.message ?? 'none'}`);
  console.log(blocked ? '✅ RLS: anon cannot read otp_codes' : '❌ RLS LEAK: anon read otp_codes');
  if (!blocked) process.exit(3);
}

main().catch((e) => {
  console.error('FAILED:', e instanceof Error ? e.message : e);
  process.exit(1);
});
