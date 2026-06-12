/**
 * Service Providers Hub calculation engines + provider matching (pure).
 *
 * Spec-mandated formulas:
 *  - Transport:  Total Cost = (Base Rate ₹/kg × Total Quantity kg) + Taxes ₹
 *  - Packing:    Total Cost = (Base Price ₹/piece × Quantity pieces) + Taxes ₹
 * Tax is an ABSOLUTE rupee value for the job, not per unit.
 */
import { round2 } from '@/lib/pricing';

export function transportTotal(baseRatePerKg: number, totalQtyKg: number, taxAbs: number): number {
  return round2(Math.max(0, baseRatePerKg) * Math.max(0, totalQtyKg) + Math.max(0, taxAbs));
}

export function packingTotal(pricePerPiece: number, pieces: number, taxAbs: number): number {
  return round2(Math.max(0, pricePerPiece) * Math.max(0, pieces) + Math.max(0, taxAbs));
}

export interface QuoteValidation {
  ok: boolean;
  errors: string[];
}

export function validateQuote(baseRate: number, taxAbs: number): QuoteValidation {
  const errors: string[] = [];
  if (!Number.isFinite(baseRate) || baseRate <= 0) errors.push('Base rate must be greater than 0.');
  if (!Number.isFinite(taxAbs) || taxAbs < 0) errors.push('Tax cannot be negative (use 0 if none).');
  return { ok: errors.length === 0, errors };
}

export interface ProviderProfileLike {
  active: boolean;
  isTransporter: boolean;
  vehicleTypes: readonly string[];
  isPackingSupplier: boolean;
  packingTypes: readonly string[];
}

export interface ServiceRequestLike {
  kind: 'transport' | 'packing';
  vehicleTypes: readonly string[];
  packingType: string | null;
}

/**
 * Broadcast matching: a transport inquiry reaches providers operating ANY of
 * the requested vehicle classes; a packing inquiry reaches providers stocking
 * that packaging type.
 */
export function providerMatchesRequest(
  profile: ProviderProfileLike,
  request: ServiceRequestLike,
): boolean {
  if (!profile.active) return false;
  if (request.kind === 'transport') {
    if (!profile.isTransporter) return false;
    if (request.vehicleTypes.length === 0) return true; // no restriction stated
    const set = new Set(profile.vehicleTypes);
    return request.vehicleTypes.some((v) => set.has(v));
  }
  if (!profile.isPackingSupplier) return false;
  if (!request.packingType) return false;
  return profile.packingTypes.includes(request.packingType);
}
