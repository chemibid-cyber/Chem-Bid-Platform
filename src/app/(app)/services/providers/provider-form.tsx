'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { upsertProviderProfileAction, type ServiceFormState } from '../actions';
import { VEHICLE_TYPES, PACKING_TYPES } from '@/lib/services/constants';
import { SubmitButton } from '@/components/submit-button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface ProviderInitial {
  isTransporter: boolean;
  vehicleTypes: string[];
  isPackingSupplier: boolean;
  packingTypes: string[];
}

export function ProviderProfileForm({ initial }: { initial: ProviderInitial }) {
  const [state, action] = useFormState<ServiceFormState, FormData>(upsertProviderProfileAction, null);
  const [isTransporter, setIsTransporter] = useState(initial.isTransporter);
  const [isPackingSupplier, setIsPackingSupplier] = useState(initial.isPackingSupplier);

  return (
    <form action={action} className="space-y-6">
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

      <div className="space-y-3 rounded-xl border p-4">
        <label className="flex items-center gap-2 font-medium">
          <Checkbox
            name="isTransporter"
            checked={isTransporter}
            onChange={(e) => setIsTransporter(e.target.checked)}
          />
          We operate transport assets
        </label>
        {isTransporter ? (
          <div className="space-y-2 pl-6">
            <Label>Vehicle classes you run</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {VEHICLE_TYPES.map((v) => (
                <label key={v.value} className="flex items-center gap-2 rounded-xl border bg-muted/20 p-2.5 text-sm">
                  <Checkbox
                    name="vehicleTypes"
                    value={v.value}
                    defaultChecked={initial.vehicleTypes.includes(v.value)}
                  />
                  {v.label}
                </label>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-3 rounded-xl border p-4">
        <label className="flex items-center gap-2 font-medium">
          <Checkbox
            name="isPackingSupplier"
            checked={isPackingSupplier}
            onChange={(e) => setIsPackingSupplier(e.target.checked)}
          />
          We supply packing material
        </label>
        {isPackingSupplier ? (
          <div className="space-y-2 pl-6">
            <Label>Packing types you stock</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {PACKING_TYPES.map((p) => (
                <label key={p.value} className="flex items-center gap-2 rounded-xl border bg-muted/20 p-2.5 text-sm">
                  <Checkbox
                    name="packingTypes"
                    value={p.value}
                    defaultChecked={initial.packingTypes.includes(p.value)}
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <p className="text-sm text-muted-foreground">
        The moment a needer publishes an inquiry under your asset class, you get a high-priority
        email — no dashboard refreshing needed. Untick both to stop receiving inquiries.
      </p>

      <SubmitButton>Save provider profile</SubmitButton>
    </form>
  );
}
