'use client';

import { useFormState } from 'react-dom';
import { launchStage2Action } from '../../actions';
import type { AuctionFormState } from '../../actions';
import { SubmitButton } from '@/components/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function Stage2LaunchForm({ auctionId, unit, lowest }: { auctionId: string; unit: string; lowest: string }) {
  const [state, action] = useFormState<AuctionFormState, FormData>(launchStage2Action, null);
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
      <input type="hidden" name="auctionId" value={auctionId} />
      <div className="space-y-2">
        <Label htmlFor="targetRate">Single counter on the material rate (₹/{unit})</Label>
        <Input id="targetRate" name="targetRate" type="number" step="0.01" min="0" placeholder={lowest} required />
        <p className="text-xs text-muted-foreground">
          Negotiation is on the <strong>material rate</strong> — each seller&apos;s transport + tax
          carry over from their Stage-1 bid. Blasted to all participants for one 24-hour round.
          Sellers may accept, reject, or submit a final material rate no higher than their Stage-1
          material rate.
        </p>
      </div>
      <SubmitButton>Launch Stage-2 counter</SubmitButton>
    </form>
  );
}
