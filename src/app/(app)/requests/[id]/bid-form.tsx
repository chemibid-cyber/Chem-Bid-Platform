'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { submitBidAction, type BidFormState } from '../actions';
import { PAYMENT_TERMS_LABEL, UNIT_LABEL, formatRate } from '@/lib/format';
import { SubmitButton } from '@/components/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface BidInitial {
  basic: string | null;
  freight: string | null;
  paymentTerms: string | null;
  leadTimeDays: number | null;
  coaOnDispatch: boolean;
  hasCoa: boolean;
}

const TERMS = ['advance', 'net15', 'net30', 'net45', 'lc'];

export function BidForm({
  auctionId,
  basis,
  unit,
  initial,
}: {
  auctionId: string;
  basis: 'delivered' | 'exworks';
  unit: string;
  initial: BidInitial;
}) {
  const [state, action] = useFormState<BidFormState, FormData>(submitBidAction, null);
  const [basic, setBasic] = useState(initial.basic ?? '');
  const [freight, setFreight] = useState(initial.freight ?? '');
  const [coaOnDispatch, setCoaOnDispatch] = useState(initial.coaOnDispatch);

  const unitLabel = UNIT_LABEL[unit] ?? unit;
  const total = Number(basic || 0) + (basis === 'exworks' ? 0 : Number(freight || 0));

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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="basic">Basic rate (₹/{unitLabel})</Label>
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
        {basis === 'delivered' ? (
          <div className="space-y-2">
            <Label htmlFor="freight">Freight rate (₹/{unitLabel})</Label>
            <Input
              id="freight"
              name="freight"
              type="number"
              step="0.01"
              min="0"
              value={freight}
              onChange={(e) => setFreight(e.target.value)}
              required
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Freight</Label>
            <p className="flex h-10 items-center text-sm text-muted-foreground">
              Ex-Works — you don&apos;t quote freight (buyer arranges pickup).
            </p>
            <input type="hidden" name="freight" value="0" />
          </div>
        )}
      </div>

      <div className="rounded-md border bg-muted/30 p-3 text-sm">
        Total rate:{' '}
        <span className="text-base font-semibold">
          ₹{formatRate(total)}/{unitLabel}
        </span>{' '}
        <span className="text-muted-foreground">(for the full quantity)</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="paymentTerms">Payment terms</Label>
          <Select id="paymentTerms" name="paymentTerms" defaultValue={initial.paymentTerms ?? 'net30'}>
            {TERMS.map((t) => (
              <option key={t} value={t}>
                {PAYMENT_TERMS_LABEL[t]}
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
            <Label htmlFor="coaFile">Certificate of Analysis (PDF/JPG/PNG)</Label>
            <Input id="coaFile" name="coaFile" type="file" accept="application/pdf,image/jpeg,image/png" />
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
