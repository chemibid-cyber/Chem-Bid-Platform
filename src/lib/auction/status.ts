import type { BadgeProps } from '@/components/ui/badge';

type Variant = NonNullable<BadgeProps['variant']>;

export const AUCTION_STATUS_META: Record<string, { label: string; variant: Variant }> = {
  draft: { label: 'Draft', variant: 'outline' },
  active: { label: 'Active', variant: 'success' },
  awaiting_decision: { label: 'Awaiting decision', variant: 'warning' },
  closed: { label: 'Closed', variant: 'secondary' },
  unsuccessful: { label: 'Unsuccessful', variant: 'secondary' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
};

export function auctionStatusMeta(status: string): { label: string; variant: Variant } {
  return AUCTION_STATUS_META[status] ?? { label: status, variant: 'outline' };
}
