import { describe, it, expect } from 'vitest';
import { sortByRank, rankBids, rankOf, effectiveTotal, averageTotal } from './ranking';

const t = (s: string) => new Date(s);

describe('ranking', () => {
  it('ranks lowest total first', () => {
    const bids = [
      { id: 'a', total: 110, createdAt: t('2026-06-01T10:00:00Z') },
      { id: 'b', total: 100, createdAt: t('2026-06-01T11:00:00Z') },
      { id: 'c', total: 105, createdAt: t('2026-06-01T09:00:00Z') },
    ];
    expect(sortByRank(bids).map((b) => b.id)).toEqual(['b', 'c', 'a']);
  });

  it('breaks ties by EARLIER timestamp', () => {
    const bids = [
      { id: 'late', total: 100, createdAt: t('2026-06-01T12:00:00Z') },
      { id: 'early', total: 100, createdAt: t('2026-06-01T08:00:00Z') },
    ];
    const ranked = rankBids(bids);
    expect(ranked[0]!.id).toBe('early');
    expect(ranked[0]!.rank).toBe(1);
    expect(ranked[1]!.rank).toBe(2);
  });

  it('reports the rank of a specific bid', () => {
    const bids = [
      { id: 'a', total: 110, createdAt: t('2026-06-01T10:00:00Z') },
      { id: 'b', total: 100, createdAt: t('2026-06-01T11:00:00Z') },
    ];
    expect(rankOf(bids, 'a')).toBe(2);
    expect(rankOf(bids, 'b')).toBe(1);
    expect(rankOf(bids, 'missing')).toBeNull();
  });

  it('takes the LOWER of stage1/stage2 (super-comparison)', () => {
    expect(effectiveTotal(100, null)).toBe(100); // no stage2 → stage1 stands
    expect(effectiveTotal(100, 90)).toBe(90); // stage2 lower
    expect(effectiveTotal(100, 120)).toBe(100); // stage2 higher (shouldn't happen, but safe)
  });

  it('averages totals to 2dp', () => {
    expect(averageTotal([100, 110, 105])).toBe(105);
    expect(averageTotal([])).toBe(0);
  });
});
