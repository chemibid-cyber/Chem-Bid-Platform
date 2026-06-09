'use client';

import { useRef } from 'react';
import { useFormState } from 'react-dom';
import { Ban, Check } from 'lucide-react';
import { confirmDealAction, blockSellerAction, type AuctionFormState } from '../../actions';
import { ConfirmButton } from '@/components/ui/confirm-dialog';
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
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <div>
      {/* Hidden form keeps useFormState's redirect + error handling; the styled
          dialog triggers it via requestSubmit() instead of a native confirm(). */}
      <form ref={formRef} action={action} className="hidden">
        <input type="hidden" name="auctionId" value={auctionId} />
        <input type="hidden" name="bidId" value={bidId} />
      </form>
      {state?.error ? (
        <Alert variant="destructive" className="mb-2">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <ConfirmButton
        variant="success"
        size="sm"
        title={`Confirm the deal with ${sellerName}?`}
        description="This records the mutual intent of both parties under your signup Terms and closes the auction. It is not an automatically enforceable contract."
        confirmLabel="Confirm deal"
        onConfirm={() => formRef.current?.requestSubmit()}
      >
        <Check className="h-4 w-4" /> Confirm deal
      </ConfirmButton>
    </div>
  );
}

export function BlockSellerButton({
  auctionId,
  sellerCompanyId,
}: {
  auctionId: string;
  sellerCompanyId: string;
}) {
  return (
    <ConfirmButton
      variant="ghost"
      size="sm"
      className="text-destructive"
      title="Block this seller for this CAS?"
      description="They'll be muted for your future requirements on this chemical. Their existing bid stays in the audit trail."
      confirmLabel="Block seller"
      destructive
      onConfirm={async () => {
        const res = await blockSellerAction(auctionId, sellerCompanyId);
        if (res?.error) throw new Error(res.error);
      }}
    >
      <Ban className="h-4 w-4" /> Block
    </ConfirmButton>
  );
}
