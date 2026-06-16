'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { createPackingRequestAction, type ServiceFormState } from '../../actions';
import { PACKING_TYPES, PACKING_CONDITIONS } from '@/lib/services/constants';
import { PAYMENT_TERMS_LABEL } from '@/lib/format';
import { SubmitButton } from '@/components/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

const TERMS = ['advance', 'net15', 'net30', 'net45', 'lc'];

export function PackingRequestForm() {
  const [state, action] = useFormState<ServiceFormState, FormData>(createPackingRequestAction, null);
  const [packingType, setPackingType] = useState('drums');

  return (
    <form action={action} className="space-y-5">
      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="packingType">Packing type</Label>
          <Select
            id="packingType"
            name="packingType"
            value={packingType}
            onChange={(e) => setPackingType(e.target.value)}
          >
            {PACKING_TYPES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
            <option value="other">Other (specify)…</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="condition">Condition</Label>
          <Select id="condition" name="condition" defaultValue="new">
            {PACKING_CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="quantityPieces">Quantity (pieces)</Label>
          <Input id="quantityPieces" name="quantityPieces" type="number" min="1" step="1" required />
        </div>
      </div>

      {packingType === 'other' ? (
        <div className="space-y-2">
          <Label htmlFor="packingTypeOther">Specify packing type</Label>
          <Input
            id="packingTypeOther"
            name="packingTypeOther"
            maxLength={80}
            required
            placeholder="e.g. Glass bottles, jerry cans, composite IBCs"
          />
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="materialSpec">Specification of material (optional)</Label>
        <Textarea
          id="materialSpec"
          name="materialSpec"
          placeholder="e.g. Epoxy-phenolic lined MS, 1.2 mm wall; or food-grade virgin HDPE"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="weightPerPiece">Weight / capacity per piece (optional)</Label>
          <Input id="weightPerPiece" name="weightPerPiece" placeholder="e.g. 9 kg tare · 200 L" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="logisticsBasis">Logistics basis</Label>
          <Select id="logisticsBasis" name="logisticsBasis" defaultValue="delivered">
            <option value="delivered">Delivered (supplier delivers to you)</option>
            <option value="exworks">Ex-Works (you fetch from the supplier)</option>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="paymentTerms">Baseline payment terms</Label>
        <Select id="paymentTerms" name="paymentTerms" defaultValue="net30">
          {TERMS.map((t) => (
            <option key={t} value={t}>
              {PAYMENT_TERMS_LABEL[t]}
            </option>
          ))}
        </Select>
        <p className="text-xs text-muted-foreground">
          A primary negotiation parameter — suppliers who can&apos;t accept it will propose
          alternative terms with their quote.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Other description (optional)</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Custom dimensions, bung closures, labelling requirements…"
        />
      </div>

      <SubmitButton>Publish packing inquiry</SubmitButton>
    </form>
  );
}
