'use client';

import { useState, useTransition } from 'react';
import { useFormState } from 'react-dom';
import { Loader2 } from 'lucide-react';
import {
  resolveDisputeAction,
  setGstVerificationAction,
  setSuspensionAction,
  resolveReportAction,
  type OperatorFormState,
} from './actions';
import { SubmitButton } from '@/components/submit-button';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function ResolveDisputeForm({ disputeId }: { disputeId: string }) {
  const [state, action] = useFormState<OperatorFormState, FormData>(resolveDisputeAction, null);
  return (
    <form action={action} className="space-y-2">
      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <input type="hidden" name="disputeId" value={disputeId} />
      <Textarea name="note" placeholder="Resolution note (what was decided)…" required />
      <SubmitButton size="sm">Resolve dispute</SubmitButton>
    </form>
  );
}

export function GstOverrideButtons({ companyId }: { companyId: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2">
      <Button variant="success" size="sm" disabled={pending} onClick={() => start(() => void setGstVerificationAction(companyId, 'verified'))}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Verify
      </Button>
      <Button variant="outline" size="sm" disabled={pending} onClick={() => start(() => void setGstVerificationAction(companyId, 'rejected'))}>
        Reject
      </Button>
    </div>
  );
}

export function SuspendButton({ companyId, suspended }: { companyId: string; suspended: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant={suspended ? 'outline' : 'destructive'}
      size="sm"
      disabled={pending}
      onClick={() => start(() => void setSuspensionAction(companyId, !suspended))}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {suspended ? 'Reinstate' : 'Suspend'}
    </Button>
  );
}

export function ResolveReportButton({ reportId }: { reportId: string }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending || done}
      onClick={() => start(async () => { await resolveReportAction(reportId); setDone(true); })}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {done ? 'Resolved' : 'Mark resolved'}
    </Button>
  );
}
