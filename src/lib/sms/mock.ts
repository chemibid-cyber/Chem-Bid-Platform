import type { SmsOtpProvider, SmsSendResult } from './provider';

/**
 * Dev/test SMS provider — logs the code to the server console instead of sending.
 *
 * HARD GUARD: throws if it ever runs in production. The factory defaults to
 * `mock`, so without this an unset SMS_PROVIDER on Vercel would silently make
 * phone "verification" a no-op (always succeeds to send, never delivers) while
 * the UI claims a code was sent. Better to fail loudly than to ship a fake.
 */
export class MockSmsProvider implements SmsOtpProvider {
  readonly name = 'mock';

  async send(toE164: string, code: string): Promise<SmsSendResult> {
    const env = process.env.VERCEL_ENV ?? process.env.NODE_ENV;
    if (env === 'production') {
      throw new Error(
        'MockSmsProvider must not run in production. Set SMS_PROVIDER + a real provider key (e.g. msg91) and complete India DLT registration before enabling phone OTP.',
      );
    }
    // eslint-disable-next-line no-console
    console.info(`\n[sms:mock] → ${toE164}  code=${code}\n`);
    return { ok: true, id: 'mock' };
  }
}
