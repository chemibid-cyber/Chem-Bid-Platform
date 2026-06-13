/**
 * Proves the password-reset mechanism end to end against the live Supabase,
 * WITHOUT sending email or needing an inbox. Mirrors the deployed flow:
 *   1. requestResetAction → admin.generateLink({type:'recovery'}) → hashed_token
 *   2. updatePasswordAction → anon client verifyOtp({token_hash, type}) → session
 *
 *   npx tsx scripts/test-reset.ts [email]
 *
 * Uses a throwaway sim user by default so it never touches a real account's token.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const email = process.argv[2] || 's01@sim.test';

  const svc = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });

  // Step 1 — generate the recovery token (what requestResetAction does).
  const { data, error } = await svc.auth.admin.generateLink({ type: 'recovery', email });
  if (error) {
    console.error('STEP 1 generateLink FAILED:', error.message);
    process.exit(2);
  }
  const hashed = data.properties?.hashed_token;
  console.log('STEP 1 ok — hashed_token present:', !!hashed);
  console.log('         emailed link would be: https://app.chemibid.com/reset-password?token_hash=' +
    (hashed ? hashed.slice(0, 10) + '…' : '(none)') + '&type=recovery');

  // Step 2 — verify the token on a fresh anon client (what updatePasswordAction does on submit).
  const client = createClient(url, anon, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: vdata, error: verr } = await client.auth.verifyOtp({
    token_hash: hashed!,
    type: 'recovery',
  });
  if (verr) {
    console.error('STEP 2 verifyOtp FAILED:', verr.message);
    process.exit(3);
  }
  console.log('STEP 2 ok — verifyOtp returned a session:', !!vdata.session, 'for', vdata.user?.email);
  console.log('\n✅ RESET MECHANISM WORKS: token → verifyOtp → authenticated session.');
}

main();
