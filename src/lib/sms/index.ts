import type { SmsOtpProvider } from './provider';
import { MockSmsProvider } from './mock';
import { Msg91Provider } from './msg91';

export type { SmsOtpProvider, SmsSendResult } from './provider';
export { normalizeIndianPhone, isIndianE164 } from './phone';

/** Factory: returns the provider named by SMS_PROVIDER (default: mock). */
export function getSmsProvider(): SmsOtpProvider {
  const choice = (process.env.SMS_PROVIDER ?? 'mock').toLowerCase();
  switch (choice) {
    case 'msg91':
      return new Msg91Provider();
    case 'mock':
    default:
      return new MockSmsProvider();
  }
}

/** Whether a real SMS provider is configured (controls UI test-mode messaging). */
export function isSmsLive(): boolean {
  return (process.env.SMS_PROVIDER ?? 'mock').toLowerCase() !== 'mock';
}
