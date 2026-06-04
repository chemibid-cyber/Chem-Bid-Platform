'use client';

import { useFormState } from 'react-dom';
import { refreshGstAction } from './actions';
import { SubmitButton } from '@/components/submit-button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function GstRefreshForm() {
  const [state, action] = useFormState(refreshGstAction, null);
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
      <SubmitButton variant="outline" size="sm">
        Refresh from GST
      </SubmitButton>
    </form>
  );
}
