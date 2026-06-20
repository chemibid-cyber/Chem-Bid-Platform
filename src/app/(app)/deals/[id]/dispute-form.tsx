'use client';

import { useFormState } from 'react-dom';
import { raiseDisputeAction, type DealFormState } from '../actions';
import { SubmitButton } from '@/components/submit-button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileDropzone } from '@/components/ui/file-dropzone';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function DisputeForm({ dealId }: { dealId: string }) {
  const [state, action] = useFormState<DealFormState, FormData>(raiseDisputeAction, null);
  return (
    <form action={action} className="space-y-3">
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
      <input type="hidden" name="dealId" value={dealId} />
      <div className="space-y-2">
        <Label htmlFor="reason">What went wrong?</Label>
        <Textarea id="reason" name="reason" placeholder="Describe the issue (e.g. goods not dispatched, quality mismatch)." required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="evidence">Evidence (optional)</Label>
        <FileDropzone id="evidence" name="evidence" accept="application/pdf,image/jpeg,image/png" hint="PDF, JPG or PNG" />
      </div>
      <SubmitButton variant="destructive">Raise dispute</SubmitButton>
    </form>
  );
}
