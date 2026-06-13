'use client';

import * as React from 'react';
import { pollNewNotifications, type PolledNotification } from '@/app/(app)/notifications/poll-actions';
import { useToast } from '@/components/ui/toaster';
import { UNIT_LABEL } from '@/lib/format';

const POLL_INTERVAL_MS = 15000;

/** Minimal type→title map, mirrored from notifications/page.tsx (out of scope to edit). */
const s = (v: unknown) => (v == null ? '' : String(v));

function toView(type: string, p: Record<string, unknown>): { title: string; href: string | null } {
  const auctionId = s(p.auctionId);
  const unit = UNIT_LABEL[s(p.unit)] ?? s(p.unit);
  switch (type) {
    case 'auction.new':
      return { title: `New requirement: ${s(p.name)} (${s(p.quantity)} ${unit})`, href: `/requests/${auctionId}` };
    case 'auction.bids_ready':
      return { title: `Bids are in for "${s(p.name)}" — review and settle`, href: `/auctions/${auctionId}/review` };
    case 'auction.unsuccessful':
      return { title: `"${s(p.name)}" closed with no bids — clone & relist?`, href: `/auctions/${auctionId}` };
    case 'auction.cancelled':
      return { title: `A requirement you engaged with was cancelled: "${s(p.name)}"`, href: `/requests/${auctionId}` };
    case 'auction.stage2':
      return { title: `Counter-offer: ₹${s(p.rate)}/${unit} material rate for "${s(p.name)}"`, href: `/requests/${auctionId}` };
    case 'counter_proposal.received':
      return { title: `A seller proposed changes to "${s(p.name)}"`, href: `/auctions/${auctionId}` };
    case 'counter_proposal.accepted':
      return { title: `The buyer accepted your proposed changes to "${s(p.name)}"`, href: `/requests/${auctionId}` };
    case 'counter_proposal.rejected':
      return { title: `The buyer declined your proposed changes to "${s(p.name)}"`, href: `/requests/${auctionId}` };
    case 'deal.won':
      return { title: `You won the deal for "${s(p.name)}"`, href: `/deals/${s(p.dealId)}` };
    case 'deal.confirmed':
      return { title: `Deal confirmed for "${s(p.name)}"`, href: `/deals/${s(p.dealId)}` };
    case 'network.added':
      return { title: `${s(p.buyerName)} added you to their vendor network (CAS ${s(p.casNumber)})`, href: `/network` };
    case 'catalog.transfer_requested':
      return { title: `${s(p.requestedBy)} requested transfer of "${s(p.name)}"`, href: `/catalog` };
    case 'service.inquiry':
      return { title: `New service inquiry: ${s(p.summary)}`, href: `/services/${s(p.requestId)}` };
    case 'service.quote':
      return {
        title: `${s(p.providerName)} quoted ₹${Number(p.total ?? 0).toLocaleString('en-IN')} — ${s(p.summary)}`,
        href: `/services/${s(p.requestId)}`,
      };
    case 'service.accepted':
      return { title: `Your quote was accepted: ${s(p.summary)}`, href: `/services/${s(p.requestId)}` };
    case 'service.cancelled':
      return { title: `Inquiry cancelled: ${s(p.summary)}`, href: `/services/${s(p.requestId)}` };
    default:
      return { title: 'New notification', href: '/notifications' };
  }
}

/**
 * Polls the server every ~15s for the user's NEW unread notifications and pops a
 * toast per new one. Polls only while the tab is visible. Baseline starts at mount
 * time, so existing history never toasts. Dedupes by notification id.
 */
export function NotificationToaster() {
  const { toast } = useToast();
  // Baseline timestamp: only notifications created strictly after this toast.
  const sinceRef = React.useRef<string>(new Date().toISOString());
  const seenRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      let fresh: PolledNotification[];
      try {
        fresh = await pollNewNotifications(sinceRef.current);
      } catch {
        return; // transient failure — try again on the next tick
      }
      if (cancelled || fresh.length === 0) return;

      // Server returns newest-first; advance the baseline to the newest seen.
      sinceRef.current = fresh[0].createdAt;

      // Toast oldest-first so the newest ends up on top of the stack.
      for (const n of [...fresh].reverse()) {
        if (seenRef.current.has(n.id)) continue;
        seenRef.current.add(n.id);
        const v = toView(n.type, n.payload);
        toast({ id: n.id, title: v.title, href: v.href });
      }
    }

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    // Poll immediately when the tab becomes visible again (after being hidden).
    function onVisible() {
      if (document.visibilityState === 'visible') void poll();
    }
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [toast]);

  return null;
}
