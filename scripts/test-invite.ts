/**
 * Live check of the reworked invite mechanism against real Supabase:
 *   1. admin.generateLink({type:'invite'}) → hashed_token (what addMemberAction does)
 *   2. anon verifyOtp({token_hash, type:'invite'}) → session (what acceptInviteAction does on submit)
 * Cleans up the throwaway auth user. No email is sent.
 *   npx tsx scripts/test-invite.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const email = `invite-test-${Date.now()}@example.com`;

  const svc = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data, error } = await svc.auth.admin.generateLink({ type: 'invite', email });
  if (error) {
    console.error('STEP 1 generateLink(invite) FAILED:', error.message);
    process.exit(2);
  }
  const hashed = data.properties?.hashed_token;
  const userId = data.user?.id;
  console.log('STEP 1 invite link generated — hashed_token present:', !!hashed);
  console.log('        emailed link: https://app.chemibid.com/accept-invite?token_hash=' +
    (hashed ? hashed.slice(0, 10) + '…' : '(none)') + '&type=invite');

  const client = createClient(url, anon, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: v, error: verr } = await client.auth.verifyOtp({ token_hash: hashed!, type: 'invite' });
  if (verr) console.error('STEP 2 verifyOtp(invite) FAILED:', verr.message);
  else console.log('STEP 2 verifyOtp(invite) ok — session established:', !!v.session, 'for', v.user?.email);

  if (userId) {
    await svc.auth.admin.deleteUser(userId).catch(() => {});
    console.log('cleanup: throwaway test user deleted');
  }
  if (verr) process.exit(3);
  console.log('\n✅ INVITE MECHANISM WORKS: invite token → verifyOtp → authenticated session.');
}

main().catch((e) => {
  console.error('FAILED:', e instanceof Error ? e.message : e);
  process.exit(1);
});
