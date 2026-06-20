'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { addMemberAction, type MemberFormState } from './actions';
import { SubmitButton } from '@/components/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function AddMemberForm() {
  const [state, action] = useFormState<MemberFormState, FormData>(addMemberAction, null);
  // #34: enforce >=1 capability on the client (server re-checks in addMemberAction).
  // The checkboxes keep their `name` so they still serialize via FormData (server
  // reads `canBuy === 'on'`); the mirrored state only gates submit + shows a hint.
  const [canBuy, setCanBuy] = useState(false);
  const [canSell, setCanSell] = useState(false);
  const [capError, setCapError] = useState<string | null>(null);
  const noCapability = !canBuy && !canSell;

  return (
    <form
      action={action}
      className="space-y-4"
      onSubmit={(e) => {
        if (noCapability) {
          e.preventDefault();
          setCapError('Select at least one capability: Buy or Sell.');
        }
      }}
    >
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

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" name="firstName" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" name="lastName" required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Corporate email</Label>
        <Input id="email" name="email" type="email" required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="designation">Designation</Label>
          <Input id="designation" name="designation" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="team">Team</Label>
        <Input id="team" name="team" placeholder="e.g. Solvents" />
      </div>

      <div className="space-y-2">
        <Label>Capabilities</Label>
        <div className="flex flex-wrap gap-3 rounded-xl bg-muted/40 p-3">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm leading-none">
            <Checkbox
              name="canBuy"
              checked={canBuy}
              onChange={(e) => {
                setCanBuy(e.target.checked);
                if (e.target.checked || canSell) setCapError(null);
              }}
            />
            <span>Can buy</span>
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm leading-none">
            <Checkbox
              name="canSell"
              checked={canSell}
              onChange={(e) => {
                setCanSell(e.target.checked);
                if (e.target.checked || canBuy) setCapError(null);
              }}
            />
            <span>Can sell</span>
          </label>
        </div>
        <p className="text-xs text-muted-foreground">Pick at least one — Buy, Sell, or both.</p>
        {capError ? <p className="text-xs text-destructive">{capError}</p> : null}
      </div>

      <SubmitButton disabled={noCapability}>Send invite</SubmitButton>
    </form>
  );
}
