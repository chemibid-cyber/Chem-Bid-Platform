import * as React from 'react';
import { cn } from '@/lib/utils';

/** "Soon" pill for features that are intentionally deferred (Phase 2+). */
export function ComingSoonBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-brand/20 bg-brand/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand',
        className,
      )}
    >
      Soon
    </span>
  );
}

/** A roadmap tile — clearly not-yet-live, but signposted so the product feels whole. */
export function ComingSoonCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/30 p-5">
      <div className="flex items-center justify-between">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <ComingSoonBadge />
      </div>
      <h3 className="mt-3 font-semibold tracking-tight">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}
