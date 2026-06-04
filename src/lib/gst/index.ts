import type { GstVerificationProvider } from './provider';
import { MockGstProvider } from './mock';
import { SurepassGstProvider } from './surepass';

export type { GstVerificationProvider, GstVerificationResult } from './provider';

/** Factory: returns the provider named by GST_PROVIDER (default: mock). */
export function getGstProvider(): GstVerificationProvider {
  const choice = (process.env.GST_PROVIDER ?? 'mock').toLowerCase();
  switch (choice) {
    case 'surepass':
      return new SurepassGstProvider();
    case 'mock':
    default:
      return new MockGstProvider();
  }
}
