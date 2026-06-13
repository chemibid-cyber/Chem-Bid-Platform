/**
 * Prints a FRESH reset link (does NOT consume the token) so the deployed
 * /reset-password page can be opened + verified end to end.
 *   npx tsx scripts/print-reset-link.ts <email>
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const APP_URL = 'https://app.chemibid.com';

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('usage: npx tsx scripts/print-reset-link.ts <email>');
    process.exit(1);
  }
  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data, error } = await svc.auth.admin.generateLink({ type: 'recovery', email });
  if (error) {
    console.error('generateLink FAILED:', error.message);
    process.exit(2);
  }
  const hashed = data.properties?.hashed_token;
  if (!hashed) {
    console.error('no hashed_token (is the email a registered user?)');
    process.exit(3);
  }
  console.log(`${APP_URL}/reset-password?token_hash=${encodeURIComponent(hashed)}&type=recovery`);
}
main().catch((e) => {
  console.error('FAILED:', e instanceof Error ? e.message : e);
  process.exit(1);
});
