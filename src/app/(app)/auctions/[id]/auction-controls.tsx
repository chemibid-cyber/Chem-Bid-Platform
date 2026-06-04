'use client';

import { useState, useTransition } from 'react';
import { useFormState } from 'react-dom';
import { Download, Loader2 } from 'lucide-react';
import {
  extendAuctionAction,
  cancelAuctionAction,
  getAuctionSpecUrlAction,
  type AuctionFormState,
} from '../actions';
import { SubmitButton } from '@/components/submit-button';
import { Button } from '@/components/ui/button';
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
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive"
        disabled={pending}
        onClick={() => {
          if (confirm('Cancel this auction? Sellers will be notified.'))
            start(async () => setError((await cancelAuctionAction(auctionId))?.error ?? null));
        }}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Cancel auction
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function SpecDownloadButton({ auctionId }: { auctionId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await getAuctionSpecUrlAction(auctionId);
          if (res.url) window.open(res.url, '_blank');
          else alert(res.error ?? 'Could not open file.');
        })
      }
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      Spec sheet
    </Button>
  );
}
