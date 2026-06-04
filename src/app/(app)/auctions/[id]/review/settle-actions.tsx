'use client';

import { useState, useTransition } from 'react';
import { useFormState } from 'react-dom';
import { Loader2, Ban, Check } from 'lucide-react';
import { confirmDealAction, blockSellerAction, type AuctionFormState } from '../../actions';
import { SubmitButton } from '@/components/submit-button';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function ConfirmDealForm({
  auctionId,
  bidId,
  sellerName,
}: {
  auctionId: string;
  bidId: string;
  sellerName: string;
}) {
  const [state, action] = useFormState<AuctionFormState, FormData>(confirmDealAction, null);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`Confirm the deal with ${sellerName}? This records mutual intent and closes the auction.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="auctionId" value={auctionId} />
      <input type="hidden" name="bidId" value={bidId} />
      {state?.error ? (
        <Alert variant="destructive" className="mb-2">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <SubmitButton size="sm" variant="success">
        <Check className="h-4 w-4" /> Confirm deal
      </SubmitButton>
    </form>
  );
}

export function BlockSellerButton({
  auctionId,
  sellerCompanyId,
}: {
  auctionId: string;
  sellerCompanyId: string;
}) {
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
          if (confirm('Block this seller for this CAS? They will be muted for your future requirements.'))
            start(async () => setError((await blockSellerAction(auctionId, sellerCompanyId))?.error ?? null));
        }}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
        Block
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
