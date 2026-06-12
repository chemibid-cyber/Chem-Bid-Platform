import { extractPan, normalizeGstin } from '@/lib/gstin';
import type { GstVerificationProvider, GstVerificationResult } from './provider';

/**
 * gstincheck.co.in GSTIN verification.
 * Endpoint: GET https://sheet.gstincheck.co.in/check/{API_KEY}/{GSTIN}
 * Envelope: { flag: boolean, message: string, errorCode?: string, data: {...} }
 *
 * Flip on with GST_PROVIDER=gstincheck + GSTINCHECK_API_KEY.
 *
 * Error policy (matches how (auth)/actions.ts consumes the result):
 *  - flag:true                          -> verified (Active) / rejected (Cancelled etc.)
 *  - flag:false with a GSTIN-shaped
 *    error (invalid / not found)        -> { status: 'rejected' } (blocks signup)
 *  - flag:false for OUR/vendor reasons
 *    (GST server down, bad key, credits
 *    exhausted, unknown codes)          -> throw (signup falls back to provisional, FR-1.1)
 */

interface GstinCheckAddrParts {
  bno?: string;
  flno?: string;
  bnm?: string;
  st?: string;
  loc?: string;
  city?: string;
  dst?: string;
  stcd?: string;
  pncd?: string;
}

export interface GstinCheckData {
  gstin?: string;
  lgnm?: string; // legal name
  tradeNam?: string;
  sts?: string; // "Active" | "Cancelled" | ...
  ctb?: string; // constitution of business
  dty?: string; // taxpayer type
  rgdt?: string; // registration date
  pradr?: {
    adr?: string; // some responses: flat principal-address string
    addr?: GstinCheckAddrParts; // others: split components
  };
}

export interface GstinCheckResponse {
  flag?: boolean;
  message?: string;
  errorCode?: string;
  data?: GstinCheckData;
}

/**
 * flag:false errors that are a VERDICT on the GSTIN itself (safe to reject).
 * Everything else (server-not-responding, auth, credits, unknown) must throw —
 * a vendor hiccup should never wrongly reject a real business.
 */
export function isGstinVerdictError(errorCode?: string, message?: string): boolean {
  const code = (errorCode ?? '').toUpperCase();
  const msg = (message ?? '').toLowerCase();
  if (code.includes('INVALID_GSTIN') || code.includes('GSTIN_NOT_FOUND')) return true;
  if (msg.includes('invalid gstin') || msg.includes('gstin not found')) return true;
  return false;
}

/** Assemble a readable address from the split components when no flat string exists. */
export function joinGstinCheckAddress(addr?: GstinCheckAddrParts): string {
  if (!addr) return '';
  return [addr.bno, addr.flno, addr.bnm, addr.st, addr.loc, addr.city, addr.dst, addr.stcd, addr.pncd]
    .map((x) => (typeof x === 'string' ? x.trim() : ''))
    .filter(Boolean)
    .join(', ');
}

/** Pure mapper for a flag:true body -> normalized result. Unit-tested without network. */
export function mapGstinCheckData(data: GstinCheckData, gstin: string): GstVerificationResult {
  const pan = extractPan(gstin);
  const legalName = (data.lgnm ?? '').trim() || (data.tradeNam ?? '').trim();

  if (!legalName) {
    return {
      ok: false,
      status: 'rejected',
      gstin,
      pan,
      legalName: '',
      address: '',
      message: 'GSTIN record has no legal name.',
      raw: data,
    };
  }

  const statusStr = (data.sts ?? '').trim().toLowerCase();
  const inactive = statusStr !== '' && statusStr !== 'active';
  if (inactive) {
    return {
      ok: false,
      status: 'rejected',
      gstin,
      pan,
      legalName,
      address: '',
      message: `This GSTIN is ${data.sts}, not Active.`,
      raw: data,
    };
  }

  const address = (data.pradr?.adr ?? '').trim() || joinGstinCheckAddress(data.pradr?.addr);
  return {
    ok: true,
    status: 'verified',
    gstin,
    pan,
    legalName,
    address,
    message: 'Verified (gstincheck).',
    raw: data,
  };
}

// Signup verifies twice (client preview + server re-check). A short same-instance
// cache halves credit burn on the happy path; serverless cold starts just miss it.
const cache = new Map<string, { at: number; result: GstVerificationResult }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

export class GstinCheckProvider implements GstVerificationProvider {
  readonly name = 'gstincheck';

  async verify(gstinRaw: string): Promise<GstVerificationResult> {
    const apiKey = process.env.GSTINCHECK_API_KEY;
    const base = process.env.GSTINCHECK_BASE_URL ?? 'https://sheet.gstincheck.co.in';
    const gstin = normalizeGstin(gstinRaw);

    if (!apiKey) {
      throw new Error(
        'GSTINCHECK_API_KEY is not set. Keep GST_PROVIDER=mock until the key is provisioned.',
      );
    }

    const hit = cache.get(gstin);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.result;

    const res = await fetch(`${base}/check/${encodeURIComponent(apiKey)}/${encodeURIComponent(gstin)}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      // The API normally answers 200 even for errors; a non-2xx is infra trouble.
      throw new Error(`gstincheck unavailable (HTTP ${res.status}).`);
    }

    const json = (await res.json().catch(() => ({}))) as GstinCheckResponse;

    if (json.flag !== true) {
      if (isGstinVerdictError(json.errorCode, json.message)) {
        return {
          ok: false,
          status: 'rejected',
          gstin,
          pan: extractPan(gstin),
          legalName: '',
          address: '',
          message: json.message ?? 'GSTIN not found.',
          raw: json,
        };
      }
      // GST_SERVER_NOT_RESPOND, bad key, credits exhausted, unknown codes →
      // our/vendor problem: throw so signup degrades to provisional.
      throw new Error(`gstincheck error: ${json.errorCode ?? 'UNKNOWN'} — ${json.message ?? 'no message'}`);
    }

    const result = mapGstinCheckData(json.data ?? {}, gstin);
    if (result.ok) cache.set(gstin, { at: Date.now(), result });
    return result;
  }
}
