import type { SmsOtpProvider, SmsSendResult } from './provider';

/**
 * MSG91 (India) SMS adapter — sends OUR generated code via a DLT-registered
 * template, so we keep control of hashing/verification (we don't use MSG91's
 * own OTP product). Activates when MSG91_AUTH_KEY + MSG91_TEMPLATE_ID are set.
 *
 * GO-LIVE REQUIREMENTS (India): the template_id must be a DLT-approved template
 * whose body matches EXACTLY (MSG91 silently drops non-matching content), with a
 * variable for the code. We pass both `otp` and `var1` so it maps regardless of
 * the template's variable name. See OPERATIONS.md.
 */
export class Msg91Provider implements SmsOtpProvider {
  readonly name = 'msg91';

  async send(toE164: string, code: string): Promise<SmsSendResult> {
    const authKey = process.env.MSG91_AUTH_KEY;
    const templateId = process.env.MSG91_TEMPLATE_ID;
    if (!authKey || !templateId) {
      return { ok: false, error: 'MSG91 not configured (MSG91_AUTH_KEY / MSG91_TEMPLATE_ID missing).' };
    }
    const mobiles = toE164.replace(/^\+/, ''); // 91XXXXXXXXXX
    try {
      const res = await fetch('https://control.msg91.com/api/v5/flow/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authkey: authKey },
        body: JSON.stringify({
          template_id: templateId,
          recipients: [{ mobiles, otp: code, var1: code }],
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { type?: string; message?: string; request_id?: string };
      if (!res.ok || data?.type === 'error') {
        return { ok: false, error: data?.message ?? `MSG91 HTTP ${res.status}` };
      }
      return { ok: true, id: data?.request_id ?? data?.message };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'MSG91 request failed' };
    }
  }
}
