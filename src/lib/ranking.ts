/**
 * Bid ranking (CLAUDE.md §2.4) and the super-comparison rule (FR-7.2).
 *
 *  - Rank by LOWEST Total Rate per unit.
 *  - Ties broken by EARLIER timestamp (rewards first commitment).
 *  - Super-comparison takes the LOWER of each seller's Stage-1 / Stage-2 total,
 *    which is also why an all-reject Stage-2 simply leaves Stage-1 standing.
 */
export interface Rankable {
  id: string;
  total: number;
  createdAt: Date | string | number;
}

function toMillis(d: Date | string | number): number {
  if (d instanceof Date) return d.getTime();
  if (typeof d === 'number') return d;
  return new Date(d).getTime();
}

/** Stable sort: lowest total first; ties → earlier createdAt first. */
export function sortByRank<T extends Rankable>(bids: readonly T[]): T[] {
  return [...bids].sort((a, b) => {
    if (a.total !== b.total) return a.total - b.total;
    return toMillis(a.createdAt) - toMillis(b.createdAt);
  });
}

/** Returns the input with a 1-based `rank` field attached, sorted ascending. */
export function rankBids<T extends Rankable>(bids: readonly T[]): Array<T & { rank: number }> {
  return sortByRank(bids).map((bid, i) => ({ ...bid, rank: i + 1 }));
}

/** The live blind-mode rank of one bid (1-based), or null if absent. */
export function rankOf(bids: readonly Rankable[], bidId: string): number | null {
  const ranked = rankBids(bids);
  const found = ranked.find((b) => b.id === bidId);
  return found ? found.rank : null;
}

/** Lower of Stage-1 total and a (possibly null) Stage-2 rate. */
export function effectiveTotal(stage1Total: number, stage2Rate: number | null | undefined): number {
  if (stage2Rate == null || !Number.isFinite(stage2Rate)) return stage1Total;
  return Math.min(stage1Total, stage2Rate);
}

export function averageTotal(totals: readonly number[]): number {
  if (totals.length === 0) return 0;
  const sum = totals.reduce((acc, n) => acc + n, 0);
  return Math.round((sum / totals.length + Number.EPSILON) * 100) / 100;
}
