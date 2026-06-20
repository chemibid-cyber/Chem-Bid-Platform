import { PageHeaderSkeleton, CardGridSkeleton, ListSkeleton } from '@/components/app/loading-skeletons';

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <CardGridSkeleton count={3} />
      <ListSkeleton rows={4} />
    </div>
  );
}
