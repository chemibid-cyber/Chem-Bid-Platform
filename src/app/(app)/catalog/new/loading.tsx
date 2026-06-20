import { PageHeaderSkeleton, FormSkeleton } from '@/components/app/loading-skeletons';

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <FormSkeleton fields={5} />
    </div>
  );
}
