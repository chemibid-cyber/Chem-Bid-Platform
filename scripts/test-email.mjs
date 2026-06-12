/** One-off: verify RESEND_API_KEY works. Usage: node scripts/test-email.mjs you@example.com */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { Resend } from 'resend';

const to = process.argv[2];
if (!to) {
  console.error('usage: node scripts/test-email.mjs <recipient>');
  process.exit(1);
}
const resend = new Resend(process.env.RESEND_API_KEY);
const { data, error } = await resend.emails.send({
  from: process.env.EMAIL_FROM ?? 'Chemical Auction <onboarding@resend.dev>',
  to,
  subject: 'Chemical Auction — email transport test',
  html: '<p>Resend is wired correctly for the Chemical Auction platform. This is a one-off transport test.</p>',
  text: 'Resend is wired correctly for the Chemical Auction platform.',
});
if (error) {
  console.error('FAILED:', JSON.stringify(error, null, 2));
  process.exit(1);
}
console.log('SENT ok, id =', data?.id);
