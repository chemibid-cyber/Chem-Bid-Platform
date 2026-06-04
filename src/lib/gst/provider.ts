/**
 * GST verification seam (CLAUDE.md §2.1, FR-1.1).
 *
 * Identity is anchored to a verified GSTIN. Legal name + address come from the
 * provider and are LOCKED — never user-editable. The provider is swappable
 * (mock now, Surepass later) so the vendor changes without touching app code.
 */
export interface GstVerificationResult {
  ok: boolean;
  status: 'verified' | 'rejected';
  gstin: string;
  pan: string;
  legalName: string;
  address: string;
  message?: string;
  raw?: unknown;
}

export interface GstVerificationProvider {
  readonly name: string;
  verify(gstin: string): Promise<GstVerificationResult>;
}
