import {
  PageHeaderSkeleton,
  StatStripSkeleton,
  CardGridSkeleton,
  ListSkeleton,
} from '@/components/app/loading-skeletons';

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <StatStripSkeleton />
      <CardGridSkeleton count={4} />
      <ListSkeleton rows={4} />
    </div>
  );
}
