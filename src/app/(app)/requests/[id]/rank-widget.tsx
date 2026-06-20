'use client';

import { useCallback, useEffect, useState } from 'react';
import { getMyRankAction } from '../actions';
import { createClient } from '@/lib/supabase/client';

/**
 * Blind-mode rank. The rank is computed server-side (getMyRankAction); the client
 * only ever learns its own position — never a competitor's price or identity.
 * Refreshes on an interval, plus a best-effort Realtime trigger (active once the
 * Prompt-7 RLS policies allow the seller to receive change events).
 */
export function RankWidget({ auctionId }: { auctionId: string }) {
  const [rank, setRank] = useState<number | null>(null);
  const [of, setOf] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const refresh = useCallback(async () => {
    try {
      const r = await getMyRankAction(auctionId);
      setRank(r.rank);
      setOf(r.of);
      setUpdatedAt(Date.now());
    } catch {
      /* ignore transient errors */
    }
  }, [auctionId]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 12000);
    // Ticking "updated Xm ago" clock — purely presentational.
    const tick = setInterval(() => setNow(Date.now()), 30000);

    let cleanup = () => {};
    try {
      const supabase = createClient();
      const channel = supabase
        .channel(`bids-${auctionId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'bids', filter: `auction_id=eq.${auctionId}` },
          () => refresh(),
        )
        .subscribe();
      cleanup = () => {
        supabase.removeChannel(channel);
      };
    } catch {
      /* realtime unavailable — interval still refreshes */
    }

    return () => {
      clearInterval(interval);
      clearInterval(tick);
      cleanup();
    };
  }, [auctionId, refresh]);

  const updatedLabel = (() => {
    if (updatedAt == null) return 'updating…';
    const mins = Math.floor((now - updatedAt) / 60000);
    if (mins <= 0) return 'updated just now';
    return `updated ${mins}m ago`;
  })();

  return (
    <div className="rounded-2xl bg-graphite p-6 text-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="livedot inline-block h-2 w-2 rounded-full bg-live" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">
            Live · Your blind rank
          </span>
        </div>
        <span className="text-xs tabular-nums text-white/60">{updatedLabel}</span>
      </div>

      {rank ? (
        <>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-6xl font-extrabold leading-none tracking-tight tabular-nums">
              #{rank}
            </span>
            <span className="text-xl font-medium text-white/60">
              / {of} seller{of === 1 ? '' : 's'}
            </span>
          </div>
          <div className="my-4 h-px bg-white/10" />
          <p className="max-w-[56ch] text-sm leading-relaxed text-white/70">
            Ranked by lowest total rate. You never see a rival&apos;s price, and rival sellers never
            see you — only your own blind rank. Lower your total before close to climb; you can
            revise once.
          </p>
        </>
      ) : (
        <>
          <div className="my-4 h-px bg-white/10" />
          <p className="text-sm leading-relaxed text-white/70">
            Submit your bid to see your live blind rank.
          </p>
        </>
      )}
    </div>
  );
}
