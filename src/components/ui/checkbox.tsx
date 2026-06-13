import * as React from 'react';
import { cn } from '@/lib/utils';

/** Native checkbox, styled with the brand accent. Use with a sibling <Label>. */
export type CheckboxProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => (
    <input
      type="checkbox"
      ref={ref}
      className={cn(
        // Native checkbox tinted with the brand accent — `accent-color` renders a
        // crisp filled box + white tick when checked in all current browsers
        // (Chrome 93+, Firefox 92+, Safari 15.4+). `align-middle` keeps it on the
        // text baseline next to its label. (An earlier appearance-none + data-URL
        // SVG approach broke the webpack CSS build, so we stay native here.)
        'h-4 w-4 shrink-0 cursor-pointer rounded-[5px] border border-input accent-brand align-middle',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
);
Checkbox.displayName = 'Checkbox';
