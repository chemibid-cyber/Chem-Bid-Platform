import { Resend } from 'resend';

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sends a transactional email via Resend. With no RESEND_API_KEY (local dev),
 * it logs to the console instead of failing — so the whole app runs key-free.
 */
export async function sendEmail(input: SendEmailInput): Promise<{ ok: boolean; id?: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? 'Chemical Auction <onboarding@resend.dev>';

  if (!key) {
    // eslint-disable-next-line no-console
    console.info(
      `\n[email:dev] →`,
      Array.isArray(input.to) ? input.to.join(', ') : input.to,
      `\n  subject: ${input.subject}\n  ${input.text ?? stripHtml(input.html)}\n`,
    );
    return { ok: true, id: 'dev-console' };
  }

  try {
    const resend = new Resend(key);
    const { data, error } = await resend.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text ?? stripHtml(input.html),
    });
    if (error) {
      // eslint-disable-next-line no-console
      console.error('[email] send failed:', error);
      return { ok: false };
    }
    return { ok: true, id: data?.id };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[email] threw:', err);
    return { ok: false };
  }
}
