import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The persona help layer (DESIGN.md §1). Explain the PLATFORM, never the chemistry.
 * Use at most one affordance per concept per screen.
 */

/** Quiet one-liner under a control or section — for first-encounter mechanics. */
export function Hint({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn('text-xs leading-relaxed text-muted-foreground', className)}>{children}</p>;
}

/** A small ⓘ whose tooltip explains a platform concept (hover + keyboard focus). */
export function InfoTip({ label, className }: { label: string; className?: string }) {
  return (
    <span
      tabIndex={0}
      role="note"
      className={cn('group relative inline-flex align-middle outline-none', className)}
    >
      <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground/70 transition-colors group-hover:text-brand group-focus:text-brand" />
      <span className="sr-only">{label}</span>
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 hidden w-60 -translate-x-1/2 rounded-lg border bg-popover px-3 py-2 text-xs font-normal leading-relaxed text-popover-foreground shadow-md group-hover:block group-focus:block"
      >
        {label}
      </span>
    </span>
  );
}

const calloutVariants = cva('flex gap-2.5 rounded-lg border p-3 text-sm leading-relaxed', {
  variants: {
    variant: {
      brand: 'border-brand/20 bg-brand/5 text-foreground [&_svg]:text-brand',
      info: 'border-border bg-muted/50 text-foreground [&_svg]:text-muted-foreground',
      warning: 'border-warning/30 bg-warning/10 text-foreground [&_svg]:text-warning',
    },
  },
  defaultVariants: { variant: 'info' },
});

/** Boxed note for an important, easy-to-misread mechanic (blind mode, Stage-2). */
export function Callout({
  variant,
  icon: Icon,
  title,
  children,
  className,
}: VariantProps<typeof calloutVariants> & {
  icon?: React.ComponentType<{ className?: string }>;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(calloutVariants({ variant }), className)}>
      {Icon ? <Icon className="mt-0.5 h-4 w-4 shrink-0" /> : null}
      <div>
        {title ? <p className="mb-0.5 font-medium">{title}</p> : null}
        <div className="text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

/** Teaches the next action when there's no data — never just "No data". */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <p className="font-semibold">{title}</p>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}
