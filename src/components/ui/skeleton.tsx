import { cn } from '@/lib/utils';

/** A shimmering placeholder block. Compose these to mirror a screen's layout
 *  while its data loads. Uses the muted token + Tailwind's pulse animation
 *  (auto-disabled under prefers-reduced-motion by the browser). */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />;
}
