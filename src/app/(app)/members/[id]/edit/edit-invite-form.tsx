'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { editInvitedMemberAction, type MemberFormState } from '../../actions';
import { SubmitButton } from '@/components/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface EditInviteDefaults {
  memberId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  designation: string;
}

export function EditInviteForm({ defaults }: { defaults: EditInviteDefaults }) {
  const [state, action] = useFormState<MemberFormState, FormData>(editInvitedMemberAction, null);
  const [email, setEmail] = useState(defaults.email);
  const emailChanged = email.trim().toLowerCase() !== defaults.email.toLowerCase();

  return (
    <form action={action} className="space-y-4">
      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <input type="hidden" name="memberId" value={defaults.memberId} />

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" name="firstName" defaultValue={defaults.firstName} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" name="lastName" defaultValue={defaults.lastName} required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Corporate email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {emailChanged ? (
          <p className="text-xs text-muted-foreground">
            Changing the email will re-send the invite to the new address. The old link stops
            working.
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" defaultValue={defaults.phone} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="designation">Designation</Label>
          <Input id="designation" name="designation" defaultValue={defaults.designation} />
        </div>
      </div>

      <SubmitButton>Save changes</SubmitButton>
    </form>
  );
}
