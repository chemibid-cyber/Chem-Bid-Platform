'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { submitBidAction, type BidFormState } from '../actions';
import { PAYMENT_TERMS_OPTIONS, UNIT_LABEL, formatRate } from '@/lib/format';
import { computeTaxFromPct, effectiveFreight, type LogisticsBasis } from '@/lib/pricing';
import { SubmitButton } from '@/components/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileDropzone } from '@/components/ui/file-dropzone';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface BidInitial {
  basic: string | null;
  freight: string | null;
  /** The tax % the seller entered (#19). Optional — the page may not thread it. */
  taxPct?: string | null;
  /**
   * @deprecated Tax is now entered as a % (`taxPct`). This holds the legacy
   * absolute ₹/unit amount; kept optional so the out-of-scope page that still
   * passes it keeps compiling. Not rendered — prefill reads `taxPct`.
   */
  tax?: string | null;
  paymentTerms: string | null;
  leadTimeDays: number | null;
  coaOnDispatch: boolean;
  hasCoa: boolean;
}

// #18: full payment-terms set MINUS 'other' (bids carry no custom-terms field).
const TERM_OPTIONS = PAYMENT_TERMS_OPTIONS.filter((t) => t.value !== 'other');

export function BidForm({
  auctionId,
  basis,
  unit,
  initial,
}: {
  auctionId: string;
  basis: LogisticsBasis;
  unit: string;
  initial: BidInitial;
}) {
  const [state, action] = useFormState<BidFormState, FormData>(submitBidAction, null);
  const [basic, setBasic] = useState(initial.basic ?? '');
  const [freight, setFreight] = useState(initial.freight ?? '');
  const [taxPct, setTaxPct] = useState(initial.taxPct ?? '');
  const [coaOnDispatch, setCoaOnDispatch] = useState(initial.coaOnDispatch);

  const unitLabel = UNIT_LABEL[unit] ?? unit;
  // #24: freight may be 0 (Delivered/Other) or forced 0 (Ex-Works). #19: tax is
  // a % of (material + effective freight); display the derived ₹/unit amount.
  const basicNum = Number(basic || 0);
  const freightNum = Number(freight || 0);
  const taxPctNum = Number(taxPct || 0);
  const taxAmount = computeTaxFromPct(taxPctNum, basicNum, freightNum, basis);
  const total = Math.max(0, basicNum) + effectiveFreight(freightNum, basis) + taxAmount;
  // #24: freight input is visible for both Delivered AND Other (0 is allowed).
  const showFreight = basis !== 'exworks';

  return (
    <form action={action} className="space-y-5">
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
      <input type="hidden" name="auctionId" value={auctionId} />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="basic">Material rate (₹/{unitLabel})</Label>
          <Input
            id="basic"
            name="basic"
            type="number"
            step="0.01"
            min="0"
            value={basic}
            onChange={(e) => setBasic(e.target.value)}
            required
          />
        </div>
        {showFreight ? (
          <div className="space-y-2">
            <Label htmlFor="freight">Transport (₹/{unitLabel})</Label>
            <Input
              id="freight"
              name="freight"
              type="number"
              step="0.01"
              min="0"
              value={freight}
              onChange={(e) => setFreight(e.target.value)}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">Enter 0 if freight is included or not applicable.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Transport</Label>
            <p className="flex h-10 items-center text-sm text-muted-foreground">
              Ex-Works — buyer arranges pickup.
            </p>
            <input type="hidden" name="freight" value="0" />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="taxPct">Tax (%)</Label>
          <Input
            id="taxPct"
            name="taxPct"
            type="number"
            step="0.01"
            min="0"
            value={taxPct}
            onChange={(e) => setTaxPct(e.target.value)}
            placeholder="0"
          />
          <p className="text-xs text-muted-foreground">
            {taxPctNum > 0 ? (
              <>
                {formatRate(taxPctNum)}% = ₹{formatRate(taxAmount)}/{unitLabel} (auto-calculated)
              </>
            ) : (
              <>Applied to material + transport.</>
            )}
          </p>
        </div>
      </div>

      <div className="rounded-md border bg-muted/30 p-3 text-sm">
        Total rate:{' '}
        <span className="text-base font-semibold">
          ₹{formatRate(total)}/{unitLabel}
        </span>{' '}
        <span className="text-muted-foreground">
          = material + transport + tax (₹{formatRate(taxAmount)}/{unitLabel}) · ranked on this full amount ·
          for the full quantity
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="paymentTerms">Payment terms</Label>
          <Select id="paymentTerms" name="paymentTerms" defaultValue={initial.paymentTerms ?? 'net30'}>
            {TERM_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="leadTimeDays">Lead time (days)</Label>
          <Input
            id="leadTimeDays"
            name="leadTimeDays"
            type="number"
            min="0"
            defaultValue={initial.leadTimeDays ?? ''}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3">
          <Checkbox
            id="coaOnDispatch"
            name="coaOnDispatch"
            checked={coaOnDispatch}
            onChange={(e) => setCoaOnDispatch(e.target.checked)}
          />
          <Label htmlFor="coaOnDispatch" className="font-normal">
            COA on dispatch (make-to-order) — I&apos;ll provide the Certificate of Analysis at dispatch
          </Label>
        </div>
        {!coaOnDispatch ? (
          <div className="space-y-1">
            <Label htmlFor="coaFile">Certificate of Analysis</Label>
            <FileDropzone id="coaFile" name="coaFile" accept="application/pdf,image/jpeg,image/png" hint="PDF, JPG or PNG" />
            {initial.hasCoa ? (
              <p className="text-xs text-muted-foreground">A COA is already attached — upload again to replace it.</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <SubmitButton>{initial.basic ? 'Revise bid' : 'Submit bid'}</SubmitButton>
    </form>
  );
}
