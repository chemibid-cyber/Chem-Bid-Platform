import { Skeleton } from '@/components/ui/skeleton';

/**
 * Reusable loading skeletons that mirror the app's layouts, so route-level
 * loading.tsx files can show a shape-matching placeholder during navigation.
 * All use the design tokens (rounded-2xl, shadow-card, bg-card) so they read as
 * the real thing arriving, not a generic spinner.
 */

export function PageHeaderSkeleton() {
  return (
    <div className="space-y-2.5">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80 max-w-full" />
    </div>
  );
}

export function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl bg-card p-5 shadow-card">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}

/** Record list — a card of divided rows (auctions, requests, catalog, members…). */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-card shadow-card">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-4 border-b border-border/60 p-4 last:border-0"
        >
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-48 max-w-full" />
            <Skeleton className="h-3 w-72 max-w-full" />
          </div>
          <Skeleton className="h-8 w-24 shrink-0 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <div className="rounded-2xl bg-card p-6 shadow-card">
      <Skeleton className="h-6 w-40" />
      <div className="mt-6 space-y-5">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
        ))}
        <Skeleton className="h-11 w-36 rounded-lg" />
      </div>
    </div>
  );
}

/** The dashboard's divided metric strip (3 big numbers). */
export function StatStripSkeleton() {
  return (
    <div className="flex divide-x divide-border rounded-2xl bg-card shadow-card">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex-1 p-6">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-3 h-9 w-14" />
        </div>
      ))}
    </div>
  );
}

/** A detail page: a couple of stacked content cards + a side card. */
export function DetailSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <div className="space-y-4">
        <div className="rounded-2xl bg-card p-6 shadow-card">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-5/6" />
          <Skeleton className="mt-2 h-4 w-3/4" />
        </div>
        <div className="rounded-2xl bg-card p-6 shadow-card">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-4 h-24 w-full rounded-lg" />
        </div>
      </div>
      <div className="rounded-2xl bg-card p-6 shadow-card">
        <Skeleton className="h-4 w-32" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Centered branded spinner — for light pages where a skeleton is overkill. */
export function CenteredSpinner() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-brand" />
    </div>
  );
}
