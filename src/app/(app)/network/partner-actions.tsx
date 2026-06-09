'use client';

import { useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { removePartnerAction, declinePartnerAction } from './actions';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-dialog';

export function RemovePartnerButton({ partnerId }: { partnerId: string }) {
  return (
    <ConfirmButton
      variant="ghost"
      size="sm"
      className="text-destructive"
      title="Remove this partner?"
      description="They'll no longer be reachable through your Registered-Only auctions. You can re-add them anytime."
      confirmLabel="Remove partner"
      destructive
      onConfirm={async () => {
        const res = await removePartnerAction(partnerId);
        if (res?.error) throw new Error(res.error);
      }}
    >
      Remove
    </ConfirmButton>
  );
}

export function DeclinePartnerButton({ partnerId }: { partnerId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => start(() => void declinePartnerAction(partnerId))}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      Decline
    </Button>
  );
}
