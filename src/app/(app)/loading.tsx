import { PageHeaderSkeleton, CardGridSkeleton } from '@/components/app/loading-skeletons';

// Universal fallback for any authed page without its own loading.tsx.
export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <CardGridSkeleton count={4} />
    </div>
  );
}
