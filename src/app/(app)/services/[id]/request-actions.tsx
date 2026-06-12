'use client';

import { Check } from 'lucide-react';
import {
  acceptServiceQuoteAction,
  cancelServiceRequestAction,
  withdrawServiceQuoteAction,
} from '../actions';
import { ConfirmButton } from '@/components/ui/confirm-dialog';

export function AcceptQuoteButton({
  requestId,
  quoteId,
  providerName,
  total,
}: {
  requestId: string;
  quoteId: string;
  providerName: string;
  total: string;
}) {
  return (
    <ConfirmButton
      variant="success"
      size="sm"
      title={`Accept ${providerName}'s quote?`}
      description={`Total cost ₹${total}. This closes the inquiry, declines other quotes, and archives everything in your Service History. Execution and payment happen directly between your companies.`}
      confirmLabel="Accept quote"
      onConfirm={async () => {
        const res = await acceptServiceQuoteAction(requestId, quoteId);
        if (res?.error) throw new Error(res.error);
      }}
    >
      <Check className="h-4 w-4" /> Accept quote
    </ConfirmButton>
  );
}

export function CancelRequestButton({ requestId }: { requestId: string }) {
  return (
    <ConfirmButton
      variant="ghost"
      size="sm"
      className="text-destructive"
      title="Cancel this inquiry?"
      description="Providers who quoted will be notified. The inquiry is archived in your Service History — nothing is deleted."
      confirmLabel="Cancel inquiry"
      destructive
      onConfirm={async () => {
        const res = await cancelServiceRequestAction(requestId);
        if (res?.error) throw new Error(res.error);
      }}
    >
      Cancel inquiry
    </ConfirmButton>
  );
}

export function WithdrawQuoteButton({ requestId }: { requestId: string }) {
  return (
    <ConfirmButton
      variant="ghost"
      size="sm"
      className="text-destructive"
      title="Withdraw your quote?"
      description="You can re-quote while the inquiry stays open."
      confirmLabel="Withdraw quote"
      destructive
      onConfirm={async () => {
        const res = await withdrawServiceQuoteAction(requestId);
        if (res?.error) throw new Error(res.error);
      }}
    >
      Withdraw quote
    </ConfirmButton>
  );
}
