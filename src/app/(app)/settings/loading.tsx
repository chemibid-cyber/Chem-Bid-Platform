import { PageHeaderSkeleton, CardGridSkeleton } from '@/components/app/loading-skeletons';

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <CardGridSkeleton count={2} />
    </div>
  );
}
