'use client';

import * as React from 'react';
import { Input, type InputProps } from '@/components/ui/input';

export interface DecimalInputProps extends InputProps {
  /**
   * Maximum number of decimal places the field will accept. Extra digits are
   * truncated (NOT rounded) as the user types — e.g. with the default of 2,
   * "100.2567" becomes "100.25". Pass 0 to force integer-only entry.
   */
  maxDecimals?: number;
}

/**
 * #27 — money/quantity input with client-side decimal clamping.
 *
 * Wraps the shared <Input>, forces `type="number"` + `inputMode="decimal"`,
 * and clamps the typed value to at most `maxDecimals` decimal places before
 * forwarding the (clamped) change to the caller. Truncation (not rounding)
 * keeps the UX honest: a user never sees a digit they didn't type rounded up.
 *
 * Works for both controlled (`value` + `onChange`) and uncontrolled
 * (`defaultValue`) usage. For the uncontrolled case the DOM input value is
 * rewritten in place so the visible text always reflects the clamp. All other
 * Input props (id, name, min, max, required, placeholder, className, ref) are
 * forwarded untouched; `step` defaults to "0.01" for 2dp ("1" for integers).
 */
function clampDecimals(raw: string, maxDecimals: number): string {
  // Scientific notation ("1e-3", "2.5e3") is a valid number-input value, but the
  // dot-based truncation below would corrupt it (e.g. "2.5e3" → "2.5"). Leave it
  // untouched and let the server's round2(Number(...)) normalize it on submit.
  if (/[eE]/.test(raw)) return raw;
  // Leave non-numeric transient states ("", "-", ".") untouched — only clamp
  // once there's a fractional part with too many digits.
  const dot = raw.indexOf('.');
  if (dot === -1) return raw;
  if (maxDecimals <= 0) {
    // Integer-only: drop the decimal point and everything after it.
    return raw.slice(0, dot);
  }
  const decimals = raw.length - dot - 1;
  if (decimals <= maxDecimals) return raw;
  return raw.slice(0, dot + 1 + maxDecimals);
}

export const DecimalInput = React.forwardRef<HTMLInputElement, DecimalInputProps>(
  ({ maxDecimals = 2, onChange, step, ...props }, ref) => {
    const resolvedStep = step ?? (maxDecimals <= 0 ? '1' : `0.${'0'.repeat(maxDecimals - 1)}1`);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const clamped = clampDecimals(e.target.value, maxDecimals);
      if (clamped !== e.target.value) {
        // Rewrite the input's value so the visible text reflects the clamp in
        // both controlled and uncontrolled modes.
        e.target.value = clamped;
      }
      onChange?.(e);
    }

    return (
      <Input
        ref={ref}
        type="number"
        inputMode="decimal"
        step={resolvedStep}
        onChange={handleChange}
        {...props}
      />
    );
  },
);
DecimalInput.displayName = 'DecimalInput';
