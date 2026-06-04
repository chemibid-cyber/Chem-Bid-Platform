/**
 * Split-pricing engine (CLAUDE.md §2.9, FR-4.3/4.4/6.4).
 *
 * Rules encoded here:
 *  - Total Rate = Basic + Freight (per unit).
 *  - Ex-Works HIDES + ZEROES freight → Total = Basic.
 *  - Delivered REQUIRES freight.
 *  - Stage-2 price-drop lock: a Stage-2 rate may never exceed the seller's
 *    Stage-1 total (a negotiation only moves the price DOWN).
 */
export type LogisticsBasis = 'delivered' | 'exworks';

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Freight is meaningless under Ex-Works (buyer arranges pickup) → forced to 0. */
export function effectiveFreight(freight: number, basis: LogisticsBasis): number {
  return basis === 'exworks' ? 0 : Math.max(0, freight);
}

export interface BidPricingInput {
  basic: number;
  freight: number;
  basis: LogisticsBasis;
}

export function computeTotalRate({ basic, freight, basis }: BidPricingInput): number {
  return round2(Math.max(0, basic) + effectiveFreight(freight, basis));
}

export interface PricingValidation {
  ok: boolean;
  errors: string[];
}

/** Form-level validation for a Stage-1 bid's pricing block. */
export function validateBidPricing({ basic, freight, basis }: BidPricingInput): PricingValidation {
  const errors: string[] = [];
  if (!Number.isFinite(basic) || basic <= 0) {
    errors.push('Basic rate must be greater than 0.');
  }
  if (basis === 'delivered') {
    if (!Number.isFinite(freight) || freight <= 0) {
      errors.push('Freight rate is required for a Delivered auction.');
    }
  }
  return { ok: errors.length === 0, errors };
}

/** Stage-2 counter must be ≤ the seller's own Stage-1 total. */
export function isValidStage2Rate(stage2Rate: number, stage1Total: number): boolean {
  return Number.isFinite(stage2Rate) && stage2Rate > 0 && stage2Rate <= stage1Total;
}
