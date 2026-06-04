'use client';

import { useState, useTransition } from 'react';
import { useFormState } from 'react-dom';
import { setMarketingOptOutAction, requestDeletionAction, type DataFormState } from './actions';
import { SubmitButton } from '@/components/submit-button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function MarketingToggle({ optOut }: { optOut: boolean }) {
  const [checked, setChecked] = useState(!optOut); // checked = subscribed
  const [pending, start] = useTransition();
  return (
    <label className="flex items-center gap-2 text-sm" aria-busy={pending}>
      <Checkbox
        checked={checked}
        onChange={(e) => {
          setChecked(e.target.checked);
          start(() => setMarketingOptOutAction(!e.target.checked));
        }}
      />
      Receive non-transactional emails (product updates, market feed). Auction emails are always
      sent and clearly labelled.
    </label>
  );
}

export function DeletionForm() {
  const [state, action] = useFormState<DataFormState, FormData>(requestDeletionAction, null);
  return (
    <form action={action} className="space-y-3">
      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="confirm">
          Type <strong>DELETE</strong> to request account deletion
        </Label>
        <Input id="confirm" name="confirm" placeholder="DELETE" className="max-w-xs" />
        <p className="text-xs text-muted-foreground">
          This soft-disables your account and queues a purge of personal data, subject to a legal
          hold if a dispute is open. Audit history is preserved.
        </p>
      </div>
      <SubmitButton variant="destructive" size="sm">
        Request deletion
      </SubmitButton>
    </form>
  );
}
