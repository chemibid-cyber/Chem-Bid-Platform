'use client';

import { useFormState } from 'react-dom';
import { addMemberAction, type MemberFormState } from './actions';
import { SubmitButton } from '@/components/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function AddMemberForm() {
  const [state, action] = useFormState<MemberFormState, FormData>(addMemberAction, null);

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
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox name="canBuy" defaultChecked /> Can buy
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox name="canSell" defaultChecked /> Can sell
          </label>
        </div>
      </div>

      <SubmitButton>Send invite</SubmitButton>
    </form>
  );
}
