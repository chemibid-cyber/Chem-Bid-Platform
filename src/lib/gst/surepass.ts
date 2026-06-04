import { extractPan, normalizeGstin } from '@/lib/gstin';
import type { GstVerificationProvider, GstVerificationResult } from './provider';

/**
 * Surepass GST verification (Phase 2). Wired but inert until a token is set —
 * keep GST_PROVIDER=mock until the vendor contract is signed (CLAUDE.md §11.2).
 * Endpoint shape per Surepass GSTIN-advanced docs; adjust field paths on signup.
 */
export class SurepassGstProvider implements GstVerificationProvider {
  readonly name = 'surepass';

  async verify(gstinRaw: string): Promise<GstVerificationResult> {
    const token = process.env.SUREPASS_API_TOKEN;
    const base = process.env.SUREPASS_BASE_URL ?? 'https://kyc-api.surepass.io';
    const gstin = normalizeGstin(gstinRaw);

    if (!token) {
      throw new Error(
        'SUREPASS_API_TOKEN is not set. Keep GST_PROVIDER=mock until the vendor key is provisioned.',
      );
    }

    const res = await fetch(`${base}/api/v1/corporate/gstin`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id_number: gstin }),
      cache: 'no-store',
    });

    if (!res.ok) {
      return {
        ok: false,
        status: 'rejected',
        gstin,
        pan: extractPan(gstin),
        legalName: '',
        address: '',
        message: `Surepass returned ${res.status}.`,
      };
    }

    const json = (await res.json()) as {
      data?: { legal_name?: string; address?: string; pan_number?: string };
    };
    const data = json.data ?? {};
    const legalName = data.legal_name ?? '';

    return {
      ok: Boolean(legalName),
      status: legalName ? 'verified' : 'rejected',
      gstin,
      pan: data.pan_number ?? extractPan(gstin),
      legalName,
      address: data.address ?? '',
      message: legalName ? 'Verified (Surepass).' : 'GSTIN not found.',
      raw: json,
    };
  }
}
