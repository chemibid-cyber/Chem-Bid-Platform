'use client';

import { useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { removePartnerAction, declinePartnerAction } from './actions';
import { Button } from '@/components/ui/button';

export function RemovePartnerButton({ partnerId }: { partnerId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-destructive"
      disabled={pending}
      onClick={() => {
        if (confirm('Remove this partner?')) start(() => void removePartnerAction(partnerId));
      }}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      Remove
    </Button>
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
