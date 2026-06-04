'use client';

import { useFormState } from 'react-dom';
import { registerPartnerAction, type NetworkFormState } from './actions';
import { SubmitButton } from '@/components/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function AddPartnerForm() {
  const [state, action] = useFormState<NetworkFormState, FormData>(registerPartnerAction, null);

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

      <div className="space-y-2">
        <Label htmlFor="partnerGstin">Partner GSTIN</Label>
        <Input id="partnerGstin" name="partnerGstin" placeholder="24ABCDE1234F1Z5" maxLength={15} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="casNumber">CAS number</Label>
        <Input id="casNumber" name="casNumber" placeholder="108-88-3" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="partnerEmail">Partner email (optional)</Label>
        <Input id="partnerEmail" name="partnerEmail" type="email" placeholder="To invite them if not yet on the platform" />
      </div>
      <SubmitButton>Register partner</SubmitButton>
    </form>
  );
}
