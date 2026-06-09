'use client';

import { useState, useTransition } from 'react';
import { useFormState } from 'react-dom';
import { Download, Loader2 } from 'lucide-react';
import {
  extendAuctionAction,
  cancelAuctionAction,
  cloneAuctionAction,
  getAuctionSpecUrlAction,
  type AuctionFormState,
} from '../actions';
import { SubmitButton } from '@/components/submit-button';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function ExtendForm({ auctionId }: { auctionId: string }) {
  const [state, action] = useFormState<AuctionFormState, FormData>(extendAuctionAction, null);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="auctionId" value={auctionId} />
      <div className="space-y-1">
        <Label htmlFor="closesAt" className="text-xs">
          Extend closing (IST, ≤ 48h)
        </Label>
        <Input id="closesAt" name="closesAt" type="datetime-local" className="w-auto" required />
      </div>
      <SubmitButton variant="outline" size="sm">
        Extend
      </SubmitButton>
      {state?.error ? (
        <Alert variant="destructive" className="w-full">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
    </form>
  );
}

export function CancelButton({ auctionId }: { auctionId: string }) {
  return (
    <ConfirmButton
      variant="ghost"
      size="sm"
      className="text-destructive"
      title="Cancel this auction?"
      description="Sellers who were notified will be told it's cancelled. This can't be undone."
      confirmLabel="Cancel auction"
      destructive
      onConfirm={async () => {
        const res = await cancelAuctionAction(auctionId);
        if (res?.error) throw new Error(res.error);
      }}
    >
      Cancel auction
    </ConfirmButton>
  );
}

export function CloneButton({ auctionId }: { auctionId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button variant="default" size="sm" disabled={pending} onClick={() => start(() => void cloneAuctionAction(auctionId))}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      Clone &amp; relist
    </Button>
  );
}

export function SpecDownloadButton({ auctionId }: { auctionId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await getAuctionSpecUrlAction(auctionId);
            if (res.url) window.open(res.url, '_blank');
            else setError(res.error ?? 'Could not open file.');
          })
        }
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        Spec sheet
      </Button>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
