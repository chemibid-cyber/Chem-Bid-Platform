import { Skeleton } from '@/components/ui/skeleton';
import { FormSkeleton } from '@/components/app/loading-skeletons';

// Mirrors the bidding screen: dark Blind Board + bid form + spec side card.
export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-64" />
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl bg-graphite p-6">
            <Skeleton className="h-3 w-40 bg-white/10" />
            <Skeleton className="mt-4 h-16 w-32 bg-white/10" />
            <Skeleton className="mt-5 h-4 w-full bg-white/10" />
          </div>
          <FormSkeleton fields={4} />
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
    </div>
  );
}
