import {
  PageHeaderSkeleton,
  StatStripSkeleton,
  CardGridSkeleton,
} from '@/components/app/loading-skeletons';

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <StatStripSkeleton />
      <CardGridSkeleton count={4} />
    </div>
  );
}
