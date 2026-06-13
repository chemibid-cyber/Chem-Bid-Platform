/**
 * Split-pricing engine (CLAUDE.md §2.9, FR-4.3/4.4/6.4 + 2026-06-12 tax tier).
 *
 * Rules encoded here:
 *  - Total Rate = Material (basic) + Freight + Tax (all per unit).
 *  - Ex-Works HIDES + ZEROES freight → Total = Material + Tax.
 *  - Delivered REQUIRES freight.
 *  - Tax is optional (0 when not applicable), never negative.
 *  - Ranking/leaderboards always use the FULL total, never material alone.
 *  - Stage-2 negotiates on the MATERIAL rate; freight + tax carry over from
 *    Stage-1. Price-drop lock: a Stage-2 material rate may never exceed the
 *    seller's Stage-1 material rate (negotiation only moves the price DOWN).
 */
export type LogisticsBasis = 'delivered' | 'exworks' | 'other';

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Freight is meaningless under Ex-Works (buyer arranges pickup) → forced to 0. */
export function effectiveFreight(freight: number, basis: LogisticsBasis): number {
  return basis === 'exworks' ? 0 : Math.max(0, freight);
}

/**
 * Tax entered as a PERCENTAGE (#19), auto-converted to a per-unit ₹ amount.
 * Base = material + effective freight (freight is 0 under Ex-Works), so the
 * tax tracks the taxable value the seller is actually quoting. Negative inputs
 * (rate or %) clamp to 0; the result is rounded to 2 decimals (₹/unit).
 */
export function computeTaxFromPct(
  taxPct: number,
  basic: number,
  freight: number,
  basis: LogisticsBasis,
): number {
  const pct = Number.isFinite(taxPct) ? Math.max(0, taxPct) : 0;
  const base = Math.max(0, basic) + effectiveFreight(freight, basis);
  return round2((pct / 100) * base);
}

export interface BidPricingInput {
  basic: number;
  freight: number;
  tax?: number;
  basis: LogisticsBasis;
}

export function computeTotalRate({ basic, freight, tax = 0, basis }: BidPricingInput): number {
  return round2(Math.max(0, basic) + effectiveFreight(freight, basis) + Math.max(0, tax));
}

export interface PricingValidation {
  ok: boolean;
  errors: string[];
}

/** Form-level validation for a Stage-1 bid's pricing block. */
export function validateBidPricing({ basic, freight, tax = 0, basis }: BidPricingInput): PricingValidation {
  const errors: string[] = [];
  if (!Number.isFinite(basic) || basic <= 0) {
    errors.push('Material rate must be greater than 0.');
  }
  // Freight may be 0 (e.g. included in the material rate). Only Ex-Works hides it
  // entirely; for Delivered / Other the seller may enter any non-negative amount.
  if (basis !== 'exworks') {
    if (!Number.isFinite(freight) || freight < 0) {
      errors.push('Transport (freight) cannot be negative (enter 0 if it is included or not applicable).');
    }
  }
  if (!Number.isFinite(tax) || tax < 0) {
    errors.push('Tax cannot be negative (use 0 if not applicable).');
  }
  return { ok: errors.length === 0, errors };
}

/**
 * Stage-2 price-drop lock — on the MATERIAL rate: a Stage-2 material rate must
 * be > 0 and at most the seller's Stage-1 material rate.
 */
export function isValidStage2Rate(stage2Material: number, stage1Material: number): boolean {
  return Number.isFinite(stage2Material) && stage2Material > 0 && stage2Material <= stage1Material;
}

/**
 * A Stage-2 response re-prices ONLY the material; the seller's Stage-1 freight
 * and tax carry over. This is the seller's all-in Stage-2 total for comparison.
 * Accepts strings because Postgres `numeric` columns arrive as strings.
 */
export function stage2Total(
  stage2Material: number,
  stage1Freight: number | string | null | undefined,
  stage1Tax: number | string | null | undefined,
): number {
  const freight = Number(stage1Freight ?? 0);
  const tax = Number(stage1Tax ?? 0);
  return round2(
    Math.max(0, stage2Material) +
      (Number.isFinite(freight) ? Math.max(0, freight) : 0) +
      (Number.isFinite(tax) ? Math.max(0, tax) : 0),
  );
}
