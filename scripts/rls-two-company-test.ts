/**
 * Two-company RLS proof (Prompt 7 CHECK). Runs against a LIVE Supabase project
 * after 01_enable_rls.sql + 02_policies.sql are applied and test data exists.
 *
 * Setup (via the UI, once):
 *   1. Register company BUYER, company SELLER_A, company SELLER_B (3 GSTINs).
 *   2. SELLER_A + SELLER_B each add CAS 108-88-3 to their sales catalog.
 *   3. BUYER publishes a blind auction for 108-88-3 (Send to All).
 *   4. SELLER_A and SELLER_B both Accept & Quote.
 *
 * Then set env and run:  npx tsx scripts/rls-two-company-test.ts
 *   SUPABASE_URL, SUPABASE_ANON_KEY
 *   A_EMAIL, A_PASS   (a user in SELLER_A)
 *   B_EMAIL, B_PASS   (a user in SELLER_B)
 *
 * Asserts: SELLER_A's anon session can read its OWN bid but NOT SELLER_B's bid,
 * and cannot read SELLER_B's company/users rows. Proves blind isolation at the DB.
 */
import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function need(name: string, v: string | undefined): string {
  if (!v) {
    console.error(`Missing env ${name}`);
    process.exit(2);
  }
  return v;
}

async function sessionFor(email: string, pass: string) {
  const sb = createClient(need('SUPABASE_URL', URL), need('SUPABASE_ANON_KEY', ANON));
  const { error } = await sb.auth.signInWithPassword({ email, password: pass });
  if (error) {
    console.error(`Sign-in failed for ${email}: ${error.message}`);
    process.exit(2);
  }
  return sb;
}

let failures = 0;
function assert(cond: boolean, msg: string) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!cond) failures += 1;
}

async function main() {
  const a = await sessionFor(need('A_EMAIL', process.env.A_EMAIL), need('A_PASS', process.env.A_PASS));
  const b = await sessionFor(need('B_EMAIL', process.env.B_EMAIL), need('B_PASS', process.env.B_PASS));

  // Each seller's own company id.
  const { data: aMe } = await a.from('users').select('company_id').limit(1).single();
  const { data: bMe } = await b.from('users').select('company_id').limit(1).single();
  const aCompany = aMe?.company_id as string;
  const bCompany = bMe?.company_id as string;
  assert(Boolean(aCompany) && aCompany !== bCompany, 'A and B are distinct companies');

  // Bids visible to A — must contain NONE owned by B's company.
  const { data: aBids } = await a.from('bids').select('id, seller_company_id, auction_id');
  const leak = (aBids ?? []).filter((r) => r.seller_company_id === bCompany);
  assert(leak.length === 0, "Seller A cannot read Seller B's bid rows");
  assert((aBids ?? []).some((r) => r.seller_company_id === aCompany), 'Seller A can read its OWN bid');

  // A cannot read B's company row or B's users.
  const { data: bCompanyRow } = await a.from('companies').select('id').eq('id', bCompany);
  assert((bCompanyRow ?? []).length === 0, "Seller A cannot read Seller B's company identity (pre-reveal)");
  const { data: bUsers } = await a.from('users').select('id').eq('company_id', bCompany);
  assert((bUsers ?? []).length === 0, "Seller A cannot read Seller B's contact users");

  // audit_log is not readable by a tenant and not mutable.
  const { data: audit } = await a.from('audit_log').select('id').limit(1);
  assert((audit ?? []).length === 0, 'Tenant cannot read audit_log');
  const { error: updErr } = await a.from('audit_log').update({ action: 'tamper' }).neq('id', '00000000-0000-0000-0000-000000000000');
  assert(Boolean(updErr), 'audit_log UPDATE is rejected');

  console.log(`\n${failures === 0 ? 'ALL RLS CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
