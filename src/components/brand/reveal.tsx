import { cn } from '@/lib/utils';

/**
 * Entrance animation wrapper — PURE CSS, no JavaScript. The content's natural
 * state is fully visible; the `.reveal` keyframe only animates it IN. So if JS
 * never runs, hydration lags, or motion is reduced, the content is still shown
 * (a fade can never leave the landing blank). `delay` staggers siblings.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn('reveal', className)}
      style={delay ? { animationDelay: `${delay}ms`, ...style } : style}
    >
      {children}
    </div>
  );
}
