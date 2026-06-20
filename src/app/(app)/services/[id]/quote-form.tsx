'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { submitServiceQuoteAction, type ServiceFormState } from '../actions';
import { transportTotal, packingTotal } from '@/lib/services/totals';
import { formatINR } from '@/lib/format';
import { SubmitButton } from '@/components/submit-button';
import { DecimalInput } from '@/components/ui/decimal-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface QuoteInitial {
  baseRate: string | null;
  taxAmount: string | null;
  altPaymentTerms: string | null;
  note: string | null;
}

export function ServiceQuoteForm({
  requestId,
  kind,
  quantity,
  baselineTerms,
  initial,
}: {
  requestId: string;
  kind: 'transport' | 'packing';
  quantity: number;
  baselineTerms: string;
  initial: QuoteInitial;
}) {
  const [state, action] = useFormState<ServiceFormState, FormData>(submitServiceQuoteAction, null);
  const [baseRate, setBaseRate] = useState(initial.baseRate ?? '');
  const [tax, setTax] = useState(initial.taxAmount ?? '');
  const [altTerms, setAltTerms] = useState(Boolean(initial.altPaymentTerms));

  const rate = Number(baseRate || 0);
  const taxAbs = Number(tax || 0);
  const total = kind === 'transport' ? transportTotal(rate, quantity, taxAbs) : packingTotal(rate, quantity, taxAbs);
  const rateUnit = kind === 'transport' ? '₹/kg' : '₹/piece';
  const qtyLabel = kind === 'transport' ? `${quantity.toLocaleString('en-IN')} kg` : `${quantity.toLocaleString('en-IN')} pcs`;

  return (
    <form action={action} className="space-y-4">
      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      {state?.success ? (
        <Alert variant="success">
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      ) : null}
      <input type="hidden" name="requestId" value={requestId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="baseRate">Base rate ({rateUnit})</Label>
          <DecimalInput
            id="baseRate"
            name="baseRate"
            maxDecimals={2}
            min="0"
            value={baseRate}
            onChange={(e) => setBaseRate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="taxAmount">Tax — absolute (₹)</Label>
          <DecimalInput
            id="taxAmount"
            name="taxAmount"
            maxDecimals={2}
            min="0"
            value={tax}
            onChange={(e) => setTax(e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      <div className="rounded-xl border bg-muted/30 p-3 text-sm">
        Total cost:{' '}
        <span className="font-display text-base font-semibold tabular-nums">{formatINR(total)}</span>{' '}
        <span className="tabular-nums text-muted-foreground">
          = base rate × {qtyLabel} + tax
        </span>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 rounded-xl border bg-muted/20 p-3 text-sm">
          <Checkbox
            name="altTermsToggle"
            checked={altTerms}
            onChange={(e) => setAltTerms(e.target.checked)}
          />
          I can&apos;t accept the baseline payment terms ({baselineTerms}) — propose alternative terms
        </label>
        {altTerms ? (
          <Textarea
            name="altPaymentTerms"
            placeholder="e.g. 50% advance against PI, balance Net 15 from LR date"
            defaultValue={initial.altPaymentTerms ?? ''}
          />
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">Note (optional)</Label>
        <Textarea id="note" name="note" defaultValue={initial.note ?? ''} placeholder="Availability, validity, conditions…" />
      </div>

      <SubmitButton>{initial.baseRate ? 'Revise quote' : 'Submit quote'}</SubmitButton>
    </form>
  );
}
