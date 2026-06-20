'use client';

import { useFormState } from 'react-dom';
import { createTransportRequestAction, type ServiceFormState } from '../../actions';
import { VEHICLE_TYPES } from '@/lib/services/constants';
import { PAYMENT_TERMS_LABEL } from '@/lib/format';
import { SubmitButton } from '@/components/submit-button';
import { PlacesInput } from '@/components/places-input';
import { Input } from '@/components/ui/input';
import { DecimalInput } from '@/components/ui/decimal-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';

const TERMS = ['advance', 'net15', 'net30', 'net45', 'lc'];

export function TransportRequestForm() {
  const [state, action] = useFormState<ServiceFormState, FormData>(createTransportRequestAction, null);

  return (
    <form action={action} className="space-y-5">
      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="materialName">Material name</Label>
        <Input id="materialName" name="materialName" placeholder="e.g. Toluene" required />
        <p className="text-xs text-muted-foreground">
          Carriers cross-reference safety data sheets and tank linings against this.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="totalQtyKg">Total quantity (kg)</Label>
          <DecimalInput id="totalQtyKg" name="totalQtyKg" maxDecimals={2} min="0" required />
          <p className="text-xs text-muted-foreground">
            Gross weight: chemical + packaging together.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="lotQtyKg">One-lot quantity (kg, optional)</Label>
          <DecimalInput id="lotQtyKg" name="lotQtyKg" maxDecimals={2} min="0" />
          <p className="text-xs text-muted-foreground">Max per truck/tanker load, incl. packing.</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Vehicle type (pick all that work)</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {VEHICLE_TYPES.map((v) => (
            <label key={v.value} className="flex items-center gap-2 rounded-xl border bg-muted/20 p-2.5 text-sm">
              <Checkbox name="vehicleTypes" value={v.value} />
              {v.label}
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <PlacesInput
          id="pickupAddress"
          name="pickupAddress"
          placeIdName="pickupPlaceId"
          label="Pickup location"
          required
        />
        <PlacesInput
          id="dropAddress"
          name="dropAddress"
          placeIdName="dropPlaceId"
          label="Drop location"
          required
        />
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
          A primary negotiation parameter — providers who can&apos;t accept it will propose
          alternative terms with their quote.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Other description (optional)</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Facility access limits, loading hours, safety handling declarations…"
        />
      </div>

      <SubmitButton>Publish transport inquiry</SubmitButton>
    </form>
  );
}
