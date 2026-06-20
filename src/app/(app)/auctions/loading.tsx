import { PageHeaderSkeleton, ListSkeleton } from '@/components/app/loading-skeletons';

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <ListSkeleton rows={5} />
    </div>
  );
}
