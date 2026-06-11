import { extractPan, normalizeGstin } from '@/lib/gstin';
import type { GstVerificationProvider, GstVerificationResult } from './provider';

/**
 * Cashfree GSTIN verification (Verification Suite / VRS).
 * Docs: https://www.cashfree.com/docs/api-reference/vrs/v2/gstin/verify-gstin
 *
 * Swappable like the other providers — flip GST_PROVIDER=cashfree and set the keys.
 * Keep GST_PROVIDER=mock until CASHFREE_CLIENT_ID / CASHFREE_CLIENT_SECRET are set.
 *
 * Error policy (matches how (auth)/actions.ts consumes the result):
 *  - bad / not-found / cancelled GSTIN  -> { status: 'rejected' }  (blocks signup with a message)
 *  - OUR-side failure (bad key, IP not whitelisted, no balance, rate-limit, outage)
 *    -> throw  (signup falls back to provisional/pending registration, FR-1.1)
 */

export interface CashfreeSplitAddress {
  building_name?: string;
  building_number?: string;
  flat_number?: string;
  street?: string;
  location?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
}

export interface CashfreeGstResponse {
  reference_id?: number;
  GSTIN?: string;
  valid?: boolean;
  message?: string;
  legal_name_of_business?: string;
  trade_name_of_business?: string;
  constitution_of_business?: string;
  taxpayer_type?: string;
  gst_in_status?: string;
  date_of_registration?: string;
  principal_place_address?: string;
  principal_place_split_address?: CashfreeSplitAddress;
}

/**
 * HTTP statuses that mean the request never got a real verdict on the GSTIN —
 * it's our configuration/quota/outage, not the user's input. Throw on these so
 * the caller degrades to provisional registration instead of wrongly rejecting.
 */
export function isOperationalError(status: number): boolean {
  return status === 401 || status === 403 || status === 422 || status === 429 || status >= 500;
}

/** Assemble a readable address from the split components when the flat string is absent. */
export function joinSplitAddress(s?: CashfreeSplitAddress): string {
  if (!s) return '';
  return [
    s.building_number,
    s.flat_number,
    s.building_name,
    s.street,
    s.location,
    s.city,
    s.district,
    s.state,
    s.pincode,
  ]
    .map((x) => (typeof x === 'string' ? x.trim() : ''))
    .filter(Boolean)
    .join(', ');
}

/** Pure mapper: a 2xx Cashfree body -> normalized result. Unit-tested without network. */
export function mapCashfreeResponse(json: CashfreeGstResponse, gstin: string): GstVerificationResult {
  const pan = extractPan(gstin);
  const legalName = (json.legal_name_of_business ?? '').trim();

  if (json.valid === false || !legalName) {
    return {
      ok: false,
      status: 'rejected',
      gstin,
      pan,
      legalName: '',
      address: '',
      message: json.message ?? 'GSTIN not found.',
      raw: json,
    };
  }

  const statusStr = (json.gst_in_status ?? '').trim().toLowerCase();
  const inactive = statusStr !== '' && statusStr !== 'active';
  if (inactive) {
    return {
      ok: false,
      status: 'rejected',
      gstin,
      pan,
      legalName,
      address: (json.principal_place_address ?? '').trim(),
      message: `This GSTIN is ${json.gst_in_status}, not Active.`,
      raw: json,
    };
  }

  const address = (json.principal_place_address ?? '').trim() || joinSplitAddress(json.principal_place_split_address);
  return {
    ok: true,
    status: 'verified',
    gstin,
    pan,
    legalName,
    address,
    message: 'Verified (Cashfree).',
    raw: json,
  };
}

export class CashfreeGstProvider implements GstVerificationProvider {
  readonly name = 'cashfree';

  async verify(gstinRaw: string): Promise<GstVerificationResult> {
    const clientId = process.env.CASHFREE_CLIENT_ID;
    const clientSecret = process.env.CASHFREE_CLIENT_SECRET;
    const base =
      process.env.CASHFREE_BASE_URL ??
      (process.env.CASHFREE_ENV === 'production'
        ? 'https://api.cashfree.com'
        : 'https://sandbox.cashfree.com');
    const gstin = normalizeGstin(gstinRaw);

    if (!clientId || !clientSecret) {
      throw new Error(
        'CASHFREE_CLIENT_ID / CASHFREE_CLIENT_SECRET are not set. Keep GST_PROVIDER=mock until the keys are provisioned.',
      );
    }

    const res = await fetch(`${base}/verification/gstin`, {
      method: 'POST',
      headers: {
        'x-client-id': clientId,
        'x-client-secret': clientSecret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ GSTIN: gstin }),
      cache: 'no-store',
    });

    // Our problem, not the user's GSTIN -> throw so signup degrades to provisional.
    if (isOperationalError(res.status)) {
      throw new Error(`Cashfree GSTIN verification unavailable (HTTP ${res.status}).`);
    }

    const json = (await res.json().catch(() => ({}))) as CashfreeGstResponse;

    // 400 (e.g. malformed GSTIN) and any other non-2xx that reached here = bad input.
    if (!res.ok) {
      return {
        ok: false,
        status: 'rejected',
        gstin,
        pan: extractPan(gstin),
        legalName: '',
        address: '',
        message: json.message ?? `GSTIN could not be verified (HTTP ${res.status}).`,
        raw: json,
      };
    }

    return mapCashfreeResponse(json, gstin);
  }
}
