/**
 * Sends ONE real member invite using the same logic as addMemberAction, with the
 * NEW accept-invite link format, so the new invite→register flow can be tested end
 * to end. Emails vrajtalatii@gmail.com and links it to the host company.
 *   npx tsx scripts/send-test-invite.ts
 * Prints the invited user id for cleanup afterwards.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { eq } from 'drizzle-orm';
import { db } from '../src/lib/db';
import { users, companies } from '../src/lib/db/schema';
import { createServiceClient } from '../src/lib/supabase/service';
import { sendEmail } from '../src/lib/email';
import { inviteEmail } from '../src/lib/email/templates';

const APP_URL = 'https://app.chemibid.com';
const INVITE_EMAIL = 'vrajtalatii@gmail.com';

async function main() {
  // Host company: prefer chemibid@gmail.com's company, else the first company.
  const [hostUser] = await db.select().from(users).where(eq(users.email, 'chemibid@gmail.com')).limit(1);
  let companyId: string;
  let inviterName = 'Your admin';
  if (hostUser) {
    companyId = hostUser.companyId;
    inviterName = `${hostUser.firstName} ${hostUser.lastName}`;
  } else {
    const [c] = await db.select().from(companies).limit(1);
    if (!c) throw new Error('no company to invite into');
    companyId = c.id;
  }
  const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  const companyName = company?.legalName ?? 'your company';

  const [existing] = await db.select().from(users).where(eq(users.email, INVITE_EMAIL)).limit(1);
  if (existing) {
    console.error(`${INVITE_EMAIL} is already a user (id ${existing.id}). Remove it first or use another email.`);
    process.exit(2);
  }

  const svc = createServiceClient();
  const { data: linkData, error } = await svc.auth.admin.generateLink({
    type: 'invite',
    email: INVITE_EMAIL,
    options: { data: { first_name: 'Vraj', last_name: '(invite test)' } },
  });
  if (error || !linkData.user) {
    console.error('generateLink(invite) failed:', error?.message);
    process.exit(3);
  }
  const hashed = linkData.properties?.hashed_token;
  if (!hashed) {
    console.error('no hashed_token returned');
    process.exit(3);
  }

  await db.insert(users).values({
    id: linkData.user.id,
    companyId,
    firstName: 'Vraj',
    lastName: '(invite test)',
    email: INVITE_EMAIL,
    canBuy: false,
    canSell: false,
    isAdmin: false,
    status: 'invited',
  });

  const acceptUrl = `${APP_URL}/accept-invite?token_hash=${encodeURIComponent(hashed)}&type=invite`;
  const tmpl = inviteEmail({ companyName, inviterName, acceptUrl });
  const r = await sendEmail({ to: INVITE_EMAIL, subject: tmpl.subject, html: tmpl.html, text: tmpl.text });

  console.log('invite email sent ok:', r.ok, '→', INVITE_EMAIL);
  console.log('company:', companyName);
  console.log('accept URL host:', acceptUrl.slice(0, 60) + '…&type=invite');
  console.log('invited user id (for cleanup):', linkData.user.id);
}

main().catch((e) => {
  console.error('FAILED:', e instanceof Error ? e.message : e);
  process.exit(1);
});
