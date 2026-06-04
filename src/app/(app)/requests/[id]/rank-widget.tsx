'use client';

import { useCallback, useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
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

  const refresh = useCallback(async () => {
    try {
      const r = await getMyRankAction(auctionId);
      setRank(r.rank);
      setOf(r.of);
    } catch {
      /* ignore transient errors */
    }
  }, [auctionId]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 12000);

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
      cleanup();
    };
  }, [auctionId, refresh]);

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
      <Trophy className="h-7 w-7 text-primary" />
      <div>
        {rank ? (
          <>
            <p className="text-2xl font-bold leading-none">#{rank}</p>
            <p className="text-sm text-muted-foreground">
              of {of} live bid{of === 1 ? '' : 's'} · by lowest total rate
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Submit your bid to see your live rank.</p>
        )}
      </div>
    </div>
  );
}
