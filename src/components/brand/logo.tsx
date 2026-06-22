import { cn } from '@/lib/utils';

/**
 * ChemiBid mark — a benzene-style hexagon (chemistry) with a live "bid" node at
 * the top vertex (the same green pulse used on the Blind Board). Uses
 * currentColor so it tints with its parent (e.g. text-live on a graphite tile).
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <polygon
        points="12,3 19.79,7.5 19.79,16.5 12,21 4.21,16.5 4.21,7.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="3" r="2.5" fill="currentColor" />
    </svg>
  );
}

/** The standard app logo lockup: a graphite tile with the green mark inside.
 *  Size + radius come from className so callers control scale. */
export function LogoTile({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-lg bg-graphite text-live',
        className,
      )}
    >
      <LogoMark className="h-3/5 w-3/5" />
    </span>
  );
}
