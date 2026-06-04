/**
 * Targeting engine helpers (CLAUDE.md §2 / FR-3.4).
 *
 * Mixture matching uses WHOLE-TOKEN equality, never substring — so "IPA" matches
 * the token "IPA" but never the "IPA" inside "tdIPArt". This kills the v0.1
 * substring false-positive class.
 */

/** Split on whitespace + punctuation, lowercase, drop empties. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/** True iff `needle` appears as a WHOLE token within `haystack`. Case-insensitive. */
export function wholeTokenMatch(haystack: string, needle: string): boolean {
  const target = needle.trim().toLowerCase();
  if (!target) return false;
  return tokenize(haystack).includes(target);
}

/**
 * Buyer's supplier_filter ∩ seller's declared roles.
 * An empty buyer filter means "any role" → always matches.
 */
export function rolesIntersect(
  sellerRoles: readonly string[],
  buyerFilter: readonly string[],
): boolean {
  if (buyerFilter.length === 0) return true;
  const set = new Set(sellerRoles.map((r) => r.toLowerCase()));
  return buyerFilter.some((r) => set.has(r.toLowerCase()));
}

export interface SellerCandidate {
  companyId: string;
  casNumber: string | null;
  name: string;
  isMixture: boolean;
  mixtureText: string | null;
  grade: string;
  roles: string[];
}

export interface AuctionTarget {
  casNumber: string | null;
  name: string;
  isMixture: boolean;
  matchText: string; // name + remarks, for token matching on mixtures
  grade: string;
  supplierFilter: string[];
}

/**
 * Whether a seller catalog candidate qualifies for an auction.
 * Blocks are applied separately (they need DB state); this is the pure match.
 */
export function isQualifiedSeller(auction: AuctionTarget, seller: SellerCandidate): boolean {
  // 1. Subject match: CAS equality, or whole-token mixture match.
  let subjectMatch = false;
  if (auction.casNumber && seller.casNumber) {
    subjectMatch = auction.casNumber.trim() === seller.casNumber.trim();
  } else if (auction.isMixture || seller.isMixture) {
    const sellerText = seller.isMixture
      ? `${seller.name} ${seller.mixtureText ?? ''}`
      : seller.name;
    subjectMatch =
      wholeTokenMatch(auction.matchText, seller.name) ||
      tokenize(sellerText).some((tok) => wholeTokenMatch(auction.matchText, tok));
  }
  if (!subjectMatch) return false;

  // 2. Role intersection with the buyer's supplier filter.
  return rolesIntersect(seller.roles, auction.supplierFilter);
}
